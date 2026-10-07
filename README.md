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

## Components

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
