import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';
import { FieldDefinition } from '@decaf-ts/ui-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { IonSkeletonText } from '@ionic/angular/standalone';
import { AngularFieldDefinition } from '../../engine';
import { NgComponentOutlet } from '@angular/common';

@Component({
  standalone: true,
  imports: [IonSkeletonText, NgComponentOutlet],
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

  component!: unknown;

  props!: Record<string, unknown>;

  content!: { id: string }[][];

  output!: FieldDefinition<AngularFieldDefinition>;
  //
  // @ViewChild('componentElementContainer', {
  //   static: true,
  //   read: ViewContainerRef,
  // })
  // componentElementContainer!: ViewContainerRef;

  constructor(private vcr: ViewContainerRef) {}

  ngOnInit(): void {
    this.model =
      typeof this.model === 'string'
        ? (Model.build({}, JSON.parse(this.model)) as M)
        : this.model;
    // this.output = RenderingEngine.render(this.model as unknown as Model);
    // this.component = NgxRenderingEngine.components(this.output.tag);
    // this.props = this.output.props;
    // this.content = this.output.children?.map((child) => {
    //   return this.vcr.createEmbeddedView();
    // });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model']) {
      const { currentValue, previousValue, firstChange } = changes['model'];
    }
    if (changes['details']) {
      const { currentValue, previousValue, firstChange } = changes['details'];
    }
  }
  // //
  // ngOnDestroy(): void {}
}
