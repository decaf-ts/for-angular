import {model, type ModelArg} from "@decaf-ts/decorator-validation";
import {BaseModel, pk} from "@decaf-ts/core";
import { uielement, uilayout, uilistmodel, uiprop, uitablecol } from "@decaf-ts/ui-decorators";
import {description} from "@decaf-ts/decoration";

export enum UserGroup {
  ADMIN = "admin",
  READ = "read",
  WRITE = "write",
};

export enum AuditOperations {
  REMOVE = "Remove user",
  ADD = "Add user",
  DEACTIVATE = "Deactivate user",
  LOGIN = "Access wallet",
  SHARED_ENCLAVE_CREATE = "Create identity",
  BREAK_GLASS_RECOVERY = "Wallet recovered with the break Glass Recovery Code",
  AUTHORIZE = "Authorize integration user",
  REVOKE = "Revoke integration user",
  DATA_RECOVERY = "Use of the Data Recovery Key",
  RECOVERY_KEY_COPIED = "Copy Data Recovery Key",
  USER_ACCESS = "User access"
};

@uilistmodel('ngx-decaf-list-item', {icon: 'ti-shield-plus'})
@uilayout('ngx-decaf-crud-form', true)
@model()
export class Audit extends BaseModel {

    @pk({ type: String, generated: false })
    @description("Unique identifier of the audit record.")
    id!: string;

    @uielement('')
    @uitablecol(0)
    userId!: string;

    @uiprop()
    @uitablecol(1)
    userDID!: string;

    @uiprop()
    @uitablecol(2)
    userGroup!: UserGroup;

    @uiprop()
    @uitablecol(3)
    transaction!: string;

    @uiprop()
    @uitablecol(4)
    action!: AuditOperations;

    @uiprop()
    @uitablecol(5)
    diffs?: Record<string, unknown>;

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(model?: ModelArg<Audit>) {
        super(model);
    }
}
