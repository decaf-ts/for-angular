import { Component, OnInit } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IonContent } from '@ionic/angular/standalone';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { FieldSetForm } from 'src/app/forms/FieldsetForm';
import { CardComponent, ContainerComponent, ModelRendererComponent } from 'src/lib/components';
import { IBaseCustomEvent, NgxPageDirective } from 'src/lib/engine';

@Component({
  standalone: true,
  selector: 'app-fieldset',
  templateUrl: './fieldset.page.html',
  styleUrls: ['./fieldset.page.scss'],
  imports: [HeaderComponent, IonContent, ContainerComponent, CardComponent, ModelRendererComponent],
})
export class FieldsetPage extends NgxPageDirective implements OnInit {
  constructor() {
    super('FieldsetPage');
  }

  async ngOnInit(): Promise<void> {
    await super.initialize();
    this.globals = { operation: OperationKeys.CREATE };
    this.model = new FieldSetForm();
  }

  handleSubmit(event: IBaseCustomEvent): void {
    this.log.for(this.handleSubmit).info(`Submit event: ${JSON.stringify(event)}`);
  }
}
