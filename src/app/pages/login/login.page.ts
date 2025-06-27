import { Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, inject, Input, OnInit } from '@angular/core';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ComponentsModule } from 'src/app/components/components.module';
import { BaseCustomEvent, CrudFormEvent } from 'src/lib/engine';
import { LoginModel } from 'src/app/models/LoginModel';
import { getLogger } from 'src/lib/for-angular.module';
import { IonCard, IonCardContent, IonImg, ToastController} from '@ionic/angular/standalone';
import { LoginClass, LoginHandler, LoginHandlerProvider } from 'src/app/utils/LoginHandler';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [ForAngularComponentsModule, IonCard, IonCardContent, IonImg, ComponentsModule],
})
export class LoginPage implements OnInit {

    model = new LoginModel({});

    private router = inject(Router);
    private toastController = inject(ToastController);

    ngOnInit(): void {}

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

      } catch (error: any) {
        getLogger(this).error(error?.message || error);
      }
    }

}
