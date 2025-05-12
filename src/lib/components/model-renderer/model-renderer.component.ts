import {
  Component,
  ComponentRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  Type,
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
import { KeyValue, ModelRenderCustomEvent } from 'src/lib/engine/types';

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

  @ViewChild('componentOuter', {static: true, read: ViewContainerRef })
  vcr!: ViewContainerRef;

  @Output()
  listenEvent = new EventEmitter<any>();

  private instance!: KeyValue | undefined;

  constructor(
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

    this.instance = this.output?.instance || undefined;
    this.subscribeEvents()
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
    this.unsubscribeEvents();
  }

  private subscribeEvents(): void {
    if(this.instance) {
      const self = this;
      const componentKeys = Object.keys(this.instance);
      for (const key of componentKeys) {
        const value = this.instance[key];
        if(value instanceof EventEmitter)
          (self.instance as KeyValue)[key].subscribe((event: CustomEvent) => self.listenEvent.emit({
            detail: {
              component: self.output?.component.name,
              name: key,
              data: event,
            } as ModelRenderCustomEvent
        }))
      }
    }
  }

  private unsubscribeEvents(): void {
    if(this.instance) {
      const componentKeys = Object.keys(this.instance);
      for (const key of componentKeys) {
        const value = this.instance[key];
        if(value instanceof EventEmitter)
          this.instance[key].unsubscribe();
      }
    }
  }

  protected readonly JSON = JSON;
}
