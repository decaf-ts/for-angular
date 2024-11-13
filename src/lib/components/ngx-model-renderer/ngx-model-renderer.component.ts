import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import { NgComponentOutlet } from '@angular/common';
import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { IonicModule } from '@ionic/angular';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ngx-model-renderer',
  standalone: true,
  imports: [NgComponentOutlet, IonicModule],
  templateUrl: './ngx-model-renderer.component.html',
  styleUrl: './ngx-model-renderer.component.scss',
})
export class NgxModelRendererComponent<M extends Model>
  implements OnInit, OnChanges
{
  @Input({ required: true })
  model!: M | string;

  output!: string;

  ngOnInit(): void {
    this.model =
      typeof this.model === 'string'
        ? (Model.build({}, this.model) as M)
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
