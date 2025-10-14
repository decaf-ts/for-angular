# Repository Guidelines

## Project Structure & Module Organization
Source TypeScript lives in `src/` with public exports consolidated in `src/index.ts`. Tests stay in `tests/unit`, `tests/integration`, and `tests/bundling` for packaging checks. Build artefacts are emitted to `lib/` (CJS + ESM + typings) and `dist/` (CJS + ESM bundled). Generated documentation resides in `docs/`, while editable assets and scripts live in `workdocs/`; refresh diagrams there before copying outputs.

## Build, Test, and Development Commands
The repository exposes the following npm scripts:

### Setup and Maintenance
- `do-install`: reads the `.token` file into the `TOKEN` environment variable and runs `npm install`, which is handy when private registries require an auth token.
- `update-dependencies`: upgrades all dependencies that start with `@decaf-ts/` to their latest version.
- `update-scripts`: downloads the latest GitHub workflows, configs, and templates from the ts-workspace template repository.
- `sync-codex`: copies the prompts under `./.codex/prompts` into `~/.codex/prompts` so Codex CLI can reuse them.
- `on-first-run`: bootstraps the project by calling `update-scripts` with the `--boot` flag.
- `set-git-auth`: configures git remotes to use the token stored in `.token`; run this once per repository.
- `flash-forward`: bumps every dependency to the latest version via `npm-check-updates` and re-installs.
- `reset`: restores the repository to the state of the default branch (wipes the working tree and re-installs dependencies); use with care.

### Build and Quality
- `build`: runs `npx build-scripts --dev` to produce development builds in `lib` and `dist`.
- `build:prod`: runs `npx build-scripts --prod` to generate optimized production builds.
- `lint`: executes ESLint across the repository.
- `lint-fix`: runs ESLint with `--fix` to automatically resolve issues when possible.
- `prepare-pr`: runs documentation, test, readme refresh, linting, production build, and coverage ahead of opening a pull request.

### Documentation Assets
- `drawings`: converts every Draw.io file under `workdocs/drawings` into PNG assets and copies them into `workdocs/resources`.
- `uml`: renders each PlantUML diagram found in `workdocs/uml` to PNG and copies the result to `workdocs/resources`.
- `docs`: clears the `docs` folder and rebuilds the static documentation site via `build-scripts --docs`.
- `publish-docs`: publishes the Markdown content under `workdocs/confluence` to Confluence through the official `markdown-confluence` container.

### Docker
- `docker:login`: authenticates against `ghcr.io` using the credentials stored in `.dockeruser` and `.dockertoken`.
- `docker:build`: convenience alias that delegates to `docker:build-base`.
- `docker:build-base`: builds the base container image with BuildKit using the version from `package.json`.
- `docker:publish`: convenience alias that delegates to `docker:publish-base`.
- `docker:publish-base`: pushes the versioned and `latest` Docker images to the GHCR registry.


## Coding Style & Naming Conventions
ESLint (`eslint.config.js`) and Prettier enforce two-space indentation, trailing commas where ES5 allows, and semicolons. The project compiles with strict TypeScript settings (`strict`, `noImplicitAny`, `noImplicitOverride`), so resolve warnings instead of suppressing them. Use PascalCase for classes, camelCase for functions and variables, and SCREAMING_SNAKE_CASE for shared constants. Keep module entry points lean and re-export public APIs through `src/index.ts`.

## Testing Guidelines
All automated test scripts live in `package.json`:

- `test`: default entry point; forwards directly to `test:all`.
- `test:unit`: runs Jest against files in `tests/unit`.
- `test:integration`: runs Jest against files in `tests/integration`.
- `test:all`: executes the entire Jest test suite under `tests`.
- `test:dist`: runs the full suite twice, once against the compiled `lib` output and once against the `dist` bundle via the `TEST_TARGET` environment variable.
- `test:circular`: checks the source for circular dependencies using `dpdm`.
- `coverage`: wipes previous coverage JSON files and runs the full test suite with the coverage-specific Jest config to emit reports and badges.

Name specs with `*.test.ts`. Isolate logic in unit suites never mock. If a mock is required, write an integration test instead; move cross-module workflows to `tests/integration`. Run `npm run coverage` before merging and confirm the generated reports in `workdocs/reports/data/`.

## Commit & Pull Request Guidelines
Mirror existing history by prefixing commit subjects with the tracker key when they match the branch name, otherwise ask the user for the reference (e.g., `DECAF-123 short summary`) or semantic version when cutting a release. Keep subjects under 72 characters and include rationale in the body when behaviour changes. Pull requests should link issues, list validation commands (`lint`, `test`, `coverage`), and attach screenshots for visual updates. Run `npm run prepare-pr` and mention any skipped steps.

## Documentation & Assets
Use Node 22+ and npm 10+. Rebuild documentation with `npm run docs`; regenerate diagrams via `npm run drawings` or `npm run uml` (requires Docker). Keep sensitive tokens (`.npmtoken`, `.confluence-token`) out of commits and refresh them only through the existing automation.
