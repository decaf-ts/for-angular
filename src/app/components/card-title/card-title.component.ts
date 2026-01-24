import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonRouterLink } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AppSwitcherComponent } from '../switcher/switcher.component';
import { ITabItem } from 'src/app/ew/utils/interfaces';
import { NgxComponentDirective } from 'src/lib/engine/NgxComponentDirective';
import { OperationKeys } from '@decaf-ts/db-decorators';

@Component({
  selector: 'app-card-title',
  templateUrl: './card-title.component.html',
  styleUrls: ['./card-title.component.scss'],
  standalone: true,
  imports: [AppCardTitleComponent, TranslatePipe, AppSwitcherComponent, IonRouterLink, RouterLink],
})
export class AppCardTitleComponent extends NgxComponentDirective implements OnInit {
  @Input({ required: true })
  title?: string = '';

  @Input()
  subtitle?: string = '';

  @Input()
  allowCreate: boolean = false;

  @Input()
  tabs: ITabItem[] = [];

  @Input()
  override borders: boolean = true;

  @Input()
  override operation: OperationKeys | undefined = undefined;

  @Input()
  createButton = {
    text: 'create',
    color: 'primary',
    handle: async () => await this.handleRedirect(),
  };

  constructor() {
    super('AppCardTitleComponent');
  }

  async ngOnInit(): Promise<void> {
    // await this.initProps(this.props);
    if (!this.allowCreate)
      this.allowCreate = this.isAllowed(this.operation || OperationKeys.CREATE);
  }

  async handleRedirect(): Promise<void> {
    await this.router.navigateByUrl(`${this.route}/create`);
  }
}
