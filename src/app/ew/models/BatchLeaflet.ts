import { FormGroup } from "@angular/forms";
import { BaseModel, pk, table } from "@decaf-ts/core";
import { model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement,  uilistmodel,  uilistprop, uimodel, uiprop } from "@decaf-ts/ui-decorators";
import {
  ElementPositions,
  ElementSizes,
  ListItemPositions,
  NgxEventHandler,
  KeyValue
} from "src/lib/engine";
import { composed, OperationKeys } from "@decaf-ts/db-decorators";
import { presentNgxInlineModal } from "src/lib/components/modal/modal.component";
import { getDocumentTypes, getLeafletLanguages } from "src/app/utils/helpers";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { FileUploadComponent } from "src/lib/components/file-upload/file-upload.component";
import { getMenuIcon } from "src/lib/utils";
import { EwMenu } from "src/app/utils/contants";


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
    await presentNgxInlineModal(`<div>${xml}</div>`, {className: 'xml-preview-modal', title: 'product.leaflet.preview'});
    // chamar serviço do Diogo
    // alert("XML Preview:\n\n" + this.value);
  }
}

@uilistmodel('ngx-decaf-list-item', {icon: getMenuIcon('Leaflets', EwMenu)})
@uimodel('ngx-decaf-crud-form', { locale: 'leaflet', cardType: 'shadow', operation: OperationKeys.READ})
@model()
export class BatchLeaflet extends BaseModel {


  @pk({type: String,  generated: false})
  @uilistprop('uid')
  @composed(["productCode", "batchNumber", "lang"], ":", true)
  id!: string;

  @uiprop()
  batchNumber!: string;

  @uiprop()
  productCode!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.lang.label',
    placeholder: 'leaflet.lang.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getLeafletLanguages()
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.info)
  lang!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.type.label',
    placeholder: 'leaflet.type.placeholder',
    type: HTML5InputTypes.SELECT,
    options: () => getDocumentTypes('batch')
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.title)
  type!: string;

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

  market: string = '';

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<BatchLeaflet>) {
      super(model);
  }
}
