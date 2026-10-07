import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/tests/playwright',
    // Pre-existing legacy specs that were never run because `src/app` was ignored
    // wholesale; they reference removed/renamed APIs and lack the router/i18n
    // providers the current components need. They are excluded so the standard
    // suite stays green while the new SAA-68 `src/app` specs run.
    'src/app/components/product-item/',
    'src/app/components/select-field/',
    'src/app/components/card-title/',
    'src/app/components/switcher/',
    'src/app/pages/audit/',
    'src/app/pages/leaflet/',
    'src/app/pages/batches/',
    'src/app/pages/account/',
    'src/app/pages/cron-selector/',
  ],
  modulePathIgnorePatterns: ['/dist'],
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
    '^src/app/(.*)$': '<rootDir>/src/app/$1',
    '^src/graph/(.*)$': '<rootDir>/src/graph/$1',
    '^src/graph$': '<rootDir>/src/graph/index.ts',
    '^src/lib/engine/(.*)$': '<rootDir>/src/lib/engine/$1',
    '^src/lib/helpers/(.*)$': '<rootDir>/src/lib/helpers/$1',
    '^src/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^lodash-es$': 'lodash',
    '^ionicons/components/ion-icon.js$': '@ionic/core/components/ion-icon.js',
    '@decaf-ts/overrides/ui-decorators': '<rootDir>/node_modules/@decaf-ts/ui-decorators/lib/esm/model/overrides.js',
  },

  // Critical for Ionic/Stencil modules
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@ionic/core|@stencil|@ionic/angular|ionicons|@decaf-ts)'],

  // Other settings
  verbose: true,
  collectCoverage: false,
  coverageDirectory: './workdocs/reports/coverage',
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/bin/**/*'],
  reporters: ['default'],
  moduleFileExtensions: ['ts', 'tsx', 'mjs', 'js', 'jsx', 'json', 'node', 'html'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};

export default config;
