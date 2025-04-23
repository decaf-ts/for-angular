import { Component, Input, OnInit  } from '@angular/core';
import { Color } from '@ionic/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean } from 'src/lib/helpers/string';

@Component({
  selector: 'ngx-decaf-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class IconComponent implements OnInit {

  @Input()
  name!: string;

  @Input()
  color: Color = "";

  @Input()
  slot?: 'start' | 'end' | 'icon-only' = 'icon-only';

  @Input()
  button: StringOrBoolean = false

  @Input()
  width!: string;

  @Input()
  size?: 'large' | 'small' | 'default' = 'default';

  @Input()
  platformStylePreserve: StringOrBoolean = false;

  type: 'image' | 'ionic' | 'tabler' = 'ionic';


  constructor() { }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.button = stringToBoolean(this.button);
    if(this.button)
        this.slot = 'icon-only';
    this.getIconType();
  }

  private getIconType() {
    if(this.name) {
      this.name = this.name.toLowerCase();

      if(this.name.includes('svg'))
        return this.type = 'image';
      if(this.name.includes('ti-'))
        return this.type = 'tabler';

      this.platformStylePreserve = stringToBoolean(this.platformStylePreserve)
      if(this.platformStylePreserve && this.type === 'ionic')
        this.name = this.name.replace('-outline', '').replace('-sharp', '');
    }
  }

}
