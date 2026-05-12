// alias to path on ui-decorators overrides to ensure correct resolution in Angular projects
import '@decaf-ts/overrides/ui-decorators';

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { AppConfig } from './app/app.config';

bootstrapApplication(AppComponent, AppConfig).catch((err) => console.error(err));
