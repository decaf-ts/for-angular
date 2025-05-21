import { apply, metadata } from '@decaf-ts/reflection';
import { NgxRenderingEngine2 } from './NgxRenderingEngine2';
import { AngularEngineKeys, ComponentsTagNames } from './constants';
import { Constructor, propMetadata } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { ComponentMetadata } from './types';
import { reflectComponentType, Type } from '@angular/core';
import { UIElementMetadata, UIKeys, uimodel, UIModelMetadata } from '@decaf-ts/ui-decorators';
import { RenderingEngine as UiRenderingEngine} from '@decaf-ts/ui-decorators';
export function Dynamic() {
  return apply(
    (original: object) => {
      const metadata = reflectComponentType(original as Type<unknown>);

      if (!metadata)
        throw new InternalError(
          `Could not find Component metadata. @Dynamic decorator must come above @Component`,
        );

      NgxRenderingEngine2.registerComponent(
        metadata.selector,
        original as unknown as Constructor<unknown>,
      );
    },
    metadata(NgxRenderingEngine2.key(AngularEngineKeys.DYNAMIC), true),
  );
}

export function listItemElement(
  mapTo: 'title' | 'description' | 'subtitle' | 'info' |'subinfo',
  props?: Record<string, any>,
  tag: string = ComponentsTagNames.LIST_ITEM,
  serialize: boolean = false
) {
  return (original: any, propertyKey?: any) => {
    props = Object.assign({}, props, {mapper: {[mapTo]: propertyKey}});
    const metadata: UIElementMetadata = {
      tag: tag,
      serialize: serialize,
      props: Object.assign(
        {
          name: propertyKey,
        },
        props || {}
      ),
    };

    return propMetadata(UiRenderingEngine.key(UIKeys.ELEMENT), metadata)(
      original,
      propertyKey
    );
  };
}

export function uilistmodel(tag: string = 'ngx-decaf-list-infinite', mapper?: Record<string, string>, props: Record<string, any> = {}) {
  if(!!mapper)
    props['item'] = {mapper, render: true};
  return uimodel(tag, props);
}
