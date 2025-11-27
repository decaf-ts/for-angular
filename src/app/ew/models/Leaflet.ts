import { BaseModel, pk } from "@decaf-ts/core";
import { model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement, uilistprop, uimodel } from "@decaf-ts/ui-decorators";
import { getDocumentTypes, getLeafletLanguages, getMarkets } from "../../utils/helpers";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { FileUploadComponent } from "src/lib/components/file-upload/file-upload.component";
import { ElementPositions, ElementSizes, ListItemPositions } from "src/lib/engine";
import { composed, readonly } from "@decaf-ts/db-decorators";

@uimodel('ngx-crud-form')
@model()
export class Leaflet extends BaseModel {


  @pk({type: "String", generated: false})
  @composed(["productCode", "batchNumber", "lang"], ":", true)
  @uilistprop('uid')
  id!: string;

  @required()
  @readonly()
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
    accept: ['image/*', '.xml'],
  } as Partial<FileUploadComponent>)
  xmlFileContent!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Leaflet>) {
      super(model);
  }
}
