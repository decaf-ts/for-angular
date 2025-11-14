import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { IPagedComponentProperties } from '@decaf-ts/ui-decorators';
import { IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { CardComponent } from 'src/lib/components';

import { ComponentRendererComponent } from 'src/lib/components/component-renderer/component-renderer.component';
import { ElementPosition, ElementPositions, NgxParentComponentDirective } from 'src/lib/engine';
import { Dynamic } from 'src/lib/engine/decorators';


@Dynamic()
@Component({
  selector: 'app-switcher',
  templateUrl: './switcher.component.html',
  styleUrls: ['./switcher.component.scss'],
  standalone: true,
  imports: [CommonModule, CardComponent, IonSpinner, TranslatePipe, ComponentRendererComponent]
})
export class SwitcherComponent extends NgxParentComponentDirective implements OnInit, OnDestroy {

  @Input()
  tabs: IPagedComponentProperties[] = [];

  @Input()
  position: Extract<ElementPosition, 'top' | 'left'> = ElementPositions.top;

  button: boolean = false;

  override activeIndex: number = 0;

  constructor() {
    super("SwitcherComponent");
  }

  override async ngOnInit() {
    console.log(this.button);
    // await super.ngOnInit();
    // Initialize tabs based on children and existing tabs input
    if(!this.tabs.length || this.tabs.length < this.children.length) {
      this.tabs = this.children.map(({props}, index) => {
        const tab = this.tabs[index];
        const {title, description} = tab ? tab : props;
        return {
          title,
          description
        } as IPagedComponentProperties;
      });
      this.activePage = this.getActivePage(this.activeIndex);
    }
    this.initialized = true;
  }

  /**
   * @description Cleanup method called when the component is destroyed.
   * @summary Unsubscribes from any active timer subscriptions to prevent memory leaks.
   * This is part of Angular's component lifecycle and ensures proper resource cleanup.
   *
   */
  override ngOnDestroy(): void {
    super.ngOnDestroy();
    if(this.timerSubscription)
      this.timerSubscription.unsubscribe();
  }


  // handleChangeTab(index: number) {
  //   const content = this.children[index] as FieldDefinition;
  //   this.activeContent = undefined;
  //   this.skeletonData = [... new Array(content ? content.children?.length : 1)];
  //   this.timerSubscription = timer(1).subscribe(() =>
  //     this.activeContent = {... this.children[index] as FieldDefinition }
  //   );
  //   this.activeIndex = index;
  // }

}
