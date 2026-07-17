import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { IListItemCustomEvent } from '../../engine/interfaces';
import { KeyValue } from '../../engine/types';
import { ListItemComponent } from '../list-item/list-item.component';
import { ListComponent } from './list.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  ListComponent,
  ListItemComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

/**
 * Regression coverage for the "select options modal" flow (see
 * `getNgxSelectOptionsModal` in modal.component.ts, and how `crud-field.component.ts`
 * uses it for `interface: 'modal'` fields such as `productCode`).
 *
 * A `ListComponent` used as a modal child (`isModalChild = true`) renders raw
 * SelectOption-like rows through `ngx-decaf-component-renderer` -> `ngx-decaf-list-item`.
 * Clicking a row must emit a selection event (with the row's pk value as `data`) so the
 * modal can confirm/dismiss with that value, instead of navigating away — which is what
 * happened before these fixes, because `route` was wrongly kept for modal children and
 * `pk` was never forwarded to each row at all.
 */
describe('ListComponent - modal child selection (component-renderer + list-item wiring)', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let navigateByUrlSpy: jest.SpyInstance;

  const rows: KeyValue[] = [
    { value: '111', text: 'Option one' },
    { value: '222', text: 'Option two' },
  ];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    })
      .overrideComponent(ListComponent, {
        add: {
          // Same per-row conditional as list.component.html (lines ~78-91), copied
          // verbatim so this test exercises the exact same template expressions —
          // in particular the `route`/`pk` wiring inside `[globals]`.
          template: `
          <ion-list #component>
            @if (item?.tag) {
              @for (child of items; track trackItemFn($index, child)) {
                <ngx-decaf-component-renderer
                  [tag]="item.tag"
                  (listenEvent)="handleEvent($event)"
                  [globals]="{
                    item: child,
                    mapper: mapper,
                    route: isModalChild ? undefined : route,
                    model: child,
                    pk: pk,
                    isModalChild: isModalChild || child.isModalChild,
                    emitEvent: child.emitEvent,
                  }"
                />
              }
            }
          </ion-list>
         `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;

    component.pk = 'value';
    component.mapper = { title: 'text', uid: 'value' };
    component.isModalChild = true;
    component.item = { tag: true, emitEvent: true };
    component.data = [...rows];

    navigateByUrlSpy = jest.spyOn(component.router, 'navigateByUrl').mockResolvedValue(true);

    fixture.detectChanges();
  }));

  function renderedListItems(): ListItemComponent[] {
    return fixture.debugElement
      .queryAll(By.directive(ListItemComponent))
      .map((debugEl) => debugEl.componentInstance as ListItemComponent);
  }

  it('renders one ngx-decaf-list-item per row, each receiving its own raw row as `model`', () => {
    const items = renderedListItems();
    expect(items.length).toBe(rows.length);
    expect(items.map((i) => (i.model as KeyValue)?.['value'])).toEqual(rows.map((r) => r['value']));
  });

  it('does not receive a route when used as a modal child (so clicks emit instead of navigating)', () => {
    const items = renderedListItems();
    expect(items.every((i) => !i.route)).toBe(true);
  });

  it('forwards the parent pk to every row so click events carry the correct id', () => {
    const items = renderedListItems();
    expect(items.every((i) => i.pk === 'value')).toBe(true);
  });

  it('emits a selection event with the correct row id on click, instead of navigating', async () => {
    const items = renderedListItems();
    const emitted: IListItemCustomEvent[] = [];
    component.listenEvent.subscribe((event) => emitted.push(event as IListItemCustomEvent));

    await items[1].handleAction(new Event('click'), OperationKeys.READ);
    await fixture.whenStable();

    expect(navigateByUrlSpy).not.toHaveBeenCalled();
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1].data).toBe('222');
  });
});
