module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js', '**/tests/integration/**/*.test.js'],
  testPathIgnorePatterns: ['/tests/e2e/'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/tests/**',
    '!**/node_modules/**',
    '!**/public/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000
};