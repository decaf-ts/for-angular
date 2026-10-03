import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser, TranslateService } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../../i18n';
import en from '../../i18n/data/en.json';
import pt from '../../i18n/data/pt.json';
import { PaginationComponent } from './pagination.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  PaginationComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
    parser: {
      provide: TranslateParser,
      useClass: I18nParser,
    },
  }),
];

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;
  let translateService: TranslateService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.setTranslation(
      'en',
      {
        component: {
          pagination: {
            previous: 'previous',
            next: 'next',
            page: 'Page {0}',
            resume: 'Showing page {0} of {1}',
          },
        },
      },
      true
    );
    translateService.use('en');

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('baseline navigation and states', () => {
    component.totalPages = 5;
    component.current = 2;
    component.ngOnInit();
    fixture.detectChanges();

    const prevSpy = jest.spyOn(component, 'previous');
    const navSpy = jest.spyOn(component, 'navigate');
    const nextSpy = jest.spyOn(component, 'next');

    const prevEl = fixture.nativeElement.querySelector('[aria-label="previous"]');
    const nextEl = fixture.nativeElement.querySelector('[aria-label="next"]');
    const pageSpans = Array.from(fixture.nativeElement.querySelectorAll('.page-item')) as HTMLElement[];
    const targetPageSpan = pageSpans.find((s) => s.textContent?.trim() === '03');
    const targetPageEl = targetPageSpan?.closest('div, button') as HTMLElement;

    expect(prevEl).toBeTruthy();
    expect(nextEl).toBeTruthy();
    expect(targetPageEl).toBeTruthy();

    // Click triggers
    prevEl.click();
    expect(prevSpy).toHaveBeenCalledTimes(1);

    targetPageEl.click();
    expect(navSpy).toHaveBeenCalledWith(3);

    nextEl.click();
    expect(nextSpy).toHaveBeenCalledTimes(1);

    // Enter keydown does not call navigation (no double-firing custom handlers on native buttons)
    prevEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(prevSpy).toHaveBeenCalledTimes(1);

    targetPageEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(navSpy).toHaveBeenCalledWith(3);
    expect(navSpy).toHaveBeenCalledTimes(1);

    nextEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(nextSpy).toHaveBeenCalledTimes(1);

    // Active page state at current = 2
    const activeEl = fixture.nativeElement.querySelector('.dcf-active');
    expect(activeEl).toBeTruthy();
    expect(activeEl.textContent).toContain('02');

    // Page 1: previous is disabled
    component.current = 1;
    component.ngOnInit();
    fixture.detectChanges();
    const prevAt1 = fixture.nativeElement.querySelector('[aria-label="previous"]');
    expect(prevAt1.classList.contains('dcf-disabled')).toBe(true);

    // Page 5 (last): next is disabled
    component.current = 5;
    component.ngOnInit();
    fixture.detectChanges();
    const nextAt5 = fixture.nativeElement.querySelector('[aria-label="next"]');
    expect(nextAt5.classList.contains('dcf-disabled')).toBe(true);
  });

  it('regression pagination semantics', () => {
    component.totalPages = 5;
    component.current = 2;
    component.ngOnInit();
    fixture.detectChanges();

    const prevEl = fixture.nativeElement.querySelector('[aria-label="previous"]');
    const nextEl = fixture.nativeElement.querySelector('[aria-label="next"]');
    expect(prevEl.tagName.toLowerCase()).toBe('button');
    expect(nextEl.tagName.toLowerCase()).toBe('button');

    const pageSpans = Array.from(fixture.nativeElement.querySelectorAll('.page-item')) as HTMLElement[];
    const page2Span = pageSpans.find((s) => s.textContent?.trim() === '02');
    const page2Control = page2Span?.closest('button, div') as HTMLElement;
    expect(page2Control.getAttribute('aria-current')).toBe('page');
  });

  it('pagination native buttons and separators', () => {
    component.totalPages = 10;
    component.current = 1;
    component.truncatePages = true;
    component.ngOnInit();
    fixture.detectChanges();

    const prevEl = fixture.nativeElement.querySelector('.dcf-pagination button:first-child');
    const nextEl = fixture.nativeElement.querySelector('.dcf-pagination button:last-child');
    expect(prevEl.tagName.toLowerCase()).toBe('button');
    expect(prevEl.getAttribute('type')).toBe('button');
    expect(nextEl.tagName.toLowerCase()).toBe('button');
    expect(nextEl.getAttribute('type')).toBe('button');

    const pageButtons = Array.from(fixture.nativeElement.querySelectorAll('.dcf-pagination button')) as HTMLButtonElement[];
    expect(pageButtons.length).toBeGreaterThan(2);
    for (const btn of pageButtons) {
      expect(btn.tagName.toLowerCase()).toBe('button');
      expect(btn.getAttribute('type')).toBe('button');
    }

    const separators = Array.from(fixture.nativeElement.querySelectorAll('.dcf-pagination-separator')) as HTMLElement[];
    expect(separators.length).toBeGreaterThan(0);
    for (const sep of separators) {
      expect(sep.tagName.toLowerCase()).toBe('span');
      expect(sep.getAttribute('aria-hidden')).toBe('true');
      expect(sep.hasAttribute('tabindex')).toBe(false);
    }
  });

  it('pagination aria-current', () => {
    component.totalPages = 5;
    component.current = 3;
    component.ngOnInit();
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.dcf-pagination button')) as HTMLButtonElement[];
    const prevEl = buttons[0];
    const nextEl = buttons[buttons.length - 1];
    expect(prevEl.getAttribute('aria-current')).toBeNull();
    expect(nextEl.getAttribute('aria-current')).toBeNull();

    const pageSpans = Array.from(fixture.nativeElement.querySelectorAll('.page-item')) as HTMLElement[];
    for (const span of pageSpans) {
      const pageControl = span.closest('button');
      if (!pageControl) continue;
      const pageNum = span.textContent?.trim();
      if (pageNum === '03') {
        expect(pageControl.getAttribute('aria-current')).toBe('page');
      } else {
        expect(pageControl.getAttribute('aria-current')).toBeNull();
      }
    }
  });

  it('pagination activation', () => {
    component.totalPages = 5;
    component.current = 2;
    component.ngOnInit();
    fixture.detectChanges();

    const prevSpy = jest.spyOn(component, 'previous');
    const nextSpy = jest.spyOn(component, 'next');
    const navSpy = jest.spyOn(component, 'navigate');

    const prevEl = fixture.nativeElement.querySelector('.dcf-pagination button:first-child') as HTMLButtonElement;
    const nextEl = fixture.nativeElement.querySelector('.dcf-pagination button:last-child') as HTMLButtonElement;
    const pageSpans = Array.from(fixture.nativeElement.querySelectorAll('.page-item')) as HTMLElement[];
    const targetPageSpan = pageSpans.find((s) => s.textContent?.trim() === '03');
    const pageEl = targetPageSpan?.closest('button') as HTMLButtonElement;

    const controls = [
      {
        kind: 'previous',
        element: prevEl,
        spy: prevSpy,
        expectedArg: undefined,
      },
      {
        kind: 'next',
        element: nextEl,
        spy: nextSpy,
        expectedArg: undefined,
      },
      {
        kind: 'page',
        element: pageEl,
        spy: navSpy,
        expectedArg: 3,
      },
    ];

    for (const ctrl of controls) {
      // (a) click() calls the right method exactly once
      ctrl.spy.mockClear();
      ctrl.element.click();
      expect(ctrl.spy).toHaveBeenCalledTimes(1);
      if (ctrl.expectedArg !== undefined) {
        expect(ctrl.spy).toHaveBeenCalledWith(ctrl.expectedArg);
      }

      // (b) native button[type="button"] not disabled when enabled
      expect(ctrl.element.tagName.toLowerCase()).toBe('button');
      expect(ctrl.element.getAttribute('type')).toBe('button');
      expect(ctrl.element.disabled).toBe(false);

      // (c) dispatched keydown Enter and Space call NO navigation method
      ctrl.spy.mockClear();
      ctrl.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(ctrl.spy).not.toHaveBeenCalled();

      ctrl.element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      expect(ctrl.spy).not.toHaveBeenCalled();
    }
  });

  it('pagination disabled states', () => {
    // Member 1: Previous is disabled at page 1
    component.totalPages = 5;
    component.current = 1;
    component.bookMarkPagination = false;
    component.ngOnInit();
    fixture.detectChanges();

    const prevAt1 = fixture.nativeElement.querySelector('.dcf-pagination button:first-child') as HTMLButtonElement;
    const nextAt1 = fixture.nativeElement.querySelector('.dcf-pagination button:last-child') as HTMLButtonElement;
    expect(prevAt1.disabled).toBe(true);
    expect(nextAt1.disabled).toBe(false);

    // Member 2: Next is disabled at the last page
    component.current = 5;
    component.ngOnInit();
    fixture.detectChanges();

    const prevAtLast = fixture.nativeElement.querySelector('.dcf-pagination button:first-child') as HTMLButtonElement;
    const nextAtLast = fixture.nativeElement.querySelector('.dcf-pagination button:last-child') as HTMLButtonElement;
    expect(prevAtLast.disabled).toBe(false);
    expect(nextAtLast.disabled).toBe(true);

    // Member 3: Next is disabled with bookmark pagination and no next bookmark
    component.current = 1;
    component.bookMarkPagination = true;
    component.nextBookmark = '';
    component.ngOnInit();
    fixture.detectChanges();

    const nextBookmarkDisabled = fixture.nativeElement.querySelector('.dcf-pagination button:last-child') as HTMLButtonElement;
    expect(nextBookmarkDisabled.disabled).toBe(true);
  });

  it('pagination aria labels', () => {
    translateService.setTranslation('en', en, true);
    translateService.setTranslation('pt', pt, true);

    const languages = [
      {
        lang: 'en',
        prev: en.component.pagination.previous,
        next: en.component.pagination.next,
        pageFn: (p: number) => en.component.pagination.page.replace('{0}', String(p)),
      },
      {
        lang: 'pt',
        prev: pt.component.pagination.previous,
        next: pt.component.pagination.next,
        pageFn: (p: number) => pt.component.pagination.page.replace('{0}', String(p)),
      },
    ];

    for (const { lang, prev, next, pageFn } of languages) {
      translateService.use(lang);
      component.totalPages = 3;
      component.current = 1;
      component.ngOnInit();
      fixture.detectChanges();

      const prevBtn = fixture.nativeElement.querySelector('.dcf-pagination button:first-child') as HTMLButtonElement;
      const nextBtn = fixture.nativeElement.querySelector('.dcf-pagination button:last-child') as HTMLButtonElement;
      expect(prevBtn.getAttribute('aria-label')).toBe(prev);
      expect(nextBtn.getAttribute('aria-label')).toBe(next);

      const pageSpans = Array.from(fixture.nativeElement.querySelectorAll('.page-item')) as HTMLElement[];
      for (const span of pageSpans) {
        const btn = span.closest('button');
        if (!btn) continue;
        const pageNum = Number.parseInt(span.textContent?.trim() || '0', 10);
        expect(btn.getAttribute('aria-label')).toBe(pageFn(pageNum));
      }
    }
  });

  it('pagination layout classes preserved', () => {
    component.totalPages = 5;
    component.current = 2;
    component.disablePages = false;
    component.ngOnInit();
    fixture.detectChanges();

    const pageSpans = Array.from(fixture.nativeElement.querySelectorAll('span.page-item')) as HTMLElement[];
    expect(pageSpans.length).toBe(5);
    const texts = pageSpans.map((s) => s.textContent?.trim());
    expect(texts).toEqual(['01', '02', '03', '04', '05']);

    const activeBtn = fixture.nativeElement.querySelector('.dcf-active') as HTMLElement;
    expect(activeBtn).toBeTruthy();
    expect(activeBtn.textContent).toContain('02');

    // disablePages true
    component.disablePages = true;
    component.ngOnInit();
    fixture.detectChanges();

    const prevBtn = fixture.nativeElement.querySelector('.dcf-pagination button:first-child') as HTMLButtonElement;
    const nextBtn = fixture.nativeElement.querySelector('.dcf-pagination button:last-child') as HTMLButtonElement;
    expect(prevBtn.classList.contains('dcf-nav')).toBe(true);
    expect(prevBtn.classList.contains('dcf-nav-prev')).toBe(true);
    expect(nextBtn.classList.contains('dcf-nav')).toBe(true);
    expect(nextBtn.classList.contains('dcf-nav-next')).toBe(true);
  });
});
