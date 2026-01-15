import {
  Model,
  type,
} from "@decaf-ts/decorator-validation";
import { apply, metadata } from "@decaf-ts/decoration";
import {
  afterCreate,
  afterDelete,
  afterUpdate,
  generated,
  IRepository,
  onCreate,
  onUpdate,
  OperationKeys,
} from "@decaf-ts/db-decorators";
import { ContextOf, Repository, UnsupportedError, UUID } from "@decaf-ts/core";
import { Audit } from "./Audit";
import { TableNames } from "./constants";
import { Entity } from "./Entity";
import { GtinOwner } from "./GtinOwner";

import { toDiffs } from "./helpers/comparison";

export async function createAuditHandler<
  M extends Model,
  R extends Repository<M, any>,
  V,
>(this: R, context: ContextOf<R>, data: V, key: keyof M, model: M): Promise<void> {
  const repo = Repository.forModel(Audit);
  const id = UUID.instance.generate();
  const toCreate = new Audit({
    userGroup: id,
    userId: id,
    action: OperationKeys.CREATE,
    transaction: id,
    diffs: toDiffs(new this.class().compare(model)),
  });

  const audit = await repo.create(toCreate, context);
  context.logger.info(
    `Audit log for ${OperationKeys.CREATE} of ${Model.tableName(this.class)} created: ${audit.id}: ${JSON.stringify(audit, undefined, 2)}`
  );
}

export async function updateAuditHandler<
  M extends Model,
  R extends IRepository<M, any>,
  V,
>(
  this: R,
  context: any,
  data: V,
  key: keyof M,
  model: M,
  oldModel: M
): Promise<void> {
  const id = UUID.instance.generate();

  const toCreate = new Audit({
    userGroup: id,
    userId: id,
    transaction: id,
    action: OperationKeys.UPDATE,
    diffs: toDiffs(model.compare(oldModel)),
  });

  const repo = Repository.forModel(Audit);
  const audit = await repo.create(toCreate, context);
  context.logger.info(
    `Audit log for ${OperationKeys.UPDATE} of ${Model.tableName(this.class)} created: ${JSON.stringify(audit, undefined, 2)}`
  );
}

export async function deleteAuditHandler<
  M extends Model,
  R extends IRepository<M, any>,
  V,
>(this: R, context: any, data: V, key: keyof M, model: M): Promise<void> {
  const id = UUID.instance.generate();

  const toCreate = new Audit({
    userGroup: id,
    userId: id,
    transaction: id,
    action: OperationKeys.DELETE,
    diffs: toDiffs(model.compare(new this.class())),
  });

  const repo = Repository.forModel(Audit);
  const audit = await repo.create(toCreate, context);
  context.logger.info(
    `Audit log for ${OperationKeys.DELETE} of ${Model.tableName(this.class)} created: ${JSON.stringify(audit, undefined, 2)}`
  );
}

export function audit() {
  return apply(
    afterCreate(createAuditHandler as any, {}),
    afterUpdate(updateAuditHandler as any, {}),
    afterDelete(deleteAuditHandler as any, {}),
    metadata(TableNames.Audit, true)
  );
}

export async function createUuidHandler<
  M extends Model,
  R extends Repository<M, any>,
  V,
>(this: R, context: any, data: V, key: keyof M, model: M): Promise<void> {
  model[key] = UUID.instance.generate() as any;
}

export function uuid(update: boolean = false) {
  const decs: any[] = [
    generated("uuid"),
    type([String]),
    onCreate(createUuidHandler as any, {}),
  ];
  if (update) decs.push(onUpdate(createUuidHandler as any, {}));
  return apply(...decs);
}
