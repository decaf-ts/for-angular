import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DemoPageRoutingModule } from './demo-routing.module';

import { DemoPage } from './demo.page';
import { DecafCrudFieldComponent } from '../../../lib/components/decaf-crud-field/decaf-crud-field.component';
import { DecafCrudFormComponent } from '../../../lib/components/decaf-crud-form/decaf-crud-form.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DemoPageRoutingModule,
    DecafCrudFieldComponent,
    DecafCrudFormComponent,
  ],
  declarations: [DemoPage],
})
export class DemoPageModule {}
