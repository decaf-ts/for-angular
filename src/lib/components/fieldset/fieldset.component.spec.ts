import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { FieldsetComponent } from './fieldset.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../i18n';

const imports = [
  ForAngularCommonModule,
  FieldsetComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

describe('FieldsetComponent', () => {
  let component: FieldsetComponent;
  let fixture: ComponentFixture<FieldsetComponent>;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
    }).compileComponents();

    fixture = TestBed.createComponent(FieldsetComponent);
    component = fixture.componentInstance;
    // component.operation = OperationKeys.CREATE;
    fixture.detectChanges();
  }));

  it('should create', () => {
    // If ngOnInit returns a promise, await it
    // if (component?.ngOnInit instanceof Function)
    //   component.ngOnInit();

    // If ngAfterViewInit returns a promise, await it
    // if ((component as any)["ngAfterViewInit"] instanceof Function)
    //   component.ngAfterViewInit();

    // Force change detection after async operations
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
