# `@decaf-ts/for-angular/storyboard`

Guided storyboard tutorial surface: the standalone
`ngx-decaf-storyboard-tutorial` component, its root-provided
`StoryboardTutorialService`, the tutorial engine, completion resolution and the
pluggable focus/message strategies.

The entry point adds **no feature-specific runtime dependency**. It uses only
the required root peers: `@angular/*`, `@ionic/angular`, `@ngx-translate/core`
and `@decaf-ts/db-decorators`.

## Install

```bash
npm install @decaf-ts/for-angular
```

No additional peer is required for `/storyboard`.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@decaf-ts/for-angular` | `0.11.x` |

## Usage

```ts
import { Component } from '@angular/core';
import {
  StoryboardTutorialComponent,
  type StoryboardTutorialScenario,
} from '@decaf-ts/for-angular/storyboard';

@Component({
  standalone: true,
  imports: [StoryboardTutorialComponent],
  template: `
    <ngx-decaf-storyboard-tutorial [scenario]="scenario" />
  `,
})
export class OnboardingComponent {
  readonly scenario: StoryboardTutorialScenario = {
    id: 'first-run',
    steps: [],
  };
}
```

### API

| Member | Type | Purpose |
| --- | --- | --- |
| `scenario` | `StoryboardTutorialScenario` (input) | Ordered tutorial steps, context, and scenario-level defaults. |
| `autoStart` | `boolean` (input) | Starts the scenario when nothing is running. |
| `persist` | `boolean` (input) | Persists the run to `sessionStorage` for hard-reload survival. |
| `focusStrategy` / `messageStrategy` | strategy instances (inputs) | Override the scenario defaults. |
| `started` / `stepped` | outputs | Typed tutorial lifecycle events. |
| `finished` | output | Emits the terminal `TutorialStatus` when the tutorial ends or is aborted. |

Labels are declared on the scenario (`scenario.labels`), not as a component
input. Selector: `<ngx-decaf-storyboard-tutorial>`.

### Exported surface

- `StoryboardTutorialComponent`
- `StoryboardTutorialService`
- `StoryboardTutorialEngine`, `StoryboardTutorialClock`
- `resolveTutorialCompletion`
- `FadeFocusStrategy`, `HighlightFocusStrategy` and the `TutorialFocusStrategy`
  contract
- `BubbleMessageStrategy` and the `TutorialMessageStrategy` contract
- `StoryboardTutorialScenario`, `StoryboardTutorialState`,
  `StoryboardTutorialLabels`, `TutorialStatus` and related types
