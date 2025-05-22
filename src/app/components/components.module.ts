import { NgModule } from '@angular/core';
import { ContainerComponent } from './container/container.component';
import { HeaderComponent } from './header/header.component';
import { BackButtonComponent } from './back-button/back-button.component';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { TestComponent } from './test/test.component';
const Components = [
  HeaderComponent,
  BackButtonComponent,
  ContainerComponent,
  TestComponent
];

@NgModule({
  imports: [ForAngularComponentsModule, Components],
  declarations: [],
  exports: [Components, ForAngularComponentsModule],
})
export class ComponentsModule {}
