import { NgModule } from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  RouterModule,
  Routes,
  withComponentInputBinding,
} from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    // carregar componente sem redirecionar
    // loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule),
    pathMatch: 'full',
  },
  {
    path: 'model/:managerName/',
    loadChildren: () =>
      import('./pages/model/model.module').then((m) => m.ModelPageModule),
  },
  {
    path: 'model/:managerName/:operation',
    loadChildren: () =>
      import('./pages/model/model.module').then((m) => m.ModelPageModule),
  },
  {
    path: 'model/:managerName/:operation/:modelId',
    loadChildren: () =>
      import('./pages/model/model.module').then((m) => m.ModelPageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
      onSameUrlNavigation: 'reload',
    }),
  ],
  exports: [RouterModule],
  providers: [provideRouter(routes, withComponentInputBinding())],
})
export class AppRoutingModule {}
