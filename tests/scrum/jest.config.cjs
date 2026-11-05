/**
 * Functional Scrum verification suite (SAA-1049).
 *
 * Consumes the packed `dist/lib` tarball installed into a throwaway consumer,
 * never the monorepo path aliases: `@decaf-ts/for-angular/scrum` and its only
 * cross-feature dependency `@decaf-ts/for-angular/kanban` are mapped to the
 * extracted published FESMs by the pack step in `global-setup.cjs`.
 */
const path = require('node:path');
const { EXTRACT_ROOT } = require('./pack-dist.cjs');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const FESM = path.join(EXTRACT_ROOT, 'fesm2022');

module.exports = {
  preset: 'jest-preset-angular',
  rootDir: PACKAGE_ROOT,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/scrum/functional/**/*.spec.ts'],
  globalSetup: '<rootDir>/tests/scrum/global-setup.cjs',
  modulePathIgnorePatterns: ['/dist'],
  modulePaths: ['<rootDir>/node_modules'],
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@decaf-ts/for-angular/scrum$': path.join(
      FESM,
      'decaf-ts-for-angular-scrum.mjs'
    ),
    '^@decaf-ts/for-angular/kanban$': path.join(
      FESM,
      'decaf-ts-for-angular-kanban.mjs'
    ),
    '^lodash-es$': 'lodash',
    '@decaf-ts/overrides/ui-decorators':
      '<rootDir>/node_modules/@decaf-ts/ui-decorators/lib/esm/model/overrides.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@ionic/core|@stencil|@ionic/angular|ionicons|@decaf-ts|@storybook|storybook|@worktile)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'mjs', 'js', 'jsx', 'json', 'node', 'html'],
  reporters: ['default'],
};
