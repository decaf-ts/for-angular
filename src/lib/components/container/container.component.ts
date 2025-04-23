import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular/standalone';
import { ElementSizes, FlexPositions, StringOrBoolean } from 'src/lib/engine/types';
import { stringToBoolean } from 'src/lib/helpers/string';
import { ForAngularModule } from 'src/lib/for-angular.module';

@Component({
  selector: 'ngx-decaf-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
  standalone: true,
  imports: [ForAngularModule]
})
export class ContainerComponent implements OnInit {
  @Input()
  hasSideMenu: StringOrBoolean = false;

  @Input()
  className: string = "";

  @Input()
  position: FlexPositions = 'center';

  @Input()
  flex: StringOrBoolean = true;

  @Input()
  expand: StringOrBoolean = false;

  @Input()
  fullscreen: StringOrBoolean = true;

  @Input()
  size: ElementSizes = 'block';

  private menuController: MenuController = inject(MenuController);

  constructor() { }

  ngOnInit() {

    this.menuController.enable(stringToBoolean(this.hasSideMenu) as boolean);
    this.expand = stringToBoolean(this.expand);
    this.flex = stringToBoolean(this.flex);

    this.size += ` dcf-width-${this.expand ? 'expand' : this.size}`;

    if(this.flex && !this.className.includes('dcf-flex-'))
      this.className += ` dcf-flex dcf-flex-${this.position}`;

    this.fullscreen = stringToBoolean(this.fullscreen);
    if(this.fullscreen)
      this.className += ' dcf-height-viewport';

  }

}
