import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/tests/playwright',
    // The Kanban functional suite must consume the packed tarball, never the
    // monorepo path aliases; it runs through tests/kanban/jest.config.cjs.
    '/tests/kanban',
    // The Gantt functional suite must consume the packed tarball, never the
    // monorepo path aliases; it runs through tests/gantt/jest.config.cjs.
    '/tests/gantt/functional',
    // The Scrum functional suite consumes the packed tarball through
    // tests/scrum/jest.config.cjs, never the monorepo path aliases.
    '/tests/scrum/functional',
    // Gantt browser E2E specs run through tests/gantt/playwright.config.ts.
    '/tests/gantt/playwright',
    // Pre-existing legacy specs that were never run because `src/app` was ignored
    // wholesale; they reference removed/renamed APIs and lack the router/i18n
    // providers the current components need. They are excluded so the standard
    // suite stays green while the new SAA-68 `src/app` specs run.
    'src/app/components/product-item/',
    'src/app/components/select-field/',
    'src/app/components/switcher/',
    'src/app/pages/audit/',
    'src/app/pages/leaflet/',
    'src/app/pages/batches/',
    'src/app/pages/account/',
    'src/app/pages/cron-selector/',
  ],
  // The built `lib/` artifact carries a copy of the root package.json. Haste
  // would otherwise report a duplicate `@decaf-ts/for-angular` package once a
  // spec imports the root barrel directly (e.g. through the charts entry point).
  modulePathIgnorePatterns: ['/dist', '<rootDir>/lib/package.json'],
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
    '^src/diagrams/components/graph/(.*)$': '<rootDir>/src/diagrams/components/graph/$1',
    '^src/diagrams/components/graph$': '<rootDir>/src/diagrams/components/graph/index.ts',
    '^@decaf-ts/for-angular$': '<rootDir>/src/lib/public-apis.ts',
    '^@decaf-ts/for-angular/(.*)$': '<rootDir>/src/$1/public-api.ts',
    '^src/lib/engine/(.*)$': '<rootDir>/src/lib/engine/$1',
    '^src/lib/helpers/(.*)$': '<rootDir>/src/lib/helpers/$1',
    '^src/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^lodash-es$': 'lodash',
    '^@bwip-js/browser$': '<rootDir>/node_modules/@bwip-js/browser/dist/bwip-js.mjs',
    '^ionicons/components/ion-icon.js$': '@ionic/core/components/ion-icon.js',
    '@decaf-ts/overrides/ui-decorators': '<rootDir>/node_modules/@decaf-ts/ui-decorators/lib/esm/model/overrides.js',
    // for-angular is developed inside the decaf-ts umbrella repo, where
    // `@decaf-ts/*` dependencies also exist in the transitive packages'
    // node_modules (e.g. `@decaf-ts/as-graph/node_modules/@decaf-ts/decoration`).
    // Without pinning, jest loads a second copy of the stateful
    // `@decaf-ts/decoration` Metadata registry: `@uielement`/`@required` write
    // to one copy while the `@decaf-ts/as-graph/shared` readers read the other,
    // dropping element tags and validators from the workflow-input ports. Pin
    // every bare `@decaf-ts/*` import to this package's own copy so the whole
    // test graph shares one instance of each package (mirrors as-graph's
    // jest.config.cjs).
    '^@decaf-ts/([^/]+)$': '<rootDir>/node_modules/@decaf-ts/$1',
  },

  // Critical for Ionic/Stencil modules
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@ionic/core|@stencil|@ionic/angular|ionicons|@decaf-ts|@storybook|storybook)'],

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
