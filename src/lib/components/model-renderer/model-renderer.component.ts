import {
  Component,
  Injector,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { Model, sf } from '@decaf-ts/decorator-validation';
import { NgComponentOutlet } from '@angular/common';
import {
  AngularDynamicOutput,
  AngularEngineKeys,
  RenderedModel,
} from '../../engine';

@Component({
  standalone: true,
  imports: [NgComponentOutlet],
  selector: 'ngx-decaf-model-renderer',
  templateUrl: './model-renderer.component.html',
  styleUrl: './model-renderer.component.scss',
})
export class ModelRendererComponent<M extends Model>
  implements OnChanges, RenderedModel
{
  @Input({ required: true })
  model!: M | string;

  @Input()
  globals?: Record<string, unknown>;

  @ViewChild('inner', { read: TemplateRef<any>, static: true })
  inner?: TemplateRef<any>;

  output?: AngularDynamicOutput;

  @Input()
  rendererId?: string;

  constructor(
    private vcr: ViewContainerRef,
    private injector: Injector,
  ) {}

  private refresh(model: string | M) {
    model =
      typeof model === 'string'
        ? (Model.build({}, JSON.parse(model)) as M)
        : model;

    this.output = model.render<AngularDynamicOutput>(
      this.globals || {},
      this.vcr,
      this.injector,
      this.inner,
    );
    this.rendererId = sf(
      AngularEngineKeys.RENDERED_ID,
      (this.output.inputs as Record<string, any>)['rendererId'] as string,
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model']) {
      const { currentValue, previousValue, firstChange } = changes['model'];
      this.refresh(currentValue);
    }

    // this.refresh();
  }

  ngOnDestroy(): void {
    this.output = undefined;
  }

  protected readonly JSON = JSON;
}
