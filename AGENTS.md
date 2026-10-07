# AGENTS.md — for-angular

`@decaf-ts/for-angular` is the Angular rendering engine of decaf and hosts the
graph workflow editor under `src/graph`. Graph metadata and engine code live in
`@decaf-ts/as-graph` (backend-only module).

## Import rule — `@decaf-ts/as-graph/shared` only

Angular code may import `@decaf-ts/as-graph` **only from its `/shared` export**
(`@decaf-ts/as-graph/shared` — frontend-safe graph contracts: decorators,
readers, constants, catalog/manifest and document types, persisted
`GraphRunModel`/`GraphWorkflowModel`, execution-state projections). That import
**completely replaces** the old `@decaf-ts/ui-decorators/graph` import: the
legacy surface is superseded and must not be used or extended anywhere in
`for-angular`. The `@decaf-ts/as-graph` root, `/nest`, and `/ram` entries are
backend-only and must never be imported from Angular code — the bundle wall
(`src/graph/bundle-wall.spec.ts`) enforces the engine-free boundary.

## Invariant — graph code changes MUST observe the graph rules and update the technical documentation

Whenever **graph-related code is changed** (workflows, panels, nodes, ports,
connections, run/execution UI, canvas interactions, save/validation):

1. It MUST observe the relevant skills / available technical documentation for
   the rules on how workflows, panels, and nodes are supposed to work. The
   normative rule set lives in
   `workdocs/ai/project/technical-docs/design-specification/08-graph-design.md`
   (umbrella repo root — the editor UI rules in the Angular frontend section and
   the node rules in §0). Read the affected rules before changing the code.
2. Any update to the code MUST update the technical documentation in the same
   working change. A graph code change that leaves the documentation stale is
   **incomplete** — do not consider the change done until the docs reflect it.

Skill map (company skills catalog, `/company/skills/decaf-ts/`):

| Code area | Skill to read/update |
|:----------|:---------------------|
| Angular graph editor (canvas, palette, document store, parameter renderers, run bridge, node/switch modals, panels, interactions) | `/company/skills/decaf-ts/for-angular/graph/SKILL.md` |
| Graph decorators, node property taxonomy, `@uielement` usage, locale keys | `/company/skills/decaf-ts/as-graph/nodes/SKILL.md` |
| Module map, import surfaces, backend invariants | `/company/skills/decaf-ts/as-graph/SKILL.md` |
| Workflow document format, builder/serializer, persistence | `/company/skills/decaf-ts/as-graph/workflows/SKILL.md` |
| Engine/validation/run lifecycle (backend reference only — never imported here) | `/company/skills/decaf-ts/as-graph/engine/SKILL.md` |

## Rules

- No hardcoded user-facing strings in graph code: every label, placeholder, and
  option label is a locale key resolved through the app's translation
  (`@ngx-translate`), with keys structured per node category (e.g.
  `core.flow.loop.for-each` shape: `graph.node.<category>.<node>.…`).
- Graph UI work stays in `for-angular`; it must never import engine, NestJS, or
  Node-only code from `@decaf-ts/as-graph` (only the `/shared` export) or from
  any backend package.
- Renderer/UI guidance for the graph belongs to the `for-angular/graph` skill;
  backend skills stay backend-only.
- If a rule is unclear, ask the board/manager — do not guess.
