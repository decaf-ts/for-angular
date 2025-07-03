import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/tests/playwright'],

  // Transform settings
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        // isolatedModules: true,
        useESM: true,
      },
    ],
  },

  // Module handling
  moduleNameMapper: {
    '^src/lib/engine/(.*)$': '<rootDir>/src/lib/engine/$1',
    '^src/lib/helpers/(.*)$': '<rootDir>/src/lib/helpers/$1',
    '^src/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^lodash-es$': 'lodash',
  },

  // Critical for Ionic/Stencil modules
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@ionic/core|@stencil|@ionic/angular|ionicons)',
  ],

  // Other settings
  verbose: true,
  collectCoverage: false,
  coverageDirectory: './workdocs/reports/coverage',
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/bin/**/*'],
  reporters: ['default'],
  moduleFileExtensions: ['ts', 'tsx', 'mjs', 'js', 'jsx', 'json', 'node', 'html'],
  resolver: 'jest-preset-angular/build/resolvers/ng-jest-resolver.js',
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};

export default config;
