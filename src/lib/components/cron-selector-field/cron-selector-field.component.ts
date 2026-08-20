import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit } from '@angular/core';
import { IonButton, IonCheckbox, IonLabel } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { Dynamic } from '../../engine/decorators';
import { CronSelectorComponent } from '../cron-selector/cron-selector.component';
import { CrudFieldComponent } from '../crud-field/crud-field.component';

@Dynamic()
@Component({
  selector: 'app-cron-selector-field',
  standalone: true,
  imports: [CommonModule, TranslatePipe, IonButton, IonCheckbox, IonLabel, CronSelectorComponent],
  templateUrl: './cron-selector-field.component.html',
  styleUrls: ['./cron-selector-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronSelectorFieldComponent extends CrudFieldComponent implements OnInit, OnChanges {
  readonly defaultCron = '0 9 * * *';

  @Input()
  allowEmpty = false;

  @Input()
  hideDaily = false;

  @Input()
  hideInterval = false;

  @Input()
  hideWeekly = false;

  @Input()
  describeCron = false;

  get hasCronValue(): boolean {
    return typeof this.value === 'string' && this.value.trim().length > 0;
  }

  get cronValue(): string {
    return this.hasCronValue ? (this.value as string) : this.defaultCron;
  }

  get showSelector(): boolean {
    return !this.allowEmpty || this.hasCronValue;
  }

  override async ngOnInit(): Promise<void> {
    await super.initialize();
    this.handleCronChange(this.allowEmpty && !this.required ? '' : this.cronValue);
    // always show cron when required  and not empty
    if (this.required && !this.allowEmpty) {
      this.checked = true;
      this.changeDetectorRef.markForCheck();
    }
  }

  toggleVisibility(): void {
    this.checked = !this.checked;
    if (!this.checked) {
      this.setValue(this.allowEmpty && !this.required ? '' : this.cronValue);
    }
    this.changeDetectorRef.markForCheck();
  }

  handleCronChange(value: string): void {
    if (!this.isReadOnlyOperation) {
      this.setValue(value);
    }
  }
}
