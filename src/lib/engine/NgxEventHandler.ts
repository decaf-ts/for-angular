/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module module:lib/engine/NgxEventHandler
 * @description Event handler base class used by Decaf components.
 * @summary Defines NgxEventHandler which standardizes event handling logic and provides
 * logging support for handlers that process custom events emitted by components.
 *
 * @link {@link NgxEventHandler}
 */
import { ChangeDetectorRef, EnvironmentInjector, Renderer2 } from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import { DecafEventHandler } from '@decaf-ts/ui-decorators';
import { KeyValue } from './types';
import { ICrudFormEvent } from './interfaces';
import { NgxComponentDirective } from './NgxComponentDirective';

export abstract class NgxEventHandler extends DecafEventHandler {
  _data: Model | KeyValue | KeyValue[] | null = null;
  //TODO: pass to ui decorator decaf componnet
  override changeDetectorRef!: ChangeDetectorRef;

  renderer!: Renderer2;

  injector!: EnvironmentInjector;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {
    super();
  }

  override async handle<T extends NgxComponentDirective>(
    event: Partial<ICrudFormEvent>,
    data?: KeyValue,
    instance?: T,
    ...args: unknown[]
  ): Promise<void> {
    this.log.for(this.handle).info(`Handle called with args: ${event}, ${data}, ${instance}`);
  }

  from(...args: unknown[]): NgxEventHandler {
    this.log.for(this.process).info(`Process called with args: ${args}`);
    return this as NgxEventHandler;
  }

  async process(...args: unknown[]): Promise<any> {
    this.log.for(this.process).info(`Process called with args: ${args}`);
  }

  async delete(...args: unknown[]): Promise<any> {
    this.log.for(this.delete).info(`Delete called with args: ${args}`);
  }

  async batchOperation(...args: unknown[]): Promise<any> {
    this.log.for(this.batchOperation).info(`batchOperation called with args: ${args}`);
  }

  async beforeCreate(...args: unknown[]): Promise<any> {
    this.log.for(this.beforeCreate).info(`beforeCreate called with args: ${args}`);
  }

  async beforeUpdate(...args: unknown[]): Promise<any> {
    this.log.for(this.beforeUpdate).info(`beforeUpdate called with args: ${args}`);
  }

  async afterCreate(...args: unknown[]): Promise<any> {
    this.log.for(this.afterCreate).info(`afterCreate called with args: ${args}`);
  }

  async afterUpdate(...args: unknown[]): Promise<any> {
    this.log.for(this.afterUpdate).info(`afterUpdate called with args: ${args}`);
  }
}
