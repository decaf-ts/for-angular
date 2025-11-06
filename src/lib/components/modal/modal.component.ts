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



// export function getInstanceFromContext<T>(injector: Injector, controller: Type<T>): T {
//   let instance: T;

//   runInInjectionContext(injector, () => {
//     instance = inject(controller);
//   });

//   return instance!;
// }


// export async function getModal2(injector: Injector, props: ComponentProps<ModalOptions> = {}): Promise<ModalComponent> {
//   // return ModalComponent;
//   const cmp = NgxRenderingEngine.createDynamicComponent(ModalComponent);
//   // cmp.init(mdCtrl as any);
//   // cmp.changeDetectorRef.detectChanges();
//   return cmp.create({});
//   // return cmp.create();
//   // return await modalController.create({
//   //   component: ModalComponent,
//   //   componentProps: {
//   //     name: 'Decaf Modal'
//   //   }
//   // });
// }

// import {
//   createEnvironmentInjector,
//   createComponent,
// } from '@angular/core';
// import { NgxRenderingEngine } from 'src/lib/engine/NgxRenderingEngine';

// export function createDynamicComponent<T>(
//   component: Type<T>,
//   parentInjector?: Injector,
// ): T {
//   if (!parentInjector)
//       parentInjector = Injector.create({providers: [], parent: Injector.NULL});
//   const envInjector: EnvironmentInjector = createEnvironmentInjector([], parentInjector as EnvironmentInjector);

//   let instance: T;

//   runInInjectionContext(envInjector, () => {
//     const host = document.createElement('div');
//     if (!host) throw new Error('ion-app not found in DOM');

//     const compRef = createComponent(component, {
//       environmentInjector: envInjector,
//       hostElement: host
//     });

//     document.body.appendChild(host);
//      // Passa o controller via input

//     instance = compRef.instance;
//   });

//   return instance!;
// }
// export function openModal(props: any = {}) {
//   return runInInjectionContext(injector, async () => {
//     const modalCtrl = inject(ModalController);

//     const modal = await modalCtrl.create({
//       component: ModalComponent,
//       componentProps: props
//     });

//     await modal.present();
//     return modal;
//   });
// }
