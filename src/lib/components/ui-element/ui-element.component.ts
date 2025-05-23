import {
  AfterViewInit,
  Component,
  ComponentMirror,
  ComponentRef,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  reflectComponentType,
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
  RenderedModel,
  BaseCustomEvent,
  EventConstants,
  ComponentsTagNames
} from '../../engine';
import { KeyValue, ModelRenderCustomEvent } from 'src/lib/engine/types';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean } from 'src/lib/helpers/string';
import { NgxRenderingEngine2 } from 'src/lib/engine/NgxRenderingEngine2';

@Component({
  selector: 'ngx-decaf-ui-element',
  templateUrl: './ui-element.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./ui-element.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class UiElementComponent implements OnInit, OnChanges, OnDestroy {

  @ViewChild('componentViewContainer', {static: true, read: ViewContainerRef })
  vcr!: ViewContainerRef;

  @Input({required: true})
  tag!: string;

  @Input()
  globals: Record<string, unknown> = {};

  injector: EnvironmentInjector = inject(EnvironmentInjector);

  component!: ComponentRef<unknown>;

  @Output()
  listenEvent = new EventEmitter<ModelRenderCustomEvent>();

  constructor() {}

  ngOnInit(): void {
    this.createComponent(this.tag, this.globals);
  }

  async ngOnDestroy(): Promise<void> {
    if(this.component) {
      this.unsubscribeEvents();
      NgxRenderingEngine2.destroy();
    }
  }

  private createComponent(tag: string, globals: KeyValue = {}) {
    const component = NgxRenderingEngine2.components(tag)?.constructor as Type<unknown>;
    const metadata = reflectComponentType(component);
    const componentInputs = (metadata as ComponentMirror<unknown>).inputs;
    const props = globals?.['item'];
    delete props['tag'];
    const inputKeys = Object.keys(props);
    const unmappedKeys = [];

    for(let input of inputKeys) {
      if (!inputKeys.length)
        break;
      const prop = componentInputs.find((item: {propName: string}) => item.propName === input);
      if(!prop) {
         delete props[input];
         unmappedKeys.push(input);
      }
    }
    if (unmappedKeys.length)
      console.warn(
        `Unmapped input properties for component ${tag}: ${unmappedKeys.join(', ')}`,
      );

    this.vcr.clear();
    this.component = NgxRenderingEngine2.createComponent(component, props, metadata as ComponentMirror<unknown>, this.vcr, this.injector as Injector, []);
    this.subscribeEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if (changes['tag']) {
    //   const {currentValue} = changes['tag'];
    //   console.log(currentValue);
    //   // console.log(changes['tag']);
    //   // this.refresh(changes['tag'].currentValue, currentValue);
    // }
  }

  private subscribeEvents(): void {
    if(this.component) {
      console.log('Subscribing to events');
      const self = this;
      const instance = this.component?.instance as any;
      const componentKeys = Object.keys(instance);
      for (const key of componentKeys) {
        const value = instance[key];
        if(value instanceof EventEmitter)
          (instance as KeyValue)[key].subscribe((event: Partial<BaseCustomEvent>) => {
          self.listenEvent.emit({
              name: key,
              ... event,
          } as ModelRenderCustomEvent);
        })
      }
    }
  }

  private unsubscribeEvents(): void {
    if(this.component) {
       const instance = this.component?.instance as any;
      const componentKeys = Object.keys(instance);
      for (const key of componentKeys) {
        const value = instance[key];
        if(value instanceof EventEmitter)
          instance[key].unsubscribe();
      }
    }
  }

}
