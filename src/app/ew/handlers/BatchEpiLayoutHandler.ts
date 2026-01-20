import { AttributeOption, Condition } from '@decaf-ts/core';
import { Metadata, Constructor } from '@decaf-ts/decoration';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { DecafRepository, NgxEventHandler } from 'src/lib/engine';
import { getMode } from 'ionicons/dist/types/stencil-public-runtime';
import { Batch } from '../fabric';
import { getModelAndRepository } from 'src/lib/engine/helpers';

export class BatchEpiLayoutHandler extends NgxEventHandler {
  title!: string;
  condition!: AttributeOption<Model>;
  override async render(): Promise<void> {
    // const relation = 'batchNumber' as keyof Model;
    // const modelName = this.model?.constructor.name;
    // this.title = `batch.${this.operation}`;
    // this.condition = Condition.attribute(relation);
    // const batchId = this.modelId;
    // if(modelName && modelName !== 'Batch') {
    //   const repo = getModelAndRepository('Batch');
    //   this.pk = relation as string;
    //   if(repo) {
    //     const {repository} = repo;
    //     const batch = await repository.read(batchId as string) as Batch;
    //     if(batch) {
    //       this.modelId = batch.batchNumber;
    //       this.changeDetectorRef.detectChanges();
    //       await this.refresh();
    //     }
    //   }
    // }
  }
}
