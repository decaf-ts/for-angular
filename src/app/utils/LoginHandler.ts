import { inject, InjectionToken } from "@angular/core";
import { Router } from "@angular/router";
import { ToastController } from "@ionic/angular";

type credenciais = { username: string; password: string };
export type LoginHandler = (credenciais: credenciais) => Promise<boolean>;

export const LoginHandlerProvider = new InjectionToken<LoginHandler>('LoginHandlerProvider', {
  providedIn: 'root',
  factory: () => {
    const router = inject(Router);
    const toastController = inject(ToastController);
    return async ({ username, password }) => {
      const success = (!!username && !!password);
      const toast = await toastController.create({
        message: success
          ? 'Login realizado com sucesso!'
          : 'Usuário ou senha inválidos.',
        duration: 3000,
        color: success ? 'dark' : 'danger',
        position: 'top',
      });

      await toast.present();
      if(success)
        await router.navigate(['/dashboard']);
      return success;
    };
  },
});





export class LoginClass {
  async signIn(credentials: credenciais): Promise<boolean> {
    // Simulação simples de login
    const { username, password } = credentials;
    return !!username && !!password;
  }
}
