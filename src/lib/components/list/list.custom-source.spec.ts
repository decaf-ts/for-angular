import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { SimpleChanges } from '@angular/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { ListComponentsTypes } from '../../engine/constants';
import { KeyValue } from '../../engine/types';
import { ListComponent } from './list.component';

const EMPTY_SOURCE_INFO = 'No data and source passed to infinite list';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  ListComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

/**
 * Regression coverage for the `ListComponent` custom-source change (SAA-752):
 * custom-source lists (`[customSource]="true"`, fed purely by the externally
 * provided `[data]` array) must render the full array instead of being sliced
 * to `limit`, must not emit the repository-oriented empty-source INFO, and must
 * refresh when `data` changes after initialization. Repository-backed lists
 * (the default) must keep slicing to `limit` and keep emitting that INFO.
 */
describe('ListComponent - custom source (data-array driven) behavior', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    })
      .overrideComponent(ListComponent, {
        add: {
          template: `
          <ion-content>
            <ion-list [inset]="inset" [lines]="lines" #component>
              <ng-content></ng-content>
            </ion-list>
          </ion-content>
         `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
  }));

  function makeRows(count: number): KeyValue[] {
    return Array.from({ length: count }, (_, i) => ({ uid: `row-${i + 1}` }));
  }

  function spyOnInfo(): jest.SpyInstance {
    const logger = (component as unknown as { log: { info: (...args: unknown[]) => void } }).log;
    return jest.spyOn(logger, 'info');
  }

  function setInitialized(value: boolean): void {
    (component as unknown as { initialized: boolean }).initialized = value;
  }

  it('renders the full custom-source array instead of slicing it to limit', async () => {
    component.customSource = true;
    component.type = ListComponentsTypes.PAGINATED;
    component.limit = 10;
    component.searchValue = undefined;
    component.data = makeRows(12);

    await component.refresh(true);

    expect(component.items.length).toBe(12);
  });

  it('does not emit the empty-source INFO for an empty custom source', async () => {
    const infoSpy = spyOnInfo();

    component.customSource = true;
    component.type = ListComponentsTypes.PAGINATED;
    component.limit = 10;
    component.searchValue = undefined;
    component.data = [];

    await component.refresh();

    expect(infoSpy).not.toHaveBeenCalledWith(EMPTY_SOURCE_INFO);
  });

  it('refreshes on a late data change only once the custom-source list is initialized', async () => {
    component.customSource = true;
    const refreshSpy = jest.spyOn(component, 'refresh').mockResolvedValue(undefined);

    setInitialized(true);
    await component.ngOnChanges({ data: { firstChange: false } } as unknown as SimpleChanges);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    setInitialized(false);
    refreshSpy.mockClear();
    await component.ngOnChanges({ data: { firstChange: false } } as unknown as SimpleChanges);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('keeps slicing repository-backed data to limit and still emits the empty-source INFO', async () => {
    const infoSpy = spyOnInfo();

    component.customSource = false;
    component.type = ListComponentsTypes.PAGINATED;
    component.limit = 10;
    component.searchValue = undefined;
    component.data = makeRows(12);

    await component.refresh(true);
    expect(component.items.length).toBe(10);
    expect(infoSpy).not.toHaveBeenCalledWith(EMPTY_SOURCE_INFO);

    infoSpy.mockClear();
    component.data = [];
    await component.refresh();
    expect(infoSpy).toHaveBeenCalledWith(EMPTY_SOURCE_INFO);
  });
});
