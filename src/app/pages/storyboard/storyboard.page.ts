import { Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  StoryboardTutorialComponent,
  StoryboardTutorialService,
  type StoryboardTutorialScenario,
  type StoryboardTutorialState,
  type TutorialStatus,
  type TutorialFocusContext,
  type TutorialFocusStrategy,
} from '@decaf-ts/for-angular/storyboard';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/lib/components';

const CONTROLS_TARGET = '[data-tutorial="controls"]';

/**
 * Non-blocking spotlight used by the demo page: it dims the page and outlines
 * the active target while leaving the page controls reachable, so the tour and
 * the inspected feature can be used side by side.
 */
class SoftSpotlightFocusStrategy implements TutorialFocusStrategy {
  readonly name = 'soft-spotlight';

  apply(context: TutorialFocusContext): void {
    context.overlay.classList.add('storyboard-page__overlay--soft');
    context.overlay.style.pointerEvents = 'none';
    context.overlay.style.clipPath = 'none';
    context.targets.forEach((target) =>
      target.classList.add('storyboard-page__focus-target')
    );
  }

  clear(context: TutorialFocusContext): void {
    context.overlay.classList.remove('storyboard-page__overlay--soft');
    context.overlay.style.pointerEvents = '';
    context.overlay.style.clipPath = '';
    context.targets.forEach((target) =>
      target.classList.remove('storyboard-page__focus-target')
    );
  }
}

/**
 * `/storyboard` demo page: runs a translated four-step
 * `StoryboardTutorialComponent` scenario over an interactive playground, using
 * a non-blocking soft-spotlight focus strategy and reporting each lifecycle
 * event.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-storyboard-page',
  imports: [
    IonContent,
    HeaderComponent,
    ContainerComponent,
    TranslatePipe,
    StoryboardTutorialComponent,
  ],
  templateUrl: './storyboard.page.html',
  styleUrl: './storyboard.page.scss',
})
export class StoryboardPage implements OnInit, OnDestroy {
  @ViewChild(StoryboardTutorialComponent)
  private tutorial?: StoryboardTutorialComponent;

  private readonly translate = inject(TranslateService);

  private readonly tutorialService = inject(StoryboardTutorialService);

  protected readonly name = signal('');

  protected readonly confirmedValue = signal('');

  protected readonly lastEvent = signal('');

  protected readonly status = this.tutorialService.status;

  protected readonly active = this.tutorialService.active;

  protected readonly statusKey = computed(() => `storyboard.status_${this.status()}`);

  protected readonly scenario: StoryboardTutorialScenario = {
    id: 'for-angular-feature-page-tour',
    name: this.translate.instant('storyboard.scenario_name'),
    persist: false,
    focus: new SoftSpotlightFocusStrategy(),
    labels: {
      previous: this.translate.instant('storyboard.previous'),
      next: this.translate.instant('storyboard.next'),
      finish: this.translate.instant('storyboard.end'),
      abort: this.translate.instant('storyboard.abort'),
      close: this.translate.instant('storyboard.close'),
      progress: '{current} / {total}',
    },
    steps: [
      {
        id: 'welcome',
        title: this.translate.instant('storyboard.welcome_title'),
        content: this.translate.instant('storyboard.welcome_content'),
        target: '[data-tutorial="playground"]',
        placement: 'bottom',
        whitelist: [CONTROLS_TARGET],
      },
      {
        id: 'name',
        title: this.translate.instant('storyboard.name_title'),
        content: this.translate.instant('storyboard.name_content'),
        target: '#tutorial-name',
        placement: 'bottom',
        whitelist: ['#tutorial-name', CONTROLS_TARGET],
      },
      {
        id: 'confirm',
        title: this.translate.instant('storyboard.confirm_title'),
        content: this.translate.instant('storyboard.confirm_content'),
        target: '[data-tutorial="confirm"]',
        placement: 'top',
        whitelist: ['[data-tutorial="confirm"]', CONTROLS_TARGET],
      },
      {
        id: 'finish',
        title: this.translate.instant('storyboard.finish_title'),
        content: this.translate.instant('storyboard.finish_content'),
        placement: 'center',
        final: true,
        whitelist: [CONTROLS_TARGET],
      },
    ],
  };

  ngOnInit(): void {
    this.tutorialService.clearPersisted();
    this.lastEvent.set(this.translate.instant('storyboard.event_none'));
  }

  ngOnDestroy(): void {
    if (this.status() === 'running') {
      this.tutorialService.abort();
    }
  }

  protected start(): void {
    this.tutorial?.start();
  }

  protected next(): void {
    void this.tutorial?.next();
  }

  protected previous(): void {
    this.tutorial?.previous();
  }

  protected abort(): void {
    this.tutorial?.abort();
  }

  protected end(): void {
    this.tutorial?.end();
  }

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected confirm(): void {
    this.confirmedValue.set(this.name());
  }

  protected onStarted(state: StoryboardTutorialState): void {
    this.lastEvent.set(
      this.translate.instant('storyboard.event_started', {
        id: state.scenarioId,
      })
    );
  }

  protected onStepped(state: StoryboardTutorialState): void {
    const step = state.steps[0];
    this.lastEvent.set(
      this.translate.instant('storyboard.event_stepped', {
        step: step?.title ?? String(state.cursor),
      })
    );
  }

  protected onFinished(status: TutorialStatus): void {
    this.lastEvent.set(
      this.translate.instant('storyboard.event_finished', {
        status: this.translate.instant(`storyboard.status_${status}`),
      })
    );
  }
}
