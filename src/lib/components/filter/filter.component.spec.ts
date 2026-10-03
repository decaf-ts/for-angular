import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { By } from '@angular/platform-browser';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../../i18n';
import { FilterComponent } from './filter.component';
import { IconComponent } from '../icon/icon.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const imports = [
  ForAngularCommonModule,
  FilterComponent,
  TranslateModule.forRoot({
    defaultLanguage: 'en',
    loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
    parser: { provide: TranslateParser, useClass: I18nParser },
  }),
];

describe('FilterComponent combobox', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;
  let translate: TranslateService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');
    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;
    component.indexes = ['name', 'email'];
    component.disableSort = true;
    jest.spyOn(component, 'getSortOptions').mockResolvedValue(component.indexes);
  }));

  async function render(width = 1024): Promise<void> {
    await firstValueFrom(translate.use('en'));
    translate.setTranslation('en', { component: { filter: { remove: 'Remove filter: {0}' } } }, true);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function inputOf(target: ComponentFixture<FilterComponent> = fixture): HTMLInputElement {
    return target.nativeElement.querySelector('input[role="combobox"]');
  }

  function key(input: HTMLInputElement, value: string): void {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('combobox roles and expanded', async () => {
    await render();
    const input = inputOf();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    input.click();
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(fixture.nativeElement.querySelector('[role="listbox"]').id);
  });

  it('regression arrowdown activates option', async () => {
    await render();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    input.click();
    key(input, 'ArrowDown');
    expect(fixture.nativeElement.querySelector('[role="option"][aria-selected="true"]')).toBeTruthy();
  });

  it('listbox option semantics', async () => {
    await render();
    inputOf().click();
    key(inputOf(), 'ArrowDown');
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    const options = Array.from(listbox.querySelectorAll('[role="option"]')) as HTMLElement[];
    expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(inputOf().getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('combobox keyboard model', async () => {
    await render();
    const input = inputOf();
    input.focus();
    input.click();
    key(input, 'ArrowDown');
    const cases = [
      { key: 'ArrowUp', expected: 1 },
      { key: 'ArrowDown', expected: 0 },
      { key: 'Home', expected: 0 },
      { key: 'End', expected: 1 },
    ];
    for (const item of cases) {
      key(input, item.key);
      expect(document.activeElement).toBe(input);
      const options = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[];
      expect(options.findIndex((option) => option.getAttribute('aria-selected') === 'true')).toBe(item.expected);
      expect(input.getAttribute('aria-activedescendant')).toBe(options[item.expected].id);
    }
    key(input, 'Escape');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('enter selects active option once', async () => {
    await render();
    const input = inputOf();
    input.click();
    const select = jest.spyOn(component, 'selectOption');
    key(input, 'ArrowDown');
    key(input, 'Enter');
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith('name');
    expect(component.lastFilter.index).toBe('name');
  });

  it('filter instances independent', async () => {
    await render();
    const second = TestBed.createComponent(FilterComponent);
    second.componentInstance.indexes = ['city', 'country'];
    second.componentInstance.disableSort = true;
    jest.spyOn(second.componentInstance, 'getSortOptions').mockResolvedValue(second.componentInstance.indexes);
    second.detectChanges();
    await second.whenStable();
    second.detectChanges();
    const firstInput = inputOf();
    const secondInput = inputOf(second);
    expect(firstInput.id).not.toBe(secondInput.id);
    firstInput.focus();
    firstInput.click();
    key(firstInput, 'ArrowDown');
    expect(document.activeElement).toBe(firstInput);
    expect(firstInput.getAttribute('aria-activedescendant')).toContain(component.uid);
    expect(secondInput.getAttribute('aria-activedescendant')).toBeNull();
    second.destroy();
  });

  it('chip remove is a labelled button', async () => {
    await render();
    component.filterValue = [{ index: 'name', condition: 'Equal', value: 'Ada' }];
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const removeIcon = fixture.debugElement.queryAll(By.directive(IconComponent)).find((debug) => debug.nativeElement.closest('.dcf-filter-value'));
    const iconComponent = removeIcon?.componentInstance as IconComponent;
    const icon = removeIcon?.nativeElement as HTMLElement;
    const remove = icon?.querySelector('ion-button') as HTMLElement;
    expect(iconComponent.button).toBe(true);
    expect(iconComponent.ariaLabel).toBe('Remove filter: Ada');
    expect(remove).toBeTruthy();
    const nativeButton = remove.shadowRoot?.querySelector('button');
    expect(nativeButton?.getAttribute('aria-label')).toBe('Remove filter: Ada');
    expect(remove.tagName.toLowerCase()).toBe('ion-button');
    for (const keyName of ['Enter', ' ']) {
      component.filterValue = [{ index: 'name', condition: 'Equal', value: 'Ada' }];
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('.dcf-filter-value ion-button') as HTMLElement;
      button.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }));
      // JSDOM lacks the browser's native button key-to-click default action.
      button.click();
      expect(component.filterValue).toHaveLength(0);
    }
  });

  it('mobile branch combobox', async () => {
    await render(390);
    const input = inputOf();
    input.click();
    key(input, 'ArrowDown');
    const listbox = fixture.nativeElement.querySelector('.dcf-filter-component .dcf-dropdown[role="listbox"]');
    expect(listbox).toBeTruthy();
    expect(listbox.querySelector('[role="option"][aria-selected="true"]')).toBeTruthy();
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
  });
});
