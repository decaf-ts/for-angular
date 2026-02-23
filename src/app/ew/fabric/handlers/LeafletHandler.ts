import { Router } from '@angular/router';
import { Condition } from '@decaf-ts/core';
import { composedFromCreateUpdate, ComposedFromMetadata, OperationKeys, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { DecafComponent } from '@decaf-ts/ui-decorators';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { DecafRepository, InputOption, NgxEventHandler } from 'src/lib/engine';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { Leaflet } from '../Leaflet';
import { Product } from '../Product';

import { TableComponent } from 'src/lib/components';
import { getLeafletLanguages, getMarkets } from '../../utils/helpers';
import { LeafletFile } from '../LeafletFile';

export class LeafletHandler extends NgxEventHandler {
  override model!: Model;

  private static product?: Product;

  private static languages: InputOption[] = getLeafletLanguages();

  private static markets: InputOption[] = getMarkets();

  override async render(instance: TableComponent, prop: string, value: string): Promise<string | void> {
    const { operation, type } = instance;
    // if (!instance._query?.length) {
    //   instance._query = await ProductHandler.query();
    // }
    if (prop === 'batchNumber' && value) {
      if (instance?.headers)
        instance.headers = instance.headers.map((header) => (header === 'batchNumber' ? 'batchCol' : header));
      if (!operation) {
        return value;
      }
      // falback to list item position if operation is paginated or infinite and value is not mapped to avoid empty column
      return 'info';

      // if (!operation) {
      //   if (prop === 'lang' && value) {
      //     instance.value = getLeafletLanguages().find((item) => value === item.value)?.text;
      //   }
      // }
    }
  }

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
        const model = Model.build(data as Model, this.model.constructor.name) as Leaflet;
        const composedMetadata = Model.composed(model as Model, pk as any);
        composedFromCreateUpdate.call(
          this as any,
          new Leaflet(),
          composedMetadata as ComposedFromMetadata,
          pk as keyof Model,
          model as Model
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
                result = await LeafletHandler.parseFileContent(Object.assign(query[0], data), repository);
                result = await repository.update(result);
              } else {
                result = await LeafletHandler.parseFileContent(model as Model, repository);
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

  // static async beforeSave<M extends Leaflet>(data: M, repository: DecafRepository<M>): Promise<M> {
  //   return await LeafletHandler.parseFileContent<M>(data, repository);
  // }

  static async parseFileContent(data: Partial<Leaflet>, repository: DecafRepository<Model>): Promise<Leaflet> {
    const { xmlFileContent } = data;
    data.otherFilesContent = [];
    const leafletId = data.id;
    function buildFileContent(fileName: string, fileContent: string): LeafletFile {
      const now = new Date();
      const file = Model.build(
        {
          leafletId,
          fileName,
          fileContent,

          id: `${leafletId}:${fileName}`,
          createdAt: now,
          updatedAt: now,
        },
        LeafletFile.name
      ) as LeafletFile;

      return file;
    }
    if (xmlFileContent) {
      const arrayFiles = JSON.parse(xmlFileContent as string) as { name: string; source: string }[];
      for (const file of arrayFiles) {
        const isXmlFile = file.name.toLowerCase().endsWith('.xml');
        const fileContent = buildFileContent(file.name, file.source);
        if (isXmlFile) {
          data.xmlFileContent = fileContent;
        } else {
          data.otherFilesContent.push(fileContent);
        }
      }
    }
    return data as Leaflet;
  }

  static async getLanguage(
    instance: DecafComponent<Model> & { type: 'infinite' | 'paginated' },
    lang: string
  ): Promise<string> {
    if (instance.operation && ['paginated', 'infinite'].includes(instance.type)) {
      return 'subinfo';
    }
    return getLeafletLanguages().find((item) => lang === item.value)?.text || '';
  }

  static async getMarket(instance: DecafComponent<Model>, market: string): Promise<string | void> {
    return getMarkets().find((item) => market === item.value)?.text || '';
  }
}
