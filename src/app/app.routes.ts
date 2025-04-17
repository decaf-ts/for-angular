import { Routes } from '@angular/router';
// import { ModelPageComponent } from './pages/model/model.page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'demo',
    pathMatch: 'full'
  },
  {
    path: 'demo',
    loadComponent: () => import('./pages/demo/demo.page').then( m => m.DemoPage)
  },
  // {
  //   path: 'model/:modelName/:operation',
  //   loadChildren: () =>
  //     import('./pages/model/model.page').then((m) => m.ModelPageComponent),
  // },
  // {
  //   path: 'list/:modelName/:operation/:modelId',
  //   loadChildren: () =>
  //     import('./pages/list/list.page').then((m) => m.ModelPageComponent),
  // },
  {
    path: '',
    redirectTo: 'demo',
    pathMatch: 'full',
  },
  {
    path: 'test',
    loadComponent: () => import('./pages/test/test.page').then( m => m.TestPage)
  },
  {
    path: 'test',
    loadComponent: () => import('./pages/test/test.page').then( m => m.TestPage)
  }
];
