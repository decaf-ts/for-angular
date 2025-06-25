import {
  Component,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  TemplateRef, Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { Model, sf } from '@decaf-ts/decorator-validation';
import { NgComponentOutlet } from '@angular/common';
import {
  AngularDynamicOutput,
  AngularEngineKeys,
  BaseComponentProps,
  BaseCustomEvent,
  NgxRenderingEngine2,
  RenderedModel,
} from '../../engine';
import { KeyValue, ModelRenderCustomEvent } from 'src/lib/engine/types';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { Renderable } from '@decaf-ts/ui-decorators';

@Component({
  standalone: true,
  imports: [ForAngularModule, NgComponentOutlet],
  selector: 'ngx-decaf-dynamic-renderer',
  templateUrl: './dynamic-renderer.component.html',
  styleUrl: './dynamic-renderer.component.scss',
})
export class DynamicRendererComponent {
  @Input() output!: AngularDynamicOutput;

  @Input() component!: Type<unknown>;
  @Input() inputs?: Record<string, unknown>;
  @Input() injector?: Injector;
  @Input() content?: Node[][];

  ngAfterViewInit() {
    // console.log("$$ injector=", this.injector);
    // this.output.children?.forEach(child => console.log(child));
  }

  ngOnChanges(changes: SimpleChanges): void {
      console.log("$$$ CHANGE", changes)
  }
}
