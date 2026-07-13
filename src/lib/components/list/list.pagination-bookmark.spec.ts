import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { ListComponentsTypes } from '../../engine/constants';
import { KeyValue } from '../../engine/types';
import { PaginationComponent } from '../pagination/pagination.component';
import { ListComponent } from './list.component';

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
 * Mock of a cursor/bookmark-based Paginator (e.g. CouchDB Mango-style pagination).
 * Unlike offset pagination, `total` is never known — the only way to know if there is
 * a next page is the presence of a `_bookmark` value after fetching the current page.
 * On the last page, real bookmark-style backends return an empty/undefined bookmark.
 */
class MockBookmarkPaginator {
  total: number | undefined = undefined;
  _bookmark: string | undefined;
  calls: number[] = [];

  constructor(
    private data: KeyValue[][],
    private bookmarksAfterPage: (string | undefined)[]
  ) {}

  async page(n: number): Promise<KeyValue[]> {
    this.calls.push(n);
    this._bookmark = this.bookmarksAfterPage[n - 1];
    return this.data[n - 1] || [];
  }
}

const PAGE_COUNT = 10;

function buildTenPageParginator(): MockBookmarkPaginator {
  const data = Array.from({ length: PAGE_COUNT }, (_, i) => [{ uid: `${i + 1}-a` }, { uid: `${i + 1}-b` }]);
  // every page except the last has a bookmark pointing to the next one
  const bookmarks = Array.from({ length: PAGE_COUNT }, (_, i) => (i < PAGE_COUNT - 1 ? `bookmark-${i + 2}` : undefined));
  return new MockBookmarkPaginator(data, bookmarks);
}

describe('ListComponent - bookmark pagination (10-page real-usage simulation)', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let paginator: MockBookmarkPaginator;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    })
      .overrideComponent(ListComponent, {
        add: {
          // Real production conditional that gates the paginator's existence in the DOM,
          // copied verbatim from list.component.html so the test exercises the actual bug/fix.
          template: `
          <ion-content>
            <ion-list [inset]="inset" [lines]="lines" #component>
              <ng-content></ng-content>
            </ion-list>
            @if (loadMoreData) {
              @if (type === 'paginated' && !searchValue?.length) {
                <ngx-decaf-pagination
                  [disablePages]="disablePaginationPages"
                  [truncatePages]="truncatePaginationPages"
                  [totalPages]="pages"
                  [bookMarkPagination]="bookMarkPagination"
                  [nextBookmark]="paginator?.['_bookmark']"
                  [table]="component"
                  [current]="page"
                  (clickEvent)="handlePaginate($event)"
                />
              } @else {
                <ion-infinite-scroll
                  [position]="scrollPosition"
                  [threshold]="scrollThreshold"
                  (ionInfinite)="handleRefresh($event)">
                  <ion-infinite-scroll-content [loadingSpinner]="loadingSpinner" [loadingText]="loadingText" />
                </ion-infinite-scroll>
              }
            }
          </ion-content>
         `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    component.data = [];
    component.type = ListComponentsTypes.PAGINATED;
    fixture.detectChanges();

    paginator = buildTenPageParginator();
    component.paginator = paginator as unknown as typeof component.paginator;
  }));

  // --- DOM helpers, mirroring how a user would actually interact with the controls ---

  function paginationInstance(): PaginationComponent {
    return fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance;
  }

  function previousControl(): HTMLElement {
    return fixture.nativeElement.querySelector('ngx-decaf-pagination [aria-label="previous"]');
  }

  function nextControl(): HTMLElement {
    return fixture.nativeElement.querySelector('ngx-decaf-pagination [aria-label="next"]');
  }

  function isDisabled(el: HTMLElement): boolean {
    return el.classList.contains('dcf-disabled');
  }

  /** Simulates a real click on the "next" control: same code path a user click triggers. */
  async function clickNext(): Promise<void> {
    paginationInstance().next();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Simulates a real click on the "previous" control: same code path a user click triggers. */
  async function clickPrevious(): Promise<void> {
    paginationInstance().previous();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function expectedItemsForPage(page: number): string[] {
    return [`${page}-a`, `${page}-b`];
  }

  function actualRenderedUids(): string[] {
    return (component.items as KeyValue[]).map((i) => i['uid'] as string);
  }

  async function loadFirstPage(): Promise<void> {
    component.page = 1;
    await component.parseResult(paginator as never);
    fixture.detectChanges();
  }

  it('walks forward through all 10 pages, keeping the paginator mounted and data consistent at every step', async () => {
    await loadFirstPage();
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(1));
    expect(isDisabled(previousControl())).toBe(true); // page 1: previous must be disabled
    expect(isDisabled(nextControl())).toBe(false);

    for (let page = 2; page <= PAGE_COUNT; page++) {
      await clickNext();
      expect(component.page).toBe(page);
      expect(actualRenderedUids()).toEqual(expectedItemsForPage(page));
      expect(fixture.nativeElement.querySelector('ngx-decaf-pagination')).toBeTruthy(); // never destroyed
      expect(fixture.nativeElement.querySelector('ion-infinite-scroll')).toBeFalsy();
    }

    // now sitting on page 10, the last page: next must be disabled, previous enabled
    expect(isDisabled(nextControl())).toBe(true);
    expect(isDisabled(previousControl())).toBe(false);
  });

  it('does not navigate or refetch when clicking "previous" on the first page', async () => {
    await loadFirstPage();
    const callsBefore = paginator.calls.length;

    await clickPrevious();

    expect(component.page).toBe(1); // unchanged
    expect(paginator.calls.length).toBe(callsBefore); // no new fetch triggered
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(1)); // data unchanged
  });

  it('does not navigate or refetch when clicking "next" on the last page', async () => {
    await loadFirstPage();
    for (let page = 2; page <= PAGE_COUNT; page++) {
      await clickNext();
    }
    expect(component.page).toBe(PAGE_COUNT);
    const callsBefore = paginator.calls.length;

    await clickNext(); // attempt to go past the last page

    expect(component.page).toBe(PAGE_COUNT); // unchanged
    expect(paginator.calls.length).toBe(callsBefore); // no new fetch triggered
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(PAGE_COUNT)); // data unchanged
  });

  it('simulates real usage: forward to the end, back to the middle, forward again — data stays consistent throughout', async () => {
    await loadFirstPage();

    // Forward: 1 -> 10
    for (let page = 2; page <= PAGE_COUNT; page++) {
      await clickNext();
      expect(actualRenderedUids()).toEqual(expectedItemsForPage(page));
    }
    expect(isDisabled(nextControl())).toBe(true);

    // Back: 10 -> 5
    for (let page = PAGE_COUNT - 1; page >= 5; page--) {
      await clickPrevious();
      expect(component.page).toBe(page);
      expect(actualRenderedUids()).toEqual(expectedItemsForPage(page));
      expect(fixture.nativeElement.querySelector('ngx-decaf-pagination')).toBeTruthy();
    }
    // mid-list: neither boundary control should be disabled
    expect(isDisabled(previousControl())).toBe(false);
    expect(isDisabled(nextControl())).toBe(false);

    // Forward again: 5 -> 8, verifying the data is re-fetched correctly and not stale
    // from the earlier forward pass (which is the exact scenario that used to desync
    // once the paginator got destroyed/recreated by the old structural @if).
    for (let page = 6; page <= 8; page++) {
      await clickNext();
      expect(component.page).toBe(page);
      expect(actualRenderedUids()).toEqual(expectedItemsForPage(page));
    }

    // Back to page 1 in one sweep, confirming the "previous" disable state is correctly
    // restored once we land back on the first page.
    for (let page = 7; page >= 1; page--) {
      await clickPrevious();
    }
    expect(component.page).toBe(1);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(1));
    expect(isDisabled(previousControl())).toBe(true);
    expect(isDisabled(nextControl())).toBe(false);
  });
});
