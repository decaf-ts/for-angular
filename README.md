![Banner](./workdocs/assets/decaf-logo.svg)

# Decaf's Angular Module

> Release candidate for **v0.11.0** — the clean-break modular entry-point release. See
> [workdocs/reports/RELEASE_NOTES.md](./workdocs/reports/RELEASE_NOTES.md) for ticket summaries.

![Licence](https://img.shields.io/github/license/decaf-ts/for-angular.svg?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/decaf-ts/for-angular?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/decaf-ts/for-angular?style=plastic)

[![Build & Test](https://github.com/decaf-ts/for-angular/actions/workflows/nodejs-build-prod.yaml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/nodejs-build-prod.yaml)
[![CodeQL](https://github.com/decaf-ts/for-angular/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/codeql-analysis.yml)[![Snyk Analysis](https://github.com/decaf-ts/for-angular/actions/workflows/snyk-analysis.yaml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/snyk-analysis.yaml)
[![Pages builder](https://github.com/decaf-ts/for-angular/actions/workflows/pages.yaml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/pages.yaml)
[![.github/workflows/release-on-tag.yaml](https://github.com/decaf-ts/for-angular/actions/workflows/release-on-tag.yaml/badge.svg?event=release)](https://github.com/decaf-ts/for-angular/actions/workflows/release-on-tag.yaml)

![Open Issues](https://img.shields.io/github/issues/decaf-ts/for-angular.svg)
![Closed Issues](https://img.shields.io/github/issues-closed/decaf-ts/for-angular.svg)
![Pull Requests](https://img.shields.io/github/issues-pr-closed/decaf-ts/for-angular.svg)
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

![Line Coverage](workdocs/reports/coverage/badge-lines.svg)
![Function Coverage](workdocs/reports/coverage/badge-functions.svg)
![Statement Coverage](workdocs/reports/coverage/badge-statements.svg)
![Branch Coverage](workdocs/reports/coverage/badge-branches.svg)


![Forks](https://img.shields.io/github/forks/decaf-ts/for-angular.svg)
![Stars](https://img.shields.io/github/stars/decaf-ts/for-angular.svg)
![Watchers](https://img.shields.io/github/watchers/decaf-ts/for-angular.svg)

![Node Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=Node&query=$.engines.node&colorB=blue)
![NPM Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=NPM&query=$.engines.npm&colorB=purple)

Documentation available [here](https://decaf-ts.github.io/for-angular/)

Minimal size: ##PACKAGE_SIZE## kb gzipped


### Description

A very versatile persistence layer. from smart contracts, Digital wallets or just regular database access



### Entry points (v0.11.0)

The package is a **core root** plus dedicated secondary entry points. Every
feature is exported only from its own entry point, so a core consumer never
installs a feature engine it does not use.

```bash
npm install @decaf-ts/for-angular
```

Then add only the optional peers required by the entry points you import:

| Entry point | Extra optional peers | Documentation |
| --- | --- | --- |
| `@decaf-ts/for-angular` (root) | none — uses the required Angular/Ionic/Decaf peers | this README |
| `@decaf-ts/for-angular/kanban` | `@angular/cdk@^21.2.14` | [kanban/README.md](./kanban/README.md) |
| `@decaf-ts/for-angular/scrum` | `@angular/cdk@^21.2.14` (through `/kanban`) | [scrum/README.md](./scrum/README.md) |
| `@decaf-ts/for-angular/gantt` | `@worktile/gantt@^21.0.0`, `html2canvas@^1.4.1`, `date-fns@^4`, `@date-fns/tz@^1` | [gantt/README.md](./gantt/README.md) |
| `@decaf-ts/for-angular/charts` | `echarts@^6.1.0`, `@cortex-js/compute-engine@^0.147.0` | [charts/README.md](./charts/README.md) |
| `@decaf-ts/for-angular/math` | `mathlive@^0.111.1` | [math/README.md](./math/README.md) |
| `@decaf-ts/for-angular/code-editor` | the CodeMirror 6 family | [code-editor/README.md](./code-editor/README.md) |
| `@decaf-ts/for-angular/barcode` | `@bwip-js/browser@^4.11.4` | [barcode/README.md](./barcode/README.md) |
| `@decaf-ts/for-angular/calendar` | none | [calendar/README.md](./calendar/README.md) |
| `@decaf-ts/for-angular/agent` | `@decaf-ts/as-graph@^0.6.0`, `ng-diagram@^1.4.0` (through `/diagrams`) | [agent/README.md](./agent/README.md) |
| `@decaf-ts/for-angular/cron` | `cronstrue@^3.24.0` | [cron/README.md](./cron/README.md) |
| `@decaf-ts/for-angular/diagrams` | `@decaf-ts/as-graph@^0.6.0`, `ng-diagram@^1.4.0` | [diagrams/README.md](./diagrams/README.md) |
| `@decaf-ts/for-angular/storyboard` | none | [storyboard/README.md](./storyboard/README.md) |

The model builder is part of the **root** entry point; import
`ModelBuilderComponent` directly from `@decaf-ts/for-angular`.

Every entry point can be imported independently from the packed npm artifact.
Feature-to-feature dependencies are **`/scrum → /kanban`** (the sprint board and
backlog compose the shared Kanban primitives instead of shipping a second
drag/drop engine) and **`/agent → /diagrams`** (the chat transcript reuses the
graph I/O viewer). `/diagrams` receives its code-editor and model-builder
surfaces through injection tokens, so it does not import those entry points.

### Compatibility

| Package | Supported / tested |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` (Angular 21 line) |
| TypeScript | `~5.9.0` (`>=5.9 <6.0`) |
| Node / npm | `>=20.0.0` / `>=10.0.0` |
| Server rendering | Supported: components avoid import-time `window`/`document` access and emit host placeholders. |
| Zoneless | Not advertised or tested in this release. |

Any Angular 21 host that pins `@angular/core`, `@angular/common` and (for
`/kanban` or `/scrum`) `@angular/cdk` to 21.x installs cleanly. A plain
`npm install` of the tarball in a **truly empty** directory can hit npm 11's
optional-peer resolution artifact: npm auto-installs `@angular/cdk`, floats
Angular to 22 and collides with this package's `^21.2.17` anchor. Use
`npm install @decaf-ts/for-angular --legacy-peer-deps` for a scratch or
non-Angular host. This is a documented npm resolver artifact, not a missing
manifest peer.

### How to Use

- [Initial Setup](./workdocs/tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./workdocs/tutorials/For%20Developers.md#installation)

## Components

> The curve editor and math input below now live in the `/charts` and `/math`
> entry points. Import them from their dedicated entry point; the root barrel
> no longer re-exports feature components.

### `<decaf-curve-editor>`

Standalone interactive curve editor backed by Apache ECharts: a line series with draggable control points, drawn with linear or monotone cubic (Fritsch–Carlson, no overshoot) interpolation. The control points are the source of truth for the rendered curve; a LaTeX formula can also be set, and is sampled over the x range into control points. Curve drags regenerate the formula, so both stay consistent. MathLive and ECharts types never leak through the public API.

| Binding | Type | Description |
| --- | --- | --- |
| `[(points)]` | `CurvePoint[]` (`{ x, y }`) | Control points, kept sorted by ascending `x` (two-way) |
| `[(formula)]` | `string` | LaTeX formula describing the curve (two-way) |
| `[interpolation]` | `'monotonic' \| 'linear'` | Interpolation strategy (default `'monotonic'`) |
| `[xRange]` / `[yRange]` | `[number, number]` | Inclusive `[min, max]` domains (default `[0, 1]`) |
| `[lockEndpoints]` | `boolean` | Pins the first/last points to the x range bounds and prevents their removal |
| `[height]` | `number` | Rendered chart height in pixels (default `320`) |

Outputs: `pointAdded` (`CurvePoint`), `pointRemoved` (`CurvePoint`), `pointMoved` (`{ index, point, previous }`), `curveChanged` (sampled `CurvePoint[]`), `formulaChanged` (`string`).

```html
<decaf-curve-editor
  [(points)]="points"
  [(formula)]="formula"
  [interpolation]="'monotonic'"
  [xRange]="[0, 10]"
  [yRange]="[0, 1]"
  [lockEndpoints]="true"
  (pointMoved)="onPointMoved($event)">
</decaf-curve-editor>
```

### Chart components

Four CRD chart layout components backed by Apache ECharts are exported from the
`/charts` entry point: `ngx-decaf-line-chart`, `ngx-decaf-bar-chart`,
`ngx-decaf-pie-chart` and `ngx-decaf-scatter-chart` (base:
`ngx-decaf-chart`). In `READ` operation each renders its dataset; in
`CREATE`/`UPDATE` it also renders its decorated configuration model through
`ngx-decaf-model-renderer`.

| Binding | Type | Description |
| --- | --- | --- |
| `[operation]` | `CrudOperations` | `READ` renders the chart; `CREATE`/`UPDATE` also render the configuration form |
| `[config]` | `ChartConfig \| Model` | Plain configuration or a decorated family config model |
| `[dataset]` | `VirtualDataset \| VirtualDatasetView` | Query source to sub-query or an already narrowed view |
| `[datasetQuery]` | `VirtualDatasetQuery` | Sub-query applied to a `VirtualDataset` source |
| `[data]` | `readonly unknown[]` | Direct rows, taking precedence over `dataset` |
| `[height]` | `number \| string` | Canvas height (default `320`) |

Outputs: `configChanged` after a submitted configuration and `chartError` for
dataset/render failures. `VirtualDataset` composes a sub-query over a global
`@decaf-ts/core` query — AND-combined conditions, the smaller limit and additive
offsets — and delegates execution to the source loader. See
[charts/README.md](./charts/README.md#chart-components) for the configuration
models, option builder and dataset examples.

```html
<ngx-decaf-bar-chart
  operation="READ"
  [dataset]="salesDataset"
  [datasetQuery]="{ where: regionCondition }"
  [config]="{ title: 'Sales', xField: 'month', yField: 'revenue' }">
</ngx-decaf-bar-chart>
```

### `<decaf-math-input>`

Standalone LaTeX formula input wrapping the MathLive `<math-field>` custom element (lazy-loaded on first render, no MathLive types in the public API). The field value is a plain LaTeX string emitted on every input.

| Binding | Type | Description |
| --- | --- | --- |
| `[(value)]` | `string` | LaTeX value, emitted on input (two-way) |
| `[placeholder]` | `string` | Placeholder shown when the field is empty |
| `[disabled]` | `boolean` | Renders the field read-only |

```html
<decaf-math-input [(value)]="formula" placeholder="f(x) = ..."></decaf-math-input>
```

Typical pairing: bind both components to the same `formula` string — editing the math field re-samples the curve over the x range, and dragging curve points regenerates the formula.

### `<ngx-decaf-agent-chat>`

Standalone agent conversation UI over a graph workflow run, exported from the
[`/agent`](./agent/README.md) secondary entry point. `/agent` reuses the graph
I/O viewer from [`/diagrams`](./diagrams/README.md) through its public
specifier, so it needs the same optional peers (`@decaf-ts/as-graph`,
`ng-diagram`). The entry point ships the shell together with the transport
contract (`AgentChatTransport` with `send`/`replay`/`cancel`), the
`AGENT_CHAT_TRANSPORT`, `AGENT_CHAT_HISTORY_SOURCE` and
`AGENT_CHAT_KNOWLEDGE_BASE_SOURCE` injection tokens, the composer/message
models, the envelope fold (`agentChatFoldEnvelope`), the per-component
`AgentChatService` conversation state, the markdown transcript builder, the
in-memory history/knowledge-base sources, and the translation fallback pipe.
The shell owns only transient UI state (draft, staged attachments, drawers,
inline editing, selectors): it projects `AgentChatService` signals into the
`ngx-decaf-chat-*` component suite below and forwards user actions back to the
service and transport.

| Binding | Type | Description |
| --- | --- | --- |
| `[workflow]` | `GraphWorkflowDocument \| null` | Workflow document the chat runs against (namespace chips derive from its auth metadata) |
| `[workflowId]` | `string \| null` | Backend workflow id to run (`null` clears a previously configured value) |
| `[sessionId]` | `string \| null` | Conversation session id (generated as `agent-chat-<epoch>-<seq>` when unset) |
| `[headerTitleKey]` | `string` | Localized header title key (default `agent.chat.title`) |
| `[headerTitleFallback]` | `string` | Header title fallback when the key is missing (default `Agent chat`) |
| `[knowledgeSources]` | `AgentChatKnowledgeSource[]` | Knowledge-base options offered in the composer |
| `[suggestions]` | `string[]` | Starter prompts shown above the composer on an empty transcript |
| `[slashCommands]` | `AgentChatSlashCommand[]` | Slash commands offered by the composer popover |
| `[models]` | `AgentChatModel[]` | Models offered by the composer's model selector |
| `[visibility]` | `AgentChatVisibility` | Initial conversation visibility (default `private`) |
| `[showHistory]` | `boolean` | Whether the history rail is rendered (default `true`) |
| `[showKnowledgeBase]` | `boolean` | Whether the knowledge-base selector is available (default `true`) |

Outputs: `download` (`AgentChatTranscriptDownload` — the markdown transcript
payload built by the conversation toolbar) and `historySelected`
(`AgentChatHistoryEntry` — a conversation picked in the history rail).

```html
<ngx-decaf-agent-chat
  [workflow]="document"
  [workflowId]="id"
  [suggestions]="suggestions"
  [slashCommands]="slashCommands"
  [models]="models">
</ngx-decaf-agent-chat>
```

The transcript is a `role="log"` live region with per-role styling,
action/attachment chips and auto-scroll; the composer handles Enter-to-send /
Shift+Enter newline, metadata-only attachments (file contents are never read),
and a knowledge-base selector forwarded as `knowledgeBaseIds` run inputs. A
collapsible telemetry strip shows per-roundtrip rows, the structured-object
panel reuses the graph I/O viewer for the latest structured output, and
namespace chips derive from the configured workflow document's auth metadata.

### Agent chat transports and data sources

Every run goes through the injectable `AgentChatTransport` contract (`send`,
`replay`, `cancel`). The default `AGENT_CHAT_TRANSPORT` is
`GraphRunAgentChatTransport`, which runs the configured workflow over the
graph backend's `POST /graph/runs` + SSE envelope stream (replay from sequence
zero, idempotent cancel); `AgentChatService` folds every envelope into
transcript state with `agentChatFoldEnvelope`. Override the token at component
or environment level to plug in an alternative transport (e.g. the optional
`@ai-sdk/angular` peer, or the scripted fake transport below).

The history rail and knowledge-base selector read through the
`AGENT_CHAT_HISTORY_SOURCE` and `AGENT_CHAT_KNOWLEDGE_BASE_SOURCE` tokens.
Both default to an empty in-memory store; provide the seedable
`InMemoryAgentChatHistorySource` / `InMemoryAgentKnowledgeBaseSource` or your
own `AgentChatHistorySource` / `AgentChatKnowledgeBaseSource` implementation.

### `AgentChatFakeTransport` (scripted demo transport)

`AgentChatFakeTransport` is a deterministic, in-browser `AgentChatTransport`
used by the demo `/chat` page and the Storybook integration stories — no
network, no backend, no randomness. `configure({ scenario, speed })` selects
the scripted scenario (`conversation` or `structured-object`) and the playback
speed; every `send` replays it through the same envelope contract as the real
transport, exercising token-by-token streaming, reasoning and code blocks,
tool calls (orders, tracker, weather), workflow steps, progress, an approval
prompt, telemetry and a streamed structured object. Component families that
live outside the transcript (tool result cards, workflow status, progress,
agent steps, nested agents, approval, notifications) are delivered through the
demo-only `demoEvents![Banner](./workdocs/assets/decaf-logo.svg)

# Decaf's Angular Module

> Release candidate for **v0.11.0** — the clean-break modular entry-point release. See
> [workdocs/reports/RELEASE_NOTES.md](./workdocs/reports/RELEASE_NOTES.md) for ticket summaries.

![Licence](https://img.shields.io/github/license/decaf-ts/for-angular.svg?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/decaf-ts/for-angular?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/decaf-ts/for-angular?style=plastic)

[![Build & Test](https://github.com/decaf-ts/for-angular/actions/workflows/nodejs-build-prod.yaml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/nodejs-build-prod.yaml)
[![CodeQL](https://github.com/decaf-ts/for-angular/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/codeql-analysis.yml)[![Snyk Analysis](https://github.com/decaf-ts/for-angular/actions/workflows/snyk-analysis.yaml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/snyk-analysis.yaml)
[![Pages builder](https://github.com/decaf-ts/for-angular/actions/workflows/pages.yaml/badge.svg)](https://github.com/decaf-ts/for-angular/actions/workflows/pages.yaml)
[![.github/workflows/release-on-tag.yaml](https://github.com/decaf-ts/for-angular/actions/workflows/release-on-tag.yaml/badge.svg?event=release)](https://github.com/decaf-ts/for-angular/actions/workflows/release-on-tag.yaml)

![Open Issues](https://img.shields.io/github/issues/decaf-ts/for-angular.svg)
![Closed Issues](https://img.shields.io/github/issues-closed/decaf-ts/for-angular.svg)
![Pull Requests](https://img.shields.io/github/issues-pr-closed/decaf-ts/for-angular.svg)
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

![Line Coverage](workdocs/reports/coverage/badge-lines.svg)
![Function Coverage](workdocs/reports/coverage/badge-functions.svg)
![Statement Coverage](workdocs/reports/coverage/badge-statements.svg)
![Branch Coverage](workdocs/reports/coverage/badge-branches.svg)


![Forks](https://img.shields.io/github/forks/decaf-ts/for-angular.svg)
![Stars](https://img.shields.io/github/stars/decaf-ts/for-angular.svg)
![Watchers](https://img.shields.io/github/watchers/decaf-ts/for-angular.svg)

![Node Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=Node&query=$.engines.node&colorB=blue)
![NPM Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=NPM&query=$.engines.npm&colorB=purple)

Documentation available [here](https://decaf-ts.github.io/for-angular/)

Minimal size: ##PACKAGE_SIZE## kb gzipped


### Description

A very versatile persistence layer. from smart contracts, Digital wallets or just regular database access



### Entry points (v0.11.0)

The package is a **core root** plus dedicated secondary entry points. Every
feature is exported only from its own entry point, so a core consumer never
installs a feature engine it does not use.

```bash
npm install @decaf-ts/for-angular
```

Then add only the optional peers required by the entry points you import:

| Entry point | Extra optional peers | Documentation |
| --- | --- | --- |
| `@decaf-ts/for-angular` (root) | none — uses the required Angular/Ionic/Decaf peers | this README |
| `@decaf-ts/for-angular/kanban` | `@angular/cdk@^21.2.14` | [kanban/README.md](./kanban/README.md) |
| `@decaf-ts/for-angular/scrum` | `@angular/cdk@^21.2.14` (through `/kanban`) | [scrum/README.md](./scrum/README.md) |
| `@decaf-ts/for-angular/gantt` | `@worktile/gantt@^21.0.0`, `html2canvas@^1.4.1`, `date-fns@^4`, `@date-fns/tz@^1` | [gantt/README.md](./gantt/README.md) |
| `@decaf-ts/for-angular/charts` | `echarts@^6.1.0`, `@cortex-js/compute-engine@^0.147.0` | [charts/README.md](./charts/README.md) |
| `@decaf-ts/for-angular/math` | `mathlive@^0.111.1` | [math/README.md](./math/README.md) |
| `@decaf-ts/for-angular/code-editor` | the CodeMirror 6 family | [code-editor/README.md](./code-editor/README.md) |
| `@decaf-ts/for-angular/barcode` | `@bwip-js/browser@^4.11.4` | [barcode/README.md](./barcode/README.md) |
| `@decaf-ts/for-angular/calendar` | none | [calendar/README.md](./calendar/README.md) |
| `@decaf-ts/for-angular/agent` | `@decaf-ts/as-graph@^0.6.0`, `ng-diagram@^1.4.0` (through `/diagrams`) | [agent/README.md](./agent/README.md) |
| `@decaf-ts/for-angular/cron` | `cronstrue@^3.24.0` | [cron/README.md](./cron/README.md) |
| `@decaf-ts/for-angular/diagrams` | `@decaf-ts/as-graph@^0.6.0`, `ng-diagram@^1.4.0` | [diagrams/README.md](./diagrams/README.md) |
| `@decaf-ts/for-angular/storyboard` | none | [storyboard/README.md](./storyboard/README.md) |

The model builder is part of the **root** entry point; import
`ModelBuilderComponent` directly from `@decaf-ts/for-angular`.

Every entry point can be imported independently from the packed npm artifact.
Feature-to-feature dependencies are **`/scrum → /kanban`** (the sprint board and
backlog compose the shared Kanban primitives instead of shipping a second
drag/drop engine) and **`/agent → /diagrams`** (the chat transcript reuses the
graph I/O viewer). `/diagrams` receives its code-editor and model-builder
surfaces through injection tokens, so it does not import those entry points.

### Compatibility

| Package | Supported / tested |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` (Angular 21 line) |
| TypeScript | `~5.9.0` (`>=5.9 <6.0`) |
| Node / npm | `>=20.0.0` / `>=10.0.0` |
| Server rendering | Supported: components avoid import-time `window`/`document` access and emit host placeholders. |
| Zoneless | Not advertised or tested in this release. |

Any Angular 21 host that pins `@angular/core`, `@angular/common` and (for
`/kanban` or `/scrum`) `@angular/cdk` to 21.x installs cleanly. A plain
`npm install` of the tarball in a **truly empty** directory can hit npm 11's
optional-peer resolution artifact: npm auto-installs `@angular/cdk`, floats
Angular to 22 and collides with this package's `^21.2.17` anchor. Use
`npm install @decaf-ts/for-angular --legacy-peer-deps` for a scratch or
non-Angular host. This is a documented npm resolver artifact, not a missing
manifest peer.

 side channel so a host page can drive its own panels
from the same scripted run. `cancel` clears every pending timer and emits a
single `WORKFLOW_CANCELLED` terminal envelope.

```ts
providers: [
  AgentChatFakeTransport,
  { provide: AGENT_CHAT_TRANSPORT, useExisting: AgentChatFakeTransport },
]
```

### Chat component suite

The 42 `ngx-decaf-chat-*` standalone components exported from the same
[`/agent`](./agent/README.md) entry point. The shell composes most of them;
each is also usable on its own, and every user-facing string resolves through
the `agent.chat.*` i18n subtree via the `translateFallback` pipe
(`AgentTranslateFallbackPipe`), which renders a hardcoded English fallback
when the host provides no translation. Full per-component bindings live in
the source JSDoc and the Storybook stories (`npm run storybook`).

#### Conversation and history

| Component | Selector | Purpose |
| --- | --- | --- |
| `ChatHeaderComponent` | `ngx-decaf-chat-header` | Chat header bar: title, namespace badges, history/knowledge-base/telemetry toggles |
| `ChatIconComponent` | `ngx-decaf-chat-icon` | Inline SVG icon renderer with a fixed chat icon-name set |
| `ChatConversationComponent` | `ngx-decaf-chat-conversation` | Scrollable transcript with autoscroll, empty state and markdown download |
| `ChatMessageComponent` | `ngx-decaf-chat-message` | Single message: role avatar/label, text and nested parts (attachments, tools, reasoning, code) |
| `ChatMessageActionsComponent` | `ngx-decaf-chat-message-actions` | Per-message copy/vote/edit/delete bar with role-aware defaults |
| `ChatMessageEditorComponent` | `ngx-decaf-chat-message-editor` | Inline message editor (Escape cancels, Ctrl/Cmd+Enter saves) |
| `ChatThinkingMessageComponent` | `ngx-decaf-chat-thinking-message` | Typing placeholder while the agent composes |
| `ChatGreetingComponent` | `ngx-decaf-chat-greeting` | Empty-state greeting or info card with optional call-to-action |
| `ChatHistoryComponent` | `ngx-decaf-chat-history` | History sidebar/drawer fed by entries, an observable stream or an injected source |
| `ChatHistoryItemComponent` | `ngx-decaf-chat-history-item` | Single history row with visibility badge and inline delete confirmation |

#### Composer and input

| Component | Selector | Purpose |
| --- | --- | --- |
| `ChatComposerComponent` | `ngx-decaf-chat-composer` | Auto-growing prompt composer: Enter-to-send, status-aware send/stop, clear-and-refocus |
| `ChatAttachmentInputComponent` | `ngx-decaf-chat-attachment-input` | Attachment intake: file picker, drag-drop overlay, clipboard paste, MIME/size validation |
| `ChatAttachmentPreviewComponent` | `ngx-decaf-chat-attachment-preview` | Staged-attachment strip with thumbnails and per-item removal |
| `ChatAttachmentPartComponent` | `ngx-decaf-chat-attachment-part` | Sent attachment inside a message: image, decoded text or fallback chip |
| `ChatSuggestedActionsComponent` | `ngx-decaf-chat-suggested-actions` | Grid of starter prompts shown only in the empty state |
| `ChatSlashCommandsComponent` | `ngx-decaf-chat-slash-commands` | Slash-command popover with prefix filtering and keyboard navigation |
| `ChatSuggestionDialogComponent` | `ngx-decaf-chat-suggestion-dialog` | Modal presenting an AI-generated suggestion (Enter applies, Escape ignores) |
| `ChatModelSelectorComponent` | `ngx-decaf-chat-model-selector` | Searchable model dropdown filtering by name/id/provider/description |
| `ChatVisibilitySelectorComponent` | `ngx-decaf-chat-visibility-selector` | Private/shared visibility dropdown with optimistic update and rollback |
| `ChatKnowledgeBaseSelectorComponent` | `ngx-decaf-chat-knowledge-base-selector` | Knowledge-base panel: selectable entries, upload queue, deletion |

#### Reasoning, code and structured output

| Component | Selector | Purpose |
| --- | --- | --- |
| `ChatReasoningComponent` | `ngx-decaf-chat-reasoning` | Collapsible reasoning panel for model thinking content |
| `ChatCodeBlockComponent` | `ngx-decaf-chat-code-block` | Syntax-highlighted code block with header and copy button |
| `ChatStructuredObjectComponent` | `ngx-decaf-chat-structured-object` | Structured object rendered as flattened rows, with streaming ghost state and history |

#### Artifacts

| Component | Selector | Purpose |
| --- | --- | --- |
| `ChatArtifactComponent` | `ngx-decaf-chat-artifact` | Artifact panel shell: title, kind/visibility badges, streamed text or image media |
| `ChatArtifactDocumentComponent` | `ngx-decaf-chat-artifact-document` | Loads and displays an artifact document via an optional loader, with reload handling |
| `ChatArtifactEditorComponent` | `ngx-decaf-chat-artifact-editor` | Editable artifact content (code editor, text area or image preview) |
| `ChatArtifactSkeletonComponent` | `ngx-decaf-chat-artifact-skeleton` | Loading placeholder for artifact content |
| `ChatArtifactToolbarComponent` | `ngx-decaf-chat-artifact-toolbar` | Toolbar of artifact kind tools emitting the selected kind |
| `ChatArtifactVersionFooterComponent` | `ngx-decaf-chat-artifact-version-footer` | Version navigation footer (older/newer, current version label) |
| `ChatArtifactDiffComponent` | `ngx-decaf-chat-artifact-diff` | Line diff between previous and current text with side-by-side/inline modes |
| `ChatArtifactConsoleComponent` | `ngx-decaf-chat-artifact-console` | Resizable console log panel with level styling and clear action |

#### Tools and agent network

| Component | Selector | Purpose |
| --- | --- | --- |
| `ChatToolComponent` | `ngx-decaf-chat-tool` | Collapsible tool-call card: name, lifecycle state, input/output/error payloads |
| `ChatToolOrdersComponent` | `ngx-decaf-chat-tool-orders` | Tool-result renderer for order lists (emits the selected order) |
| `ChatToolTrackerComponent` | `ngx-decaf-chat-tool-tracker` | Delivery-tracker tool result: packed / in transit / delivered progress |
| `ChatToolWeatherComponent` | `ngx-decaf-chat-weather` | Tool-result renderer for the weather tool: location, condition, temperature range |
| `ChatWorkflowStatusComponent` | `ngx-decaf-chat-workflow-status` | Workflow step list with per-step status icons and optional serialized output |
| `ChatAgentStepComponent` | `ngx-decaf-chat-agent-step` | One agent-network step: name, lifecycle status, input/output payloads |
| `ChatNestedAgentComponent` | `ngx-decaf-chat-nested-agent` | Nested sub-agent transcript block with ancestry path and streamed text |
| `ChatApprovalComponent` | `ngx-decaf-chat-approval` | Approval prompt for a suspended run, emitting resume/deny decisions |
| `ChatProgressComponent` | `ngx-decaf-chat-progress` | Progress indicator driven by the latest run progress event |

#### Feedback

| Component | Selector | Purpose |
| --- | --- | --- |
| `ChatNotificationComponent` | `ngx-decaf-chat-notification` | Toast stack with severity icons, auto-dismiss timers and action forwarding |
| `ChatTelemetryComponent` | `ngx-decaf-chat-telemetry` | Collapsible telemetry panel listing roundtrip rows with durations and tokens |

### `<decaf-calendar>`

Controlled month-grid calendar exported from the [`/calendar`](./calendar/README.md)
entry point: a fixed six-week grid (leading/trailing days from adjacent months
stay rendered and selectable), single-date selection, host-owned event markers
(up to three colour dots per day plus a `+N` overflow counter) and month
navigation. It is presentation only — the host owns the rendered month, the
selection and the events, so `dateSelected` and `monthChange` are requests the
host applies back to the inputs. The entry point adds no runtime dependency of
its own: only `@angular/*` and the platform `Intl` API.

| Binding | Type | Description |
| --- | --- | --- |
| `[year]` / `[month]` | `number` | Rendered year and month (`month` is `1`-based; out-of-range values roll into adjacent years) |
| `[selectedDate]` | `string \| null` | Selected local date key (`YYYY-MM-DD`), or `null` |
| `[events]` | `readonly CalendarEvent[]` | Host-owned markers (`{ id, date, title, color?, data? }`) projected onto dates in host order; invalid dates are skipped |
| `[today]` | `string \| null` | Override for the date marked as today (deterministic hosts/tests) |
| `[locale]` | `string` | BCP 47 locale for month, weekday and accessible labels (default `en-GB`) |
| `[firstDayOfWeek]` | `CalendarWeekday` | First grid column (`0` Sunday, `1` Monday; default `1`) |

Outputs: `dateSelected` (`CalendarSelectionEvent`: `{ date, previousDate, year, month, day }`) and
`monthChange` (`CalendarMonthChangeEvent`: `{ year, month, previousYear, previousMonth, direction }`
with `direction` of `previous`, `next` or `today`). Keyboard navigation (arrows move by day/week,
`Home`/`End` jump to the week edges) with a roving tabindex is built in. The accessible-label inputs
(`label`, `previousMonthLabel`, `nextMonthLabel`, `todayLabel`), the `instanceId` prefix and the
exported pure date helpers are documented in [calendar/README.md](./calendar/README.md).

```html
<decaf-calendar
  [year]="year()"
  [month]="month()"
  [selectedDate]="selectedDate()"
  [events]="events"
  (dateSelected)="onSelected($event)"
  (monthChange)="onMonthChange($event)">
</decaf-calendar>
```

Because the calendar is controlled, the host applies each emitted request back:

```ts
onSelected(event: CalendarSelectionEvent): void {
  this.selectedDate.set(event.date);
}

onMonthChange(event: CalendarMonthChangeEvent): void {
  this.year.set(event.year);
  this.month.set(event.month);
}
```

## Demo pages

The demo app served by `npm run start` (`http://localhost:8110`) ships one lazy
route per feature entry point, each exercising the public surface without a
backend:

| Route | What it exercises |
| --- | --- |
| `/barcode` | [`/barcode`](./barcode/README.md): `renderBarcodeSvg` over an editable payload with symbology (all `BarcodeTypes`) and scale selectors, sanitized SVG output and the error path |
| `/charts` | [`/charts`](./charts/README.md): the four CRD chart components in `READ` over an editable dataset with smooth/area/stack/legend/tooltip toggles, plus the curve editor's two-way `points`/`formula` binding and interpolation switch |
| `/code-editor` | [`/code-editor`](./code-editor/README.md): `CodeEditorComponent` in `code` and `formula` modes with preloaded snippets, live line/character counts and validity feedback |
| `/math` | [`/math`](./math/README.md): `MathInputComponent` with example LaTeX snippets evaluated through `@cortex-js/compute-engine`, a clear action and an inline error state for formulas that cannot be evaluated |
| `/storyboard` | [`/storyboard`](./storyboard/README.md): `StoryboardTutorialComponent` + `StoryboardTutorialService` running a four-step scenario with a custom non-blocking focus strategy, start/next/previous/abort/end controls and a live status/event readout |
| `/diagrams` | [`/diagrams`](./diagrams/README.md): `GraphRendererComponent` over an in-memory fixture node catalogue (no backend) with a two-node preview workflow and the input/output panels open |
| `/calendar` | [`/calendar`](./calendar/README.md): `CalendarComponent` with host-owned month/selection signals, month navigation applied back from `monthChange`, event add/remove with colour markers and locale following the app language |
| `/chat` | [`/agent`](./agent/README.md): `ngx-decaf-agent-chat` in fake mode over the deterministic `AgentChatFakeTransport` (no backend needed), with a conversation/structured-object scenario switcher and live panels for the non-transcript component families (tool results, workflow status, progress, agent step, nested agent, approval, notifications) |

## Running the graph UI against a backend

The graph pages (`/graph`, workflow list, runs) talk to a standalone `@decaf-ts/as-graph` backend
over `http://localhost:3000` (the `GRAPH_BACKEND_URL` injection token, default
`http://localhost:3000`). The UI is backend-agnostic: it lists whatever engine catalogue the backend
serves and gates create/run/save from the served capability manifest, so switching engines needs no
UI change.

The backend is booted by the `@decaf-ts/as-graph` standalone host. `for-angular` wires one script
per variant:

| Script | Backend it boots |
| --- | --- |
| `npm run start:backend` / `start:backend:local` | local built-in engine |
| `npm run start:backend:mastra` | Mastra (`@mastra/core`) |
| `npm run start:backend:dagster` | Dagster (needs `DAGSTER_GRAPHQL_URL`) |

`npm run start` runs the UI dev server on `http://localhost:8110`. To boot a backend and the UI
together, use `npm run start:dev` (local), `npm run start:dev:mastra`, or
`npm run start:dev:dagster`.

**Prerequisites**

- `@decaf-ts/as-graph` must be installed with the variant-capable standalone host
  (`lib/cjs/nest/graph/main.cjs`); if the installed version predates it, build and link the local
  `as-graph` package first.
- `mastra`: the `@mastra/core` peer (`^1.77.0`) is installed with the backend package.
- `dagster`: a Dagster gateway plus `DAGSTER_GRAPHQL_URL`; the `as-graph` package's
  `npm run prepare-it-tests` provisions the pinned fixture, and `npm run teardown-it-tests` stops it.

See the `@decaf-ts/as-graph` "Running each backend + UI combination" guide for the full setup, port,
and verification details.

**The `/workflows` catalogue** — `/workflows` is the catalog surface: it lists the selected engine's
served catalogue (`graph/engines/{engineId}/workflows`) and falls back to the legacy
`GET /graph/workflows` endpoint when the manifest does not advertise catalogue browsing. Create
Workflow routes to the empty canvas (`graph/create`) only when the selected engine's served manifest
allows authoring (`canCreateWorkflow`); otherwise the button is hidden and its tooltip reports that
the engine does not support creating workflows.

**Row-click navigation & deep links** — clicking a catalogue row opens the workflow's own
`/workflows/:workflowId` editor route (forwarding the selected engine as `?engine=`), and the route
also works as a direct deep link: without the query parameter the page resolves through the served
manifest's default engine, and an unknown engine disables Run instead of falling back permissively.
A row may carry `runnable: false` — a read-only canonical document the engine serves but does not
execute — which disables that row's Run action (and Run on the editor page) with a read-only
explanation. See
[Workflow deep link & row navigation](./workdocs/graph/workflow-deep-link.md).

**Run console & failed runs** — the run console is a docked bar that stays mounted while lowered and
animates its drawer open on demand; a `workflow.failed` terminal surfaces on the canvas as an alert
with the engine's structured error, anchors the failure on the node the run was working on (so an
engine-level failure never reads as a neutral canvas), and records a `failed` entry in the console.
See [Run console & failed-run surfacing](./workdocs/graph/run-console.md).

**Editor side panels & typed inputs** — the floating Workflow inputs / Run result panels collapse to
rails while the canvas re-fits around them; each typed workflow-input field can be dragged onto the
canvas (or placed with its `+` button) to move its input boundary, with the control type derived
from the port's declared value schema. See
[Editor side panels & typed workflow inputs](./workdocs/graph/editor-side-panels.md).

**Loop editor** — a foreach body is an ordered mandatory chain with labeled edges (`item`, the next
node's input port, `loop`); the add-node ghost is an editor-only affordance for an empty loop and is
never persisted into the document, deleting a mid-loop node repairs the chain, and ghosts are not
projected while a run is on the canvas. See [Loop editor](./workdocs/graph/loop-editor.md).

**Node I/O panels** — after a run, each node's inputs/outputs render capped at
`GRAPH_IO_PANEL_LIMIT` (default 256 KB / 2000 lines, provider-overridable) so a large run payload
cannot overflow the page; a download action fetches the entire untruncated payload from the run
detail endpoint (requires the run id and node id). See
[Node I/O panel](./workdocs/graph/node-io-panel.md).

**Verification** — with a backend on `:3000`, open `http://localhost:8110/workflows`; the workflow
table lists the selected engine's scenarios. The UI unit tests for this surface are
`npm run test:graph`, and the per-engine UI validation lane — booting each engine's backend and
driving list/show/replay/node-I-O for every fixture with Playwright — runs through
`tests/playwright/graph/per-engine/run-per-engine-ui.sh`. All graph components carry Storybook
stories (`npm run storybook`); every built-in functional node kind additionally gets a
working-workflow story that plays a real run against the backend selected by the story URL
(boundary kinds excluded) — see
[Storybook working-workflow stories](./workdocs/graph/storybook-working-workflows.md).

### Editor dark mode & accessibility gate

The graph editor surfaces carry their palette in `src/graph/styles/graph-theme.scss` (`--gx-*`
custom properties, plus canvas `--ngd-*` remaps): the `:root` values are byte-identical to the
literals they replaced (light mode pixel-for-pixel unchanged), and the dark palette applies under
both triggers the decaf engine uses — `html.dcf-palette-dark` (engine toggle) and
`@media (prefers-color-scheme: dark)` (OS preference) — so the editor follows both without touching
surfaces outside the graph editor. Host apps embedding the editor must load `graph-theme.scss`
globally. The editor is covered by an axe-core accessibility gate
(`tests/playwright/graph/a11y.spec.ts`, WCAG 2.x AA) over the canvas/toolbar/palette, the node
inspection split view and inline editor, the node/switch edit modals, the model-builder surface,
the workflow-create modal, and the workflow/executions lists — including a forced dark-mode pass.

## Coding Principles

- group similar functionality in folders (analog to namespaces but without any namespace declaration)
- one class per file;
- one interface per file (unless interface is just used as a type);
- group types as other interfaces in a types.ts file per folder;
- group constants or enums in a constants.ts file per folder;
- group decorators in a decorators.ts file per folder;
- always import from the specific file, never from a folder or index file (exceptions for dependencies on other packages);
- prefer the usage of established design patters where applicable:
  - Singleton (can be an anti-pattern. use with care);
  - factory;
  - observer;
  - strategy;
  - builder;
  - etc;

## Release Documentation Hooks
Stay aligned with the automated release pipeline by reviewing [Release Notes](./workdocs/reports/RELEASE_NOTES.md) and [Dependencies](./workdocs/reports/DEPENDENCIES.md) after trying these recipes (updated on 2025-11-26).


### Related

[![decaf-ts](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=decaf-ts)](https://github.com/decaf-ts/decaf-ts)
[![ui-decorators](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=ui-decorators)](https://github.com/decaf-ts/ui-decorators)
[![styles](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=styles)](https://github.com/decaf-ts/styles)
[![decorator-validation](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=decorator-validation)](https://github.com/decaf-ts/decorator-validation)
[![db-decorators](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=db-decorators)](https://github.com/decaf-ts/db-decorators)


### Social

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/decaf-ts/)




#### Languages

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ShellScript](https://img.shields.io/badge/Shell_Script-121011?style=for-the-badge&logo=gnu-bash&logoColor=white)

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/decaf-ts/ts-workspace/issues/new/choose).

## Contributing

I am grateful for any contributions made to this project. Please read [this](./workdocs/98-Contributing.md) to get started.

## Supporting

The first and easiest way you can support it is by [Contributing](./workdocs/98-Contributing.md). Even just finding a typo in the documentation is important.

Financial support is always welcome and helps keep both me and the project alive and healthy.

So if you can, if this project in any way. either by learning something or simply by helping you save precious time, please consider donating.

## License

This project is licensed under the Mozilla Public License 2.0 (MPL-2.0). See `./LICENSE.md` for a Fair Usage Addendum that explains when AGPL-3.0 applies (automated AI/Decaf MCP code generation and non-deterministic UI generation).

By developers, for developers...
