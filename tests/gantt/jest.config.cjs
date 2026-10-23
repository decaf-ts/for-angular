/**
 * Functional Gantt verification suite (SAA-1045).
 *
 * Consumes the packed `dist/lib` tarball, never the monorepo path aliases: the
 * `@decaf-ts/for-angular/gantt` specifier is mapped to the extracted published
 * FESM by the pack step in `global-setup.cjs`.
 */
const path = require('node:path');
const { OUT_ROOT } = require('./pack-dist.cjs');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

module.exports = {
  preset: 'jest-preset-angular',
  rootDir: PACKAGE_ROOT,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/gantt/functional/**/*.spec.ts'],
  globalSetup: '<rootDir>/tests/gantt/global-setup.cjs',
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
    '^@decaf-ts/for-angular/gantt$': path.join(
      OUT_ROOT,
      'package',
      'fesm2022',
      'decaf-ts-for-angular-gantt.mjs'
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
