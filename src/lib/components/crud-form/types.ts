/**
 * @module module:lib/components/crud-form/types
 * @description Type definitions for the CRUD form module.
 * @summary Declares interfaces used by `CrudFormComponent` such as the
 * `FormReactiveSubmitEvent` and `CrudFormOptions` which describe submission
 * payload shapes and configurable button options.
 */

export interface FormReactiveSubmitEvent {
  data: Record<string, unknown>;
}

export interface CrudFormOptions {
  buttons: {
    submit: {
      icon?: string;
      iconSlot?: 'start' | 'end';
      text?: string;
    };
    clear?: {
      icon?: string;
      iconSlot?: 'start' | 'end';
      text?: string;
    };
  };
}
