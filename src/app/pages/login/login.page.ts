import { Component } from '@angular/core';
import { LoginForm } from 'src/app/forms/LoginForm';
import { IonCard, IonCardContent, IonContent} from '@ionic/angular/standalone';
import { LogoComponent } from 'src/app/components/logo/logo.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { NgxBasePage } from 'src/lib/engine';

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
  imports: [IonContent, IonCard, IonCardContent, LogoComponent, ContainerComponent, ModelRendererComponent],

})
export class LoginPage extends NgxBasePage {

  /**
   * @description Instance of LoginForm for form data binding
   * @summary This property holds the data model for the login form, containing
   * username and password fields with their respective validation rules.
   * It's used to bind form controls and manage form state throughout the login process.
   *
   * @type {LoginForm}
   * @memberOf LoginPage
   */
  model: LoginForm = new LoginForm({
    username: 'user',
    password: 'Pass123-'
  });

  constructor() {
    super("LoginPage", false);
  }
}
