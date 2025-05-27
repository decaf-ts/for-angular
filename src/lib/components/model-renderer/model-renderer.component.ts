import {
  AfterViewInit,
  Component,
  ComponentRef,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
} from '@angular/core';
import { Model, sf } from '@decaf-ts/decorator-validation';
import { NgComponentOutlet } from '@angular/common';
import {
  AngularDynamicOutput,
  AngularEngineKeys,
  BaseComponentProps,
  NgxRenderingEngine2,
  RenderedModel,
  BaseCustomEvent,
  EventConstants,
  ComponentsTagNames
} from '../../engine';
import { KeyValue, ModelRenderCustomEvent } from 'src/lib/engine/types';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean } from 'src/lib/helpers/string';
import { Renderable } from '@decaf-ts/ui-decorators';

@Component({
  standalone: true,
  imports: [ForAngularModule, NgComponentOutlet],
  selector: 'ngx-decaf-model-renderer',
  templateUrl: './model-renderer.component.html',
  styleUrl: './model-renderer.component.scss',
})
export class ModelRendererComponent<M extends Model>
  implements OnChanges, OnDestroy, RenderedModel
{
  @Input({ required: true })
  model!: M | string | undefined;

  @Input()
  globals: Record<string, unknown> = {};

  @ViewChild('inner', { read: TemplateRef, static: true })
  inner?: TemplateRef<any>;

  output?: AngularDynamicOutput;

  @Input()
  rendererId?: string;

  @ViewChild('componentOuter', {static: true, read: ViewContainerRef })
  vcr!: ViewContainerRef;

  @Output()
  listenEvent = new EventEmitter<ModelRenderCustomEvent>();

  private render!: NgxRenderingEngine2;
  private instance!: KeyValue | undefined;

  constructor(
    private injector: Injector,
  ) {}

  private refresh(model: string | M) {

   model =
      typeof model === 'string'
        ? (Model.build({}, JSON.parse(model)) as M)
        : model;
    this.output = (model as unknown as Renderable).render<AngularDynamicOutput>(
      this.globals || {},
      this.vcr,
      this.injector,
      this.inner,
    );
    if(!!this.output?.inputs)
      this.rendererId = sf(
        AngularEngineKeys.RENDERED_ID,
        (this.output.inputs as Record<string, any>)['rendererId'] as string,
      );
    this.instance = this.output?.instance;
    this.subscribeEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes[BaseComponentProps.MODEL]) {
      const { currentValue, previousValue, firstChange } = changes[BaseComponentProps.MODEL];
      this.refresh(currentValue);
    }
  }

  async ngOnDestroy(): Promise<void> {
    if(this.instance) {
      this.unsubscribeEvents();
      await NgxRenderingEngine2.destroy();
    }
    this.output =  undefined;
  }


  private subscribeEvents(): void {
    if(this.instance) {
      const self = this;
      const componentKeys = Object.keys(this.instance);
      for (const key of componentKeys) {
        const value = this.instance[key];
        if(value instanceof EventEmitter)
          (self.instance as KeyValue)[key].subscribe((event: Partial<BaseCustomEvent>) => {
          self.listenEvent.emit({
              component: self.output?.component.name || "",
              name: key,
              ... event,
          } as ModelRenderCustomEvent);
        })
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
