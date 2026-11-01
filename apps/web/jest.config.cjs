module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '.*test\\.tsx?$',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', module: 'commonjs', esModuleInterop: true } }] },
};
