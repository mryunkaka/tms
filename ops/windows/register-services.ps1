$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from an elevated PowerShell session.'
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$serverRoot = 'C:\Server'
$nodeRoot = Join-Path $serverRoot 'node-v24.22.1-win-x64'
$nginxRoot = Join-Path $serverRoot 'nginx-1.30.6\nginx-1.30.6'
$nssm = Join-Path $serverRoot 'nssm-2.24\nssm-2.24\win64\nssm.exe'
$postgresService = Get-CimInstance Win32_Service |
    Where-Object { $_.Name -match '^postgresql-x64-18' } |
    Select-Object -First 1
$envFile = Join-Path $repoRoot '.env'
$apiBuild = Join-Path $repoRoot 'apps\api\dist\src\main.js'
$webBuild = Join-Path $repoRoot 'apps\web\.next\BUILD_ID'

foreach ($required in @($nodeRoot, $nginxRoot, $nssm, $envFile, $apiBuild, $webBuild)) {
    if (-not (Test-Path $required)) { throw "Required path not found: $required" }
}
if (-not $postgresService) { throw 'PostgreSQL 18 service is missing or stopped. Install and start PostgreSQL first.' }
$envText = Get-Content $envFile -Raw
foreach ($requiredSetting in @('NODE_ENV=production', 'API_PORT=3001', 'WEB_ORIGIN=http://127.0.0.1:8085')) {
    if ($envText -notmatch [regex]::Escape($requiredSetting)) { throw "Set $requiredSetting in the repository .env file first." }
}
foreach ($requiredKey in @('DATABASE_URL', 'JWT_ACCESS_SECRET', 'INITIAL_ADMIN_EMAIL', 'INITIAL_ADMIN_PASSWORD')) {
    if ($envText -notmatch "(?m)^$requiredKey=.+$") { throw "Set a non-empty $requiredKey in the repository .env file first." }
}
$jwtSecret = [regex]::Match($envText, '(?m)^JWT_ACCESS_SECRET=(.+)$')
if (-not $jwtSecret.Success -or $jwtSecret.Groups[1].Value.Length -lt 64) { throw 'JWT_ACCESS_SECRET must contain at least 64 characters for production.' }
Set-Service -Name $postgresService.Name -StartupType Automatic
if ((Get-Service -Name $postgresService.Name).Status -ne 'Running') { Start-Service -Name $postgresService.Name }

$node = Join-Path $nodeRoot 'node.exe'
$npmCli = Join-Path $nodeRoot 'node_modules\npm\bin\npm-cli.js'
$env:Path = "$nodeRoot;$env:Path"
$nginxConfig = Join-Path $nginxRoot 'conf\nginx.conf'
$nginxExe = Join-Path $nginxRoot 'nginx.exe'
$siteConfig = Join-Path $serverRoot 'tms\conf\nginx-tms.conf'
$logRoot = Join-Path $serverRoot 'tms\logs'
New-Item -ItemType Directory -Path (Split-Path $siteConfig), $logRoot -Force | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'nginx-tms.conf') $siteConfig -Force

$mainConf = Get-Content $nginxConfig -Raw
$includeLine = '    include C:/Server/tms/conf/nginx-tms.conf;'
$nginxBackup = $null
if ($mainConf -notmatch [regex]::Escape($includeLine)) {
    $anchor = '    access_log C:/Server/nginx-1.30.6/nginx-1.30.6/logs/access.log;'
    if (-not $mainConf.Contains($anchor)) { throw 'Expected Nginx http configuration anchor was not found.' }
    $nginxBackup = "$nginxConfig.before-tms-$(Get-Date -Format yyyyMMdd-HHmmss).bak"
    Copy-Item $nginxConfig $nginxBackup
    $mainConf = $mainConf.Replace($anchor, "$anchor`r`n$includeLine")
    [System.IO.File]::WriteAllText($nginxConfig, $mainConf, [System.Text.UTF8Encoding]::new($false))
}

& $nginxExe -t -p "$nginxRoot/" -c conf/nginx.conf
if ($LASTEXITCODE -ne 0) {
    if ($nginxBackup) { Copy-Item $nginxBackup $nginxConfig -Force }
    throw 'Nginx configuration validation failed; the existing service was not reloaded.'
}

& $node $npmCli run db:deploy --workspace @tms/api
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL migration deploy failed; no TMS service was started.' }
& $node $npmCli run db:seed --workspace @tms/api
if ($LASTEXITCODE -ne 0) { throw 'Initial admin seed failed; check the initial-admin settings and database.' }

$nodeService = Get-CimInstance Win32_Service -Filter "Name='nodejs'" -ErrorAction SilentlyContinue
if ($nodeService -and $nodeService.PathName -notlike "*$nssm*") {
    throw 'A Windows service named nodejs already exists and is not managed by this NSSM installation.'
}
if (-not $nodeService) {
    & $nssm install nodejs $node $npmCli start | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'NSSM could not create the nodejs service.' }
}

& $nssm set nodejs AppDirectory $repoRoot | Out-Null
& $nssm set nodejs AppEnvironmentExtra "PATH=$nodeRoot;%PATH%" | Out-Null
& $nssm set nodejs AppStdout (Join-Path $logRoot 'nodejs-stdout.log') | Out-Null
& $nssm set nodejs AppStderr (Join-Path $logRoot 'nodejs-stderr.log') | Out-Null
& $nssm set nodejs AppRotateFiles 1 | Out-Null
& $nssm set nodejs AppRotateBytes 10485760 | Out-Null
& $nssm set nodejs AppRestartDelay 5000 | Out-Null
& $nssm set nodejs AppExit Default Restart | Out-Null
& $nssm set nodejs DependOnService $postgresService.Name | Out-Null
& $nssm set nodejs Start SERVICE_AUTO_START | Out-Null

$nginxService = Get-CimInstance Win32_Service -Filter "Name='WebStack-Nginx'" -ErrorAction SilentlyContinue
if (-not $nginxService) { throw 'Existing WebStack-Nginx service was not found; refusing to create a duplicate listener.' }
& sc.exe config WebStack-Nginx start= auto | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not ensure the existing Nginx service uses automatic startup.' }
& $nginxExe -s reload -p "$nginxRoot/" -c conf/nginx.conf
if ($LASTEXITCODE -ne 0) {
    Restart-Service -Name WebStack-Nginx
    if ((Get-Service -Name WebStack-Nginx).Status -ne 'Running') { throw 'Nginx configuration is valid but its service could not restart.' }
}

& $nssm start nodejs
if ($LASTEXITCODE -ne 0) { throw 'The nodejs service was configured but did not start.' }

Get-Service WebStack-Nginx, nodejs | Select-Object Name, Status, StartType
Write-Output 'TMS web: http://127.0.0.1:8085'
Write-Output 'TMS API health: http://127.0.0.1:8085/api/v1/health'
