import { Routes } from '@angular/router';
// import { ModelPageComponent } from './pages/model/model.page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'crud/create',
    pathMatch: 'full'
  },
  {
    path: 'crud',
    loadComponent: () => import('./pages/crud/crud.page').then( m => m.CrudPage)
  },
  {
    path: 'crud/:operation',
    loadComponent: () => import('./pages/crud/crud.page').then( m => m.CrudPage)
  },
  {
    path: 'list',
    loadComponent: () => import('./pages/list/list.page').then( m => m.ListPage)
  },
  {
    path: 'list/:type',
    loadComponent: () => import('./pages/list/list.page').then( m => m.ListPage)
  },
  {
    path: 'list-model',
    loadComponent: () => import('./pages/list-model/list-model.page').then( m => m.ListModelPage)
  },
  {
    path: 'list-model/:type',
    loadComponent: () => import('./pages/list-model/list-model.page').then( m => m.ListModelPage)
  },
  {
    path: 'model',
    loadComponent: () => import('./pages/model/model.page').then( m => m.ModelPage)
  },
   {
    path: 'model/:modelName/:operation',
    loadComponent: () => import('./pages/model/model.page').then( m => m.ModelPage)
  },
  {
    path: 'model/:modelName/:operation/:uid',
    loadComponent: () => import('./pages/model/model.page').then( m => m.ModelPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  }
];
