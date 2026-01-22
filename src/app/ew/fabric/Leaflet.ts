import { Comparison, Model, type ModelArg } from '@decaf-ts/decorator-validation';
import { model, required } from '@decaf-ts/decorator-validation';
import { LeafletFile } from './LeafletFile';
// import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
// import { BatchPattern, TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import {
  Cascade,
  column,
  index,
  oneToMany,
  OrderDirection,
  pk,
  Repository,
  table,
} from '@decaf-ts/core';
import { composed, InternalError, OperationKeys, readonly } from '@decaf-ts/db-decorators';
import { description } from '@decaf-ts/decoration';
import { Cacheable } from './Cacheable';
import {
  DecafComponent,
  DecafEventHandler,
  HTML5InputTypes,
  uielement,
  uihandlers,
  uilistmodel,
  uimodel,
  uionrender,
  uitablecol,
  ComponentEventNames,
  ElementPositions,
  ElementSizes,
} from '@decaf-ts/ui-decorators';
import { Product } from './Product';
import { getDocumentTypes, getLeafletLanguages, getMarkets } from 'src/app/ew/utils/helpers';
import { Batch } from './Batch';
import { TableNames } from './constants';
import { LeafletHandler } from '../handlers/LeafletHandler';
import { audit } from './utils';

export enum LeafletType {
  // 'Patient Information'
  leaflet = 'leaflet',
  // 'Prescribing Information',
  prescribingInfo = 'prescribingInfo',
  // @deprecated
  smpc = 'smpc',
}

@description('Represents the ePI leaflet linked to a specific product, batch, and language.')
//@uses(FabricFlavour)
@table(TableNames.Leaflet)
@uilistmodel('ngx-decaf-list-item', { icon: 'ti-file-barcode' })
@uimodel('ngx-decaf-crud-form', { empty: { showButton: false } })
@uihandlers({ [ComponentEventNames.Submit]: LeafletHandler })
@model()
export class Leaflet extends Cacheable {
  @pk()
  @audit()
  @composed(['productCode', 'batchNumber', 'leafletType', 'lang', 'epiMarket'], ':', [
    'batchNumber',
    'epiMarket',
  ])
  @description('Unique identifier composed of product code, batch number, and language.')
  id!: string;

  //@gtin()
  //@cache()
  @required()
  @readonly()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('GTIN code of the product associated with this leaflet.')
  @uielement('app-select-field', {
    label: 'leaflet.productCode.label',
    placeholder: 'leaflet.productCode.placeholder',
    type: HTML5InputTypes.SELECT,
    options: () => Product,
    optionsMapper: (item: Product) => ({
      value: item.productCode,
      text: item.productCode + ' - ' + item.inventedName,
    }),
    translatable: false,
  })
  @uionrender(
    () =>
      class _ extends DecafEventHandler {
        override async render(): Promise<void> {
          const instance = this as unknown as {
            headers: string[];
            operation: OperationKeys[];
          };
          if (instance.headers)
            instance.headers = instance.headers.map((header) =>
              header === 'productCode' ? 'documentCol' : header,
            );
        }
      },
  )
  @uitablecol(
    0,
    async (value: string, instance: DecafComponent<Model> & { model: Product; type: string }) => {
      if (!instance.operation) {
        let model = instance.model;
        if (!model?.inventedName) {
          const constructor = Model.get('Product');
          if (constructor) {
            const repository = Repository.forModel(constructor);
            model = (await repository.read(model.productCode)) as Product;
          }
        }
        return `${model.inventedName || ''} ${value}`;
      } else {
        if (['paginated', 'infinite'].includes(instance.type)) value = 'title'; // fallback mapper to list item position
      }
      return value;
    },
  )
  productCode!: string;

  //@cache()
  @column()
  @readonly()
  // @pattern(BatchPattern)
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Batch number linked to the product, if applicable.')
  @uielement('app-select-field', {
    label: 'leaflet.batchNumber.label',
    placeholder: 'leaflet.batchNumber.placeholder',
    type: HTML5InputTypes.SELECT,
    translatable: false,
    optionsMapper: (item: Batch) => ({
      value: item.batchNumber,
      text: item.batchNumber,
    }),
    options: () => Batch,
  })
  @uionrender(
    () =>
      class _ extends DecafEventHandler {
        override async render(): Promise<void> {
          const instance = this as unknown as {
            headers: string[];
            operation: OperationKeys[];
          };
          if (instance.headers)
            instance.headers = instance.headers.map((header) =>
              header === 'batchNumber' ? 'batchCol' : header,
            );
        }
      },
  )
  @uitablecol(1, async (value: string, instance: DecafComponent<Model> & { type: string }) => {
    if (instance.operation && ['paginated', 'infinite'].includes(instance.type)) value = 'subinfo'; // fallback mapper to list item position
    return value;
  })
  batchNumber?: string;

  //@cache()
  @required()
  @readonly()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Type category the leaflet belongs to.')
  @uielement('app-select-field', {
    label: 'leaflet.type.label',
    placeholder: 'leaflet.type.placeholder',
    type: HTML5InputTypes.SELECT,
    translatable: false,
    startEmpty: false,
    options: getDocumentTypes(),
  })
  @uitablecol(2, async (value: string, instance: DecafComponent<Model> & { type: string }) => {
    if (instance.operation && ['paginated', 'infinite'].includes(instance.type)) value = 'info'; // fallback mapper to list item position
    return value;
  })
  leafletType: LeafletType = LeafletType.leaflet;

  //@cache()
  @column()
  @required()
  @readonly()
  // @pattern(LocaleHelper.getLanguagesRegex())
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description("Language code of the leaflet (e.g., 'en', 'pt', 'es').")
  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.lang.label',
    placeholder: 'leaflet.lang.placeholder',
    type: HTML5InputTypes.SELECT,
    value: 'en',
    options: getLeafletLanguages(),
    startEmpty: false,
    translatable: false,
  })
  @uitablecol(3, async (v: string, instance: DecafComponent<Model> & { type: string }) => {
    if (instance.operation && ['paginated', 'infinite'].includes(instance.type)) return 'subinfo';
    if (!instance.operation) return getLeafletLanguages().find(({ value }) => value === v)?.text;
    return v;
  })
  lang!: string; // TODO -> rollback to language property

  //@cache()
  @column()
  // @epiMarket()
  // @pattern(LocaleHelper.getMarketRegex()) // Just for now. The list of epiMarkets must be checked.
  @readonly()
  @uielement('app-select-field', {
    label: 'leaflet.market.label',
    placeholder: 'leaflet.market.placeholder',
    translatable: false,
    type: HTML5InputTypes.SELECT,
    options: getMarkets(),
  })
  @uitablecol(4, async (v: string, instance: DecafComponent<Model>) => {
    if (!instance.operation) return getMarkets().find(({ value }) => value === v)?.text;
    return v;
  })
  epiMarket!: string; // TODO -> Create validation decorator. CountryMarket is a CONDITIONAL property. can only exist for product only. no batch

  //@cache()
  @column()
  @required()
  @description('Main XML content of the electronic leaflet.')
  @uielement('ngx-decaf-file-upload', {
    label: 'product.xmlFileContent.label',
    placeholder: 'product.xmlFileContent.placeholder',
    enableDirectoryMode: true,
    showIcon: false,
    size: ElementSizes.small,
    position: ElementPositions.left,
    required: true,
    maxFileSize: 10,
    // previewHandler: XmlPreviewHandler,
    accept: ['image/*', '.xml'],
  })
  xmlFileContent!: string;

  //@cache()
  @oneToMany(() => LeafletFile, { update: Cascade.CASCADE, delete: Cascade.CASCADE }, false)
  @description('List of additional files linked to the leaflet, such as PDFs or images.')
  otherFilesContent!: string[] | LeafletFile[];

  constructor(model?: ModelArg<Leaflet>) {
    super(model);
  }

  override compare<M extends Model>(
    other: M,
    ...exceptions: (keyof M)[]
  ): Comparison<M> | undefined {
    return super.compare<M>(
      other as any,
      ...([
        ...new Set([
          exceptions,
          'updatedAt',
          'updatedBy',
          'otherFilesContent',
          'xmlFileContent',
        ]).values(),
      ] as any[]),
    );
  }

  override toCache<S extends boolean>(stringify?: S): S extends false ? Record<any, any> : string {
    if (this.otherFilesContent && !this.otherFilesContent.every((f) => f instanceof LeafletFile))
      throw new InternalError('otherFilesContent must be resolved before caching');
    const original = super.toCache(false);
    return (stringify ? JSON.stringify(original) : original) as any;
  }
}
