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

  const chars = [
    { char: '&', raw: 'foo & bar', escaped: 'foo &amp; bar' },
    { char: '<', raw: 'foo < bar', escaped: 'foo &lt; bar' },
    { char: '>', raw: 'foo > bar', escaped: 'foo &gt; bar' },
    { char: '"', raw: 'foo " bar', escaped: 'foo &quot; bar' },
    { char: "'", raw: "foo ' bar", escaped: 'foo &#39; bar' },
  ];

  it.each(chars)(
    'escaped characters shown literally: $char',
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
});
