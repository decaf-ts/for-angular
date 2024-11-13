import { OperationKeys } from '@decaf-ts/db-decorators';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';
  protected readonly OperationKeys = OperationKeys;
}
