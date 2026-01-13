import { BaseModel, pk, Repository } from "@decaf-ts/core";
import {  Model, model, ModelArg, required } from "@decaf-ts/decorator-validation";
import {  DecafEventHandler, hideOn, HTML5InputTypes, uielement,  uilistmodel,  uilistprop, uimodel, uionrender, uiprop, uitablecol } from "@decaf-ts/ui-decorators";
import { getDocumentTypes, getLeafletLanguages, getMarkets } from "../helpers";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { FileUploadComponent } from "src/lib/components/file-upload/file-upload.component";
import { ElementPositions, ElementSizes, KeyValue, ListItemPositions, NgxEventHandler } from "src/lib/engine";
import { OperationKeys, timestamp } from "@decaf-ts/db-decorators";
import { FormGroup } from "@angular/forms";
import { presentNgxInlineModal } from "src/lib/components";
import { Batch } from "./Batch";
import { Product } from "./Product";
import { EwMenu } from "src/app/utils/contants";
import { getMenuIcon } from "src/lib/utils/helpers";

class XmlPreviewHandler extends NgxEventHandler {

  files?: Partial<File>[] = [];

  formGroup?: FormGroup;

  override async handle(file: string): Promise<void> {

    const parseXml = (xmlString: string): string | undefined => {
      try {
        xmlString = (xmlString as string).replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '')
        const decodedString = atob(xmlString);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(decodedString, "text/xml");

        // const encoder = new TextEncoder(); // gera bytes UTF-8
        // const utf8Bytes = encoder.encode(xmlDoc.documentElement.outerHTML);
        // return new TextDecoder("utf-8").decode(utf8Bytes);

        return xmlDoc.documentElement.innerHTML;

      } catch (error: unknown) {
        this.log.error((error as Error)?.message);
        return undefined;
      }
    }
    const xml = parseXml(file);
    const product = (this.formGroup as FormGroup).root.get('product');
    const model = {} as KeyValue;
    if(product instanceof FormGroup) {
      model['inventedName'] = product.get('inventedName')?.value;
      model['nameMedicinalProduct'] = product.get('nameMedicinalProduct')?.value;
    }

    // const fragment = servico(xml , images, model);
    await presentNgxInlineModal(xml as string, {
      className: 'xml-preview-modal',
      headerTransparent: true,
    });
    // chamar serviço do Diogo
    // alert("XML Preview:\n\n" + this.value);
  }
}

@uilistmodel('ngx-decaf-list-item', {icon: getMenuIcon('Leaflets', EwMenu)})
@uimodel('ngx-decaf-crud-form', { locale: 'leaflet', cardType: 'shadow'})
@model()
export class Leaflet extends BaseModel {

  // @pk({type: String, generated: false})
  @pk({type: Number})
  @uilistprop('uid')
  // @composed(["productCode", "lang"], ":", true)
  id!: number;

  // @uiprop()
  // productCode!: string;

  @required()
  @uielement('app-select-field', {
    label: 'leaflet.productCode.label',
    placeholder: 'leaflet.productCode.placeholder',
    type: HTML5InputTypes.SELECT,
    options: () => Product,
    optionsMapper: (item: Product) => ({ value: item.productCode, text: item.productCode + ' - ' + item.inventedName }),
    translatable: false,
  } as Partial<CrudFieldComponent>)
  @uionrender(() => class _ extends DecafEventHandler {
    override async render(): Promise<void> {
      const instance = this as unknown as {headers: string[], operation: OperationKeys[]};
      if(!this.operation)
        instance.headers = instance.headers.map(header => header === 'productCode' ? 'documentName': header);
    }
  })
  @uitablecol(0, async (value: string, model: Leaflet) => {
    const constructor = Model.get('Product');
    if(constructor) {
      const repository = Repository.forModel(constructor);
      const product = await repository.read(model.productCode) as Product;
      if(product)
        value = `${product.inventedName} - ${value}`;
    }
    return value;
  })
  productCode!: string;

  @uielement('app-select-field', {
    label: 'leaflet.batchNumber.label',
    placeholder: 'leaflet.batchNumber.placeholder',
    type: HTML5InputTypes.SELECT,
    translatable: false,
    optionsMapper: (item: Batch) => ({ value: item.id, text: item.batchNumber}),
    options: () => Batch,
    disabled: true,
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.title)
  batchNumber!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.lang.label',
    placeholder: 'leaflet.lang.placeholder',
    type: HTML5InputTypes.SELECT,
    value: "en",
    options: getLeafletLanguages(),
    startEmpty: false,
    translatable: false,
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.subinfo)
  lang!: string;

  @required()
  @uielement('app-select-field', {
    label: 'leaflet.type.label',
    placeholder: 'leaflet.type.placeholder',
    type: HTML5InputTypes.SELECT,
    translatable: false,
    startEmpty: false,
    options: getDocumentTypes()
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.info)
  type!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.market.label',
    placeholder: 'leaflet.market.placeholder',
    translatable: false,
    type: HTML5InputTypes.SELECT,
    options: () => getMarkets()
  } as Partial<CrudFieldComponent>)
  market!: string;

  @uielement('ngx-decaf-file-upload', {
    label: 'product.xmlFileContent.label',
    placeholder: 'product.xmlFileContent.placeholder',
    enableDirectoryMode: true,
    showIcon: false,
    size: ElementSizes.small,
    position: ElementPositions.left,
    required: true,
    maxFileSize: 10,
    previewHandler: XmlPreviewHandler,
    accept: ['image/*', '.xml'],
  } as Partial<FileUploadComponent>)
  xmlFileContent!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'category.created.label',
    placeholder: 'category.created.placeholder',
    type: 'textarea',
  })
  @timestamp([OperationKeys.CREATE])
  @hideOn(OperationKeys.CREATE)
   @uitablecol(3)
  override createdAt!: Date;

  @uiprop()
  @uitablecol(4)
  version?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Leaflet>) {
      super(model);
  }
}

