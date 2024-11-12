import { RenderingEngine, UIKeys } from '@decaf-ts/ui-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { FieldDefinition } from './types';

export class NgxRenderingEngine extends RenderingEngine<FieldDefinition> {
  override initialize(...args: any[]): Promise<void> {
    throw new Error('Method not implemented.');
  }

  override render<M extends Model>(model: M, ...args: any[]) {
    const classDecorator = Reflect.getMetadata(
      RenderingEngine.key(UIKeys.UIMODEL),
      model.constructor,
    );
    if (!classDecorator)
      throw new
  }
}
