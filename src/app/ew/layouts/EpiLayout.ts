import { list, model, Model, ModelArg, Primitives } from '@decaf-ts/decorator-validation';
import { uichild, uimodel, uiorder, uionrender,  DecafComponent } from '@decaf-ts/ui-decorators';
import { Leaflet } from '../models/Leaflet';
import { ProductMarket } from '../models/ProductMarket';
import { ProductStrength } from '../models/ProductStrength';
import { FieldsetComponent } from 'src/lib/components';
import { Condition } from '@decaf-ts/core';
import { DecafRepository } from 'src/lib/engine';
import { Metadata } from '@decaf-ts/decoration';
import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';

class EpiRenderHandler extends NgxEventHandler {
  override async render(): Promise<void> {
    console.log('EpiRenderHandler.render called');
    if(this._repository) {
      const type = Metadata.type(this._repository.class, 'productCode').name.toLowerCase();
      const value = ([Primitives.NUMBER, Primitives.BIGINT].includes(type.toLowerCase()) ? Number(this.modelId) : this.modelId) as string | number;
      const condition = Condition.attribute<Model>('productCode' as keyof Model).eq(value);
      const query = await (this._repository as DecafRepository<Model>).query(condition, 'productCode' as keyof Model);
      if(query?.length) {
        this.value = query;
        await this.refresh();
      }
    }
  }
}

@uimodel('ngx-decaf-crud-form', {})
@model()
export class EpiLayout extends Model {

  @list(Leaflet, 'Array')
  @uiorder(1)
  @uionrender(() => EpiRenderHandler)
  @uichild(
    Leaflet.name,
    'ngx-decaf-fieldset',
    {
      title: 'Documents',
      borders: false,
      required: false,
      ordenable: false,
      multiple: true,
    } as Partial<FieldsetComponent>,
    true
  )
  document!: Leaflet;

  @list(Leaflet, 'Array')
  @uichild(
    ProductStrength.name,
    'ngx-decaf-fieldset',
    {
      title: 'Strengths',
      borders: false,
      required: false,
      ordenable: false,
       multiple: true,
    } as Partial<FieldsetComponent>,
    true
  )
  @uiorder(2)
  @uionrender(() => EpiRenderHandler)
  strengths!: ProductStrength;

  @list(Leaflet, 'Array')
  @uichild(
    ProductMarket.name,
    'ngx-decaf-fieldset',
    {
      title: 'Markets',
      borders: false,
      required: false,
      ordenable: false,
       multiple: true,
    } as Partial<FieldsetComponent>,
    true
  )
  @uiorder(3)
  markets!: ProductMarket;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<EpiLayout>) {
    super(args);
  }
}
