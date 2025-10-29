import {
  date,
  email,
  minlength,
  model,
  Model,
  ModelArg,
  required,
  url,
} from '@decaf-ts/decorator-validation';
import { uichild, uielement,  uilayoutprop, uipageprop, uisteppedmodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';

@uisteppedmodel('ngx-decaf-stepped-form',
  [
    {title: 'stepped-form.step1.title', description: 'stepped-form.step1.description'},
    {title: 'stepped-form.step2.title', description: 'stepped-form.step2.description'},
    {title: 'stepped-form.step3.title', description: 'stepped-form.step3.description'},
  ],
  false
)
@model()
export class SteppedForm extends Model {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.contact.label',
    type: 'select',
    options: [
      { value: 'morning', text: 'morning' },
      { value: 'afternoon', text: 'afternoon' },
      { value: 'evening', text: 'evening' },
      { value: 'all', text: 'all' },
    ],
  })
  @uipageprop(1)
  contact!: string;

  @required()
  @minlength(2)
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.name.label',
    placeholder: 'demo.name.placeholder'
  })
  @uipageprop(1)
  @uilayoutprop(1)
  name!: string;

  @required()
  @email()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.email.label',
    placeholder: 'demo.email.placeholder'
  })
  @uipageprop(1)
  @uilayoutprop(1)
  email!: string;

  @uipageprop(2)
  @uilayoutprop(2, 1)
  @uichild(CategoryModel.name, 'ngx-decaf-fieldset')
  category!: CategoryModel;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.gender.label',
    type: 'radio',
    options: [
      { value: 'Male', text: 'male' },
      { value: 'Female', text: 'female' },
    ],
  })
  @uipageprop(2)
  @uilayoutprop(2, 1)
  gender!: string;

  @required()
  @date('yyyy-MM-dd')
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.birthdate.label',
  })
  @uipageprop(3)
  birthdate!: Date;

  @url()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.website.label',
    type: 'url'
  })
  @uipageprop(3)
  website!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.agree.label',
    type: 'checkbox',
  })
  @uipageprop(3)
  agree!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<SteppedForm>) {
    super(arg);
  }
}
