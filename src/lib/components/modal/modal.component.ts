import { Component, EnvironmentInjector, inject, Input, OnInit} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { modalController, OverlayEventDetail} from "@ionic/core";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  ModalOptions
} from '@ionic/angular/standalone';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';
import * as allIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { NgxRenderingEngine } from '../../engine/NgxRenderingEngine';
import { Dynamic } from '../../engine/decorators';
import { KeyValue } from '../../engine/types';
import { IBaseCustomEvent } from '../../engine/interfaces';
import {ActionRoles, DefaultModalOptions} from '../../engine/constants';
import { NgxParentComponentDirective } from '../../engine/NgxParentComponentDirective';
import { SafeHtml } from '@angular/platform-browser';
import { OperationKeys } from '@decaf-ts/db-decorators';

@Dynamic()
@Component({
  selector: 'ngx-decaf-modal',
  templateUrl: 'modal.component.html',
  styleUrls: ['modal.component.scss'],
  standalone: true,
  imports: [IonModal, ModelRendererComponent, TranslatePipe, IonSpinner, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  host: {'[attr.id]': 'uid'},
})
export class ModalComponent extends NgxParentComponentDirective implements OnInit  {

  @Input()
  title?: string;

  @Input()
  isOpen: boolean = false;

  @Input()
  options?: ModalOptions;

  @Input()
  globals?: KeyValue;

  @Input()
  inlineContent?: string | SafeHtml;

  @Input()
  InlineContentPosition: 'top' | 'bottom'  = 'bottom';

  @Input()
  fullscreen: boolean = false;

  modalController: ModalController = inject(ModalController);


  constructor() {
    super("ModalComponent");
    addIcons(allIcons);
  }

  override async ngOnInit(): Promise<void> {
    if (!this.modalController)
      this.modalController = modalController as unknown as ModalController;
  }

  override async initialize(options: KeyValue = {}): Promise<void> {
    if (!this.modalController)
      this.modalController = modalController as unknown as ModalController;
    this.options = Object.assign({}, DefaultModalOptions, this.options, options);
    this.initialized = true;
  }

  async create(props: KeyValue = {}): Promise<ModalComponent> {
   if (!this.initialized)
      await this.initialize(props);
    return this;
  }

  present() {
    this.isOpen = true;
    this.changeDetectorRef.detectChanges();
  }


  override async handleEvent(event: CustomEvent<IBaseCustomEvent>) {
    if (event instanceof Event)
      event.stopImmediatePropagation();
    console.log(event);
  }

  handleWillDismiss(event: CustomEvent<OverlayEventDetail>) {
    const { data, role } = event.detail;

    this.listenEvent.emit({
      name: role as string,
      component: "ModalComponent",
      data: data
    });
  }

  async cancel() {
    this.modalController.dismiss(null, ActionRoles.cancel, this.uid as string);
    this.isOpen = false;
  }

  async confirm(event: CustomEvent<OverlayEventDetail>) {
    await this.modalController.dismiss(this.name, ActionRoles.confirm, this.uid as string);
    this.isOpen = false;
  }

}

export async function getNgxModalComponent(props: Partial<ModalComponent> = {}, modalProps: Partial<ModalOptions> = {}, injector?: EnvironmentInjector): Promise<ModalComponent> {
  const {globals} = {... props};
  if (!globals || !globals?.['operation'])
    props.globals = {...(globals || {}), operation: OperationKeys.CREATE};
  const component = NgxRenderingEngine.createComponent(ModalComponent, props, injector || undefined) as ModalComponent;
  return component.create(modalProps);
}
