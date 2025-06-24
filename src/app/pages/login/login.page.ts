import { Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, inject, Input, OnInit } from '@angular/core';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ComponentsModule } from 'src/app/components/components.module';
import { BaseCustomEvent, CrudFormEvent } from 'src/lib/engine';
import { LoginModel } from 'src/app/models/LoginModel';
import { getLogger } from 'src/lib/for-angular.module';
import { IonCard, IonCardContent, IonImg} from '@ionic/angular/standalone';
import { LoginClass, LoginHandler, LoginHandlerProvider } from 'src/app/utils/LoginHandler';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [ForAngularComponentsModule, IonCard, IonCardContent, IonImg, ComponentsModule],
})
export class LoginPage implements OnInit {

    model = new LoginModel({});

    private loginHandler: LoginHandler = inject(LoginHandlerProvider);
    ngOnInit(): void {}

    async handleEvent(event: CrudFormEvent): Promise<void> {
      const {handler} = event;
      if(handler)
        console.log(await handler());
      //  const {data, name, handlers} = event;
      // if(handlers?.[name]) {
      //   const res = await handlers?.[name](data);
      // }

      // const logger = getLogger(this);
      // const loginHandler = new LoginClass();
      // // loginHandler.signIn(data).then((success) => {
      // //   getLogger(this).info('Login successful');
      // // })
      // this.loginHandler(data);
    }

}
