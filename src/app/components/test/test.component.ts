import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit  } from '@angular/core';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { Dynamic } from 'src/lib/engine/decorators';

@Dynamic()
@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./test.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class TestComponent extends NgxBaseComponent implements OnInit {

  /**
   * @constructor
   * @description Initializes a new instance of the TestComponent.
   * Calls the parent constructor with the component name for generate base locale string.
   */
  constructor() {
    super("TestComponent")
  }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.locale = this.getLocale(this.translatable);
  }

}
