import {
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  Type,
} from '@angular/core';

export abstract class DynamicModule {
  private selectorToFactoryMap: Record<string, Component> = null;

  protected abstract dynamicComponents: Type<any>[]; // similar to entryComponents

  constructor(protected componentFactoryResolver: ComponentFactoryResolver) {}

  public getComponentFactory(selector: string): ComponentFactory<any> {
    if (!this.selectorToFactoryMap) {
      // lazy initialisation
      this.populateRegistry();
    }
    return this.selectorToFactoryMap[selector];
  }

  private populateRegistry() {
    this.selectorToFactoryMap = {};
    if (
      Array.isArray(this.dynamicComponents) &&
      this.dynamicComponents.length > 0
    ) {
      this.dynamicComponents.forEach((compType) => {
        const componentFactory: ComponentFactory<any> =
          this.componentFactoryResolver.resolveComponentFactory(compType);
        this.selectorToFactoryMap[componentFactory.selector] = componentFactory;
      });
    }
  }
}
