
import { IRepository, OperationKeys } from "@decaf-ts/db-decorators";
import { Model } from "@decaf-ts/decorator-validation";
import {
  NgxEventHandler,
  ICrudFormEvent,
  KeyValue,
  DecafRepository,
  NgxComponentDirective,
  ActionRoles,
  ComponentEventNames,
  FormParent,
} from "src/lib/engine";
import { getModelAndRepository } from "src/lib/engine/helpers";
import { getNgxToastComponent } from "src/app/utils/NgxToastComponent";
import { getNgxModalComponent } from "src/lib/components/modal/modal.component";


type LayoutModelContext = Record<string, {model: Model | Model[], repository: IRepository<Model>, pk: string}>;
export class ProductLayoutHandler extends NgxEventHandler {

  formGroup!: FormParent;

  override async handle(event: ICrudFormEvent, modelName = 'Product', pk?: keyof Model): Promise<void> {
    const {name} = event;

    if(name === ComponentEventNames.CLICK) {
      if(modelName === 'Batch' && this.operation === OperationKeys.CREATE) {
        const {data} = event;
        if((data as string)?.[0]) {
          const batchNumber = (data as string)[0];
          const param = `${batchNumber ? `?batchId=${batchNumber}` : ''}`;
          return await this.router.navigateByUrl(`/leaflets/create${param}`);
        }
      }
      return;
    }


    if(name === ComponentEventNames.FORM_GROUP_LOADED) {
      this.formGroup = event.data as FormParent;
      return;
    }

    let allowSubmit = true;
    let success = false;
    const models = await this.process(event, this.model as Model, false) as LayoutModelContext;
    const repo = getModelAndRepository(modelName);

    if(repo) {
      const {repository, model, pk} = repo;
      const data = {} as KeyValue;
      for(const key of Object.keys(models)) {
        if(key === model.constructor.name.toLowerCase()) {
          Object.assign(data, models[key].model);
        } else {
          data[key] = models[key].model;
        }
      }
      if(this.operation === OperationKeys.UPDATE) {
        const diffs = await ProductLayoutHandler.beforeSave(
          repository,
          Model.build(data, model.constructor.name),
          models,
          pk,
         );
        if(diffs) {
          const locale = modelName.toLowerCase();
          const modal = await getNgxModalComponent({
            tag: 'app-modal-diffs',
            expandable: true,
            title: `${modelName.toLowerCase()}.diffs.title`,
            //  headerTransparent: true,
            globals: {
              diffs,
              locale
            }
          });
          await modal.present();
          const {role} = await modal.onDidDismiss();
          allowSubmit = role === ActionRoles.confirm;
        }
      }

      if(allowSubmit) {
        const data = {} as KeyValue;
        for(const key of Object.keys(models)) {
          if(key === model.constructor.name.toLowerCase()) {
            Object.assign(data, models[key].model);
          } else {
            const childPk = models[key].pk;
            data[key] = ((models[key].model || []) as KeyValue[]).map((m: KeyValue) => {
              if(m[childPk] === undefined || !m[childPk])
                delete m[childPk];
              return {...m, ...{[pk]: data[pk]}};
            });
          }
        }
        success = await ProductLayoutHandler.submit(
          repository,
          Model.build(data, model.constructor.name),
          this.operation as OperationKeys
        );
        if(success)
          this.location.back();
        const options = {
          color: success ? 'dark' : 'danger',
          message: await this.translate(`operations.multiple.${success ? 'success' : 'error'}`)
        };
        const toast = getNgxToastComponent(options);
        await toast.show(options);
      }
    }
  }

  static async beforeSave<M extends Model>(repository: IRepository<M>, data: M, models: LayoutModelContext, pk: string,): Promise<KeyValue | undefined> {
    const skip = [pk, 'strengths', 'markets', 'id', 'updatedAt', 'updatedBy', 'version', 'createdBy', 'createdAt'] as (keyof M)[];
    const oldData = await repository.read((data as KeyValue)[pk]) as M;
    const modelDiffs = data.compare(
      oldData,
      ... (skip)
    );
    const filterDiffs = {} as KeyValue;
    for(const [key, value] of Object.entries(modelDiffs || {})) {
      const {other, current} = Array.isArray(value) ? value[0] : value;
      if(Array.isArray(other)) {
        if(!other.length && current === undefined)
          continue;
      } else {
        if(Array.isArray(current)) {
          if(current.length === Number(other))
            continue;
        }
      }
      if(Array.isArray(current) && Array.isArray(other) && other.length) {
        filterDiffs[key] = {other: '', current: current.slice(other.length)};
        continue;
      }
      filterDiffs[key] = value;
    }
    return Object.keys(filterDiffs as KeyValue).length ? filterDiffs : undefined;
  }

  static async submit(repository: IRepository<Model>, model: Model, operation: OperationKeys): Promise<boolean> {
    let success = false;
    try {
      if (model) {
        let result;
        switch (operation) {
          case OperationKeys.CREATE:
            result = await repository.create(model);
            break;
          case OperationKeys.UPDATE: {
            result = await repository.update(model)
            break;
          }
          // case OperationKeys.DELETE:
          // result = await (!Array.isArray(model)
          //   ? repository.delete(model as string | number)
          //   : repository.deleteAll(model as string[] | number[]));
          // break;
        }
        success = result ? true : false;
      }
    } catch (error: unknown) {
      console.error(
        `Error during ${operation} operation: ${
          error instanceof Error ? error.message : (error as string)
        }`
      );
    }
    return success
  }
}
