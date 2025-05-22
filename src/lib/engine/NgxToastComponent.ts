import { toastController } from "@ionic/core";
import { ToastOptions } from '@ionic/angular/standalone';

export type ToastRole = 'cancel' | string | undefined;

const DefaulOptions = {
  duration: 3000,
  position: 'top',
  animated: true
}

let instance!: NgxToastComponent;
let component: HTMLIonToastElement | null;

export class NgxToastComponent {

  private readonly options: ToastOptions;

  constructor(options: ToastOptions){
    this.options = Object.assign(DefaulOptions, options);
  }

  async error(message: string): Promise<ToastRole>  {
    (component as HTMLIonToastElement) = await this.show(Object.assign(this.options, {message: message, color: "danger"}));
    const {role} = await this.handleDidDismiss(component as HTMLIonToastElement);
    return role;
  }

  private async show(options: ToastOptions): Promise<HTMLIonToastElement>{
    options = Object.assign({duration: 5000}, options);
    let timeout = 0;
    if(!!component) {
      await component.dismiss();
      timeout = 200;
    }
    component = await toastController.create(options);
    setTimeout(async() => await (component as HTMLIonToastElement).present(), timeout);
    return component;
  }

  async inform(message: string) {
    await this.show(Object.assign(this.options, {message: message, color: ""}));
  }

  async success(message: string) {
    await this.show(Object.assign(this.options, {message: message, color: "success"}));
  }

  async warn(message: string): Promise<ToastRole> {
    (component as HTMLIonToastElement) =  await this.show(Object.assign(this.options, {message: message, color: "warning"}));
    const {role} = await this.handleDidDismiss(component as HTMLIonToastElement);
    return role;
  }

  private async handleDidDismiss(toast: HTMLIonToastElement): Promise<any> {
    const didDismiss = await toast.onDidDismiss();
    component = null;
    return didDismiss;
  }
}


export function getNgxToastComponent(options: ToastOptions = {}): NgxToastComponent {
  if(!instance)
    instance = new NgxToastComponent(options);
  return instance;
}
