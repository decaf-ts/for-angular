import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild  } from '@angular/core';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { IonChip, IonIcon, IonItem, IonLabel, IonPopover, IonSearchbar } from '@ionic/angular/standalone';
import { Condition } from '@decaf-ts/core';
import { KeyValue } from 'src/lib/engine';


@Component({
  selector: 'ngx-decaf-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
  imports: [ForAngularModule, IonPopover, IonLabel, IonItem, IonChip, IonIcon, IonSearchbar],
  standalone: true,

})
export class FilterComponent extends NgxBaseComponent implements OnInit {

  @Input()
  indexes: string[] = ['id', 'name', 'description'];

  @Input()
  conditions: string[] = ['Equal', 'Contains', 'Not Contains', 'Greater Than', 'Less Than', 'Not Equal'];

  @ViewChild('optionsFilterElement', { read: ElementRef, static: true })
  optionsFilterElement!: ElementRef;

  /**
   * @description Event emitter for search events.
   * @summary Emits search events when the user interacts with the searchbar.
   * @type {EventEmitter<KeyValue[] | undefined>}
   */
  @Output()
  filterEvent: EventEmitter<KeyValue[] | undefined> = new EventEmitter<KeyValue[] | undefined>();

  //   conditions: KeyValue[] = [
  //   {equal: 'Equal'},
  //   {contains: 'Contains'},
  //   {notContains: 'Not Contains'},
  //   {greaterThan: 'Greater Than'},
  //   {lessThan: 'Less Than'},
  //   {notEqual: 'Not Equal'},
  // ];


  /**
   * @constructor
   * @description Initializes a new instance of the FilterComponent.
   * Calls the parent constructor with the component name for generate base locale string.
   */
  constructor() {
    super("FilterComponent");
  }

  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
   *
   * @returns {void} This method does not return a value.
   */
  ngOnInit(): void {

    // set component as initilizad, trigger change to get locale string
    this.initialize();

  }

  value = '';

  options: string[] = [];
  selectedFilters: string[] = [];

  filteredOptions: string[] = [];
  filterValue: KeyValue[] = [];

  filter: KeyValue = {};
  step: number = 1;

  handleInput(event: InputEvent) {
    const {value} = event.target as HTMLInputElement;
      this.filteredOptions = this.filterOptions(value);
  }

  handleFocus(options: string[]  = []) {
    if(!this.filterValue.length && !options.length)
     options = this.indexes;
    if(this.step === 3)
      options = [];
    this.filteredOptions = this.options = options;
  }

  addFilter(value: string, event?: CustomEvent): void {
    value = value.trim();
    if(event instanceof KeyboardEvent && !value) {
      this.submit();
    } else {
       if((value && (!(event instanceof KeyboardEvent)) || this.step === 3)) {
        switch (this.step) {
          case 1:
            this.filter['index'] = value;
            this.options = this.conditions;
            break;
          case 2:
            this.filter['condition'] = value;
            this.options = [];
            break;
          case 3:
            this.filter['value'] = value;
            this.options = this.indexes;
            break;
        }
        if(this.step === 3) {
          this.step = 0;
          this.filterValue.push(this.filter);
          this.filter = {};
        }
        if(this.options.length)
          this.handleFocus(this.options);
        this.step++;

        this.selectedFilters.push(value);
        this.value = '';
        this.component.nativeElement.focus();
      }
    }
  }

  selectOption(event: CustomEvent, value: string) {
    this.addFilter(value);
  }

  updateOption(word: string): void {
    // const index = this.selectedFilters.indexOf(word);
  }

  allowClear(tag: string): boolean {
    return this.indexes.indexOf(tag) === -1 && this.conditions.indexOf(tag) === -1;
  }

  removeFilter(filter: string): void {
    function cleanString(filter: string): string {
      return filter
        .toLowerCase()                 // convert all characters to lowercase
        .normalize("NFD")              // separate accent marks from characters
        .replace(/[\u0300-\u036f]/g, "") // remove accent marks
        .replace(/\s+/g, "");          // remove all whitespace
    }
    this.value = "";
    // if(this.filterValue.length === 1) {
    //   this.initFilter = true;
    //   this.selectedFilters = this.filterValue = [];
    //   this.handleFocus(this.indexes);
    // }

    this.filterValue = this.filterValue.filter((item) => cleanString(item['value']) !== cleanString(filter));
    const filtered: string[] = [];
    this.filterValue.forEach(item => {
      Object.values(item).forEach(val => filtered.push(val))
    })
    this.selectedFilters = [...filtered];
    // this.step = 1;
    // this.filter = {};
    this.handleFocus(this.indexes);
    // const index = this.selectedFilters.indexOf(tag);
    // this.selectedFilters.splice(0, index + 1);
    // if(this.selectedFilters.length === 1) {
    //   this.handleFocus(this.conditions);
    // } else {
    //    this.handleFocus();
    // }
  }

  reset() {
    this.options = this.filteredOptions = this.filterValue = [];
    this.step = 1;
    this.filter = {};
    this.selectedFilters = [];
    this.value = '';
  }

  clear(value?: string) {
    if(!value) {
      this.reset();
      this.filterEvent.emit(undefined);
    }
  }


  submit() {
    console.log('submiting', this.filterValue);
    if(this.filterValue.length) {
      this.filterEvent.emit(this.filterValue);
      this.reset();
    }
  }

  toCamelCase(phrase: string): string {
    return phrase
      .toLowerCase()
      .split(/\s+/)
      .map((word: string, index: number) =>
        (index === 0) ?
            word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
  }


  filterOptions(value: string | null |  undefined): string[] {
    const optionsElement = this.optionsFilterElement.nativeElement;
    if(!value?.length || !value || value.length < 2) {
      const filteredOption = optionsElement.querySelector('.dcf-filtering-item');
      if(filteredOption)
        filteredOption.classList.remove('dcf-filtering-item');
      return this.options;
    }

    const options = optionsElement.querySelectorAll('.dcf-item');
    for (const option of options) {
      const isActive = option.textContent?.toLowerCase().includes(value.toLowerCase());
      if(isActive) {
        option.classList.add('dcf-filtering-item');
        break;
      }
    }
    return this.options.filter((option: string) => option.toLowerCase().includes(value.toLowerCase() as string));
  }


}
