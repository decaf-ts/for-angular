/**
 * @module module:lib/components/storyboard-tutorial/storyboard-tutorial.component.spec
 * @description Component spec for the storyboard tutorial host.
 * @summary Covers interaction blocking/whitelisting, pluggable strategy swap and
 * the start/step/finish lifecycle including navigation survival and the
 * sessionStorage restore path.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { StoryboardTutorialComponent } from './storyboard-tutorial.component';
import { StoryboardTutorialService } from './storyboard-tutorial.service';
import {
  BubbleMessageStrategy,
  TUTORIAL_BUBBLE_CLASS,
} from './storyboard-tutorial.message';
import {
  FadeFocusStrategy,
  HighlightFocusStrategy,
  TUTORIAL_FADE_CLASS,
  TUTORIAL_FADE_TARGET_CLASS,
  TUTORIAL_HIGHLIGHT_CLASS,
  TUTORIAL_HIGHLIGHT_TARGET_CLASS,
} from './storyboard-tutorial.focus';
import {
  StoryboardTutorialScenario,
  TUTORIAL_ACTIVE_CLASS,
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_WHITELIST_ATTRIBUTE,
  TutorialFocusContext,
  TutorialFocusStrategy,
  TutorialMessageContext,
  TutorialMessageStrategy,
} from './storyboard-tutorial.types';

type Ctx = Record<string, unknown>;

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

class SpyFocusStrategy implements TutorialFocusStrategy<Ctx> {
  readonly name: string;
  readonly apply = jest.fn();
  readonly clear = jest.fn();

  constructor(name: string) {
    this.name = name;
  }
}

class SpyMessageStrategy implements TutorialMessageStrategy<Ctx> {
  readonly name: string;
  readonly render = jest.fn();
  readonly clear = jest.fn();

  constructor(name: string) {
    this.name = name;
  }
}

function makeTarget(id: string): HTMLElement {
  const target = document.createElement('button');
  target.id = id;
  target.className = 'spec-target';
  jest.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    left: 10,
    top: 20,
    right: 110,
    bottom: 70,
    width: 100,
    height: 50,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  } as DOMRect);
  document.body.appendChild(target);
  return target;
}

function dispatchKeydown(target: EventTarget): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('StoryboardTutorialComponent', () => {
  let fixture: ComponentFixture<StoryboardTutorialComponent>;
  let component: StoryboardTutorialComponent;

  async function boot(
    scenario: StoryboardTutorialScenario<Ctx>,
    options: {
      autoStart?: boolean;
      focusStrategy?: TutorialFocusStrategy<Ctx>;
      messageStrategy?: TutorialMessageStrategy<Ctx>;
    } = {}
  ): Promise<void> {
    fixture = TestBed.createComponent(StoryboardTutorialComponent);
    component = fixture.componentInstance;
    if (options.focusStrategy) fixture.componentRef.setInput('focusStrategy', options.focusStrategy);
    if (options.messageStrategy) fixture.componentRef.setInput('messageStrategy', options.messageStrategy);
    fixture.componentRef.setInput('scenario', scenario);
    fixture.componentRef.setInput('autoStart', options.autoStart ?? true);
    fixture.componentRef.setInput('persist', false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        StoryboardTutorialComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: I18nFakeLoader } }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
  }));

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    document.querySelectorAll('.spec-target').forEach((element) => element.remove());
    sessionStorage.clear();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(StoryboardTutorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('interaction blocking', () => {
    it('marks whitelisted targets and cuts overlay holes while a step is active', async () => {
      const target = makeTarget('whitelist-on');
      await boot({ id: 'block-on', steps: [{ id: 's1', whitelist: ['#whitelist-on'] }] });

      expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe('true');
      expect(target.style.pointerEvents).toBe('auto');
      expect(component.overlayRef?.nativeElement.style.clipPath).toContain('polygon(evenodd');
      expect(component.overlayRef?.nativeElement.style.clipPath).toContain('10px 20px');
      expect(component.overlayRef?.nativeElement.style.clipPath).toContain('110px 70px');
    });

    it('leaves every element unmarked when a step has no whitelist', async () => {
      const target = makeTarget('whitelist-off');
      await boot({ id: 'block-off', steps: [{ id: 's1' }] });

      expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBeNull();
      expect(target.style.pointerEvents).toBe('');
      expect(component.overlayRef?.nativeElement.style.clipPath).toBe('');
    });

    it('clears the whitelist attribute and overlay clip-path on end', async () => {
      const target = makeTarget('clear-on-end');
      await boot({ id: 'clear-end', steps: [{ id: 's1', whitelist: ['#clear-on-end'] }] });
      expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe('true');

      component.end();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBeNull();
      expect(component.overlayRef?.nativeElement.style.clipPath).toBe('');
      expect(fixture.nativeElement.classList.contains(TUTORIAL_ACTIVE_CLASS)).toBe(false);
    });

    it('clears the whitelist attribute and overlay clip-path on abort', async () => {
      const target = makeTarget('clear-on-abort');
      await boot({ id: 'clear-abort', steps: [{ id: 's1', whitelist: ['#clear-on-abort'] }] });

      component.abort();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBeNull();
      expect(component.overlayRef?.nativeElement.style.clipPath).toBe('');
    });
  });

  describe('keyboard blocking', () => {
    it('prevents keydown on non-whitelisted page elements while a step is active', async () => {
      const whitelisted = makeTarget('keyboard-whitelisted');
      await boot({
        id: 'keyboard-blocked',
        steps: [{ id: 's1', whitelist: ['#keyboard-whitelisted'] }],
      });
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      try {
        expect(whitelisted.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe('true');
        const event = dispatchKeydown(outside);
        expect(event.defaultPrevented).toBe(true);
      } finally {
        outside.remove();
      }
    });

    it('allows keydown on a whitelisted target while a step is active', async () => {
      const target = makeTarget('keyboard-whitelisted-allow');
      await boot({
        id: 'keyboard-allow',
        steps: [{ id: 's1', whitelist: ['#keyboard-whitelisted-allow'] }],
      });

      expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe('true');
      const event = dispatchKeydown(target);
      expect(event.defaultPrevented).toBe(false);
    });

    it('allows keydown inside the tutorial host while a step is active', async () => {
      await boot({ id: 'keyboard-host', steps: [{ id: 's1' }] });

      const event = dispatchKeydown(fixture.nativeElement);
      expect(event.defaultPrevented).toBe(false);
    });

    it('does not block keydown when no tutorial is running', async () => {
      await boot({ id: 'keyboard-idle', steps: [{ id: 's1' }] }, { autoStart: false });
      expect(component.isRunning()).toBe(false);

      const outside = document.createElement('input');
      document.body.appendChild(outside);
      try {
        const event = dispatchKeydown(outside);
        expect(event.defaultPrevented).toBe(false);
      } finally {
        outside.remove();
      }
    });
  });

  describe('bubble navigation controls', () => {
    function bubble(): HTMLElement {
      const element = component.messageHostRef?.nativeElement.querySelector<HTMLElement>(
        `.${TUTORIAL_BUBBLE_CLASS}`
      );
      if (!element) throw new Error('bubble not rendered');
      return element;
    }

    function button(selector: string): HTMLButtonElement {
      const element = bubble().querySelector<HTMLButtonElement>(selector);
      if (!element) throw new Error(`button "${selector}" not rendered`);
      return element;
    }

    function advanceButton(): HTMLButtonElement {
      return button('.dcf-storyboard-tutorial__bubble-primary');
    }

    function previousButton(): HTMLButtonElement {
      return button('.dcf-storyboard-tutorial__bubble-button');
    }

    function skipButton(): HTMLButtonElement {
      return button('.dcf-storyboard-tutorial__bubble-abort');
    }

    function progressText(): string | null {
      return (
        bubble().querySelector('.dcf-storyboard-tutorial__bubble-progress')?.textContent ?? null
      );
    }

    async function flush(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('advances the active step when the bubble Next control is clicked', async () => {
      await boot({
        id: 'bubble-next',
        steps: [{ id: 's1', title: 'One' }, { id: 's2', title: 'Two' }, { id: 's3', title: 'Three' }],
      });
      expect(progressText()).toBe('1 / 3');
      expect(previousButton().disabled).toBe(true);
      expect(advanceButton().textContent).toBe('Next');

      advanceButton().click();
      await flush();

      expect(component.active()?.id).toBe('s2');
      expect(progressText()).toBe('2 / 3');
      expect(previousButton().disabled).toBe(false);
    });

    it('returns to the previous step when the bubble Previous control is clicked', async () => {
      await boot({
        id: 'bubble-previous',
        steps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
      });

      advanceButton().click();
      await flush();
      expect(component.active()?.id).toBe('s2');
      expect(progressText()).toBe('2 / 3');

      previousButton().click();
      await flush();

      expect(component.active()?.id).toBe('s1');
      expect(progressText()).toBe('1 / 3');
      expect(previousButton().disabled).toBe(true);
    });

    it('emits finished(aborted) when the bubble Skip control is clicked', async () => {
      const finished = jest.fn();
      await boot({ id: 'bubble-skip', steps: [{ id: 's1' }, { id: 's2' }] });
      component.finished.subscribe(finished);
      expect(skipButton().textContent).toBe('Skip');

      skipButton().click();
      await flush();

      expect(finished).toHaveBeenCalledWith('aborted');
      expect(component.isRunning()).toBe(false);
    });

    it('focuses the bubble, traps Tab, aborts on Escape and restores prior focus', async () => {
      const opener = document.createElement('button');
      opener.textContent = 'opener';
      document.body.appendChild(opener);
      opener.focus();
      const finished = jest.fn();
      try {
        await boot({ id: 'bubble-focus', steps: [{ id: 's1' }, { id: 's2' }] });
        await flush();
        component.finished.subscribe(finished);

        expect(document.activeElement).toBe(bubble());

        const bubbleButtons = Array.from(
          bubble().querySelectorAll<HTMLButtonElement>('button:not([disabled])')
        );
        bubbleButtons[bubbleButtons.length - 1].focus();
        bubble().dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
        );
        expect(document.activeElement).toBe(bubbleButtons[0]);

        bubble().dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
        );
        await flush();

        expect(finished).toHaveBeenCalledWith('aborted');
        expect(document.activeElement).toBe(opener);
      } finally {
        opener.remove();
      }
    });

    it('shows Finish on a final step and reports the progress text', async () => {
      await boot({
        id: 'bubble-final',
        steps: [{ id: 's1' }, { id: 's2', final: true }, { id: 's3' }],
      });
      expect(advanceButton().textContent).toBe('Next');

      advanceButton().click();
      await flush();

      expect(component.active()?.id).toBe('s2');
      expect(advanceButton().textContent).toBe('Finish');
      expect(progressText()).toBe('2 / 3');
    });

    it('shows Finish on the last step', async () => {
      await boot({ id: 'bubble-last', steps: [{ id: 's1' }, { id: 's2' }] });

      advanceButton().click();
      await flush();

      expect(component.active()?.id).toBe('s2');
      expect(advanceButton().textContent).toBe('Finish');
      expect(progressText()).toBe('2 / 2');
    });
  });

  describe('pluggable completion', () => {
    async function flush(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('completes from the scenario-level action when the step does not define one', async () => {
      const target = makeTarget('scenario-action-default');
      await boot({
        id: 'scenario-action-default',
        completion: { action: { type: 'click', selector: '#scenario-action-default' } },
        steps: [{ id: 's1' }, { id: 's2' }],
      });

      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(component.active()?.id).toBe('s2');
    });

    it('lets a step action override the scenario action', async () => {
      const scenarioTarget = makeTarget('scenario-action-override');
      const stepTarget = makeTarget('step-action-override');
      await boot({
        id: 'action-override',
        completion: { action: { type: 'click', selector: '#scenario-action-override' } },
        steps: [
          {
            id: 's1',
            completion: { action: { type: 'click', selector: '#step-action-override' } },
          },
          { id: 's2' },
        ],
      });

      scenarioTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(component.active()?.id).toBe('s1');

      stepTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(component.active()?.id).toBe('s2');
    });

    it('detects actions only within the step whitelist when no action selector is set', async () => {
      const whitelisted = makeTarget('whitelist-action');
      const blocked = makeTarget('whitelist-action-blocked');
      await boot({
        id: 'whitelist-action',
        steps: [
          {
            id: 's1',
            whitelist: ['#whitelist-action'],
            completion: { action: { type: 'click' } },
          },
          { id: 's2' },
        ],
      });

      blocked.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(component.active()?.id).toBe('s1');

      whitelisted.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(component.active()?.id).toBe('s2');
    });

    it('advances when the bubble close control is clicked', async () => {
      await boot({
        id: 'close-trigger',
        completion: { minTime: 0 },
        steps: [{ id: 's1' }, { id: 's2' }],
      });

      const close = component.messageHostRef?.nativeElement.querySelector<HTMLButtonElement>(
        '.dcf-storyboard-tutorial__bubble-close'
      );
      expect(close).toBeTruthy();

      close!.click();
      await flush();

      expect(component.active()?.id).toBe('s2');
    });

    it('advances when the app calls the exposed complete API', async () => {
      await boot({ id: 'imperative-component', steps: [{ id: 's1' }, { id: 's2' }] });

      expect(await component.complete('external')).toBe(true);
      await flush();

      expect(component.active()?.id).toBe('s2');
    });

    it('tears the action detection down on destroy', async () => {
      const target = makeTarget('destroy-action');
      const service = TestBed.inject(StoryboardTutorialService);
      await boot({
        id: 'destroy-action',
        steps: [
          {
            id: 's1',
            completion: { action: { type: 'click', selector: '#destroy-action' } },
          },
          { id: 's2' },
        ],
      });

      fixture.destroy();
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();

      expect(service.active()?.id).toBe('s1');
    });
  });

  describe('strategy swap', () => {
    it('lets a step-level focus and message override the scenario defaults', async () => {
      const scenarioFocus = new SpyFocusStrategy('scenario-focus');
      const scenarioMessage = new SpyMessageStrategy('scenario-message');
      const stepFocus = new SpyFocusStrategy('step-focus');
      const stepMessage = new SpyMessageStrategy('step-message');
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: 'override',
        focus: scenarioFocus,
        message: scenarioMessage,
        steps: [{ id: 's1', focus: stepFocus, message: stepMessage }],
      };

      await boot(scenario);

      expect(stepFocus.apply).toHaveBeenCalled();
      expect(stepMessage.render).toHaveBeenCalled();
      expect(scenarioFocus.apply).not.toHaveBeenCalled();
      expect(scenarioMessage.render).not.toHaveBeenCalled();
      expect(stepFocus.name).toBe('step-focus');
      expect(stepMessage.name).toBe('step-message');
    });

    it('uses the scenario-level strategy when the step does not define one', async () => {
      const scenarioFocus = new SpyFocusStrategy('scenario-focus');
      const scenarioMessage = new SpyMessageStrategy('scenario-message');
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: 'scenario-default',
        focus: scenarioFocus,
        message: scenarioMessage,
        steps: [{ id: 's1' }],
      };

      await boot(scenario);

      expect(scenarioFocus.apply).toHaveBeenCalled();
      expect(scenarioMessage.render).toHaveBeenCalled();
    });

    it('uses the component-level strategy when neither step nor scenario defines one', async () => {
      const componentFocus = new SpyFocusStrategy('component-focus');
      const componentMessage = new SpyMessageStrategy('component-message');

      await boot(
        { id: 'component-default', steps: [{ id: 's1' }] },
        { focusStrategy: componentFocus, messageStrategy: componentMessage }
      );

      expect(componentFocus.apply).toHaveBeenCalled();
      expect(componentMessage.render).toHaveBeenCalled();
    });

    it('falls back to the fade focus and bubble message strategies', async () => {
      await boot({ id: 'builtin-default', steps: [{ id: 's1', title: 'Title' }] });

      expect(new FadeFocusStrategy().name).toBe('fade');
      expect(new HighlightFocusStrategy().name).toBe('highlight');
      expect(new BubbleMessageStrategy().name).toBe('bubble');
      expect(component.overlayRef?.nativeElement.classList.contains(TUTORIAL_FADE_CLASS)).toBe(true);
      expect(
        component.messageHostRef?.nativeElement.querySelector(`.${TUTORIAL_BUBBLE_CLASS}`)
      ).toBeTruthy();
    });

    it('applies the highlight classes when a step overrides with a highlight strategy', async () => {
      const target = makeTarget('highlight-target');
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: 'highlight',
        focus: new FadeFocusStrategy(),
        steps: [
          {
            id: 's1',
            focus: new HighlightFocusStrategy(),
            whitelist: ['#highlight-target'],
          },
        ],
      };

      await boot(scenario);

      expect(component.overlayRef?.nativeElement.classList.contains(TUTORIAL_HIGHLIGHT_CLASS)).toBe(true);
      expect(component.overlayRef?.nativeElement.classList.contains(TUTORIAL_FADE_CLASS)).toBe(false);
      expect(target.classList.contains(TUTORIAL_HIGHLIGHT_TARGET_CLASS)).toBe(true);
      expect(target.classList.contains(TUTORIAL_FADE_TARGET_CLASS)).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('emits started, stepped and finished(completed) across a run', async () => {
      const started = jest.fn();
      const stepped = jest.fn();
      const finished = jest.fn();
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: 'lifecycle',
        steps: [{ id: 's1' }, { id: 's2' }],
      };

      await boot(scenario);
      component.started.subscribe(started);
      component.stepped.subscribe(stepped);
      component.finished.subscribe(finished);
      expect(component.isRunning()).toBe(true);

      await component.next();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(stepped).toHaveBeenCalledTimes(1);

      component.end();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(finished).toHaveBeenCalledWith('completed');
      expect(component.isRunning()).toBe(false);
    });

    it('emits finished(aborted) on abort', async () => {
      const finished = jest.fn();
      await boot({ id: 'aborted', steps: [{ id: 's1' }, { id: 's2' }] });
      component.finished.subscribe(finished);

      component.abort();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(finished).toHaveBeenCalledWith('aborted');
      expect(component.isRunning()).toBe(false);
    });

    it('emits started exactly once for the initial autoStart', async () => {
      const started = jest.fn();
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: 'auto-start',
        steps: [{ id: 's1' }, { id: 's2' }],
      };

      fixture = TestBed.createComponent(StoryboardTutorialComponent);
      component = fixture.componentInstance;
      component.started.subscribe(started);
      fixture.componentRef.setInput('scenario', scenario);
      fixture.componentRef.setInput('autoStart', true);
      fixture.componentRef.setInput('persist', false);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(started).toHaveBeenCalledTimes(1);
      expect(started.mock.calls[0][0].steps[0].id).toBe('s1');
      expect(component.isRunning()).toBe(true);
      expect(component.active()?.id).toBe('s1');
    });

    it('survives a component destroy and recreate against the same root service', async () => {
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: 'navigation',
        steps: [{ id: 's1' }, { id: 's2' }],
      };

      await boot(scenario);
      const service = TestBed.inject(StoryboardTutorialService);
      await component.next();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(service.active()?.id).toBe('s2');

      fixture.destroy();
      expect(service.active()?.id).toBe('s2');
      expect(service.isRunning()).toBe(true);

      const resumedStarted = jest.fn();
      fixture = TestBed.createComponent(StoryboardTutorialComponent);
      component = fixture.componentInstance;
      component.started.subscribe(resumedStarted);
      fixture.componentRef.setInput('scenario', scenario);
      fixture.componentRef.setInput('autoStart', true);
      fixture.componentRef.setInput('persist', false);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(service.active()?.id).toBe('s2');
      expect(fixture.nativeElement.classList.contains(TUTORIAL_ACTIVE_CLASS)).toBe(true);
      expect(resumedStarted).toHaveBeenCalledTimes(1);
    });

    it('restores a run from the sessionStorage snapshot on a fresh service', async () => {
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: 'persisted',
        persist: true,
        steps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
      };

      await boot(scenario, { autoStart: false });
      const service = TestBed.inject(StoryboardTutorialService);
      service.start(scenario);
      await service.next();
      await service.next();

      const raw = sessionStorage.getItem(TUTORIAL_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const snapshot = JSON.parse(raw as string);
      expect(snapshot.scenarioId).toBe('persisted');
      expect(snapshot.completed).toEqual(['s1', 's2']);
      expect(snapshot.cursor).toBe(2);

      const reloaded = new StoryboardTutorialService<Ctx>();
      reloaded.bind(scenario, { persist: true });

      expect(reloaded.active()?.id).toBe('s3');
      expect(reloaded.state()?.completed).toEqual(['s1', 's2']);
      expect(reloaded.isRunning()).toBe(true);
      reloaded.clearPersisted();
      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull();
    });
  });
});
