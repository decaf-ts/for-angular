import { Config } from '@jest/types';
import conf from '../../jest.config';

const config: Config.InitialOptions = {
  ...conf,
  rootDir: '../..',
  collectCoverage: true,
  coverageDirectory: './workdocs/reports/coverage',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './workdocs/reports/junit',
        outputName: 'junit-report.xml',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './workdocs/reports/html',
        filename: 'test-report.html',
        openReport: true,
        expand: true,
        pageTitle: 'ui-decorators Test Report',
        stripSkippedTest: true,
        darkTheme: true,
        enableMergeData: true,
        dataMergeLevel: 2,
      },
    ],
  ],
  coverageThreshold: {
    global: {
      statements: 25,
      branches: 5,
      functions: 15,
      lines: 25,
    },
  },
};

export default config;
