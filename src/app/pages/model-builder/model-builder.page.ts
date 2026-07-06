import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ModelBuilderComponent } from 'src/lib/components';

@Component({
  standalone: true,
  selector: 'app-model-builder-page',
  imports: [IonContent, ModelBuilderComponent],
  templateUrl: './model-builder.page.html',
})
export class ModelBuilderPage {
  preview = true;
}
