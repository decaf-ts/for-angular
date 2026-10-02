import { Component, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { fireEvent, userEvent, waitFor } from 'storybook/test';
import {
  StoryboardTutorialComponent,
  StoryboardTutorialService,
  type StoryboardTutorialLabels,
  type StoryboardTutorialScenario,
  type StoryboardTutorialState,
  type TutorialFocusContext,
  type TutorialFocusStrategy,
  type TutorialMessageContext,
  type TutorialMessageStrategy,
  type TutorialStatus,
} from 'src/lib/components/storyboard-tutorial';
import './setup';
import { getComponentMeta } from './utils';

/**
 * Custom focus strategy local to the stories.
 *
 * Demonstrates the pluggable `TutorialFocusStrategy` contract: it dims the page
 * and pulses the whitelisted targets instead of the built-in fade/highlight.
 */
class PulseFocusStrategy implements TutorialFocusStrategy {
  readonly name = 'pulse';

  apply(context: TutorialFocusContext): void {
    context.overlay.classList.add('sb-tut-overlay--pulse');
    context.targets.forEach((target) => target.classList.add('sb-tut-target--pulse'));
  }

  clear(context: TutorialFocusContext): void {
    context.overlay.classList.remove('sb-tut-overlay--pulse');
    context.targets.forEach((target) => target.classList.remove('sb-tut-target--pulse'));
  }
}

/**
 * Custom message strategy local to the stories.
 *
 * Demonstrates the pluggable `TutorialMessageStrategy` contract with a distinct
 * panel look and the resolved `StoryboardTutorialLabels` (including custom ones).
 */
class PanelMessageStrategy implements TutorialMessageStrategy {
  readonly name = 'panel';

  render(context: TutorialMessageContext): void {
    this.clear(context);
    const doc = context.container.ownerDocument;
    const panel = doc.createElement('div');
    panel.className = 'sb-tut-panel';
    panel.setAttribute('role', 'dialog');

    const title = doc.createElement('h4');
    title.className = 'sb-tut-panel__title';
    title.textContent = context.step.title ?? 'Tutorial';
    panel.appendChild(title);

    const content = doc.createElement('p');
    content.className = 'sb-tut-panel__content';
    content.textContent = context.step.content ?? '';
    panel.appendChild(content);

    const footer = doc.createElement('div');
    footer.className = 'sb-tut-panel__footer';

    const total = context.state.completed.length + context.state.steps.length;
    const progress = doc.createElement('span');
    progress.className = 'sb-tut-panel__progress';
    progress.textContent = (context.labels.progress ?? '{current} / {total}')
      .replace('{current}', String(context.state.completed.length + 1))
      .replace('{total}', String(total));
    footer.appendChild(progress);

    const previous = this.button(doc, context.labels.previous ?? 'Previous', () => context.controls.previous());
    previous.disabled = context.state.cursor === 0;
    footer.appendChild(previous);

    const isLast = !!context.step.final || context.state.steps.length <= 1;
    footer.appendChild(
      this.button(doc, isLast ? context.labels.finish ?? 'Finish' : context.labels.next ?? 'Next', () => {
        void context.controls.complete('next');
      })
    );
    footer.appendChild(this.button(doc, context.labels.abort ?? 'Skip', () => context.controls.abort()));

    panel.appendChild(footer);
    context.container.appendChild(panel);
  }

  clear(context: TutorialMessageContext): void {
    context.container.querySelectorAll('.sb-tut-panel').forEach((panel) => panel.remove());
  }

  private button(doc: Document, label: string, handler: () => void): HTMLButtonElement {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'sb-tut-panel__button';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }
}

/**
 * Storybook-local simulated app + tutorial host.
 *
 * Renders a realistic multi-section settings/list/form mock with stable selectors,
 * hosts `StoryboardTutorialComponent`, and exposes its inputs plus a programmatic
 * control bar and event log so `started`/`stepped`/`finished` are inspectable.
 *
 * The root `StoryboardTutorialService` is a singleton, so the harness resets it on
 * construction and teardown; otherwise a run from a previously viewed story would
 * bleed into the next one.
 */
@Component({
  selector: 'ngx-decaf-story-tutorial',
  standalone: true,
  imports: [StoryboardTutorialComponent],
  template: `
    <section class="sb-tut">
      <div class="sb-tut__app">
        <nav class="sb-tut__nav">
          <button id="sb-tut-nav-dashboard" type="button">Dashboard</button>
          <button id="sb-tut-nav-settings" type="button">Settings</button>
          <button id="sb-tut-nav-reports" type="button">Reports</button>
        </nav>

        <section id="sb-tut-settings-panel" class="sb-tut__panel">
          <h3 class="sb-tut__panel-title">Workspace settings</h3>
          <label for="sb-tut-settings-name">Workspace name</label>
          <input id="sb-tut-settings-name" type="text" placeholder="Acme workspace" />
          <label class="sb-tut__toggle">
            <input id="sb-tut-settings-toggle" type="checkbox" />
            Enable weekly digest
          </label>
        </section>

        <section id="sb-tut-list" class="sb-tut__panel">
          <h3 class="sb-tut__panel-title">Team members</h3>
          <ul class="sb-tut__list">
            <li class="sb-tut-list-item">Ada Lovelace</li>
            <li class="sb-tut-list-item">Grace Hopper</li>
            <li class="sb-tut-list-item">Alan Turing</li>
          </ul>
        </section>

        <section id="sb-tut-form" class="sb-tut__panel">
          <h3 class="sb-tut__panel-title">Invite a teammate</h3>
          <input id="sb-tut-form-email" type="email" placeholder="teammate@example.com" />
          <button id="sb-tut-form-save" type="button">Send invite</button>
        </section>

        <section id="sb-tut-slider" class="sb-tut__panel">
          <h3 class="sb-tut__panel-title">Alert threshold</h3>
          <div id="sb-tut-slider-track" class="sb-tut__slider" role="slider" aria-valuenow="50">
            <span id="sb-tut-slider-handle" class="sb-tut__slider-handle">50</span>
          </div>
        </section>

        <section id="sb-tut-notes" class="sb-tut__panel">
          <h3 class="sb-tut__panel-title">Release notes</h3>
          <p>Draft the next release notes here.</p>
        </section>
      </div>

      <div class="sb-tut__toolbar">
        <button type="button" data-testid="tutorial-start" (click)="startTutorial()">Start</button>
        <button type="button" data-testid="tutorial-next" (click)="next()">Next</button>
        <button type="button" data-testid="tutorial-previous" (click)="previous()">Previous</button>
        <button type="button" data-testid="tutorial-complete" (click)="complete()">Complete</button>
        <button type="button" data-testid="tutorial-abort" (click)="abort()">Abort</button>
      </div>

      <div class="sb-tut__log" data-testid="tutorial-log">{{ log }}</div>

      <ngx-decaf-storyboard-tutorial
        [scenario]="scenario"
        [autoStart]="autoStart"
        [persist]="persist"
        [focusStrategy]="focusStrategy"
        [messageStrategy]="messageStrategy"
        (started)="onStarted($event)"
        (stepped)="onStepped($event)"
        (finished)="onFinished($event)"
      ></ngx-decaf-storyboard-tutorial>
    </section>
  `,
  styles: [
    `
      .sb-tut {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .sb-tut__app {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 0.75rem;
        background: #fafafa;
      }
      .sb-tut__nav {
        display: flex;
        gap: 0.5rem;
        grid-column: 1 / -1;
      }
      .sb-tut__panel {
        border: 1px solid #e6e6e6;
        border-radius: 6px;
        padding: 0.6rem;
        background: #fff;
      }
      .sb-tut__panel-title {
        margin: 0 0 0.4rem;
        font-size: 0.85rem;
      }
      .sb-tut__toggle {
        display: flex;
        gap: 0.35rem;
        align-items: center;
        font-size: 0.8rem;
      }
      .sb-tut__list {
        margin: 0;
        padding-left: 1rem;
        font-size: 0.85rem;
      }
      .sb-tut__slider {
        position: relative;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(90deg, #5b8def 50%, #e0e0e0 50%);
      }
      .sb-tut__slider-handle {
        position: absolute;
        top: -5px;
        left: 50%;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #5b8def;
        color: #fff;
        font-size: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .sb-tut__toolbar {
        position: relative;
        z-index: 10000;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .sb-tut__log {
        position: relative;
        z-index: 10000;
        font-family: monospace;
        font-size: 0.75rem;
        padding: 0.35rem 0.5rem;
        border-radius: 6px;
        background: #eef3f8;
      }
      .sb-tut-overlay--pulse {
        background: rgba(91, 141, 239, 0.25);
      }
      .sb-tut-target--pulse {
        outline: 3px dashed #5b8def;
        outline-offset: 3px;
      }
      .sb-tut-panel {
        position: absolute;
        left: 1rem;
        bottom: 1rem;
        max-width: 320px;
        padding: 0.75rem 0.9rem;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      }
      .sb-tut-panel__title {
        margin: 0 0 0.35rem;
        font-size: 0.95rem;
      }
      .sb-tut-panel__content {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
      }
      .sb-tut-panel__footer {
        display: flex;
        gap: 0.4rem;
        align-items: center;
      }
      .sb-tut-panel__progress {
        font-size: 0.75rem;
        opacity: 0.6;
        margin-right: auto;
      }
      .sb-tut-panel__button {
        padding: 0.3rem 0.7rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
      }
    `,
  ],
})
class TutorialStoryHostComponent implements OnDestroy {
  @Input() scenario?: StoryboardTutorialScenario;
  @Input() autoStart = false;
  @Input() persist = false;
  @Input() focusStrategy?: TutorialFocusStrategy;
  @Input() messageStrategy?: TutorialMessageStrategy;

  log = 'no event yet';

  @ViewChild(StoryboardTutorialComponent) tutorial?: StoryboardTutorialComponent;

  private readonly service = inject(StoryboardTutorialService);

  constructor() {
    if (this.service.isRunning()) this.service.abort();
    this.service.clearPersisted();
  }

  ngOnDestroy(): void {
    this.service.abort();
    this.service.clearPersisted();
  }

  startTutorial(): void {
    this.tutorial?.start();
  }

  next(): void {
    void this.tutorial?.next();
  }

  previous(): void {
    this.tutorial?.previous();
  }

  complete(): void {
    void this.tutorial?.complete('external');
  }

  abort(): void {
    this.tutorial?.abort();
  }

  onStarted(state: StoryboardTutorialState): void {
    this.log = `started: ${state.steps[0]?.id ?? '-'}`;
  }

  onStepped(state: StoryboardTutorialState): void {
    this.log = `stepped: ${state.steps[0]?.id ?? '-'}`;
  }

  onFinished(status: TutorialStatus): void {
    this.log = `finished: ${status}`;
  }
}

/** Shared labels used to exercise the `StoryboardTutorialLabels` surface. */
const CUSTOM_LABELS: StoryboardTutorialLabels = {
  previous: 'Back',
  next: 'Continue',
  finish: 'Got it',
  abort: 'Quit tour',
  close: 'Dismiss',
  progress: 'Step {current} of {total}',
};

/** One step per `TutorialPlacement` value. */
function placementScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-placement-values',
    name: 'Placement values',
    steps: [
      {
        id: 'placement-top',
        title: 'Top placement',
        content: 'The instruction bubble is anchored above the Dashboard tab.',
        target: '#sb-tut-nav-dashboard',
        whitelist: ['#sb-tut-nav-dashboard'],
        placement: 'top',
      },
      {
        id: 'placement-bottom',
        title: 'Bottom placement',
        content: 'The instruction bubble is anchored below the Settings tab.',
        target: '#sb-tut-nav-settings',
        whitelist: ['#sb-tut-nav-settings'],
        placement: 'bottom',
      },
      {
        id: 'placement-left',
        title: 'Left placement',
        content: 'The instruction bubble is anchored to the left of the Reports tab.',
        target: '#sb-tut-nav-reports',
        whitelist: ['#sb-tut-nav-reports'],
        placement: 'left',
      },
      {
        id: 'placement-right',
        title: 'Right placement',
        content: 'The instruction bubble is anchored to the right of the workspace name field.',
        target: '#sb-tut-settings-name',
        whitelist: ['#sb-tut-settings-name'],
        placement: 'right',
      },
      {
        id: 'placement-center',
        title: 'Center placement',
        content: 'The instruction bubble is centered over the tutorial.',
        target: '#sb-tut-notes',
        whitelist: ['#sb-tut-notes'],
        placement: 'center',
        final: true,
      },
    ],
  };
}

/** Scenario where the scenario-level timeout auto-advances each step. */
function timeoutScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-timeout-completion',
    name: 'Timeout completion',
    completion: { timeout: 3000 },
    steps: [
      { id: 'timeout-1', title: 'Welcome', content: 'This step advances automatically after three seconds.', target: '#sb-tut-nav-dashboard', whitelist: ['#sb-tut-nav-dashboard'], placement: 'bottom' },
      { id: 'timeout-2', title: 'Auto-advance', content: 'Each step carries a scenario-level timeout.', target: '#sb-tut-nav-settings', whitelist: ['#sb-tut-nav-settings'], placement: 'bottom' },
      { id: 'timeout-3', title: 'Done', content: 'The last step also auto-advances.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', final: true },
    ],
  };
}

/** Scenario covering a `click` action with an explicit selector and button. */
function clickScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-action-click',
    name: 'Click action',
    steps: [
      {
        id: 'click-1',
        title: 'Open settings',
        content: 'Click the Settings tab to continue.',
        target: '#sb-tut-nav-settings',
        whitelist: ['#sb-tut-nav-settings'],
        placement: 'bottom',
        completion: { action: { type: 'click', selector: '#sb-tut-nav-settings', button: 0 } },
      },
      { id: 'click-2', title: 'Done', content: 'The click completed the step.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', final: true },
    ],
  };
}

/** Scenario covering the `input` action with `minLength` and a `minTime` floor. */
function inputScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-action-input',
    name: 'Input action',
    steps: [
      {
        id: 'input-1',
        title: 'Name your workspace',
        content: 'Type at least three characters into the workspace name field.',
        target: '#sb-tut-settings-name',
        whitelist: ['#sb-tut-settings-name'],
        placement: 'right',
        completion: { minTime: 400, action: { type: 'input', selector: '#sb-tut-settings-name', minLength: 3 } },
      },
      { id: 'input-2', title: 'Done', content: 'Input validated.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', final: true },
    ],
  };
}

/** Scenario covering the `keys` action with a key whitelist. */
function keysScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-action-keys',
    name: 'Keys action',
    steps: [
      {
        id: 'keys-1',
        title: 'Confirm the invite',
        content: 'Focus the email field and press Enter or Tab.',
        target: '#sb-tut-form-email',
        whitelist: ['#sb-tut-form-email'],
        placement: 'right',
        completion: { action: { type: 'keys', selector: '#sb-tut-form-email', keys: ['Enter', 'Tab'] } },
      },
      { id: 'keys-2', title: 'Done', content: 'Keyboard interaction detected.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', final: true },
    ],
  };
}

/** Scenario covering the `drag` action with a distance threshold. */
function dragScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-action-drag',
    name: 'Drag action',
    steps: [
      {
        id: 'drag-1',
        title: 'Tune the threshold',
        content: 'Drag the slider handle to continue.',
        target: '#sb-tut-slider',
        whitelist: ['#sb-tut-slider'],
        placement: 'bottom',
        completion: { action: { type: 'drag', selector: '#sb-tut-slider', threshold: 40 } },
      },
      { id: 'drag-2', title: 'Done', content: 'Drag detected.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', final: true },
    ],
  };
}

/** Scenario covering a `minTime` floor on the final step only. */
function minTimeScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-min-time',
    name: 'Minimum time floor',
    steps: [
      { id: 'min-1', title: 'Read the summary', content: 'This step waits for the minimum time floor before it can complete.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', completion: { minTime: 1200 }, final: true },
    ],
  };
}

/** Scenario combining `timeout`, `minTime` and an `action` on the same step. */
function combinedScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-combined',
    name: 'Combined completion',
    steps: [
      {
        id: 'combined-1',
        title: 'Open reports or wait',
        content: 'Open the Reports tab, or let the five-second timeout advance.',
        target: '#sb-tut-nav-reports',
        whitelist: ['#sb-tut-nav-reports'],
        placement: 'bottom',
        completion: { timeout: 5000, minTime: 300, action: { type: 'click', selector: '#sb-tut-nav-reports' } },
      },
      {
        id: 'combined-2',
        title: 'Pick a teammate or wait',
        content: 'Click a team member, or let the timeout advance.',
        target: '#sb-tut-list',
        whitelist: ['#sb-tut-list'],
        placement: 'top',
        completion: { timeout: 5000, minTime: 300, action: { type: 'click', selector: '.sb-tut-list-item' } },
        final: true,
      },
    ],
  };
}

/** A realistic five-step settings/list/form walkthrough with dynamic rewriting. */
function complexScenario(): StoryboardTutorialScenario {
  return {
    id: 'sb-complex-walkthrough',
    name: 'Workspace onboarding',
    labels: CUSTOM_LABELS,
    context: { startedAt: 'story', actions: [] as string[] },
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to your workspace',
        content: 'Take a quick tour of the settings, team list and invite form.',
        target: '#sb-tut-nav-dashboard',
        whitelist: ['#sb-tut-nav-dashboard'],
        placement: 'bottom',
        completion: { timeout: 4000 },
      },
      {
        id: 'open-settings',
        title: 'Open the settings',
        content: 'Click the Settings tab to configure your workspace.',
        target: '#sb-tut-nav-settings',
        whitelist: ['#sb-tut-nav-settings'],
        placement: 'bottom',
        completion: { action: { type: 'click', selector: '#sb-tut-nav-settings' } },
      },
      {
        id: 'name-workspace',
        title: 'Name your workspace',
        content: 'Type at least three characters to validate the name field.',
        target: '#sb-tut-settings-name',
        whitelist: ['#sb-tut-settings-name'],
        placement: 'right',
        completion: { minTime: 500, action: { type: 'input', selector: '#sb-tut-settings-name', minLength: 3 } },
      },
      {
        id: 'confirm-email',
        title: 'Confirm with the keyboard',
        content: 'Focus the invite email and press Enter or Tab to confirm.',
        target: '#sb-tut-form-email',
        whitelist: ['#sb-tut-form-email'],
        placement: 'left',
        completion: { action: { type: 'keys', selector: '#sb-tut-form-email', keys: ['Enter', 'Tab'] } },
      },
      {
        id: 'pick-member',
        title: 'Pick a teammate',
        content: 'Click any member to review their access.',
        target: '#sb-tut-list',
        whitelist: ['#sb-tut-list'],
        placement: 'top',
        completion: { action: { type: 'click', selector: '.sb-tut-list-item' } },
        run: ({ state }) => {
          // Dynamic rewrite: replace the remaining review step with an inserted tip.
          const inserted = {
            id: 'dynamic-tip',
            title: 'A tip appeared',
            content: 'This step was inserted dynamically from the previous step.',
            target: '#sb-tut-notes',
            whitelist: ['#sb-tut-notes'],
            placement: 'center' as const,
          };
          const remaining = state.steps.slice(1).filter((step) => step.id !== 'review');
          return {
            ...state,
            context: { ...state.context, rewritten: true },
            steps: [inserted, ...remaining],
            completed: [...state.completed, 'pick-member'],
          };
        },
      },
      {
        id: 'review',
        title: 'Review the tour',
        content: 'This step is normally replaced by the dynamic tip.',
        target: '#sb-tut-notes',
        whitelist: ['#sb-tut-notes'],
        placement: 'center',
      },
      {
        id: 'finish',
        title: 'All set',
        content: 'You have completed the onboarding walkthrough.',
        target: '#sb-tut-notes',
        whitelist: ['#sb-tut-notes'],
        placement: 'center',
        final: true,
      },
    ],
  };
}

const MATRIX = `
### Configuration matrix

| Story | scenario | autoStart | persist | focusStrategy | messageStrategy | outputs |
| --- | --- | --- | --- | --- | --- | --- |
| Placements | 5 placement values | true | false | default | default | started/stepped |
| TimeoutCompletion | timeout | true | false | default | default | started/stepped |
| ClickAction | action.click (selector/button) | true | false | default | default | started/stepped |
| InputAction | action.input (minLength/minTime) | true | false | default | default | started/stepped |
| KeysAction | action.keys (keys) | true | false | default | default | started/stepped |
| DragAction | action.drag (threshold) | true | false | default | default | started/stepped |
| MinTimeFloor | minTime | true | false | default | default | started/stepped |
| CombinedCompletion | timeout+minTime+action | true | false | default | default | started/stepped |
| AutoStart | simple | true | false | default | default | started |
| ManualStart | simple | false | false | default | default | started (on Start) |
| PersistEnabled | simple | true | true | default | default | started/stepped |
| PersistDisabled | simple | true | false | default | default | started/stepped |
| CustomFocusStrategy | simple | true | false | pulse | default | started |
| CustomMessageStrategy | simple | true | false | default | panel | started |
| CustomLabels | simple | true | false | default | default (labels) | started/stepped |
| OutputsLifecycle | 3 steps | true | false | default | default | started/stepped/finished |
| ComplexWalkthrough | 6 steps + rewrite | true | false | default | default | started/stepped/finished |
| AbortFlow | 3 steps | true | false | default | default | started/finished(aborted) |
`;

const component = getComponentMeta<TutorialStoryHostComponent>([
  StoryboardTutorialComponent,
]);

const meta: Meta<TutorialStoryHostComponent> = {
  title: 'Components/Storyboard Tutorial',
  component: TutorialStoryHostComponent,
  ...component,
  parameters: {
    docs: {
      description: {
        component: MATRIX,
      },
    },
  },
  argTypes: {
    ...component.argTypes,
    scenario: { control: false },
    focusStrategy: { control: false },
    messageStrategy: { control: false },
  },
  args: {
    scenario: undefined,
    autoStart: false,
    persist: false,
    focusStrategy: undefined,
    messageStrategy: undefined,
  },
};
export default meta;
type Story = StoryObj<TutorialStoryHostComponent>;

export const Placements: Story = {
  args: { scenario: placementScenario(), autoStart: true },
};

export const TimeoutCompletion: Story = {
  args: { scenario: timeoutScenario(), autoStart: true },
};

export const ClickAction: Story = {
  args: { scenario: clickScenario(), autoStart: true },
};

export const InputAction: Story = {
  args: { scenario: inputScenario(), autoStart: true },
};

export const KeysAction: Story = {
  args: { scenario: keysScenario(), autoStart: true },
};

export const DragAction: Story = {
  args: { scenario: dragScenario(), autoStart: true },
};

export const MinTimeFloor: Story = {
  args: { scenario: minTimeScenario(), autoStart: true },
};

export const CombinedCompletion: Story = {
  args: { scenario: combinedScenario(), autoStart: true },
};

export const AutoStart: Story = {
  args: { scenario: placementScenario(), autoStart: true },
};

export const ManualStart: Story = {
  args: { scenario: placementScenario(), autoStart: false },
  play: async ({ canvasElement }) => {
    const start = canvasElement.querySelector<HTMLElement>('[data-testid="tutorial-start"]');
    if (!start) throw new Error('Expected a start button, found none');
    await userEvent.click(start);
    await waitFor(() => {
      const log = canvasElement.querySelector<HTMLElement>('[data-testid="tutorial-log"]');
      if (!log || !log.textContent?.includes('started')) {
        throw new Error(`Expected a started event, received "${log?.textContent ?? 'nothing'}"`);
      }
    });
  },
};

export const PersistEnabled: Story = {
  args: { scenario: clickScenario(), autoStart: true, persist: true },
};

export const PersistDisabled: Story = {
  args: { scenario: clickScenario(), autoStart: true, persist: false },
};

export const CustomFocusStrategy: Story = {
  args: { scenario: placementScenario(), autoStart: true, focusStrategy: new PulseFocusStrategy() },
};

export const CustomMessageStrategy: Story = {
  args: { scenario: placementScenario(), autoStart: true, messageStrategy: new PanelMessageStrategy() },
};

export const CustomLabels: Story = {
  args: { scenario: complexScenario(), autoStart: true, messageStrategy: new PanelMessageStrategy() },
};

export const OutputsLifecycle: Story = {
  args: {
    autoStart: true,
    scenario: {
      id: 'sb-outputs-lifecycle',
      name: 'Outputs lifecycle',
      steps: [
        { id: 'lifecycle-1', title: 'One', content: 'First step.', target: '#sb-tut-nav-dashboard', whitelist: ['#sb-tut-nav-dashboard'], placement: 'bottom' },
        { id: 'lifecycle-2', title: 'Two', content: 'Second step.', target: '#sb-tut-nav-settings', whitelist: ['#sb-tut-nav-settings'], placement: 'bottom' },
        { id: 'lifecycle-3', title: 'Three', content: 'Third step.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', final: true },
      ],
    },
  },
};

export const ComplexWalkthrough: Story = {
  args: { scenario: complexScenario(), autoStart: true, persist: true },
};

export const AbortFlow: Story = {
  args: {
    autoStart: true,
    scenario: {
      id: 'sb-abort-flow',
      name: 'Abort flow',
      steps: [
        { id: 'abort-1', title: 'Start', content: 'First step of the abort flow.', target: '#sb-tut-nav-dashboard', whitelist: ['#sb-tut-nav-dashboard'], placement: 'bottom' },
        { id: 'abort-2', title: 'Middle', content: 'Second step.', target: '#sb-tut-nav-settings', whitelist: ['#sb-tut-nav-settings'], placement: 'bottom' },
        { id: 'abort-3', title: 'End', content: 'Final step.', target: '#sb-tut-notes', whitelist: ['#sb-tut-notes'], placement: 'center', final: true },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const abort = canvasElement.querySelector<HTMLElement>('.dcf-storyboard-tutorial__bubble-abort');
      if (!abort) throw new Error('Expected an abort button, found none');
    });
    const abort = canvasElement.querySelector<HTMLElement>('.dcf-storyboard-tutorial__bubble-abort');
    if (!abort) throw new Error('Expected an abort button, found none');
    await fireEvent.click(abort);
    await waitFor(() => {
      const log = canvasElement.querySelector<HTMLElement>('[data-testid="tutorial-log"]');
      if (!log || !log.textContent?.includes('finished: aborted')) {
        throw new Error(`Expected an aborted event, received "${log?.textContent ?? 'nothing'}"`);
      }
    });
  },
};
