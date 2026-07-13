import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { ListItemComponent } from './list-item.component';
import { NgxRenderingEngine } from '../../engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../i18n';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  ListItemComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];

describe('ListItemComponent', () => {
  let component: ListItemComponent;
  let fixture: ComponentFixture<ListItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

/**
 * Regression coverage for `ngOnInit`'s mapper resolution: it used to only look for a
 * `mapper` key nested *inside* `item` (`item['mapper']`), ignoring the `mapper` @Input
 * that the rendering pipeline (`ComponentRendererComponent` -> `NgxRenderingEngine.setInputs`)
 * actually populates as a sibling property. That left `this.mapper` unused, so rows never
 * got their `title`/`uid` (or any other mapped field) derived from `this.model`.
 */
describe('ListItemComponent - mapper resolution on init', () => {
  let component: ListItemComponent;
  let fixture: ComponentFixture<ListItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ListItemComponent);
    component = fixture.componentInstance;
  }));

  it('uses the `mapper` @Input (not a nested `item.mapper`) to derive fields from `model`', async () => {
    component.model = { value: '54154144219178', text: 'Option label' } as unknown as never;
    component.mapper = { title: 'text', uid: 'value' };
    component.item = { value: '54154144219178', text: 'Option label' };

    await component.ngOnInit();

    expect(component.title).toBe('Option label');
    expect(component.uid).toBe('54154144219178');
  });

  it('falls back to a mapper nested inside `item` when the `mapper` @Input is empty (back-compat)', async () => {
    component.model = { value: 'v1', text: 'Nested mapper option' } as unknown as never;
    component.mapper = {};
    component.item = { value: 'v1', text: 'Nested mapper option', mapper: { title: 'text', uid: 'value' } };

    await component.ngOnInit();

    expect(component.title).toBe('Nested mapper option');
    expect(component.uid).toBe('v1');
  });

  it('does not touch title/uid when neither the `mapper` @Input nor `item.mapper` are present', async () => {
    component.model = { value: 'v2', text: 'No mapper' } as unknown as never;
    component.mapper = {};
    component.item = { title: 'Fallback title' };

    await component.ngOnInit();

    expect(component.title).toBe('Fallback title');
  });
});
