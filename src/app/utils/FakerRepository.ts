import { RamFlavour } from '@decaf-ts/core/ram';
import { uses } from '@decaf-ts/decoration';
import { Model, ModelConstructor } from '@decaf-ts/decorator-validation';
import { DecafRepository } from 'src/lib/engine/types';
import { DecafFakerRepository } from 'src/lib/utils/DecafFakerRepository';
import { DbAdapterFlavour } from '../app.config';
import { AIModel } from '../models/AIVendorModel';
import { AIFeatures } from './contants';

// ew-domain faker cases (Audit/Product/Batch/Leaflet) were removed along with the
// `src/app/ew` demo folder; this repository now only special-cases the demo models
// that still live in `src/app/models` and falls back to generic generation.

export async function populateSampleData(models: Model[], populate: string[], limit: number = 12): Promise<void> {
  if (DbAdapterFlavour === RamFlavour) {
    for (let model of models) {
      if (model instanceof Function) {
        model = new (model as unknown as ModelConstructor<Model>)();
      }
      const name = model.constructor.name.replace(/[0-9]/g, '');
      if (populate.includes(name)) {
        uses(RamFlavour)(model);
        const repository = new FakerRepository(model, limit);
        await repository.initialize();
      }
    }
  }
}

export class FakerRepository<T extends Model> extends DecafFakerRepository<T> {
  public override async initialize(): Promise<void> {
    await super.initialize();
    const repo = this._repository as DecafRepository<Model>;
    const model = this.model as Model;
    let data = await repo.select().execute();
    if (!data?.length) {
      const name = model.constructor.name;
      switch (name) {
        case AIModel.name:
          data = await this.generateData<AIModel>(AIFeatures, 'features', 'name');
          break;
        default:
          data = await this.generateData();
      }
      try {
        data = await this.repository?.createAll(data);
      } catch (error: unknown) {
        this.log
          .for(this.initialize)
          .error(
            `Error on populate ${this.model?.constructor.name}: ${(error as Error)?.message || (error as string)}`
          );
      }
    }
    this.data = data as T[];
  }
}
