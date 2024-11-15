import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import { NgComponentOutlet } from '@angular/common';
import { RenderingEngine } from '@decaf-ts/ui-decorators';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ngx-model-renderer',
  standalone: true,
  imports: [NgComponentOutlet],
  templateUrl: './ngx-model-renderer.component.html',
  styleUrl: './ngx-model-renderer.component.scss',
})
export class NgxModelRendererComponent<M extends Model>
  implements OnInit, OnChanges
{
  @Input()
  modelName!: string;
  @Input()
  details!: Record<string, unknown>;

  model!: M;
  output!: string;

  ngOnInit(): void {
    this.model = Model.build(this.details, this.modelName) as M;
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
