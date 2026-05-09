import '@decaf-ts/logging';
import '@decaf-ts/decoration';
import '@decaf-ts/decorator-validation';
import '@decaf-ts/injectable-decorators';
import '@decaf-ts/db-decorators';
import '@decaf-ts/transactional-decorators';
import '@decaf-ts/core';
import '@decaf-ts/ui-decorators';

// with this these  pass (maybe webpack only) - webpack is treeshaking our overrides out of existence
// i seemed to be able to solve it for decorator-validation and db-decorators but not being able to do the same for the rest yet
import '../node_modules/@decaf-ts/decorator-validation/lib/esm/overrides/overrides.js';
import '../node_modules/@decaf-ts/db-decorators/lib/esm/overrides/overrides.js';
// these still fail
import '../node_modules/@decaf-ts/core/lib/esm/overrides/overrides.js';
import '../node_modules/@decaf-ts/ui-decorators/lib/esm/model/overrides.js';

import { bootstrapApplication } from '@angular/platform-browser';
import { AppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, AppConfig).catch((err) => console.error(err));
