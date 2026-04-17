import { OperationKeys } from '@decaf-ts/db-decorators';
import { list, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import {
  ComponentEventNames,
  hidden,
  hideOn,
  HTML5InputTypes,
  uielement,
  uihandlers,
  uilayout,
  uilayoutprop,
  uimodel,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { KeyValue, NgxComponentDirective } from 'src/lib/engine';
import { ICrudFormEvent } from 'src/lib/engine/interfaces';
import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';

const commonProps = {
  borders: false,
  required: true,
  ordenable: false,
  editable: false,
  multiple: false,
};

enum AccountType {
  MAH = 'mah',
  DISTRIBUTOR = 'distributor',
  AUTHORITY = 'authority',
}

class OrganizationEnrollHandler extends NgxEventHandler {
  // static storage: Storage = sessionStorage;
  // static data: AccountModel;
  //  async render(instance: NgxComponentDirective, prop: string): Promise<void> {
  //   console.log(instance.model);
  //   if (!OrganizationEnrollHandler.data) {
  //     OrganizationEnrollHandler.data = JSON.parse(
  //       OrganizationEnrollHandler.storage.getItem(SessionKeys.enrollData) || '{}'
  //     ) as AccountModel;
  //   }
  //   // if (instance.model) {
  //   //   const data = OrganizationEnrollHandler.storage.getItem(SessionKeys.enrollData);
  //   //   if (data) {
  //   //     console.log(JSON.parse(data));
  //   //     instance.model = undefined;
  //   //     instance.model = Model.build(JSON.parse(data), AccountModel.name);
  //   //     instance['changeDetectorRef'].detectChanges();
  //   //   }
  //   // }
  //   if (prop) {
  //     (instance.formGroup as any)[prop].setValue(OrganizationEnrollHandler.data[prop as keyof AccountModel]);
  //   }
  // }
  // /**
  //  * @description Handles the login event
  //  * @summary This method extracts the username and password from the event data
  //  * and checks if both are truthy values. It returns true if both username and
  //  * password are present, false otherwise.
  //  * @param {ICrudFormEvent} event - The event object containing login data
  //  * @return {Promise<boolean>} A promise that resolves to true if login is valid, false otherwise
  //  */
  override async handle(event: ICrudFormEvent): Promise<void> {
    const { active } = event.data as KeyValue;
    //TODO: make request to activate organization
  }
}

// KeycloakClientRoleConfig
@model()
@uimodel('ngx-decaf-crud-form', { multiple: false })
export class KeycloakClientRole extends Model {
  // @pk()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.keyCloack.roleName.label',
    placeholder: 'admin.enroll.keyCloack.roleName.placeholder',
  })
  @required()
  @uilayoutprop(1)
  roleName!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.keyCloack.claimValue.label',
    placeholder: 'admin.enroll.keyCloack.claimValue.placeholder',
  })
  @required()
  @uilayoutprop(1)
  claimValue!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'keyCloack.description.label',
  //   placeholder: 'keyCloack.description.placeholder',
  // })
  // @required()
  // @uilayoutprop(1)
  // description!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<KeycloakClientRole>) {
    super(model);
  }
}

// @table(TableNames.Account)
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@uihandlers({
  [ComponentEventNames.Submit]: OrganizationEnrollHandler,
})
@model()
export class AccountModel extends Model {
  @hidden()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.id.label',
    readonly: true,
  })
  @hideOn(OperationKeys.CREATE)
  id!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'admin.accounts.legalName.label',
  //   placeholder: 'admin.accounts.legalName.placeholder',
  //   // readonly: true,
  // })
  // @uitablecol(0)
  // legalName!: string;

  // @required()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'admin.accounts.orgName.label',
  //   placeholder: 'admin.accounts.orgName.placeholder',
  // })
  // @uitablecol(1)
  // orgName!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.mspid.label',
    placeholder: 'admin.accounts.mspid.placeholder',
    type: HTML5InputTypes.TEXTAREA,
    readonly: true,
  })
  @uitablecol(2)
  @hideOn(OperationKeys.CREATE)
  mspId!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.endpoint.label',
    placeholder: 'admin.accounts.endpoint.placeholder',
  })
  @uitablecol(4)
  endpoint!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.backendEndpoint.label',
    placeholder: 'admin.accounts.backendEndpoint.placeholder',
  })
  @uitablecol(5)
  backendEndpoint!: string;

  // portBase: number = 82;

  // TODO: pensar em como relacionar num modelo,
  @list(String)
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.modules.label',
    placeholder: 'admin.enroll.modules.placeholder',
    options: () => {
      return ['Epi'].map((s) => ({
        text: `admin.enroll.modules.options.${s.toLowerCase()}`,
        value: s,
      }));
    },
    // multiple: true,
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop('full')
  modules!: string[]; // epi

  @list(String)
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.features.epi.label',
    placeholder: 'admin.enroll.features.epi.placeholder',
    options: () => {
      return ['recall', 'expiry'].map((s) => ({
        text: `admin.enroll.features.epi.options.${s.toLowerCase()}`,
        value: s,
      }));
    },
    multiple: true,
    type: HTML5InputTypes.RADIO,
  })
  @uilayoutprop('full')
  features!: string[]; // epi

  // @uichild(
  //   KeycloakClientRole.name,
  //   'ngx-decaf-fieldset',
  //   {
  //     title: 'admin.enroll.epiAdmin.label',
  //     showTitle: false,
  //     ...commonProps,
  //     name: 'epiAdmin',
  //   },
  //   true
  // )
  // epiAdmin?: KeycloakClientRole;

  // @uichild(
  //   KeycloakClientRole.name,
  //   'ngx-decaf-fieldset',
  //   {
  //     title: 'admin.enroll.epiWriter.label',
  //     showTitle: false,
  //     ...commonProps,
  //     name: 'epiWriter',
  //   },
  //   true
  // )
  // epiWriter?: KeycloakClientRole;

  // @uichild(
  //   KeycloakClientRole.name,
  //   'ngx-decaf-fieldset',
  //   {
  //     title: 'admin.enroll.epiReader.label',
  //     showTitle: false,
  //     ...commonProps,
  //     name: 'epiReader',
  //   },
  //   true
  // )
  // epiReader?: KeycloakClientRole;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'admin.enroll.classification.label',
  //   placeholder: 'admin.enroll.classification.placeholder',
  //   readonly: true,
  // })
  // @hideOn(OperationKeys.CREATE)
  // token!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'admin.enroll.classification.label',
  //   placeholder: 'admin.enroll.classification.placeholder',
  //   readonly: true,
  // })
  // @uiorder(UIKeys.LAST)
  // classification: AccountType = AccountType.MAH;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'admin.enroll.onPrem.label',
  //   placeholder: 'admin.enroll.onPrem.placeholder',
  //   type: HTML5InputTypes.CHECKBOX,
  //   readonly: true,
  // })
  // @uiorder(UIKeys.LAST)
  // @uitablecol(3, async (instance: NgxComponentDirective) => {
  //   const account = instance.model as AccountModel;
  //   if (account) {
  //     return await instance.translateService.instant(
  //       `${instance.locale}.onPrem.options.${account.onPrem ? 'yes' : 'no'}`
  //     );
  //   }
  // })
  // onPrem: boolean = false;

  @uitablecol(6, async (instance: NgxComponentDirective) => {
    const account = instance.model as AccountModel;
    if (account) {
      return await instance.translateService.instant(
        `${instance.locale}.claimed.options.${account.claimed ? 'yes' : 'no'}`
      );
    }
  })
  claimed: boolean = false;

  @uitablecol(7)
  createdAt!: Date;

  constructor(args: ModelArg<AccountModel> = {}) {
    super(args);
  }
}
