import { Component,  ElementRef,  EventEmitter, HostListener, Input, OnInit, Output, ViewChild  } from '@angular/core';
import { AutocompleteTypes, PredefinedColors} from '@ionic/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import {generateRandomValue, windowEventEmitter} from 'src/lib/helpers/utils';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean } from 'src/lib/helpers/utils';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { IonSearchbar } from '@ionic/angular/standalone';
import * as allIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'ngx-decaf-searchbar',
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
  standalone: true,
  imports: [ForAngularModule, IonSearchbar]

})
export class SearchbarComponent extends NgxBaseComponent implements OnInit {

  @Input()
  override mode: "ios" | "md" | undefined = "ios";

  @Input()
  autocomplete: AutocompleteTypes | undefined = "off";

  @Input()
  autocorrect: "on" | "off" = "off";

  @Input()
  animated: StringOrBoolean = true;

  @Input()
  buttonCancelText: string = "Cancel";

  // @Input()
  // cancelButtonIcon?: string | undefined;

  @Input()
  clearIcon: string | undefined = undefined;

  @Input()
  color: string | undefined = undefined;

  @Input()
  debounce: number = 500;

  @Input()
  disabled: StringOrBoolean = false;

  @Input()
  enterkeyhint: "search" | "enter" | "done" | "go" | "next" | "previous" | "send" | undefined = "enter";

  @Input()
  inputmode: "text" | "search" | "none" | "email" | "tel" | "url" | "numeric" | "decimal" | undefined = 'search';

  @Input()
  placeholder: string = "Search";

  @Input()
  searchIcon: string | undefined = "search-outline";

  @Input()
  showCancelButton: "always" | "focus" | "never" = "never";

  @Input()
  showClearButton: "always" | "focus" | "never" = "focus";

  @Input()
  spellcheck: boolean = false;

  @Input()
  type: "number"
  | "text"
  | "search"
  | "email"
  | "password"
  | "tel"
  | "url"
  | undefined = "search";

  @Input()
  value: null | string | undefined = "";

  @Input()
  queryKeys: string | string[] = "name";

  @Input()
  isVisible: StringOrBoolean = false;

  @Input()
  wrapper: StringOrBoolean = false;

  @Input()
  wrapperColor: PredefinedColors = "primary";

  @Input()
  emitEventToWindow: StringOrBoolean = true;

  currentValue: string | undefined;

  @Output()
  searchEvent: EventEmitter<string> = new EventEmitter<string>();

  constructor() {
    super('SearchbarComponent');
    addIcons(allIcons)
  }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.emitEventToWindow = stringToBoolean(this.emitEventToWindow);
    this.wrapper = stringToBoolean(this.wrapper);
    this.isVisible = stringToBoolean(this.isVisible);
    this.disabled = stringToBoolean(this.disabled);
    this.animated = stringToBoolean(this.animated);
  }

  @HostListener("window:toggleSearchbarVisibility", ['event'])
  handleToggleVisibility(event: CustomEvent) {
    const self = this;
    self.isVisible = !self.isVisible;

    if(self.isVisible && !!self.component.nativeElement) {
      setTimeout(() => {
        (self.component.nativeElement as HTMLIonSearchbarElement).setFocus();
      }, 125);
    }
  }

  search() {
    const self = this;
    const element = self.component.nativeElement as HTMLIonSearchbarElement;
    this.searchEvent.emit(element?.value || undefined);
  }

  handleChange(event: CustomEvent) {
    const {value} = event?.detail;
    if(value?.length)
      this.emitEvent(value);
  }

  handleClear() {
    this.emitEvent(undefined);
  }

  handleInput(event: CustomEvent) {
    const {value} = event?.detail;
    if(!value || !value?.length)
      return this.handleClear();
    this.emitEvent(value);
  }

  handleBlur(event: CustomEvent) {}

  emitEvent(value: string | undefined) {
    this.searchEvent.emit(value);
    if(this.emitEventToWindow)
      windowEventEmitter('searchbarEvent', {value: value})
  }

}
