/**
 * @module app/pages/user-request/user-request.page
 * @summary Demo page driving the app's `user-data` handler through the v3
 * static dispatch API: `UserRequestHandler.handle(request, renderingEngine)`
 * resolves the handler class by `request.type` via `@userRequest` metadata,
 * instantiates it with the facade and calls `handle`.
 * @description Playwright drives this page to prove positive return,
 * cancellation and erroring-out against the live UI. The handler code path is
 * identical to the ui-decorators Jest suite (shared fixture), only the facade
 * differs (real Angular UI instead of the backend mock). Importing the app
 * handler module is what runs the `@userRequest` decorator at module load, so
 * the metadata-based lookup can resolve it.
 */

import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { JsonPipe } from '@angular/common';
import { UserRequestHandler } from '@decaf-ts/ui-decorators/user-requests';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { AngularUserRequestRenderingContext } from 'src/app/user-requests/user-request-rendering-context';
import { UserDataForm } from 'src/app/models/user-data-form';
import 'src/app/user-requests/handlers/user-data-handler';
import type { UserData } from 'src/app/user-requests/handlers/user-data-handler';

@Component({
  selector: 'app-user-request',
  standalone: true,
  templateUrl: './user-request.page.html',
  styleUrls: ['./user-request.page.scss'],
  imports: [HeaderComponent, IonButton, IonContent, JsonPipe],
})
export class UserRequestPage {
  title = 'User Requests';

  result?: UserData;

  error?: Error;

  private requestCounter = 0;

  private readonly context = new AngularUserRequestRenderingContext(
    inject(EnvironmentInjector),
  );

  async requestUserData(): Promise<void> {
    this.result = undefined;
    this.error = undefined;
    try {
      this.result = (await UserRequestHandler.handle(
        {
          id: `user-data-${++this.requestCounter}`,
          type: 'user-data',
          payload: new UserDataForm({}),
        },
        this.context,
      )) as UserData;
    } catch (error) {
      this.error = error as Error;
    }
  }
}
