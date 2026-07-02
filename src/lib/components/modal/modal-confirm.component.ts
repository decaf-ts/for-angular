import { Component, EnvironmentInjector, Input, OnInit } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { IonButton, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionRoles } from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
import { ActionRole, KeyValue } from '../../engine/types';
import { generateRandomValue } from '../../utils';
import { IconComponent } from '../icon/icon.component';
import { getNgxModalComponent, ModalComponent } from './modal.component';

@Dynamic()
@Component({
  selector: 'ngx-decaf-modal-confirm',
  templateUrl: 'modal-confirm.component.html',
  standalone: true,
  imports: [TranslatePipe, IonButton, IconComponent],
  host: { '[attr.id]': 'uid' },
})
export class ModalConfirmComponent extends ModalComponent implements OnInit {
  @Input()
  override translatable: boolean = false;

  @Input()
  override title?: string;

  /**
   * @description Data used to generate the confirmation message.
   * @summary Carries the item label, primary key, and unique identifier for the entity being confirmed.
   * @type {KeyValue | undefined}
   */
  @Input()
  data?: KeyValue;

  /**
   * @description CRUD operation represented by the confirmation modal.
   * @summary Defines which operation the modal is confirming, such as create, update, or delete.
   * @type {CrudOperations | undefined}
   */
  @Input()
  role?: CrudOperations;

  /**
   * @description Custom confirmation message.
   * @summary Overrides the localized default message when provided.
   * @type {string | undefined}
   */
  @Input()
  message?: string;

  /**
   * @description Enables alert-style confirmation behavior.
   * @summary When true, the modal is styled and configured as an alert confirmation.
   * @type {boolean}
   * @default false
   */
  @Input()
  alert: boolean = false;

  /**
   * @description Controls the visibility of the modal cancel button.
   * @summary When true, the cancel button renders in the header; when false, it is omitted.
   * @type {boolean}
   * @default true
   */
  @Input()
  showCancelButton: boolean = true;

  /**
   * @description Controls the visibility of the modal confirm button.
   * @summary When true, the confirm button renders in the header; when false, it is omitted.
   * @type {boolean}
   * @default true
   */
  @Input()
  showConfirmButton: boolean = true;

  /**
   * @description Controls whether the confirm code input is required.
   * @summary When true, the confirm code input is required; when false, it is omitted.
   * @type {boolean}
   * @default true
   */
  @Input()
  requireConfirmCode: boolean = false;

  /**
   * @description Code used to allow submission of the modal.
   * @summary When provided, the modal is submitted when the code matches the confirm code.
   * @type {string}
   */
  confirmCode: string = generateRandomValue(6).toLowerCase();

  /**
   * @description Allows the submission of the modal.
   * @summary When true, the submit button is enabled; when false, it is disabled.
   * @type {boolean}
   * @default true
   */
  allowSubmit: boolean = false;

  /**
   * @description Initializes the confirmation modal content.
   * @summary Resolves localized title and message text from the current role and injected data, then prepares the base modal.
   *
   * @returns {Promise<void>} - A promise that resolves when initialization is complete.
   */
  override async ngOnInit(): Promise<void> {
    const { uid, item, pk } = this.data || {};
    const role = this.role || OperationKeys.DELETE;
    if (this.requireConfirmCode) {
      this.confirmCode = generateRandomValue(6).toLowerCase();
      this.showConfirmButton = true;
      this.allowSubmit = false;
    }
    this.changeDetectorRef.detectChanges();

    // if (!this.title) {
    //   this.title = await this.translate(`${this.locale}.confirm.operations.${role}.title`, {
    //     '0': item,
    //   });
    //   this.translatable = false;
    // }
    if (!this.message) {
      this.message = (await this.translate(`${this.locale}.confirm.operations.${role}.message`, {
        '0': uid,
        '1': item,
        '2': pk,
      })) as string;
      this.translatable = false;
    }
    this.changeDetectorRef.detectChanges();
    await this.initialize();
  }

  /**
   * @description Handles the confirmation modal action.
   * @summary Confirms the modal when requested and passes the selected payload, otherwise cancels the modal.
   *
   * @param {string} - The action to perform.
   * @returns {Promise<void>} - A promise that resolves when the action completes.
   */
  async handleAction(role: 'confirm' | 'cancel' = 'confirm'): Promise<void> {
    if (role === ActionRoles.confirm)
      return await this.confirm({
        name: 'ModalConfirmComponent',
        data: {
          role,
          data: this.data,
        },
      });
    return await this.cancel();
  }

  handleConfirmInputChanges(event: Event) {
    const value = (event?.target as HTMLInputElement)?.value;
    this.allowSubmit = value === this.confirmCode;
    this.changeDetectorRef.detectChanges();
  }
}

/**
 * @description Presents a standard confirmation modal.
 * @summary Opens the confirmation modal with transparent header styling and a hidden close button.
 *
 * @param {ModalConfirmProps} props - Properties used to initialize the confirmation modal.
 * @param {ActionRole} role - The dismiss role applied to the modal.
 * @param {EnvironmentInjector} injector - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves with the presented modal instance.
 */
export async function presentModalConfirm(
  props: Partial<ModalConfirmComponent> = {},
  role: ActionRole = ActionRoles.confirm,
  injector?: EnvironmentInjector
): Promise<IonModal> {
  return await getNgxModalComponent(
    {
      tag: 'ngx-decaf-modal-confirm',
      headerTransparent: true,
      className: `dcf-modal-confirm dcf-${role}`,
      globals: Object.assign({}, { role }, props, { alert: false }),
    },
    {},
    injector
  );
}

/**
 * @description Presents an alert-style confirmation modal.
 * @summary Opens the confirmation modal with alert styling and a visible close button.
 *
 * @param {Partial<ModalConfirmComponent>} props - Properties used to initialize the alert modal.
 * @param {ActionRole} role - The dismiss role applied to the modal.
 * @param {EnvironmentInjector} injector - Optional environment injector for dependency injection.
 * @returns {Promise<IonModal>} - A promise that resolves with the presented modal instance.
 */
export async function presentModalAlert(
  props: Partial<ModalConfirmComponent> = {},
  role: ActionRole = ActionRoles.close,
  injector?: EnvironmentInjector
): Promise<IonModal> {
  return await getNgxModalComponent(
    {
      tag: 'ngx-decaf-modal-confirm',
      headerTransparent: true,
      className: `dcf-modal-confirm dcf-modal-alert dcf-${role}`,
      showCloseButton: true,
      globals: Object.assign({}, { role }, props, { alert: true }),
    },
    {},
    injector
  );
}
