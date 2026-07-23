/**
 * Independently maintained test configuration for internal extensions.
 *
 * Isolated-module transpilation avoids the upstream ts-jest/TypeScript
 * document-registry crash while preserving the repository path aliases.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx', 'jsx', 'node'],
  rootDir: 'src',
  testRegex: 'modules/internal-extensions/.*\\.spec\\.ts$',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': ['<rootDir>/$1'],
    '^~/(.*)$': ['<rootDir>/ee/$1', '<rootDir>/$1'],
    '^@/(.*)$': ['<rootDir>/ee/$1', '<rootDir>/$1'],
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true,
      },
    ],
  },
};
