import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { IonButton, IonCheckbox, IonLabel } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntil } from 'rxjs';
import { CronSelectorComponent } from '../cron-selector/cron-selector.component';
import { CrudFieldComponent } from '../crud-field/crud-field.component';
import { Dynamic } from '../../engine/decorators';
import { windowEventEmitter } from '../../utils/helpers';

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

  get isReadOnlyOperation(): boolean {
    return [OperationKeys.READ, OperationKeys.DELETE].includes(this.operation) || !!this.readonly || !!this.disabled;
  }

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
    if (!this.allowEmpty && !this.hasCronValue) {
      this.setValue(this.defaultCron);
    }

    await super.ngOnInit();
    this.bindControlState();
  }

  override async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await super.ngOnChanges(changes);

    if (!this.allowEmpty && !this.hasCronValue && !this.isReadOnlyOperation) {
      this.setValue(this.defaultCron);
    }

    this.bindControlState();
  }

  toggleEmpty(checked: boolean): void {
    if (this.isReadOnlyOperation) {
      return;
    }

    if (checked) {
      this.setValue(this.hasCronValue ? (this.value as string) : this.defaultCron);
      windowEventEmitter(ComponentEventNames.Change, {
        source: this.name,
        value: this.cronValue,
      });
    } else {
      this.setValue(undefined);
      windowEventEmitter(ComponentEventNames.Change, {
        source: this.name,
        value: undefined,
      });
    }

    this.onTouch();
    this.changeDetectorRef.detectChanges();
  }

  handleCronChange(value: string): void {
    if (this.isReadOnlyOperation) {
      return;
    }

    this.setValue(value);
    this.onTouch();
    this.changeDetectorRef.detectChanges();
    windowEventEmitter(ComponentEventNames.Change, {
      source: this.name,
      value,
    });
  }

  private bindControlState(): void {
    if (!this.formControl || (this.formControl as { __cronSelectorBound?: boolean }).__cronSelectorBound) {
      return;
    }

    (this.formControl as { __cronSelectorBound?: boolean }).__cronSelectorBound = true;
    this.formControl.statusChanges.pipe(takeUntil(this.destroySubscriptions$)).subscribe(() => {
      this.changeDetectorRef.detectChanges();
    });
    this.formControl.valueChanges.pipe(takeUntil(this.destroySubscriptions$)).subscribe(() => {
      this.changeDetectorRef.detectChanges();
    });
  }
}
