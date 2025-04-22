import { Component, OnInit  } from '@angular/core';
import { ForAngularModule } from 'src/lib/for-angular.module';

@Component({
  selector: 'ngx-decaf-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class ListItemComponent implements OnInit {

  constructor() { }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit() {}

}
