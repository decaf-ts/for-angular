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
 * Mock of a normal, offset/page-based Paginator (total page count known upfront,
 * e.g. a SQL/count-backed adapter) — as opposed to the bookmark/cursor-based
 * MockBookmarkPaginator used in `list.pagination-bookmark.spec.ts`. This kind of
 * paginator supports true random access: any page can be requested directly,
 * without having to sequentially traverse the ones in between.
 */
class MockNormalPaginator {
  total: number;
  calls: number[] = [];

  constructor(
    private data: KeyValue[][],
    total: number
  ) {
    this.total = total;
  }

  async page(n: number): Promise<KeyValue[]> {
    this.calls.push(n);
    return this.data[n - 1] || [];
  }
}

const PAGE_COUNT = 10;

function buildTenPageNormalParginator(): MockNormalPaginator {
  const data = Array.from({ length: PAGE_COUNT }, (_, i) => [{ uid: `${i + 1}-a` }, { uid: `${i + 1}-b` }]);
  return new MockNormalPaginator(data, PAGE_COUNT);
}

describe('ListComponent - normal (non-bookmark) pagination: sequential + page-skip navigation', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let paginator: MockNormalPaginator;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    })
      .overrideComponent(ListComponent, {
        add: {
          // Same production conditional as list.component.html, copied verbatim.
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

    paginator = buildTenPageNormalParginator();
    component.paginator = paginator as unknown as typeof component.paginator;
  }));

  // --- helpers ---

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

  function renderedPageButtonTexts(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('ngx-decaf-pagination .page-item')).map(
      (el) => (el as HTMLElement).textContent?.trim() || ''
    );
  }

  /** Real DOM click on a rendered numbered page button — same element/handler a user clicks. */
  async function clickPageButton(pageNumber: number): Promise<void> {
    const text = pageNumber.toString().padStart(2, '0');
    const spans = Array.from(fixture.nativeElement.querySelectorAll('ngx-decaf-pagination .page-item')) as HTMLElement[];
    const span = spans.find((s) => s.textContent?.trim() === text);
    if (!span) {
      throw new Error(`page button "${text}" is not currently rendered (rendered: ${renderedPageButtonTexts().join(', ')})`);
    }
    (span.closest('div') as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function clickNext(): Promise<void> {
    paginationInstance().next();
    await fixture.whenStable();
    fixture.detectChanges();
  }

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

  /**
   * Drives the initial page-1 load deterministically, exactly like
   * `list.pagination-bookmark.spec.ts` does — bypassing reliance on the timing of
   * ngOnInit's own automatic (and, in this harness, unreliable-to-await) refresh chain.
   */
  async function loadFirstPage(): Promise<void> {
    component.page = 1;
    await component.parseResult(paginator as never);
    fixture.detectChanges();
  }

  // --- tests ---

  it('renders numbered page buttons (not bookmark mode) with deterministic boundary disabling', async () => {
    await loadFirstPage();

    expect(component.pages).toBe(PAGE_COUNT); // total resolved, unlike bookmark mode
    expect(component.bookMarkPagination).toBe(false);
    expect(renderedPageButtonTexts().length).toBeGreaterThan(0); // numbered buttons ARE rendered

    expect(isDisabled(previousControl())).toBe(true); // page 1: previous disabled
    expect(isDisabled(nextControl())).toBe(false);
  });

  it('walks forward sequentially through all 10 pages, data consistent at every step', async () => {
    await loadFirstPage();
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(1));

    for (let page = 2; page <= PAGE_COUNT; page++) {
      await clickNext();
      expect(component.page).toBe(page);
      expect(actualRenderedUids()).toEqual(expectedItemsForPage(page));
      expect(component.bookMarkPagination).toBe(false); // never flips true in normal mode
    }

    expect(isDisabled(nextControl())).toBe(true); // last page: next disabled
    expect(isDisabled(previousControl())).toBe(false);
  });

  it('walks backward sequentially from the last page to the first, data consistent at every step', async () => {
    await loadFirstPage();
    for (let page = 2; page <= PAGE_COUNT; page++) {
      await clickNext();
    }
    expect(component.page).toBe(PAGE_COUNT);

    for (let page = PAGE_COUNT - 1; page >= 1; page--) {
      await clickPrevious();
      expect(component.page).toBe(page);
      expect(actualRenderedUids()).toEqual(expectedItemsForPage(page));
    }

    expect(isDisabled(previousControl())).toBe(true); // back at page 1
    expect(isDisabled(nextControl())).toBe(false);
  });

  it('supports jumping directly between non-adjacent pages via real clicks on numbered buttons (true random access)', async () => {
    await loadFirstPage();
    paginator.calls = []; // clean baseline after the initial load

    // Page 1 -> Page 9: a genuine skip, jumping clean over pages 2-8.
    await clickPageButton(9);
    expect(component.page).toBe(9);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(9));

    // Page 9 -> Page 2: skip backward over pages 3-8.
    await clickPageButton(2);
    expect(component.page).toBe(2);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(2));

    // Page 2 -> Page 10: skip forward again, straight to the last page.
    await clickPageButton(10);
    expect(component.page).toBe(10);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(10));
    expect(isDisabled(nextControl())).toBe(true);

    // Page 10 -> Page 1: skip all the way back to the start.
    await clickPageButton(1);
    expect(component.page).toBe(1);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(1));
    expect(isDisabled(previousControl())).toBe(true);

    // Crucially, the mock paginator was asked ONLY for the pages actually requested —
    // 2-8 and other skipped pages were never fetched. This is the key behavioral
    // difference from bookmark mode, where skipping is structurally impossible.
    expect(paginator.calls).toEqual([9, 2, 10, 1]);
  });

  it('supports arbitrary jumps via navigate() regardless of which buttons happen to be rendered', async () => {
    await loadFirstPage();
    paginator.calls = [];
    // navigate() is exactly what a page-button click invokes; calling it directly
    // decouples this assertion from the getPages() truncation window, proving the
    // underlying jump capability works for ANY target page, not just currently
    // rendered ones.
    paginationInstance().navigate(6);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.page).toBe(6);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(6));
    expect(paginator.calls).toEqual([6]);
  });

  it('does not navigate or refetch when clicking "previous" on the first page', async () => {
    await loadFirstPage();
    const callsBefore = paginator.calls.length;

    await clickPrevious();

    expect(component.page).toBe(1);
    expect(paginator.calls.length).toBe(callsBefore);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(1));
  });

  it('does not navigate or refetch when clicking "next" on the last page', async () => {
    await loadFirstPage();
    await clickPageButton(10); // jump straight to the last page
    const callsBefore = paginator.calls.length;

    await clickNext();

    expect(component.page).toBe(PAGE_COUNT);
    expect(paginator.calls.length).toBe(callsBefore);
    expect(actualRenderedUids()).toEqual(expectedItemsForPage(PAGE_COUNT));
  });

  it('regression: the rendered numbered-button window reacts to page changes (ngOnChanges), not frozen at first init', async () => {
    await loadFirstPage();
    const buttonsAtPageOne = renderedPageButtonTexts();
    expect(buttonsAtPageOne).toContain('01');
    expect(buttonsAtPageOne).toContain('09'); // truncation window from page 1: 1,2,...,9,10

    // Page 5 (dead center) is used for comparison instead of an adjacent page: with
    // 10 total pages, the truncation window from page 1 only ever exposes {1,2,9,10}
    // as directly clickable buttons — all of which coincidentally render the SAME
    // button set as page 1 by symmetry of the algorithm. Page 5 unambiguously
    // differs (it inserts the current page between two ellipses:
    // [1,2,...,5,...,9,10]), but isn't a clickable button from page 1's own
    // truncation window, so `navigate()` is called directly here — this test is
    // about internal reactivity, not about which buttons happen to be on-screen.
    paginationInstance().navigate(5);
    await fixture.whenStable();
    fixture.detectChanges();
    const buttonsAtPageFive = renderedPageButtonTexts();
    // From page 5 the truncation window shifts — proving `pages`/`last` are
    // recomputed on input change instead of staying frozen from first ngOnInit.
    expect(buttonsAtPageFive).not.toEqual(buttonsAtPageOne);
    expect(buttonsAtPageFive).toContain('05');
  });
});
