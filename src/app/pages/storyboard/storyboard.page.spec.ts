/**
 * @module for-angular/app/pages/storyboard/storyboard.page.spec
 * @summary SAA-1473 `/storyboard` demo page contract.
 * @description Proves the demo page exposes the four-step tour with a final
 * finish step, confirms the playground name, and projects the tutorial
 * lifecycle events into the visible last-event line. The interactive
 * start/next/end flow is covered end-to-end in
 * `tests/playwright/features/storyboard.spec.ts`.
 */
import type { Signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import type {
  StoryboardTutorialScenario,
  StoryboardTutorialState,
  TutorialStatus,
} from '@decaf-ts/for-angular/storyboard';
import { StoryboardPage } from './storyboard.page';

const TOUR_TRANSLATIONS: Record<string, string> = {
  'storyboard.event_none': 'No storyboard event yet.',
  'storyboard.event_started': 'started {{id}}',
  'storyboard.event_stepped': 'stepped {{step}}',
  'storyboard.event_finished': 'finished {{status}}',
  'storyboard.status_completed': 'completed',
};

class TourTranslateLoader implements TranslateLoader {
  getTranslation() {
    return of(TOUR_TRANSLATIONS);
  }
}

interface StoryboardPageInternals {
  name: WritableSignal<string>;
  confirmedValue: WritableSignal<string>;
  lastEvent: WritableSignal<string>;
  status: Signal<TutorialStatus>;
  scenario: StoryboardTutorialScenario;
  ngOnInit(): void;
  onNameInput(event: Event): void;
  confirm(): void;
  onStarted(state: StoryboardTutorialState): void;
  onStepped(state: StoryboardTutorialState): void;
  onFinished(status: TutorialStatus): void;
}

function createPage(): StoryboardPageInternals {
  return TestBed.runInInjectionContext(
    () => new StoryboardPage()
  ) as unknown as StoryboardPageInternals;
}

function state(stepTitle: string): StoryboardTutorialState {
  return {
    scenarioId: 'for-angular-feature-page-tour',
    cursor: 1,
    completed: [],
    context: {},
    steps: [{ id: 'name', title: stepTitle }],
  } as unknown as StoryboardTutorialState;
}

describe('StoryboardPage — scenario and event projection (SAA-1473)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TourTranslateLoader },
        }),
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', TOUR_TRANSLATIONS);
    translate.use('en');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('exposes the four demo tour steps ending with the finish step', () => {
    const page = createPage();

    expect(page.scenario.id).toBe('for-angular-feature-page-tour');
    expect(page.scenario.steps).toHaveLength(4);
    expect(page.scenario.steps.map((step) => step.id)).toEqual([
      'welcome',
      'name',
      'confirm',
      'finish',
    ]);
    expect(page.scenario.steps[0].target).toBe('[data-tutorial="playground"]');
    expect(page.scenario.steps[3].final).toBe(true);
    expect(page.scenario.persist).toBe(false);
  });

  it('starts idle with the neutral event line', () => {
    const page = createPage();

    page.ngOnInit();

    expect(page.status()).toBe('idle');
    expect(page.lastEvent()).toBe('No storyboard event yet.');
  });

  it('confirms the typed name into the playground result', () => {
    const page = createPage();

    page.onNameInput({ target: { value: 'Ada Lovelace' } } as unknown as Event);
    page.confirm();

    expect(page.name()).toBe('Ada Lovelace');
    expect(page.confirmedValue()).toBe('Ada Lovelace');
  });

  it('projects start, step, and finish events into the last-event line', () => {
    const page = createPage();

    page.onStarted(state('Welcome'));
    expect(page.lastEvent()).toContain('for-angular-feature-page-tour');

    page.onStepped(state('Name the workspace'));
    expect(page.lastEvent()).toContain('Name the workspace');

    page.onFinished('completed');
    expect(page.lastEvent()).toContain('completed');
  });
});
