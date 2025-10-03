# Repository Guidelines

## Project Structure & Module Organization
Source TypeScript lives in `src/` with public exports consolidated in `src/index.ts`. Tests stay in `tests/unit`, `tests/integration`, and `tests/bundling` for packaging checks. Build artefacts are emitted to `lib/` (CJS + ESM + typings) and `dist/` (CJS + ESM bundled). Generated documentation resides in `docs/`, while editable assets and scripts live in `workdocs/`; refresh diagrams there before copying outputs.

## Build, Test, and Development Commands
All available npm commands are described in [./workdocs/tutorials/For Developers](./workdocs/tutorials/For%20Developers.md###Scripts)

## Coding Style & Naming Conventions
ESLint (`eslint.config.js`) and Prettier enforce two-space indentation, trailing commas where ES5 allows, and semicolons. The project compiles with strict TypeScript settings (`strict`, `noImplicitAny`, `noImplicitOverride`), so resolve warnings instead of suppressing them. Use PascalCase for classes, camelCase for functions and variables, and SCREAMING_SNAKE_CASE for shared constants. Keep module entry points lean and re-export public APIs through `src/index.ts`.

## Testing Guidelines
All available npm commands are described in [./workdocs/tutorials/For Developers](./workdocs/tutorials/For%20Developers.md##Testing)
Name specs with `*.test.ts`. Isolate logic in unit suites never mock. It a mock is required, write an integration test instead; move cross-module workflows to `tests/integration`. Update `tests/bundling` whenever new build-time dependencies or entry points are introduced. Run `npm run coverage` before merging and confirm the generated reports in `workdocs/reports/data/`.

## Commit & Pull Request Guidelines
Mirror existing history by prefixing commit subjects with the tracker key or branch name (e.g., `DECAF-123 short summary`) or semantic version when cutting a release. Keep subjects under 72 characters and include rationale in the body when behaviour changes. Pull requests should link issues, list validation commands (`lint`, `test`, `coverage`), and attach screenshots for visual updates. Run `npm run prepare-pr` and mention any skipped steps.

## Documentation & Assets
Use Node 22+ and npm 10+. Rebuild documentation with `npm run docs`; regenerate diagrams via `npm run drawings` or `npm run uml` (requires Docker). Keep sensitive tokens (`.npmtoken`, `.confluence-token`) out of commits and refresh them only through the existing automation.
