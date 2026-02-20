// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
import { LoggedEnvironment, LogLevel } from '@decaf-ts/logging';
import { EnvConfig } from './types';
import { getOnWindow } from 'src/lib/utils';
const env = (getOnWindow('ENV') || {}) as EnvConfig;
const config: EnvConfig = {
  app: env.app || 'EW Frontend',
  env: env.env || 'development',
  api: {
    host: env.api.host || 'localhost:3000',
    protocol: env.api.protocol || 'http',
  },
  level: LogLevel.debug,
} as EnvConfig;

export const Environment = LoggedEnvironment.accumulate(config);

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
