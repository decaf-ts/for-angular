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
  {
    path: 'demo/:operation',
    loadComponent: () => import('./pages/demo/demo.page').then( m => m.DemoPage)
  },
  {
    path: 'crud',
    loadComponent: () => import('./pages/crud/crud.page').then( m => m.CrudPage)
  },
  {
    path: 'crud/:operation',
    loadComponent: () => import('./pages/crud/crud.page').then( m => m.CrudPage)
  }
];
