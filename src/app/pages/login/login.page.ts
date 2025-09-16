import { Component, inject, OnInit } from '@angular/core';
import { CrudFormEvent } from 'src/lib/engine';
import { LoginForm } from 'src/app/forms/LoginForm';
import { getLogger } from 'src/lib/for-angular-common.module';
import { IonCard, IonCardContent, IonContent, IonImg, ToastController} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { getLocaleContext } from 'src/lib/i18n/Loader';
import { LogoComponent } from 'src/app/components/logo/logo.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';

/**
 * @description Login page component for user authentication
 * @summary This component handles the login functionality, including form rendering and event handling.
 * It uses the LoginForm for data binding and interacts with the LoginHandler for authentication logic.
 * The component also manages locale context for internationalization and provides user feedback
 * through toast messages for login operations.
 * @class
 * @param {LoginForm} model - Form model instance for login data binding
 * @param {string} locale - Locale context for internationalization
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
  imports: [IonContent, IonCard, IonCardContent, IonImg, LogoComponent, ContainerComponent, ModelRendererComponent],

})
export class LoginPage implements OnInit {

  /**
   * @description Instance of LoginForm for form data binding
   * @summary This property holds the data model for the login form, containing
   * username and password fields with their respective validation rules.
   * It's used to bind form controls and manage form state throughout the login process.
   *
   * @type {LoginForm}
   * @memberOf LoginPage
   */
  model: LoginForm = new LoginForm({});

  /**
   * @description Locale context string for internationalization
   * @summary Contains the locale context key ('Login') used for translation
   * and internationalization purposes. This key is used to determine the
   * appropriate language resources and translation context for this page.
   *
   * @type {string}
   * @memberOf LoginPage
   */
  locale: string = getLocaleContext('Login');

  /**
   * @description App logo
   */
  logo: string = 'assets/images/decaf-logo.svg';


  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for programmatic navigation
   * to other pages after successful login or other routing operations.
   *
   * @private
   * @type {Router}
   * @memberOf LoginPage
   */
  private router: Router = inject(Router);

  /**
   * @description Ionic ToastController instance for displaying messages
   * @summary Injected ToastController service used for showing success
   * or error messages to the user as toast notifications.
   *
   * @private
   * @type {ToastController}
   * @memberOf LoginPage
   */
  private toastController: ToastController = inject(ToastController);

  /**
   * @description Component initialization lifecycle method
   * @summary Initializes the login page component by logging the locale context
   * for debugging purposes. This method is called after Angular has initialized
   * all data-bound properties and before the view is rendered.
   *
   * @returns {void}
   * @memberOf LoginPage
   */
  ngOnInit(): void {
   const {matches} = window.matchMedia('(prefers-color-scheme: dark)');
    if(matches)
      this.logo = 'assets/images/decaf-logo-lw.svg';
  }

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
