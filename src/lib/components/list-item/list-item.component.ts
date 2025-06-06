import { Component, EventEmitter, HostListener, inject, Input, OnInit, Output, ViewChild  } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { StringOrBoolean, KeyValue } from 'src/lib/engine/types';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean } from 'src/lib/helpers/utils';
import { getWindowWidth, windowEventEmitter } from 'src/lib/helpers/utils';
import { Dynamic, EventConstants, ListItemCustomEvent } from 'src/lib/engine';
import { NavController } from '@ionic/angular';
import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonContent,
  IonIcon,
  IonListHeader,
  IonPopover,
  IonItemSliding,
  IonItemOptions,
  IonItemOption
} from '@ionic/angular/standalone';
import * as AllIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';
@Dynamic()
@Component({
  selector: 'ngx-decaf-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
  standalone: true,
  imports: [
    ForAngularModule,
    IonList,
    IonListHeader,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonIcon,
    IonLabel,
    IonButton,
    IonContent,
    IonPopover
  ]

})
export class ListItemComponent extends NgxBaseComponent implements OnInit {
  @ViewChild('actionMenuComponent')
  actionMenuComponent!: HTMLIonPopoverElement;

  @Input()
  lines: 'inset' | 'inseet' | 'none' = 'none';

  @Input()
  override item!: Record<string, any>;

  @Input()
  icon!: string;

  @Input()
  iconSlot: 'start' | 'end' ='start';

  @Input()
  button: StringOrBoolean = true;

  @Input()
  title?: string;

  @Input()
  description?: string;

  @Input()
  info?: string;

  @Input()
  subinfo?: string;

  @Output()
  clickEvent:  EventEmitter<ListItemCustomEvent> = new EventEmitter<ListItemCustomEvent>();

  showSlideItems: boolean = false;

  windowWidth!: number;

  actionMenuOpen: boolean = false;


  private navController: NavController = inject(NavController);
  constructor() {
    super("ListItemComponent");
    addIcons(AllIcons)
  }

  async ngOnInit(): Promise<void> {
    this.showSlideItems = this.enableSlideItems();
    this.button = stringToBoolean(this.button);

    this.className = `${this.className}  dcf-flex dcf-flex-middle grid-item`;
    if(this.operations?.length)
      this.className += ` action`;
    this.windowWidth = getWindowWidth();
  }

  async handleAction(action: CrudOperations, event: Event, target?: HTMLElement): Promise<boolean|void> {
    event.stopPropagation();
    await this.actionMenuComponent.dismiss();
    if(!this.route) {
      const event = {target: target, action, pk: this.pk, data: this.uid, name: EventConstants.CLICK_EVENT, component: this.componentName } as ListItemCustomEvent;
      windowEventEmitter(`ListItem${EventConstants.CLICK_EVENT}`, event);
      return this.clickEvent.emit(event);
    }
    return await this.redirect(action, (typeof this.uid === 'number' ? `${this.uid}`: this.uid));
  }

  @HostListener('window:resize', ['$event'])
  enableSlideItems(event?: Event): boolean {
    this.windowWidth = getWindowWidth();
    if(!this.operations?.length || this.windowWidth > 768)
      return this.showSlideItems = false;
    this.showSlideItems = this.operations.includes(OperationKeys.UPDATE) || this.operations.includes(OperationKeys.DELETE);
    return this.showSlideItems;
  }

  removeElement(element: HTMLElement) {
    element.classList.add('uk-animation-fade', 'uk-animation-medium', 'uk-animation-reverse');
    setTimeout(() => {element.remove()}, 600)
  }
  async redirect(action: string, id?: string): Promise<boolean> {
    return await this.navController.navigateForward(`/${this.route}/${action}/${id || this.uid}`);
  }

  presentActionsMenu(event: Event) {
    event.stopPropagation();
    this.actionMenuComponent.event = event;
    this.actionMenuOpen = true;
  }
}
