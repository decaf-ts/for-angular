import { Component, inject, Input, OnInit  } from '@angular/core';
import { Color, PredefinedColors } from '@ionic/core';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { StringOrBoolean } from 'src/lib/engine/types';
import { generateLocaleFromString } from 'src/lib/helpers/utils';
import { stringToBoolean } from 'src/lib/helpers/string';
import { RouteDirections } from 'src/lib/engine';
import { RouterService } from 'src/lib/services/router.service';
import { IonCard, IonCardContent, IonIcon, IonTitle } from '@ionic/angular/standalone';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';

@Component({
  selector: 'ngx-decaf-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  standalone: true,
  imports: [
    ForAngularModule,
    IonCard,
    IonCardContent,
    IonTitle,
    IonIcon
  ]

})
export class EmptyStateComponent extends NgxBaseComponent implements OnInit {

  @Input()
  title: string = "title";

  @Input()
  titleColor: string = 'gray-6';

  @Input()
  subtitle?: string;

  @Input()
  subtitleColor: string = 'gray-4';

  @Input()
  showIcon: StringOrBoolean = true;

  @Input()
  icon: string = "ti-info-square-rounded";

  @Input()
  iconSize?: 'large' | 'small' = 'large';

  @Input()
  iconColor?: PredefinedColors = 'medium';

  @Input()
  buttonLink?: string | Function;

  @Input()
  buttonText?: string;

  @Input()
  buttonFill: 'clear' | 'solid' | 'outline' =  'solid';

  @Input()
  buttonColor: Color =  'primary';

  @Input()
  buttonSize: 'large' | 'small' | 'default' =  'default';



  private routerService: RouterService = inject(RouterService);
  constructor() {
    super("EmptyStateComponent");
  }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.translatable = stringToBoolean(this.translatable);
    this.showIcon = stringToBoolean(this.showIcon);
    this.locale = this.getLocale(this.translatable);
    if(this.translatable) {
      this.title = generateLocaleFromString(this.locale, this.title);
      this.subtitle = generateLocaleFromString(this.locale, this.subtitle);
      this.buttonText = generateLocaleFromString(this.locale, this.buttonText);
    }

    this.titleColor = `dcf-title color-${this.titleColor}`;
    this.subtitleColor = `dcf-subtitle color-${this.titleColor}`;
  }

  /**
   * Handles the click event for the empty state button.
   * This function can either execute a provided function or navigate to a specified route.
   *
   * @param functionOrLink - The action to be performed when the button is clicked.
   *                         It can be either a function to execute or a string representing a route to navigate to.
   * @returns {boolean | void | Promise<boolean>}
   *          - Returns false if no action is provided.
   *          - Returns the result of the executed function if a function is provided.
   *          - Returns a Promise<boolean> indicating the success of navigation if a route string is provided.
   */
  handleClick(): boolean | void | Promise<boolean> {
    const fn = this.buttonLink;
    if(!fn)
      return false;
    if(fn instanceof Function)
      return fn();
    return this.routerService.navigateTo(fn as string, RouteDirections.FORWARD);
  }

}
