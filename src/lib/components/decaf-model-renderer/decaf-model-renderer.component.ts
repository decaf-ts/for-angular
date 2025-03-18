import {
  Component,
  Injector,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewRef,
} from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import { IonSkeletonText } from '@ionic/angular/standalone';
import { NgComponentOutlet, NgForOf } from '@angular/common';
import { AngularDynamicOutput } from '../../engine';
import { CrudOperations } from '@decaf-ts/db-decorators';

@Component({
  standalone: true,
  imports: [NgComponentOutlet, NgForOf],
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'decaf-model-renderer',
  templateUrl: './decaf-model-renderer.component.html',
  styleUrl: './decaf-model-renderer.component.scss',
})
export class DecafModelRendererComponent<M extends Model>
  implements OnInit, OnChanges
{
  @Input({ required: true })
  model!: M | string;

  @Input()
  globals?: Record<string, unknown>;

  @ViewChild('inner', { read: TemplateRef<any>, static: true })
  inner?: TemplateRef<any>;

  output?: AngularDynamicOutput;

  constructor(
    private vcr: ViewContainerRef,
    private injector: Injector,
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  private refresh() {
    this.model =
      typeof this.model === 'string'
        ? (Model.build({}, JSON.parse(this.model)) as M)
        : this.model;

    const output = this.model.render<AngularDynamicOutput>(
      this.globals || {},
      this.vcr,
      this.injector,
      this.inner,
    );

    this.output = output;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model']) {
      const { currentValue, previousValue, firstChange } = changes['model'];
    }
    if (changes['details']) {
      const { currentValue, previousValue, firstChange } = changes['details'];
    }
    // this.refresh();
  }

  ngOnDestroy(): void {
    this.output = undefined;
  }

  protected readonly JSON = JSON;
}
