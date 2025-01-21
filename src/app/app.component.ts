import { OperationKeys } from '@decaf-ts/db-decorators';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';

  @Input()
  protected readonly OperationKeys = OperationKeys.CREATE;
}
