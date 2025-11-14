import { Component, Input, OnInit } from '@angular/core';
import { Color } from '@ionic/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle , IonCardSubtitle } from '@ionic/angular/standalone';
import { Dynamic } from '../../engine/decorators';
import { NgxComponentDirective, } from '../../engine/NgxComponentDirective';
import { } from '@ionic/angular';
import { SafeHtml } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { AngularEngineKeys } from '../../engine/constants';

@Dynamic()
@Component({
  selector: 'ngx-decaf-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [TranslatePipe, IonCard, IonCardHeader, IonCardContent, IonCardTitle, IonCardSubtitle],
  standalone: true,
})
export class CardComponent extends NgxComponentDirective implements OnInit {

  @Input()
  type: 'clear' | 'shadow' = 'clear';

  @Input()
  title: string = '';

  @Input()
  body: 'small'| 'default' | 'blank' = 'default';

  @Input()
  subtitle: string = '';

  @Input()
  color: Color = '';

  @Input()
  separator: boolean = false;

  @Input()
  borders: boolean = true;

  @Input()
  inlineContent?: string | SafeHtml;

  @Input()
  inlineContentPosition: 'top' | 'bottom'  = 'bottom';


  protected override componentName: string  = 'CardComponent';

  ngOnInit(): void {

    this.initialized = true;
     this.mediaService.isDarkMode().subscribe(isDark => {
      this.isDarkMode = isDark;
      this.mediaService.toggleClass(
        [this.component],
        AngularEngineKeys.DARK_PALETTE_CLASS,
        this.isDarkMode
      );
    });

  }

  // ngAfterViewInit(): void {
  // }
}
