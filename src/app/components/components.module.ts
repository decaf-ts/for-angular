import { NgModule } from '@angular/core';
import { ContainerComponent } from './container/container.component';
import { HeaderComponent } from './header/header.component';
import { BackButtonComponent } from './back-button/back-button.component';

const Components = [
  HeaderComponent,
  BackButtonComponent,
  ContainerComponent
];

@NgModule({
  imports: [Components],
  declarations: [],
  exports: [Components],
})
export class ComponentsModule {}
