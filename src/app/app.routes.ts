import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'fieldset',
    loadComponent: () => import('./pages/fieldset/fieldset.page').then( m => m.FieldsetPage)
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
    path: 'list-model',
    loadComponent: () => import('./pages/list-model/list-model.page').then( m => m.ListModelPage)
  },
  {
    path: 'list-model/:type',
    loadComponent: () => import('./pages/list-model/list-model.page').then( m => m.ListModelPage)
  },
 {
    path: 'model/:modelName',
    loadComponent: () => import('./pages/model/model.page').then(m => m.ModelPage)
  },
  {
    path: 'model/:modelName/:operation',
    loadComponent: () => import('./pages/model/model.page').then(m => m.ModelPage)
  },
  {
    path: 'model/:modelName/:operation/:modelId',
    loadComponent: () => import('./pages/model/model.page').then(m => m.ModelPage)
  },
  {
    path: 'model/:modelName/:operation/:modelId',
    loadComponent: () => import('./pages/model/model.page').then( m => m.ModelPage)
  },
  {
    path: 'steps-form',
    loadComponent: () => import('./pages/steps-form/steps-form.page').then( m => m.StepsFormPage)
  }
];
