import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonRouterLink } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AppSwitcherComponent } from '../switcher/switcher.component';
import { ITabItem } from 'src/app/ew/utils/interfaces';
import { NgxComponentDirective } from 'src/lib/engine/NgxComponentDirective';

@Component({
  selector: 'app-card-title',
  templateUrl: './card-title.component.html',
  styleUrls: ['./card-title.component.scss'],
  standalone: true,
  imports: [AppCardTitleComponent, TranslatePipe, AppSwitcherComponent, IonRouterLink, RouterLink],
})
export class AppCardTitleComponent extends NgxComponentDirective  {

  @Input({required: true})
  title!: string;

  @Input()
  subtitle!: string;

  @Input()
  allowCreate: boolean = false;

  @Input()
  tabs: ITabItem[] = [];

  @Input()
  override borders: boolean = true;

}
