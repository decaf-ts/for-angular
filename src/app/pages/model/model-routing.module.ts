import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModelPage } from './model.page';

const routes: Routes = [
  {
    path: '',
    component: ModelPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModelPageRoutingModule {}
