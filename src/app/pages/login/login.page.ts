import { Component, inject } from '@angular/core';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { CrudFormEvent } from 'src/lib/engine';
import { LoginForm } from 'src/app/forms/LoginForm';
import { getLogger } from 'src/lib/for-angular.module';
import { IonCard, IonCardContent, IonImg, ToastController} from '@ionic/angular/standalone';
import { Router } from '@angular/router';

/**
 * @description Login page component for user authentication
 * @summary This component handles the login functionality, including form rendering and event handling.
 * It uses the LoginForm for data binding and interacts with the LoginHandler for authentication logic.
 * @class
 * @param {Router} router - Angular Router for navigation
 * @param {ToastController} toastController - Ionic ToastController for displaying messages
 * @example
 * <app-login></app-login>
 * @mermaid
 * sequenceDiagram
 *   participant User
 *   participant LoginPage
 *   participant LoginHandler
 *   participant Router
 *   participant ToastController
 *   User->>LoginPage: Enter credentials
 *   LoginPage->>LoginHandler: Handle login event
 *   LoginHandler-->>LoginPage: Return login result
 *   LoginPage->>ToastController: Create toast message
 *   alt Login successful
 *     LoginPage->>Router: Navigate to dashboard
 *   end
 *   LoginPage->>ToastController: Present toast
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [ForAngularComponentsModule, IonCard, IonCardContent, IonImg, ComponentsModule],
})
export class LoginPage {
  /**
   * @description Instance of LoginForm for form data binding
   * @summary This property holds the data model for the login form
   */
  model = new LoginForm({});

  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for navigating to other pages after successful login
   */
  private router = inject(Router);

  /**
   * @description Ionic ToastController instance for displaying messages
   * @summary Injected ToastController service used for showing success or error messages
   */
  private toastController = inject(ToastController);

  /**
   * @description Handles form submission events
   * @summary This method processes the login form submission, authenticates the user,
   * displays appropriate messages, and navigates to the dashboard on successful login
   * @param {CrudFormEvent} event - The event object containing form data and handlers
   * @return {Promise<void>}
   * @mermaid
   * sequenceDiagram
   *   participant LoginPage
   *   participant LoginHandler
   *   participant ToastController
   *   participant Router
   *   LoginPage->>LoginHandler: Handle login event
   *   LoginHandler-->>LoginPage: Return login result
   *   LoginPage->>ToastController: Create toast message
   *   alt Login successful
   *     LoginPage->>Router: Navigate to dashboard
   *   end
   *   LoginPage->>ToastController: Present toast
   */
  async handleEvent(event: CrudFormEvent): Promise<void> {
    const {handlers} = event;
    try {
      if(handlers?.['login']) {
        const success = await (new handlers['login']()).handle(event);
        const toast = await this.toastController.create({
          message: success ? 'Login successful!' : 'Usuário ou senha inválidos.',
          duration: 3000,
          color: success ? 'dark' : 'danger',
          position: 'top',
        });
        if(success)
          await this.router.navigate(['/dashboard']);
        await toast.present();
      }
    } catch (error: unknown) {
      getLogger(this).error(error as Error | string);
    }
  }
}
