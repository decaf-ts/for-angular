import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { CronSelectorComponent } from '../cron-selector/cron-selector.component';
import { CrudFieldComponent } from '../crud-field/crud-field.component';
import { Dynamic } from '../../engine/decorators';
import { windowEventEmitter } from '../../utils/helpers';

@Dynamic()
@Component({
  selector: 'app-cron-selector-field',
  standalone: true,
  imports: [CommonModule, TranslatePipe, IonItem, IonLabel, CronSelectorComponent],
  templateUrl: './cron-selector-field.component.html',
  styleUrls: ['./cron-selector-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronSelectorFieldComponent extends CrudFieldComponent {
  @Input()
  hideDaily = false;

  @Input()
  hideInterval = false;

  @Input()
  hideWeekly = false;

  get isReadOnlyOperation(): boolean {
    return [OperationKeys.READ, OperationKeys.DELETE].includes(this.operation) || !!this.readonly || !!this.disabled;
  }

  get cronValue(): string {
    return typeof this.value === 'string' ? this.value : '';
  }

  handleCronChange(value: string): void {
    if (this.isReadOnlyOperation) {
      return;
    }

    this.setValue(value);
    this.onTouch();
    windowEventEmitter(ComponentEventNames.Change, {
      source: this.name,
      value,
    });
  }
}
