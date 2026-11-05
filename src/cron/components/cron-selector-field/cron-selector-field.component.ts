/**
 * @module for-angular/cron/components/cron-selector-field
 * @summary Form-field adapter that renders {@link CronBuilderComponent} as a decaf CRUD field.
 * @description Extends the root {@link CrudFieldComponent} so a decaf model
 * property rendered by the CRUD form can edit a cron expression. Optionally
 * collapses to a checkbox toggle (`allowEmpty`) that enables or disables the
 * schedule.
 * @memberOf module:for-angular/cron/components/cron-selector-field
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit } from '@angular/core';
import { IonButton, IonCheckbox, IonLabel } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { CrudFieldComponent, Dynamic } from '@decaf-ts/for-angular';
import { CronBuilderComponent } from './cron-builder/cron-builder.component';

/**
 * Cron-selector CRUD form field.
 *
 * @description Wraps {@link CronBuilderComponent} as a decaf CRUD field so a
 * model property renders a cron-expression editor inside a `CrudFormComponent`.
 * When `allowEmpty` is set the field adds a checkbox that clears the value
 * instead of showing the selector; required, non-empty fields always show it.
 * @class CronSelectorFieldComponent
 * @memberOf module:for-angular/cron/components/cron-selector-field
 */
@Dynamic()
@Component({
  selector: 'app-cron-selector-field',
  standalone: true,
  imports: [CommonModule, TranslatePipe, IonButton, IonCheckbox, IonLabel, CronBuilderComponent],
  templateUrl: './cron-selector-field.component.html',
  styleUrls: ['./cron-selector-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronSelectorFieldComponent extends CrudFieldComponent implements OnInit, OnChanges {
  /** Cron expression used while no value is set. */
  readonly defaultCron = '0 9 * * *';

  /** Adds a visibility checkbox that clears the cron value when unchecked. */
  @Input()
  allowEmpty = false;

  /** Forwards to {@link CronBuilderComponent.hideDaily}. */
  @Input()
  hideDaily = false;

  /** Forwards to {@link CronBuilderComponent.hideInterval}. */
  @Input()
  hideInterval = false;

  /** Forwards to {@link CronBuilderComponent.hideWeekly}. */
  @Input()
  hideWeekly = false;

  /** Forwards to {@link CronBuilderComponent.describeCron}. */
  @Input()
  describeCron = false;

  /** Whether the underlying CRUD field accepts multiple values. */
  @Input()
  override multiple = true;

  /** Whether a non-empty cron value is currently set. */
  get hasCronValue(): boolean {
    return typeof this.value === 'string' && this.value.trim().length > 0;
  }

  /** The stored cron value, or {@link CronSelectorFieldComponent.defaultCron} when empty. */
  get cronValue(): string {
    return this.hasCronValue ? (this.value as string) : this.defaultCron;
  }

  /** Whether the selector should be rendered (always shown for required values). */
  get showSelector(): boolean {
    return !this.allowEmpty || this.hasCronValue;
  }

  /** Initializes the field and applies the required/empty visibility rules. */
  override async ngOnInit(): Promise<void> {
    await super.initialize();
    this.handleCronChange(this.allowEmpty && !this.required ? '' : this.cronValue);
    // always show cron when required  and not empty
    if (this.required && !this.allowEmpty) {
      this.checked = true;
      this.changeDetectorRef.markForCheck();
    }
  }

  /** Toggles the visibility checkbox and stores the cleared or restored value. */
  toggleVisibility(): void {
    this.checked = !this.checked;
    if (!this.checked) {
      this.setValue(this.allowEmpty && !this.required ? '' : this.cronValue);
    }
    this.changeDetectorRef.markForCheck();
  }

  /** Stores a cron expression produced by the builder, unless the field is read-only. */
  handleCronChange(value: string): void {
    if (!this.isReadOnlyOperation) {
      this.setValue(value);
    }
  }
}
