import { BaseModel, pk } from "@decaf-ts/core";
import { list, model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement,  uilistprop, uimodel, uiprop } from "@decaf-ts/ui-decorators";
import { getDocumentTypes, getLeafletLanguages, getMarkets } from "../../utils/helpers";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { FileUploadComponent } from "src/lib/components/file-upload/file-upload.component";
import { ElementPositions, ElementSizes, KeyValue, ListItemPositions, NgxEventHandler } from "src/lib/engine";
import { composed } from "@decaf-ts/db-decorators";
import { FormGroup } from "@angular/forms";
import { presentNgxInlineModal } from "src/lib/components";
import { Batch } from "./Batch";

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

@uimodel('ngx-decaf-crud-form', {cardType: 'shadow'})
@model()
export class Leaflet extends BaseModel {

  @pk({type: "String",  generated: false})
  @uilistprop('uid')
  @composed(["productCode", "lang"], ":", true)
  id!: string;

  @uiprop()
  productCode!: string;

    @list(String)
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'organizationEnroll.services.label',
    placeholder: 'organizationEnroll.services.placeholder',
    options: () => {
      return ['Epi', 'Traceability'].map(s => ({ text: `organizationEnroll.services.options.${s.toLowerCase()}`, value: s }));
    },
    multiple: true,
    type: HTML5InputTypes.CHECKBOX
  })
  services!: string[];

  @uielement('app-batch-select-field', {
    label: 'leaflet.batchNumber.label',
    placeholder: 'leaflet.batchNumber.placeholder',
    type: HTML5InputTypes.SELECT,
    options: () => Batch
  } as Partial<CrudFieldComponent>)
  batchNumber!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.lang.label',
    placeholder: 'leaflet.lang.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getLeafletLanguages(),
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.title)
  lang!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.type.label',
    placeholder: 'leaflet.type.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getDocumentTypes()
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.description)
  type!: string;


  @uielement('ngx-decaf-crud-field', {
    label: 'leaflet.market.label',
    placeholder: 'leaflet.market.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getMarkets()
  } as Partial<CrudFieldComponent>)
  @uilistprop(ListItemPositions.info)
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
