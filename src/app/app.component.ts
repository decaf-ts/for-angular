import { RouterOutlet } from '@angular/router';
import { NgxCrudFormFieldComponent } from '../lib/components/ngx-crud-form-field/ngx-crud-form-field.component';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgxCrudFormFieldComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';
  protected readonly OperationKeys = OperationKeys;
}
