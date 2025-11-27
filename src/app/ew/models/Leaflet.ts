import { BaseModel, pk } from "@decaf-ts/core";
import { model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement, uilayoutprop, uilistprop, uimodel, uiprop } from "@decaf-ts/ui-decorators";
import { getDocumentTypes, getLeafletLanguages, getMarkets } from "../../utils/helpers";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { FileUploadComponent } from "src/lib/components/file-upload/file-upload.component";
import { ElementPositions, ElementSizes, FormParent, KeyValue, ListItemPositions, NgxEventHandler } from "src/lib/engine";
import { composed, readonly } from "@decaf-ts/db-decorators";
import { FormGroup } from "@angular/forms";
import { getNgxModalComponent, presentNgxInlineModal } from "src/lib/components";

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
    const images = this.files?.filter(f => f.type?.includes('image'));
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

@uimodel('ngx-crud-form')
@model()
export class Leaflet extends BaseModel {


  @pk({type: "Number"})
  @uilistprop('uid')
  id!: number;

  @uiprop()
  @uilayoutprop(1)
  productCode!: string;

  // @uielement('ngx-decaf-crud-field', {
  //     label: 'leaflet.batchNumber.label',
  //     placeholder: 'leaflet.batchNumber.placeholder',
  //     className: 'dcf-width-1-2@s dcf-width-1-1',
  // } as Partial<CrudFieldComponent>)
  // batchNumber?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.language.label',
    placeholder: 'leaflet.language.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getLeafletLanguages()
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.info)
  language!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.type.label',
    placeholder: 'leaflet.type.placeholder',
    type: HTML5InputTypes.SELECT,
    options: () => getDocumentTypes()
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.title)
  type!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.market.label',
    placeholder: 'leaflet.market.placeholder',
    type: HTML5InputTypes.SELECT,
    options: () => getMarkets(false)
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
