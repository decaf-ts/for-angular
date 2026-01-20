import {
  composedFromCreateUpdate,
  ComposedFromMetadata,
  IRepository,
  OperationKeys,
  PrimaryKeyType,
} from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { NgxEventHandler } from 'src/lib/engine';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { Leaflet } from '../fabric';
import { Condition } from '@decaf-ts/core';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { Router } from '@angular/router';

export class LeafletHandler extends NgxEventHandler {
  override model!: Model;

  override async handle<Leaflet>(event: { data: Leaflet }): Promise<void> {
    const repo = getModelAndRepository(this.model as Model);
    let operation = this.operation;
    const { data } = event;
    let success = false;
    let result = null;
    let uid = this.modelId;
    if (repo) {
      try {
        const { repository, pk, pkType } = repo;
        const model = Model.build(data as Partial<Leaflet>, this.model.constructor.name) as Leaflet;
        const composedMetadata = Model.composed(model as Model, pk as any);
        const { args, filterEmpty, separator } = composedMetadata as ComposedFromMetadata;
        composedFromCreateUpdate.call(
          this as any,
          new Leaflet(),
          composedMetadata as ComposedFromMetadata,
          pk as keyof Model,
          model as Model,
        );
        uid = model[pk as keyof Leaflet] as PrimaryKeyType;

        switch (operation) {
          case OperationKeys.CREATE:
            {
              const query = await repository
                .select()
                .where(Condition.attr(pk as keyof Model).eq(uid))
                .execute();
              if (query?.length) {
                operation = OperationKeys.UPDATE;
                result = await repository.update(Object.assign(query[0], data) as Model);
              } else {
                result = await repository.create(model as Model);
              }
            }
            break;
          case OperationKeys.READ:
          case OperationKeys.DELETE:
            {
              result = await repository.delete(uid, data);
            }
            break;
        }
        if (result) success = true;
      } catch (error: unknown) {
        this.log.for(this.handle).error(`Error deleting leaflet: ${(error as Error)?.message}`);
      }
    }
    if (success) {
      //  const lastUrl =
      //   (this.router as Router).lastSuccessfulNavigation?.previousNavigation?.finalUrl ||
      //   '/leaflets';
      (this.router as Router).navigateByUrl('/leaflets', { onSameUrlNavigation: 'reload' });
    }

    const options = {
      color: success ? 'dark' : 'danger',
      message: await this.translate(`operations.${operation}.${success ? 'success' : 'error'}`, {
        '0': this.pk,
        '1': uid,
      }),
    };
    const toast = getNgxToastComponent(options);
    await toast.show(options);
  }
}
