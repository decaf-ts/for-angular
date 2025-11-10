import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild  } from '@angular/core';
import { Color } from '@ionic/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { NgxSvgDirective } from '../../directives';
import * as allIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Dynamic } from '../../engine/decorators';
import { NgxMediaService } from 'src/lib/engine';

@Dynamic()
@Component({
  selector: 'ngx-decaf-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  imports: [NgxSvgDirective, IonIcon, IonButton],
  standalone: true,
  host: {'[attr.id]': 'uid'},
})
export class IconComponent implements OnInit, AfterViewInit {

  /** @description Reference to the component's native DOM element.
   * @summary Provides direct access to the native DOM element of the component through Angular's
   * ViewChild decorator. This reference can be used to manipulate the DOM element directly,
   * apply custom styles, or access native element properties and methods. The element is
   * identified by the 'component' template reference variable.
   * @type {ElementRef}
   * @memberOf module:lib/engine/NgxComponentDirective
   */
  @ViewChild('component', { read: ElementRef, static: false })
  component!: ElementRef;

  @Input()
  name?: string;

  @Input()
  color: Color = "";

  @Input()
  slot?: 'start' | 'end' | 'icon-only' = 'icon-only';

  @Input()
  button: boolean = false

  @Input()
  buttonFill: 'clear' | 'outline' | 'solid' | 'default' = 'clear';

  @Input()
  buttonShape: 'round' | 'default' = 'round';

  @Input()
  width!: string;

  @Input()
  size?: 'large' | 'small' | 'default' = 'default';

  type: 'image' | 'ionic' = 'ionic';

  isSvg: boolean = false;

  initialized: boolean = false;

  @Input()
  inline: boolean = false;

  mediaService: NgxMediaService = new NgxMediaService();

  constructor() {
    addIcons(allIcons);
  }

  ngOnInit(): void {
    if(this.button)
      this.slot = 'icon-only';
    if(this.name?.includes('.')) {
      this.type = 'image';
      this.isSvg = this.name.endsWith('.svg');
    }
    this.initialized = true;
  }

  ngAfterViewInit(): void {
    this.mediaService.setDarkMode(this.component.nativeElement);
  }
}
