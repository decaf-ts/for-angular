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
    path: 'demo',
    redirectTo: 'home',
    // carregar componente sem redirecionar
    loadChildren: () =>
      import('./pages/demo/demo.module').then((m) => m.DemoPageModule),
    pathMatch: 'full',
  },
  {
    path: 'model/:modelName/',
    loadChildren: () =>
      import('./pages/model/model.module').then((m) => m.ModelPageModule),
  },
  {
    path: 'model/:modelName/:operation',
    loadChildren: () =>
      import('./pages/model/model.module').then((m) => m.ModelPageModule),
  },
  {
    path: 'model/:modelName/:operation/:modelId',
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
