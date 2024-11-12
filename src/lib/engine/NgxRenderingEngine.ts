import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { Model } from '@decaf-ts/decorator-validation';

export class NgxRenderingEngine extends RenderingEngine {
  override initialize(...args: any[]): Promise<void> {
    throw new Error('Method not implemented.');
  }

  override render<M extends Model>(model: M, ...args: any[]) {
    throw new Error('Method not implemented.');
  }
}
