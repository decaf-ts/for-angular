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
  Component
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DefaultFormReactiveOptions, Dynamic, EventConstants, KeyValue } from '../../engine';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { NgxFormDirective } from '../../engine/NgxFormDirective';
import { ComponentRendererComponent } from '../../components/component-renderer/component-renderer.component';
import { LayoutComponent } from '../layout/layout.component';


@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-crud-form',
  templateUrl: './crud-form.component.html',
  styleUrls: ['./crud-form.component.scss'],
  imports: [ReactiveFormsModule, LayoutComponent, ComponentRendererComponent, IonButton, IonIcon],
  host: {'[attr.id]': 'uid'},
})

export class CrudFormComponent extends NgxFormDirective {

  constructor() {
    super();
    this.componentName = 'CrudFormComponent';
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
    // console.log(this.formGroup);
    this.options = Object.assign(
      {},
      DefaultFormReactiveOptions,
      this.options || {},
    );
    await super.ngOnInit();

  }
  /**
   * @description Handles form submission with validation and event emission.
   * @summary Processes form submission by first preventing default browser behavior,
   * then validating all form fields using NgxDecafFormService. If validation passes,
   * extracts form data and emits a submitEvent with the data, component information,
   * and any associated handlers. Returns false if validation fails.
   *
   * @param {SubmitEvent} event - The browser's native form submit event
   * @returns {Promise<boolean | void>} Returns false if validation fails, void if successful
   * @memberOf CrudFormComponent
   */
  async submit(event: SubmitEvent): Promise<boolean | void> {
    super.handleSubmit(event);
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
    this.submitEvent.emit({
      data: this.modelId,
      component: 'CrudFormComponent',
      name: EventConstants.SUBMIT,
    });
  }

}
