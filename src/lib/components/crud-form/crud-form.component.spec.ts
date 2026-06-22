import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n/FakeLoader';
import { CrudFormComponent } from './crud-form.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  CrudFormComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

describe('CrudFormComponent', () => {
  let component: CrudFormComponent;
  let fixture: ComponentFixture<CrudFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CrudFormComponent);
    component = fixture.componentInstance;
    component.operation = OperationKeys.CREATE;
    component.formGroup = new FormGroup({});
    fixture.detectChanges();
  }));

  it('should create', () => {
    // If ngOnInit returns a promise, await it
    if (component.ngOnInit instanceof Function) component.ngOnInit();

    // If ngAfterViewInit returns a promise, await it
    // if (component.ngAfterViewInit instanceof Function)
    //   component.ngAfterViewInit();

    // Force change detection after async operations
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
