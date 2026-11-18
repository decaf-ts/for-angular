import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../../i18n';
import { EmptyStateComponent } from './empty-state.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  EmptyStateComponent,
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

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;
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
    translateService.setDefaultLang('en');
    translateService.use('en');

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loading announces status', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { component: { loading: 'Loading' } }, true);
    component.refreshing = true;
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain('Loading');
    expect(status.querySelector('ion-spinner')).toBeTruthy();
  });

  it('baseline search subtitle benign term', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'No results for {0}': 'No results for {0}' }, true);

    component.searchValue = 'shoes';
    component.subtitle = 'No results for {0}';
    await component.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    expect(p.nativeElement.textContent).toContain('No results for shoes');
  });

  it('baseline translated html preserved', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'No results for <b>{0}</b>': 'No results for <b>{0}</b>' }, true);

    component.searchValue = 'shoes';
    component.subtitle = 'No results for <b>{0}</b>';
    await component.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    const b = p.query(By.css('b'));
    expect(b).toBeTruthy();
    expect(b.nativeElement.textContent).toBe('shoes');
  });

  it('baseline renders title subtitle button icon', async () => {
    component.title = 'No Items Found';
    component.subtitle = 'Try adjusting your filters';
    component.buttonText = 'Add New';
    component.buttonLink = '/add';
    component.icon = 'ti-folder-open';
    component.showIcon = true;
    component.searchValue = '';
    await component.ngOnInit();
    fixture.detectChanges();

    const titleEl = fixture.debugElement.query(By.css('.dcf-ititle'));
    expect(titleEl).toBeTruthy();
    expect(titleEl.nativeElement.textContent).toContain('No Items Found');

    const subtitleEl = fixture.debugElement.query(By.css('p'));
    expect(subtitleEl).toBeTruthy();
    expect(subtitleEl.nativeElement.textContent).toContain('Try adjusting your filters');

    const buttonEl = fixture.debugElement.query(By.css('ion-button'));
    expect(buttonEl).toBeTruthy();
    expect(buttonEl.nativeElement.textContent).toContain('Add New');

    const iconEl = fixture.debugElement.query(By.css('ngx-decaf-icon'));
    expect(iconEl).toBeTruthy();
  });

  it('regression search term xss', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'No results for {0}': 'No results for {0}' }, true);

    component.searchValue = '<img src=x onerror=alert(1)>';
    component.subtitle = 'No results for {0}';
    await component.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    expect(p.query(By.css('img'))).toBeNull();
    expect(p.nativeElement.querySelector('[onerror]')).toBeNull();
    expect(p.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('search path escapes term and uses safeHtml', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'Results for {0}': 'Results for <span style="color:red"><i>{0}</i></span>' }, true);

    const translateSpy = jest.spyOn(component, 'translate');

    component.searchValue = '<b>test</b>';
    component.subtitle = 'Results for {0}';
    await component.ngOnInit();
    fixture.detectChanges();

    expect(translateSpy).toHaveBeenCalledWith('Results for {0}', { '0': '&lt;b&gt;test&lt;/b&gt;' });

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    const span = p.query(By.css('span'));
    expect(span).toBeTruthy();
    expect(span.nativeElement.getAttribute('style')).toBeTruthy();
    expect(span.nativeElement.getAttribute('style')).toContain('color');
    const i = p.query(By.css('i'));
    expect(i).toBeTruthy();
    expect(i.nativeElement.textContent).toBe('<b>test</b>');
    expect(p.query(By.css('b'))).toBeNull();
  });

  it('translated html kept around escaped term', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'No results for <b>{0}</b>': 'No results for <b>{0}</b>' }, true);

    component.searchValue = 'x';
    component.subtitle = 'No results for <b>{0}</b>';
    await component.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    const b = p.query(By.css('b'));
    expect(b).toBeTruthy();
    expect(b.nativeElement.textContent).toBe('x');
  });

  it('no search value uses default binding', async () => {
    component.searchValue = '';
    component.subtitle = '<b>safe</b><script>alert(1)</script>';
    await component.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    const b = p.query(By.css('b'));
    expect(b).toBeTruthy();
    expect(b.nativeElement.textContent).toBe('safe');
    expect(p.query(By.css('script'))).toBeNull();
    expect(p.nativeElement.innerHTML).not.toContain('<script>');
  });

  // EXPECTED FAILURES: the '"' and "'" cases fail on purpose. THE FIX IS NOT HERE — it belongs in
  // @decaf-ts/ui-decorators, src/ui/utils.ts: escapeHtml (and revertHtml, for the inverse) must
  // escape/revert quotes ("&quot;", "&#39;") alongside "& < >". The shared implementation
  // centralized in the R2-1/R2-2 remediation currently escapes only "& < >", so these assertions
  // see the raw quote where the 5-char contract expects the entity. Quote escaping is not
  // security-required for this text-content sink (quotes cannot break out of a text node); the
  // red tests pin the full contract the old local escapeHtml honoured. Each failing test's NAME
  // carries the pointer so the jest output itself says where to fix. See security-responses.md (R2-1).
  const quoteFixNote =
    ' [INTENTIONAL FAILURE — fix in ui-decorators: escapeHtml in decaf-ts/ui-decorators src/ui/utils.ts must escape &quot; and &#39;]';
  const chars: Array<{ char: string; raw: string; escaped: string; note: string }> = [
    { char: '&', raw: 'foo & bar', escaped: 'foo &amp; bar', note: '' },
    { char: '<', raw: 'foo < bar', escaped: 'foo &lt; bar', note: '' },
    { char: '>', raw: 'foo > bar', escaped: 'foo &gt; bar', note: '' },
    { char: '"', raw: 'foo " bar', escaped: 'foo &quot; bar', note: quoteFixNote },
    { char: "'", raw: "foo ' bar", escaped: 'foo &#39; bar', note: quoteFixNote },
  ];

  it.each(chars)(
    'escaped characters shown literally: $char$note',
    async ({ char, raw, escaped }) => {
      await firstValueFrom(translateService.use('en'));
      translateService.setTranslation('en', { 'Search: {0}': 'Search: {0}' }, true);

      const translateSpy = jest.spyOn(component, 'translate');

      component.searchValue = raw;
      component.subtitle = 'Search: {0}';
      await component.ngOnInit();
      fixture.detectChanges();

      expect(translateSpy).toHaveBeenCalledWith('Search: {0}', { '0': escaped });

      const p = fixture.debugElement.query(By.css('p'));
      expect(p).toBeTruthy();
      expect(p.nativeElement.textContent).toContain(raw);
      expect(p.nativeElement.textContent).toContain(char);
    }
  );

  it('term a&amp;b renders visible text a&amp;b literally', async () => {
    await firstValueFrom(translateService.use('en'));
    translateService.setTranslation('en', { 'Search: {0}': 'Search: {0}' }, true);

    const translateSpy = jest.spyOn(component, 'translate');

    component.searchValue = 'a&amp;b';
    component.subtitle = 'Search: {0}';
    await component.ngOnInit();
    fixture.detectChanges();

    expect(translateSpy).toHaveBeenCalledWith('Search: {0}', { '0': 'a&amp;amp;b' });

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    expect(p.nativeElement.textContent).toContain('a&amp;b');
  });

  it('regression: real list/table searching-branch shape — subtitle arrives pre-interpolated with the ESCAPED term (R2-1)', async () => {
    await firstValueFrom(translateService.use('en'));
    // Real production template (en.json component.list.search.subtitle): the list/table searching
    // branches translate it upstream with escapeHtml(parseSearchValue()), so empty-state receives
    // an already-interpolated sentence whose term was escaped upstream, plus the RAW searchValue.
    const rawTerm = '<img src=x onerror=alert(1)>';
    const template = 'You searched for: <ion-text class="display-block">{0}</ion-text>';
    translateService.setTranslation('en', { [template]: template }, true);

    component.searchValue = rawTerm;
    component.subtitle = template.replace('{0}', '&lt;img src=x onerror=alert(1)&gt;');
    await component.ngOnInit();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
    expect(p.query(By.css('img'))).toBeNull();
    expect(p.nativeElement.querySelector('[onerror]')).toBeNull();
    expect(p.nativeElement.textContent).toContain(rawTerm);
  });

  it('regression: object searchValue (IFilterQuery) must not break initialization (R2-2)', async () => {
    await firstValueFrom(translateService.use('en'));
    const template = 'You searched for: <ion-text class="display-block">{0}</ion-text>';
    translateService.setTranslation('en', { [template]: template }, true);

    // The table URL-params path binds an object searchValue; init must resolve (previously a
    // non-coercing escapeHtml threw TypeError inside awaited ngOnInit, breaking super.initialize()).
    component.searchValue = {
      query: [{ index: 'name', condition: 'eq', value: '<b>x</b>' }],
    } as unknown as string;
    component.subtitle = template.replace('{0}', 'name eq &lt;b&gt;x&lt;/b&gt;');
    await expect(component.ngOnInit()).resolves.toBeUndefined();
    fixture.detectChanges();

    const p = fixture.debugElement.query(By.css('p'));
    expect(p).toBeTruthy();
  });
});
