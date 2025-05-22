import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, OnInit, Output  } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { BaseCustomEvent, EventConstants, KeyValue, StringOrBoolean } from 'src/lib/engine';

export type PaginationCustomEvent = BaseCustomEvent & {
  data: {
    page: number,
    direction: 'next' | 'previous'
  }
}

@Component({
  selector: 'ngx-decaf-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  imports: [
    ForAngularModule,
    IonIcon
  ],
  standalone: true,

})
export class PaginationComponent extends NgxBaseComponent implements OnInit {

  override translatable: StringOrBoolean = true;

  @Input({ alias: 'pages', required: true })
  data!: number;

  @Input()
  current: number = 1;

  pages!: KeyValue[];

  last!: number;

  @Output()
  clickEvent = new EventEmitter<BaseCustomEvent>();

  /**
   * @constructor
   * @description Initializes a new instance of the PaginationComponent.
   * Calls the parent constructor with the component name for generate base locale string.
   */
  constructor() {
    super("PaginationComponent");
     addIcons({chevronBackOutline, chevronForwardOutline});
  }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.locale = this.getLocale(this.translatable);
    this.pages = this.getPages(this.data, this.current) as KeyValue[];
    this.last = this.data;
  }

  handleClick(direction: 'next' | 'previous', page?: number): void {
    if(page)
      this.current = page;
    this.clickEvent.emit({
      name: EventConstants.CLICK_EVENT,
      data: {
        direction,
        page: this.current
      },
      component: this.componentName
    });
  }

  getPages(total: number, current?: number): KeyValue[] {
    if(!current)
      current = this.current;

    const pages: KeyValue[] = [];

    function getPage(index: number | null, text: string = '') {
      let check = pages.find(item => item['index'] === index);
      if(check)
          return false;
      if(index != null)
        text = index >= 10 ? index.toString() : `0${index}${text}`;
      pages.push({index, text});
    };

    for(let i = 1; i <= total; i++) {
      if(total <= 5) {
          getPage(i);
          continue;
      } else {
        if(i === 1 && total !== 1) {
          getPage(i, total !== total ? ' ... ' : '');
          continue;
        }
        if(i <= total + 1 && i > total - 1) {
          getPage(i);
          continue;
        }
        if(i + 1 >= total) {
          if(i + 1 === total && i !== total)
            getPage(null, "...");
          getPage(i);
        }
      }
    }
    return pages;
  }
  getCurrent(): number {
    return this.current;
  }

  next(): void {
    const page = this.current + 1;
    if(page <= Object.keys(this.pages)?.length || 0) {
      this.current = page;
      this.handleClick('next');
    }
  }

  previous(): void {
    const page = this.current - 1;
    if(page > 0) {
      this.current = page;
      this.handleClick('previous');
    }
  }

  navigate(page: number | null) {
    if(page !== null && this.current !== page as number) {
      this.handleClick(page > this.current ? 'next' : 'previous', page);
    }
  }

}
