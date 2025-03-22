import { Routes } from '@angular/router';
import { ModelPageComponent } from './pages/model/model.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadComponent: () =>
          import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'tab3',
        loadComponent: () =>
          import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full',
  },
];

export const routes: Routes = [
  {
    path: 'demo',
    loadChildren: () =>
      import('./pages/demo/demo.page').then((m) => m.DemoPage),
    pathMatch: 'full',
  },
  {
    path: 'model/:modelName/:operation',
    loadChildren: () =>
      import('./pages/model/model.page').then((m) => m.ModelPageComponent),
  },
  {
    path: 'list/:modelName/:operation/:modelId',
    loadChildren: () =>
      import('./pages/list/list.page').then((m) => m.ModelPageComponent),
  },
  {
    path: '',
    redirectTo: 'demo',
    pathMatch: 'full',
  },
];
