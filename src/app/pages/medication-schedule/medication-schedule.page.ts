import { Component, OnInit } from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { MedicationScheduleModel } from 'src/app/models/MedicationScheduleModel';
import { CardComponent, ContainerComponent, EmptyStateComponent } from 'src/lib/components';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { CrudEvent } from 'src/lib/engine/types';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { ICrudFormEvent, IModelComponentSubmitEvent } from 'src/lib/engine/interfaces';
import { getNgxToast } from 'src/lib/utils/NgxToast';

@Component({
  selector: 'app-medication-schedule',
  templateUrl: './medication-schedule.page.html',
  styleUrls: ['./medication-schedule.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    TranslatePipe,
    HeaderComponent,
    ContainerComponent,
    CardComponent,
    EmptyStateComponent,
    ModelRendererComponent,
  ],
})
export class MedicationSchedulePage extends NgxModelPageDirective implements OnInit {
  constructor() {
    super('medication_schedule');
  }

  async ngOnInit(): Promise<void> {
    this.model = new MedicationScheduleModel();
    this.title = 'medication_schedule.title';
    this.enableCrudOperations();
    await super.initialize();
    this.locale = 'medication_schedule';
    this.route = 'medication-schedule';
  }

  override async handleEvent<M extends Model>(event: ICrudFormEvent): Promise<void> {
    const { name } = event;
    if (name === ComponentEventNames.Submit) {
      const { success, message } = (await super.submit(event as CrudEvent<M>, true)) as IModelComponentSubmitEvent<Model>;
      const toast = getNgxToast();
      await toast.show(message as string, {
        color: success ? 'dark' : 'danger',
      });
    }
  }

  override async ionViewWillEnter(): Promise<void> {
    await super.ionViewWillEnter();
  }
}
