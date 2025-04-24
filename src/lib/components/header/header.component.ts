import { Component,  ElementRef,  EventEmitter, HostListener, inject, Input, OnInit, Output, ViewChild  } from '@angular/core';
import { Color } from '@ionic/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { MenuController } from '@ionic/angular/standalone';
import { RouterService } from 'src/lib/services/router.service';
import { stringToBoolean } from 'src/lib/helpers/string';

@Component({
  selector: 'ngx-decaf-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class HeaderComponent implements OnInit {

  @Input()
  className: string = "";

  @Input()
  mode: 'ios' | 'md' | undefined = 'md';

  @Input()
  crudOperations: CrudOperations[] = [OperationKeys.READ];

  @Input()
  currentOperation: CrudOperations = OperationKeys.READ;

  @Input()
  modelPage?: string;

  @Input()
  modelId?: string;

  @Input()
  modelOperations: string[] = [];

  @Input()
  showMenuButton: boolean | 'true' | 'false' = false;

  @Input()
  buttonMenuSlot: 'start' | 'end' = 'start';

  @Input()
  title?: string;

  @Input()
  logo: string = "";

  @Input()
  expand: StringOrBoolean = false;

  @Input()
  titleAligment?: string;

  @Input()
  border: StringOrBoolean = true;

  @Input()
  showBackButton: boolean | 'true' | 'false' = false;

  @Input()
  backButtonLink?: string | Function;

  @Input()
  backgroundColor: Color = "primary";

  @Input()
  mobileBackgroundColor: Color = "";

  @Input()
  mobileButtonMenuSlot: 'start' | 'end' = 'end';

  @Input()
  center: StringOrBoolean = false;

  @Input()
  translucent: StringOrBoolean = false;

  private menuController: MenuController = inject(MenuController);
  private routerService: RouterService  = inject(RouterService);

  constructor() {}

 /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.menuController.enable(stringToBoolean(this.showMenuButton) as boolean);
    this.showBackButton = stringToBoolean(this.showBackButton);
    this.center = stringToBoolean(this.center);
    this.translucent = stringToBoolean(this.translucent);
    this.expand = stringToBoolean(this.expand);
    this.border = stringToBoolean(this.border);
    if(this.center)
      this.className = ' dcf-flex';
    if(!!this.backgroundColor)
      this.className += ` ${this.backgroundColor}`;
    if(!this.border)
      this.className += ` ion-no-border`;
  }

  async changeOperation(operation: string, id?: string): Promise<boolean> {
    let page = `${this.modelPage}/${operation}/`.replace('//', '/');
    if(this.modelId || id)
        page = `${page}/${this.modelId || id}`;
    return this.routerService.navigateTo(page.replace('//', '/'))
  }

  isAllowed(operation: string): boolean {
    if(!this.crudOperations)
      return false;
    return this.crudOperations.includes(operation as CrudOperations) && (this.currentOperation !== OperationKeys.CREATE && this.currentOperation.toLowerCase() !== operation);
  }


}
