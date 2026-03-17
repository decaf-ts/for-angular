import { Router } from '@angular/router';
import { Condition, OrderDirection } from '@decaf-ts/core';
import { composedFromCreateUpdate, ComposedFromMetadata, OperationKeys, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { DecafRepository, IFilterQuery, NgxEventHandler, SelectOption } from 'src/lib/engine';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { Leaflet } from '../Leaflet';

import { ComponentEventNames, uihandlers, uitablecol } from '@decaf-ts/ui-decorators';
import { getNgxLoadingComponent } from 'src/app/utils/NgxLoadingController';
import { FileUploadComponent, ListComponent, TableComponent } from 'src/lib/components';
import { getDoucumentOptions, getLanguageOptions, getMarketOptions } from '../../utils/helpers';
import { LeafletFile } from '../LeafletFile';

export function getLeafletEpiProps(filterBy: 'productCode' | 'batchNumber' = 'productCode') {
  return {
    showSearchbar: false,
    title: 'Documents',
    operation: OperationKeys.READ,
    operations: [OperationKeys.READ],
    showRefresher: false,
    readonly: true,
    route: 'leaflets',
    icon: 'ti-file-barcode',
    model: getLeafletModel(),
    filterBy,
    propsMapperFn: {
      mapper: (instance: ListComponent) => {
        const { operation } = instance;
        if ([OperationKeys.READ, OperationKeys.DELETE].includes(operation as OperationKeys)) {
          return {
            description: 'leafletType',
            title: 'lang',
            info: 'batchNumber',
          };
        }
      },
    },
    // empty: {
    //   link: async function <T extends DecafComponent<Model>>() {
    //     const component = this as unknown as T;
    //     const operation = component.operation as OperationKeys;
    //     const param = `${component.modelId ? `?${filterBy}=${component.modelId}` : ''}`;
    //     alert(param);
    //     await component.router.navigateByUrl(
    //       !param ? `/leaflets` : `/leaflets/${operation}${param}`,
    //     );
    //   },
    // },
  };
}

export function getLeafletModel(): Leaflet {
  const model = new Leaflet();
  uihandlers({
    [ComponentEventNames.Submit]: LeafletHandler,
    [ComponentEventNames.Render]: LeafletHandler,
  })(Leaflet);

  uitablecol(1)(Leaflet, 'batchNumber');
  uitablecol(2, async (instance: ListComponent, prop: keyof Leaflet, value: string) => {
    return LeafletHandler.getDocumentType(instance, prop, value);
  })(Leaflet, 'leafletType');

  uitablecol(3, async (instance: ListComponent, prop: keyof Leaflet, value: string) => {
    return LeafletHandler.getLanguage(instance, prop, value);
  })(Leaflet, 'lang');

  uitablecol(4, async (instance: ListComponent, prop: keyof Leaflet, value: string) => {
    return LeafletHandler.getMarket(instance, prop, value);
  })(Leaflet, 'epiMarket');

  // Set onclick handler for diffs column to open a modal with the diffs content
  // uionclick(() => AuditHandler)(Audit, 'diffs');
  // // overrides diffs prop, to show a "View Diffs"
  // uitablecol(4, async (instance: DecafComponentConstructor, propName: string, value: string) => {
  //   const phrase = await instance.translate('audit.view_diffs');
  //   if (value?.length) {
  //     const diffs = filterDiffs(value);
  //     if (Object.keys(diffs).length) {
  //       value = JSON.stringify(diffs);
  //       return phrase;
  //     }
  //   }
  //   return '';
  // })(Audit, 'diffs');
  return model;
}

export class LeafletHandler extends NgxEventHandler {
  static model: Leaflet;

  override async render(instance: TableComponent, prop: string, value: string): Promise<string | void> {
    const { operation, type } = instance;

    if ((instance.model as Leaflet)?.xmlFileContent) {
      LeafletHandler.model = instance.model as Leaflet;
    }

    if (prop === 'Leaflet') {
      let modelId = instance.modelId as string | null;
      if (instance.filterBy === 'batchNumber' && modelId) {
        modelId = modelId.split(':')[1] as string;
      }
      instance.searchValue = LeafletHandler.getSearchOptions(instance.filterBy, modelId as string | null, 'Equal');
    }
    if (prop === 'leafletType') {
      // console.log(prop);
    }

    if (prop === 'xmlFileContent') {
      await LeafletHandler.getDocumentFiles(instance as unknown as FileUploadComponent);
    }

    if (prop === 'batchNumber' && value) {
      if (instance?.headers)
        instance.headers = instance.headers.map((header) => (header === 'batchNumber' ? 'batchCol' : header));
      if (!operation) {
        return value;
      }
      // falback to list item position if has type is paginated or infinite and value is not mapped to avoid empty column
      return 'info';

      // if (!operation) {
      //   if (prop === 'lang' && value) {
      //     instance.value = getLanguageOptions().find((item) => value === item.value)?.text;
      //   }
      // }
    }
  }

  override async handle<Leaflet>(event: { data: Leaflet }): Promise<void> {
    const repo = getModelAndRepository(this.model as Model);
    const { data } = event;
    const loading = getNgxLoadingComponent();
    const phrase = await this.translate('operations.processing', { '0': '' });
    let operation = this.operation;
    let success = false;
    let result = null;
    let uid = this.modelId;
    if (repo) {
      await loading.show(phrase);
      try {
        const { repository, pk, pkType } = repo;
        const model = Model.build(data as Partial<Leaflet>, Leaflet.name) as Leaflet;
        const composedMetadata = Model.composed(model as Model, pk as keyof Model);
        composedFromCreateUpdate.call(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                result = await repository.create(result);
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
      await (this.router as Router).navigateByUrl('/leaflets', {
        onSameUrlNavigation: 'reload',
      });
    }
    if (loading.isVisible()) {
      await loading.remove();
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

  static async getDocumentFiles(instance: FileUploadComponent): Promise<void> {
    const model = this.model;
    if (model) {
      const { otherFilesContent, xmlFileContent } = model || [];
      // const arrayFiles = [xmlFileContent as string, ...((otherFilesContent as unknown as string[]) || [])];
      const arrayFiles = [xmlFileContent as string];
      const { repository } = getModelAndRepository('LeafletFile') || {};
      const files = [];
      if (repository) {
        for (const f of arrayFiles) {
          const file = (await repository.read(
            `${encodeURIComponent(instance.modelId as string)}/${f.split(':').pop() as string}`
          )) as LeafletFile;
          if (file) {
            files.push(file.fileContent);
          }
        }
      }
      if (files?.length) {
        instance.files = [];
        instance.setValue(files);
        instance.parseValue();
      }
    }
  }

  static async parseFileContent(data: Partial<Leaflet>, repository: DecafRepository<Model>): Promise<Leaflet> {
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
    return data as Leaflet;
  }

  static async getDocumentType(
    instance: ListComponent,
    prop: string = 'eleafletTypet',
    value: string
  ): Promise<string> {
    const { operation } = instance;
    if (!operation) {
      return getDoucumentOptions().find((item) => value === item.value)?.text || '';
    }
    return 'subinfo';
  }

  static async getLanguage(instance: ListComponent, prop: string = 'lang', value: string): Promise<string> {
    const { operation } = instance;
    if (!operation) {
      return getLanguageOptions().find((item: SelectOption) => value === item.value)?.text || '';
    }
    return 'subinfo';
  }

  static async getMarket(instance: ListComponent, prop: string = 'epiMarket', value: string): Promise<string | void> {
    return getMarketOptions().find((item: SelectOption) => value === item.value)?.text || '';
  }

  static getSearchOptions(filter: string, value: string | null, condition: string): IFilterQuery {
    return {
      query: [
        {
          index: filter as string,
          condition,
          value,
        },
      ],
      sort: {
        value: filter,
        direction: OrderDirection.ASC,
      },
    };
  }
}
