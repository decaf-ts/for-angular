import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// export const DbAdapter = new RamAdapter("ram");

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
