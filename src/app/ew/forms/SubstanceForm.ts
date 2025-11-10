import { Model, model, ModelArg, required } from "@decaf-ts/decorator-validation";
import { uielement, uilayoutprop, uimodel, uipageprop } from "@decaf-ts/ui-decorators";

@uimodel('ngx-decaf-fieldset', {multiple: true})
@model()
export class SubstanceForm extends Model {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.name.label',
    placeholder: 'substance.name.placeholder',
  })
  @uilayoutprop(1)
  name!: string;


  @uipageprop(1)
  @uielement('ngx-decaf-crud-field', {
    label: 'substance.strength.label',
    placeholder: 'substance.strength.placeholder',
  })
  @uilayoutprop(1)
  strength!: string;

  legalEntityName?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<SubstanceForm>) {
    super(args);
  }
}
