import { Component, Input, OnInit } from '@angular/core';
import { Color } from '@ionic/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle , IonCardSubtitle } from '@ionic/angular/standalone';
import { Dynamic } from '../../engine/decorators';
import { NgxComponentDirective, } from '../../engine/NgxComponentDirective';
import { } from '@ionic/angular';
import { SafeHtml } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';

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
  type: 'default' | 'shadow' = 'default';

  @Input()
  title: string = '';

  @Input()
  body: 'small'| 'default' = 'small';

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
    console.log(this.componentName, this.type);
    this.initialized = true;
  }

  // ngAfterViewInit(): void {
  // }
}
