/**
 * @module module:lib/components/crud-form/crud-form.component
 * @description CRUD form component module.
 * @summary Provides `CrudFormComponent` — a wrapper that composes dynamic form
 * fields and layout to produce create/read/update/delete forms with validation
 * and submission handling.
 *
 * @link {@link CrudFormComponent}
 */

import {
  Component,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { Dynamic } from '../../engine/decorators';
import { DefaultFormReactiveOptions, ComponentEventNames } from '../../engine/constants';
import { NgxFormDirective } from '../../engine/NgxFormDirective';
import { LayoutComponent } from '../layout/layout.component';
import { TranslatePipe } from '@ngx-translate/core';


@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-crud-form',
  templateUrl: './crud-form.component.html',
  styleUrls: ['./crud-form.component.scss'],
  imports: [TranslatePipe, ReactiveFormsModule, LayoutComponent, IonButton, IonIcon],
  host: {'[attr.id]': 'uid'},
})

export class CrudFormComponent extends NgxFormDirective {

  constructor() {
    super('CrudFormComponent');
  }

  /**
   * @description Component initialization lifecycle method.
   * @summary Initializes the component by setting up the logger, configuring form state
   * based on the operation type, and merging configuration options. For READ and DELETE
   * operations, the formGroup is set to undefined since these operations don't require
   * form input. Configuration options are merged with default settings.
   *
   * @returns {Promise<void>}
   * @memberOf CrudFormComponent
   */
  override async ngOnInit(): Promise<void> {
    this.options = Object.assign(
      {},
      DefaultFormReactiveOptions,
      {buttons: {submit: {text: this.operation.toLowerCase()}}},
      this.options || {},
    );
    await super.ngOnInit();
  }

  /**
   * @description Handles delete operations by emitting delete events.
   * @summary Processes delete requests by emitting a submit event with the
   * record's unique identifier as data. This allows parent components to
   * handle the actual deletion logic while maintaining separation of concerns.
   * The event includes the uid and standard component identification.
   *
   * @returns {void}
   * @memberOf CrudFormComponent
   */
  handleDelete(): void {
    super.submitEventEmit(this.model, 'CrudFormComponent', ComponentEventNames.SUBMIT, this.handlers);
  }
}
