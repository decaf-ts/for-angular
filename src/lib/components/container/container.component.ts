import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular/standalone';
import { ElementSizes, FlexPositions } from 'src/lib/engine/types';
import { stringToBoolean } from 'src/lib/engine/helpers';
import { ForAngularModule } from 'src/lib/for-angular.module';

@Component({
  selector: 'ngx-decaf-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ForAngularModule]
})
export class ContainerComponent  implements OnInit {
  @Input()
  hasSideMenu:
  boolean
  | 'true'
  | 'false' = false;

  @Input()
  className: string = "";

  @Input()
  position: FlexPositions = 'center';

  @Input()
  flex: boolean = true;

  @Input()
  expand: boolean = false;

  @Input()
  fullscreen: boolean = true;

  @Input()
  size: ElementSizes = 'block';

  private menuController: MenuController = inject(MenuController);

  constructor() { }

  ngOnInit() {

    this.menuController.enable(stringToBoolean(this.hasSideMenu) as boolean);
    this.expand = stringToBoolean(this.expand);
    this.flex = stringToBoolean(this.flex);
    this.className += ` dcf-width-${this.expand ? 'expand' : this.size}`;

    if(this.flex && !this.className.includes('dcf-flex-'))
      this.className += ` dcf-flex dcf-flex-${this.position}`;

    this.fullscreen = stringToBoolean(this.fullscreen);
    if(this.fullscreen)
      this.className += ' dcf-height-viewport';

  }

}
