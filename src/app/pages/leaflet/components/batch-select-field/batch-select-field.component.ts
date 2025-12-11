import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CrudFieldComponent } from 'src/lib/components/crud-field/crud-field.component';
import { Dynamic } from 'src/lib/engine/decorators';

@Dynamic()
@Component({
  selector: 'app-batch-select-field',
  templateUrl: './batch-select-field.component.html',
  styleUrls: ['./batch-select-field.component.scss'],
  imports: [TranslatePipe],
  standalone: true,
})
export class BatchSelectFieldComponent extends CrudFieldComponent {
  override disabled?: boolean = true;
}
