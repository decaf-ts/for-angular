![Banner](./workdocs/assets/decaf-logo.svg)

# Decaf's Angular Module

> Release docs refreshed on 2025-11-26. See [workdocs/reports/RELEASE_NOTES.md](./workdocs/reports/RELEASE_NOTES.md) for ticket summaries.

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

Minimal size: unknown kb gzipped


### Description

A very versatile persistence layer. from smart contracts, Digital wallets or just regular database access



### How to Use

- [Initial Setup](./workdocs/tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./workdocs/tutorials/For%20Developers.md#installation)

## Graph frontend (DECAF-50)

The canonical graph frontend (DECAF-50 §4.12, §4.17–§4.20) is manifest-driven and document-native — no node constructors, no legacy config store, no flag mechanics reach the browser:

- **Catalogue (`src/graph/catalog/`):** `GraphNodeCatalogService` loads/refreshes `GraphNodeManifest[]` (palette consumes manifests; adding a node creates a `GraphNodeInstance` via `GraphNodePaletteFactory` and dispatches `node.add`). Sources: `GraphNodeCatalogApi` (backend), offline `GraphNodeManifestFixtures` (compiled from the demo's decorated classes with the ui-decorators compiler — demo-decorated kinds stay locally authoritative), and `GraphNodeCatalogCompositeSource` merging both. The catalogue service pairs a decaf `@service()` registry singleton with an Angular `Injectable({providedIn:'root'})` root provider (normative pairing, spec §4.12); `@graphAngularServiceShare` (from `src/graph/utils/graphAngularServiceShare.ts`) re-attaches the Angular provider to the decaf `@service()` wrapper class so DI resolves either shape.
- **Document layer (`src/graph/document/`):** `GraphWorkflowDocumentStore` (canonical document state; every semantic mutation is a command), `GraphDiagramMutationTranslator` + `GraphDiagramAdapter` (projection is a pure function of document + manifest reader; canvas mutations become document commands, never the reverse), `GraphDocumentSelectors`/`GraphDocumentCommands`.
- **Editing (`src/graph/components/`):** node edit modal, switch case editor, and node templates all seed from the document's `GraphNodeInstance`/canvas data and save through the store. Edit results update the store directly — `GraphNodeConfigStore` is gone.
- **Parameter renderers (`src/graph/parameters/`):** 12 built-in typed renderers (text, multiline, number, boolean, static/dynamic options, collection, object, code, expression, resource locator, credential, notice, hidden) registered in `GraphParameterRendererRegistry`, with generic fallback rendering, visibility DSL evaluation, manifest validation, and dependency-triggered dynamic options reload.
- **Runs (`src/graph/runs/`):** `GraphRunClient`/`GraphRunEventClient`/`GraphRunStateStore` wire the editor document to the backend run API, including live node/edge event mapping and terminal-state semantics (DECAF-48).

Boundary guarantee: no graph engine, executor, catalogue runtime, validator, or run-store code reaches the production browser bundle (§4.20 bar 1 — enforced by the TASK-233 bundle scan).

### Graph demo

`src/app/pages/graph/graph.page.ts` hosts the demo (workflow editor + run console) wired to the canonical document store, the manifest-driven palette, and the composite catalogue source.

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
