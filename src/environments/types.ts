import { LoggingConfig, LogLevel } from '@decaf-ts/logging';

export type EnvConfig = LoggingConfig & {
  app: string;
  env: string;
  api: {
    host: string;
    protocol: string;
  };
  level?: LogLevel;
};
