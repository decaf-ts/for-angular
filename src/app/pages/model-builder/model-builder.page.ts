import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ContainerComponent } from 'src/lib/components';
import { ModelBuilderComponent } from 'model-builder/src/lib/model-builder/model-builder.component';

@Component({
  standalone: true,
  selector: 'app-model-builder-page',
  imports: [IonContent, ContainerComponent, ModelBuilderComponent],
  templateUrl: './model-builder.page.html',
})
export class ModelBuilderPage {
  preview = true;
}
