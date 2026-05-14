import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { AppConfig } from './app/app.config';

// bootstrapApplication(AppComponent, AppConfig).catch((err) => console.error(err));

// Run angular with zone.js
bootstrapApplication(AppComponent, {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), ...AppConfig.providers],
}).catch((err) => console.error(err));
