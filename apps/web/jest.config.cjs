module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '.*test\\.tsx?$',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', module: 'commonjs', esModuleInterop: true } }] },
};
