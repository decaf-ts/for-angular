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
