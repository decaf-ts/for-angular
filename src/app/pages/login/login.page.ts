import { Component, EnvironmentInjector, inject, OnInit } from '@angular/core';
import { LoginForm } from 'src/app/forms/LoginForm';
import { IonContent } from '@ionic/angular/standalone';
import { LogoComponent } from 'src/app/components/logo/logo.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { NgxPageDirective } from 'src/lib/engine/NgxPageDirective';
import { CardComponent } from 'src/lib/components';

/**
 * @description Login page component for user authentication
 * @summary This component handles the login functionality, including form rendering and event handling.
 * It uses the LoginForm for data binding and interacts with the LoginHandler for authentication logic.
 * The component also manages locale context for internationalization and provides user feedback
 * through toast messages for login operations.
 * @class LoginPage
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
  imports: [IonContent, CardComponent, LogoComponent, ContainerComponent, ModelRendererComponent],

})
export class LoginPage extends NgxPageDirective implements OnInit {
  injector = inject(EnvironmentInjector);

  constructor() {
    super("LoginPage", false);
  }

  override async ngOnInit(): Promise<void> {
   super.ngOnInit();
   this.model = new LoginForm({
    username: 'User',
    password: 'Passd-123'
   });
  }
}

