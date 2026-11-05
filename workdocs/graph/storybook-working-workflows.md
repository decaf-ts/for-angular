# Storybook Working-Workflow Stories

The Storybook suite covers every built-in functional node kind twice over: its
configuration screen and a **working workflow** that plays a real run.

## Working workflows (`graph-node-workflows.stories.ts`)

One story per built-in **functional** node kind — the input/output boundary
kinds (`graph-input-value-node` / `graph-output-value-node`) are deliberately
excluded. Each story mounts the canonical `GraphPage` editor/runner against a
running `@decaf-ts/as-graph` backend and opens the demo fixture that exercises
that kind, so pressing **Play** executes the real engine and the node inspection
panes show real run inputs/outputs.

The backend target comes from the Storybook URL, so a reviewer can point the
stories at any environment without rebuilding:

- `?graphBackend=<origin>` — backend origin (default `http://localhost:3000`),
  applied app-wide: the node catalogue, validation, run, capability-manifest and
  save clients all resolve the same origin.
- `?engine=local|mastra|dagster` — engine variant (default `local`).

Stories whose kind needs infrastructure the URL does not provide are still
listed and say so honestly in their description — e.g. the Mastra-only
`core.agent` / `core.trigger.chat` stories explain that the model connection
must be mocked (or a real Mastra provider configured) before they can play, and
kinds without a demo fixture yet name the missing fixture instead of pretending
to run.

## Configuration screens (`graph-node-configs.stories.ts`)

One story per built-in functional node kind (boundary kinds excluded again)
mounting `GraphNodeEditModalComponent` from the shipped manifest snapshot
(`GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT`), so every node's declared
configuration fields and port defaults are reviewable in isolation. Nodes whose
execution depends on an external integration are called out in the story
description; their connection values are placeholders, never live credentials.

## Storybook app wiring

The Storybook application config mirrors the app's graph bindings — the
`GRAPH_BACKEND_URL` provider reads `?graphBackend=`, and the node-catalogue and
capability-manifest sources bind to the real HTTP API implementations — so
root-scoped graph services behave exactly as in the served app. Page and modal
stories render in fullscreen hosts (with the page's own `ion-content`), because
Ionic content collapses to zero height inside a padded, auto-height story root.
Run `npm run storybook` to browse them.
