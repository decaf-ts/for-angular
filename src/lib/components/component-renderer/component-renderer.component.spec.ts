import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { KeyValue } from '../../engine/types';
import { ListItemComponent } from '../list-item/list-item.component';
import { ComponentRendererComponent } from './component-renderer.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  ComponentRendererComponent,
  ListItemComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

/**
 * Regression coverage for the prop-merging bug in `createComponent`: `globals` can arrive
 * in two shapes depending on the caller —
 *  - "flat", as `list.component.html` sends it: `{ item, mapper, route, model, isModalChild, emitEvent }`
 *    all as siblings at the top level of `globals`.
 *  - "wrapped", as `layout.component.html` / `modal.component.html` / `switcher.component.html`
 *    send it: `{ props: { ...actualProps } }`.
 * The renderer used to pick only `globals.item` OR `globals.props` and discard everything
 * else, silently dropping `model`/`mapper`/`route`/`isModalChild`/`emitEvent` in the flat
 * case. These tests pin the fixed behavior for both shapes.
 */
describe('ComponentRendererComponent', () => {
  let component: ComponentRendererComponent;
  let fixture: ComponentFixture<ComponentRendererComponent>;

  function createInstance(): KeyValue {
    return (component as unknown as { instance: KeyValue }).instance as KeyValue;
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentRendererComponent);
    component = fixture.componentInstance;
    component.tag = 'ngx-decaf-list-item';
  }));

  it('should create', () => {
    component.globals = {};
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('forwards item/model/mapper/route/isModalChild/emitEvent when globals is flat (list.component.html shape)', () => {
    const rowData = { value: '123', text: 'Some option' };
    component.globals = {
      item: rowData,
      mapper: { title: 'text', uid: 'value' },
      route: undefined,
      model: rowData,
      isModalChild: true,
      emitEvent: true,
    };
    fixture.detectChanges();

    const instance = createInstance();
    expect(instance['item']).toEqual(rowData);
    expect(instance['model']).toEqual(rowData);
    expect(instance['mapper']).toEqual({ title: 'text', uid: 'value' });
    expect(instance['isModalChild']).toBe(true);
    expect(instance['emitEvent']).toBe(true);
    expect(instance['route']).toBeFalsy();
  });

  it('forwards props when globals is wrapped (layout/modal/switcher shape)', () => {
    const rowData = { value: '456', text: 'Another option' };
    component.globals = {
      props: {
        item: rowData,
        mapper: { title: 'text', uid: 'value' },
        model: rowData,
        isModalChild: false,
        emitEvent: false,
      },
    };
    fixture.detectChanges();

    const instance = createInstance();
    expect(instance['item']).toEqual(rowData);
    expect(instance['model']).toEqual(rowData);
    expect(instance['mapper']).toEqual({ title: 'text', uid: 'value' });
    expect(instance['isModalChild']).toBe(false);
  });

  it('does not leak the literal `props`/`item` wrapper keys onto the created instance', () => {
    const rowData = { value: '789', text: 'Wrapped option' };
    component.globals = { props: { item: rowData, model: rowData } };
    fixture.detectChanges();

    const instance = createInstance();
    // `props` is a real @Input on NgxComponentDirective-based components: it must not
    // be re-populated with the whole wrapper object, or parseProps() re-applies stale state.
    expect(instance['props']).not.toBe(component.globals);
  });
});
