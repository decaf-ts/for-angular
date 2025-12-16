import { BaseModel, pk } from "@decaf-ts/core";
import { model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement,  uilistmodel,  uilistprop, uimodel } from "@decaf-ts/ui-decorators";
import { getDocumentTypes, getLeafletLanguages, getMarkets } from "../../utils/helpers";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { FileUploadComponent } from "src/lib/components/file-upload/file-upload.component";
import {  ElementPositions, ElementSizes, KeyValue, ListItemPositions, NgxEventHandler } from "src/lib/engine";
import { composed } from "@decaf-ts/db-decorators";
import { FormGroup } from "@angular/forms";
import { presentNgxInlineModal } from "src/lib/components";
import { Batch } from "./Batch";
import { Product } from "./Product";

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

@uilistmodel('ngx-decaf-list-item', {icon: 'cafe-outline'})

@uimodel('ngx-decaf-crud-form', {cardType: 'shadow'})
@model()
export class Leaflet extends BaseModel {

  @pk({type: String, generated: false})
  @uilistprop('uid')
  @composed(["productCode"], ":", true)
  id!: string;

  // @uiprop()
  // productCode!: string;

  // @required()
  // @uielement('app-batch-select-field', {
  //   label: 'leaflet.productCode.label',
  //   placeholder: 'leaflet.productCode.placeholder',
  //   type: HTML5InputTypes.SELECT,
  //   options: () => Product,
  //   optionsMapper: (item: Product) => ({ value: item.productCode, text: item.productCode + ' - ' + item.inventedName }),
  //   translatable: false,
  // } as Partial<CrudFieldComponent>)
  // @uilistprop(ListItemPositions.description)
  // productCode!: string;

  // @uielement('app-batch-select-field', {
  //   label: 'leaflet.batchNumber.label',
  //   placeholder: 'leaflet.batchNumber.placeholder',
  //   type: HTML5InputTypes.SELECT,
  //   translatable: false,
  //   optionsMapper: (item: Batch) => ({ value: item.id, text: item.batchNumber}),
  //   options: () => Batch,
  // } as Partial<CrudFieldComponent>)
  // @uilistprop(ListItemPositions.title)
  // batchNumber!: string;

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
  @uielement('app-batch-select-field', {
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

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Leaflet>) {
      super(model);
  }
}

