import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Model } from '@decaf-ts/decorator-validation';
import { IPagedComponentProperties } from '@decaf-ts/ui-decorators';
import { IonButton } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { IBaseCustomEvent } from 'src/lib/engine/interfaces';
import { ComponentRendererComponent } from 'src/lib/components/component-renderer/component-renderer.component';
import {
  ComponentEventNames,
  ElementPosition,
  ElementPositions,
  NgxParentComponentDirective,
} from 'src/lib/engine';
import { Dynamic } from 'src/lib/engine/decorators';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';

export interface ITabItem {
  title?: string;
  description?: string;
  url?: string;
  value?: string;
  icon?: string;
  showTitle?: boolean;
}
@Dynamic()
@Component({
  selector: 'app-switcher',
  templateUrl: './switcher.component.html',
  styleUrls: ['./switcher.component.scss'],
  standalone: true,
  imports: [
    ForAngularCommonModule,
    RouterModule,
    TranslatePipe,
    ComponentRendererComponent,
    IonButton,
  ],
})
export class AppSwitcherComponent extends NgxParentComponentDirective implements OnInit, OnDestroy {
  @Input()
  items: ITabItem[] = [];

  @Input()
  position: Extract<ElementPosition, 'top' | 'left'> = ElementPositions.top;

  @Input()
  mode: 'button' | 'toggle' | 'default' = 'default';

  @Input()
  type: 'tabs' | 'switcher' | 'column' = 'switcher';

  @Input()
  leafletParam: 'productCode' | 'batchNumber' = 'productCode';

  data: Partial<Model>[] | undefined;

  override value: string | undefined;

  override activeIndex: number = 0;

  constructor() {
    super('SwitcherComponent');
  }

  override async ngOnInit() {
    // await super.ngOnInit();
    // Initialize items based on children and existing items input
    if (!this.items.length || this.items.length < this.children.length) {
      this.items = this.children.map(({ props }, index) => {
        const tab = this.items[index];
        const { title, description, url, value, showTitle } = tab ? tab : props;
        return {
          title,
          description,
          value,
          url,
          index,
          showTitle: showTitle ?? true,
        } as IPagedComponentProperties;
      });
      if (this.type === 'switcher') this.activePage = this.getActivePage(this.activeIndex);
    }
    if (this.type === 'tabs') {
      this.items.forEach((item, index) => {
        const { url } = item;
        if (url && this.router.url.includes(url)) this.activeIndex = index;
      });
    }
    await super.initialize();
    console.log(this.name, this.operation);
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    this.data = event.data as Partial<Model>[];
    this.listenEvent.emit(event);
  }

  override async ngOnDestroy(): Promise<void> {
    await super.ngOnDestroy();
    if (this.timerSubscription) this.timerSubscription.unsubscribe();
  }

  async handleNavigateToLeaflet() {
    await this.router.navigateByUrl(`/leaflets/create?${this.leafletParam}=` + this.modelId);
  }

  async navigate(page: number): Promise<void | boolean> {
    const { url, value } = this.items[page];
    if (url) return await this.router.navigateByUrl(url || '/');
    if (value !== this.value) {
      this.value = value;
      this.activeIndex = page;
      this.listenEvent.emit({
        name: ComponentEventNames.Change,
        data: value,
        component: this.constructor.name,
      });
    }
  }
}
