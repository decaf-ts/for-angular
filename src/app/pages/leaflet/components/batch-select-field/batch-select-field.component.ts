import { Component } from '@angular/core';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonText } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { Dynamic } from 'src/lib/engine/decorators';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';

@Dynamic()
@Component({
  selector: 'app-batch-select-field',
  templateUrl: './batch-select-field.component.html',
  styleUrls: ['./batch-select-field.component.scss'],
  imports: [TranslatePipe, ForAngularCommonModule, IonItem, IonLabel, IonText, IonSelect, IonSelectOption],
  standalone: true,
})
export class BatchSelectFieldComponent extends CrudFieldComponent {
  override disabled?: boolean = true;
}
