import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { IonSkeletonText } from '@ionic/angular/standalone';

@Component({
  standalone: true,
  imports: [IonSkeletonText],
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

  output!: string;

  @ViewChild('componentElementContainer', {
    static: true,
    read: ViewContainerRef,
  })
  componentElementContainer!: ViewContainerRef;

  ngOnInit(): void {
    this.model =
      typeof this.model === 'string'
        ? (Model.build({}, JSON.parse(this.model)) as M)
        : this.model;
    this.output = RenderingEngine.render(this.model);
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
