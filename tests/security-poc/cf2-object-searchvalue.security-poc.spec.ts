/**
 * [SECURITY-POC] — CF-2: unhandled rejection + degraded init when `searchValue`
 * is an object (independent validation, Exploit Validator, SAA-1632).
 *
 * Finding:  CF-2 (SAA-1629 white-box candidate, Low): EmptyStateComponent.ngOnInit
 *           awaits getSearchSubtitle, whose first statement is
 *           escapeHtml(this.searchValue); escapeHtml (empty-state.component.ts:62-70)
 *           calls text.replace(...) unguarded, so a non-string searchValue throws
 *           TypeError inside the async ngOnInit. Angular does not await ngOnInit,
 *           so the rejection is unhandled and `await super.initialize()`
 *           (empty-state.component.ts:319) never runs — the component is left
 *           uninitialized (searchSubtitle stays undefined).
 *
 * Real-world trigger (pinned revision for-angular abb26f50, v0.12.5):
 *   src/lib/components/table/table.component.ts:204-219 builds an IFilterQuery
 *   OBJECT searchValue from URL query params (`?filter=...&value=...`), and the
 *   table searching branch binds that object verbatim to the empty-state
 *   ([searchValue]="searchValue", table.component.html:244). The list component
 *   accepts object searchValues too (NgxRepositoryDirective.ts:119).
 *
 * Safe effects asserted (no execution, no network, no persistent changes):
 *   - ngOnInit() rejects with TypeError for the real URL-derived object shape.
 *   - searchSubtitle remains undefined (degraded init; escape/render path dead).
 *   - Control: a string searchValue initializes normally and sets searchSubtitle.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { firstValueFrom, Observable, of } from 'rxjs';
import {
  TranslateLoader,
  TranslateModule,
  TranslateParser,
  TranslateService,
  Translation,
} from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../src/lib/for-angular-common.module';
import { I18nParser } from '../../src/lib/i18n';
import { EmptyStateComponent } from '../../src/lib/components/empty-state/empty-state.component';
import realEnTranslations from '../../src/lib/i18n/data/en.json';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

class RealTranslationLoader implements TranslateLoader {
  getTranslation(): Observable<Translation> {
    return of(realEnTranslations as Translation);
  }
}

describe('[SECURITY-POC] CF-2 object searchValue init rejection — R2-2 REMEDIATED (was: unhandled rejection)', () => {
  let componentFixture: ComponentFixture<EmptyStateComponent>;
  let component: EmptyStateComponent;
  let translateService: TranslateService;

  // The exact shape table.component.ts:204-219 derives from URL params
  // `?filter=name&value=foo`.
  const URL_DERIVED_OBJECT_SEARCH_VALUE = {
    query: [
      {
        index: 'name',
        condition: 'Contains',
        value: 'foo',
      },
    ],
    sort: {
      value: 'name',
      direction: 'ASC',
    },
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: RealTranslationLoader,
          },
          parser: {
            provide: TranslateParser,
            useClass: I18nParser,
          },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('en');
    componentFixture = TestBed.createComponent(EmptyStateComponent);
    component = componentFixture.componentInstance;
  }));

  beforeEach(async () => {
    await firstValueFrom(translateService.use('en'));
  });

  it('R2-2 FIXED: object searchValue (URL-derived filter shape) initializes without rejection', async () => {
    component.searchValue = URL_DERIVED_OBJECT_SEARCH_VALUE as unknown as string;
    component.subtitle = 'component.list.search.subtitle';
    // Pre-remediation this rejected with TypeError (non-coercing escapeHtml) and left the
    // component uninitialized; the shared coercing escapeHtml degrades to "[object Object]".
    await expect(component.ngOnInit()).resolves.toBeUndefined();
    expect(component.searchSubtitle).toBeDefined();
  });

  it('R2-2 FIXED: empty object searchValue no longer breaks initialization (truthy object)', async () => {
    component.searchValue = {} as unknown as string;
    await expect(component.ngOnInit()).resolves.toBeUndefined();
  });

  it('CONTROL: string searchValue initializes normally and builds the search subtitle', async () => {
    component.searchValue = 'f<oo';
    component.subtitle = 'component.list.search.subtitle';
    await expect(component.ngOnInit()).resolves.toBeUndefined();
    expect(component.searchSubtitle).toContain('f&lt;oo'); // escaped term (safe key-shape path)
  });
});
