# for-angular — UI/UX, Accessibility, Micro-interactions & Security — Full Consolidated Findings Report

## Provenance

- **Source:** the complete consolidated proven review delivered under [SAA-2005](/SAA/issues/SAA-2005), consolidated by the CTO from four delegated, independent reviews (review chain below). The CTO's first-pass comment (`004e2cb2`) was treated strictly as a **baseline hypothesis**; every claim was re-derived from source by the delegates. Where the baseline was wrong, the wrong value is struck and the proven value stands below.
- **Review chain (each verdict posted with full `file:line` evidence on its own issue):**

| Child | Reviewer | Scope | Confidence |
|---|---|---|---|
| [SAA-2006](/SAA/issues/SAA-2006) | Front-End Developer | design system, tokens, component ARIA, contrast, layout consistency | 88% |
| [SAA-2007](/SAA/issues/SAA-2007) | Mobile Developer | responsive behavior, touch/affordances, motion/micro-interactions, viewport meta | 88% |
| [SAA-2008](/SAA/issues/SAA-2008) | QA Specialist | independent verification of all baseline claims + Storybook coverage audit | 96% |
| [SAA-2009](/SAA/issues/SAA-2009) | Security Engineer | innerHTML / `bypassSecurityTrustHtml` injection surface | 88% |

- **Pinned revisions at review time:** umbrella repo `/workspaces/decaf-ts` master @ `0b03a1c`; `@decaf-ts/for-angular` **v0.5.27** (package worktree HEAD @ `e5cd9a3`, "DECAF-809 update").
- **Scope of this record:** durable in-repo findings record (Deliverable 1 of [SAA-2020](/SAA/issues/SAA-2020)). This revision ([SAA-2042](/SAA/issues/SAA-2042), board directive) restores the **full detail of the original consolidated SAA-2005 report** — every proven finding, its complete `file:line` evidence, the demonstrations (including the statically demonstrated XSS payload), and the proposed fix per finding. Storybook-coverage findings from the source review remain **excluded** per board directive and are tracked separately.
- **Reference verification:** every `file:line` reference below was re-checked against `for-angular/src/**` at the pinned worktree HEAD `e5cd9a3` (clean tree; no drift found). Key numeric claims re-confirmed at the same revision: `isDarkMode` branching is exactly 25 hits across 8 files (excluding spec/story files); exactly 2/31 story files carry `play()` interaction tests (`crud-field.stories.ts:105`, `page.stories.ts:26`); the for-angular `:root` override `--dcf-color-gray-4: #b3b3b3` (`src/assets/theme/variables.scss:605`) shadows the styles-package scale `#98a2b3` (`styles/src/core.scss:126`); `--dcf-width-sm` is undefined (`core.scss` emits only `--dcf-width-s/m/l/xl`); `--dcf-shadow-glass` is emitted nowhere; `$dcf-dark-*` tokens are never emitted as custom properties; `prefers-reduced-motion` has zero matches in `src/**` and the styles package.

---

## 1. Baseline verification outcome (QA Specialist, SAA-2008)

**Verdict: baseline substantially accurate.** 14/20 claims fully CONFIRMED, 5 PARTIAL, with these proven corrections:

- **REFUTED — "6 stories have `play()` tests":** only **2 of 31** actually do (`crud-field.stories.ts:105`, `page.stories.ts:26`). Interaction-test coverage is ~6%, not ~19%.
- **REFUTED — "the package has exactly one `aria-live`/`role="alert"`":** non-spec `src/` has **5 `aria-live` + 2 `role="alert"`** (`graph-renderer.component.html:10,11,101,109,116`; `cron-builder.component.html:189`; `storyboard-tutorial.message.ts:54`). The a11y half (crud-field errors have zero `aria-describedby`/`aria-invalid`/`aria-errormessage` anywhere) is CONFIRMED.
- **REFUTED — switcher "two tab stops per item":** the inner `<a>` has no `href`, so it is not focusable — one tab stop per item.
- **REFUTED (absolute form) — "no `.has-dark-mode`/media block":** `.has-dark-mode` *is* toggled in TS (`providers.ts:165`) and `prefers-color-scheme` blocks exist (`filter.component.scss:125,128` — empty). What stands: `$dcf-dark-*` tokens (311–346) are **never emitted as custom properties** (0 matches in built CSS), and dark styling is assembled via per-component `isDarkMode` branching (25 hits / 8 files).
- **REFUTED (runtime part) — modal duplicate `id="dcf-modal-content"`:** the two occurrences (`modal.component.html:77,98`) are in mutually exclusive branches — no duplicate DOM id at runtime; latent copy/paste smell only.
- **REFUTED — "filter/switcher have no focus styles":** filter has `:focus-within`/`:focus` (`filter.component.scss:19,76,205`), switcher has `:focus` (`switcher.component.scss:251`). What stands: the `dcf-focusable` mixin is used only by graph components; **pagination** has zero `:focus` rules.
- **REFUTED — "gray-4 `red !important` is a live bug":** it is never emitted and never referenced — latent dead code (P3), not a runtime defect.
- **DISPROVEN with residual defect — "list-item actions vanish on mobile with no alternative":** a swipe-only `ion-item-options` fallback exists (`list-item.component.html:205-239`, enabled ≤639px) but is undiscoverable, covers only UPDATE/DELETE, and requires `uid`.
- **DISPROVEN — "stepped-form users lose all step context on small screens":** the active step's title/description re-render in `.dcf-current-step` at all widths (`stepped-form.component.html:50-68`).
- **CONFIRMED exact:** all 8 headline contrast ratios re-computed independently in Python — matched to 2 dp.

---

## 2. Proven findings — accessibility defects (P0/P1/P2)

### P0/P1 — Accessibility defects

1. **XSS via empty-state search subtitle (Security F1, P1 — the headline security finding).**
   - **Evidence:** `empty-state.component.ts:386` applies `bypassSecurityTrustHtml` to a string built by ngx-translate interpolation of the **end-user's search term** (`NgxTranslateService.ts:21-23`, unescaped `{0}` params), rendered via `[innerHTML]` (`empty-state.component.html:24`).
   - **Demonstration (static):** a search term of

     ```html
     <img src=x onerror=alert(document.cookie)>
     ```

     executes in app origin for any consumer using `searchValue` + a `{0}` placeholder — the component's documented, intended pattern.
   - **Proposed fix:** sanitize (`SecurityContext.HTML`) or drop the bypass; add a regression test with an `onerror` payload.
2. **Icon-only buttons have no accessible name.** `IconComponent` has no `ariaLabel` input (`icon.component.ts:46,52-89`); caller labels land on the `<ngx-decaf-icon>` host, never the inner `<ion-button>`; inner icons `aria-hidden="true"`. Affects table row actions (`table.component.html:108-160`), list-item actions, file-upload preview/remove, filter clear, dashboard tile delete (`dashboard.component.html:43-50`), model-builder property toggles/move buttons (`model-builder.component.html:163-217`), layout accordion toggle (`layout.component.html:45-51`), back-button. WCAG 4.1.2, 2.4.4, 2.5.3.
   - **Proposed fix:** add an `ariaLabel` input on `IconComponent` propagated to the inner `ion-button`, and label every icon-only call site (see P0 remediation).
3. **Zoom disabled app-wide.** `src/index.html:13` `maximum-scale=1.0, user-scalable=no`. Fails WCAG 1.4.4 (AA). **Proposed fix:** delete the two attributes.
4. **Silent form errors.** crud-field checkbox/radio/select errors are bare `ion-text.dcf-input-error [innerHTML]` (`crud-field.component.html:152-157,195-200,269-276`) — zero `aria-describedby`/`aria-invalid`/`aria-errormessage` in `src/`; no live region. WCAG 3.3.1, 4.1.3.
   - **Proposed fix:** wire `aria-describedby`/`aria-invalid` onto the controls and announce errors via a live region (see P0 remediation).
5. **Duplicate option IDs.** Every checkbox/radio option in a group binds `[id]="path"` (`crud-field.component.html:133,178`) — N duplicates per group; group `<label [for]="path">` associates with only one control. WCAG 1.3.1, 3.3.2.
   - **Proposed fix:** unique option IDs per group (`path + '.' + index`).
6. **Pagination is fake buttons.** `pagination.component.html:22-68` — `<div tabindex="0" (keydown.enter)>`, no `role`, no `aria-current="page"`, Enter only (no Space), no `:focus` rules at all, disabled state conveyed by nothing (`cursor: text`!), `aria-label="previous"/"next"` hardcoded English. WCAG 2.1.1, 2.4.7, 4.1.2, 1.4.1.
   - **Proposed fix:** real `<button>`s with `aria-current`, Space activation, a focus ring, `aria-disabled`, and translated labels.
7. **Filter "combobox" is a raw input + div list.** No `role="combobox"/"listbox"/"option"`, no `aria-expanded`/`aria-activedescendant`, no arrow/Escape keys (`filter.component.html:48-141`); static `id="dcf-filter-field"` resolved via `querySelector` (`filter.component.ts:560`) — instances collide. WCAG 4.1.2, 1.3.1, 2.1.1.
   - **Proposed fix:** ARIA-correct combobox per the APG pattern (P1 remediation); make the field id unique per instance.
8. **Switcher is fake tabs.** `switcher.component.html:14-30` — `li tabindex="0" (keyup.enter) > a` with no href; no `role="tablist"/"tab"`, no `aria-selected`, no arrow keys, no Space. WCAG 4.1.2, 2.1.1.
   - **Proposed fix:** ARIA-correct tabs per the APG pattern (P1 remediation).
9. **list-item end-slot content lost ≤768px.** DOM gate `windowWidth > 639` (`list-item.component.html:196`) + CSS `display:none !important` ≤768px (`list.component.scss:18-23`). Mobile actions otherwise reachable only through the undiscoverable swipe fallback (baseline F1.3, P2). WCAG 2.1.1, 1.3.1; WCAG 2.5.1 for the gesture path.
   - **Proposed fix:** always render the end slot (or a discoverable overflow menu) and remove the JS `windowWidth` gates.
10. **Hardcoded English interactive strings** across `list.component.html:56`, `crud-field.component.html:259`, `pagination.component.html:23,60`, model-builder (dozens), `cron-builder.component.html:124`, `file-upload.component.html:8`. WCAG 3.1.1/3.1.2.
    - **Proposed fix:** route all interactive strings through ngx-translate keys (P1 remediation).
11. **Additional confirmed P2 accessibility findings** (each previously collapsed into one digest bullet; individually recorded here with fix guidance):
    1. **Clickable `<td>`s are mouse-only.** `table.component.html:82-102` — interactive cells have no keyboard operability. **Proposed fix:** expose the interactive cell content as real buttons/links (or add keyboard handlers with correct semantics) — "table interactive-cell semantics" in the P2 remediation plan.
    2. **Stepped-form step indicator is purely visual.** No `aria-current="step"` on the active step (`stepped-form.component.html:9-13`). **Proposed fix:** set `aria-current="step"` on the active step element.
    3. **File-upload drop zone is keyboard-inoperable.** `file-upload.component.html:23-42` — drag-only affordance with no keyboard path. **Proposed fix:** make the drop zone a real button that opens the file dialog.
    4. **Spinners lack `role="status"`.** `modal.component.html:67-72`, `empty-state.component.html:4-6`, `fieldset.component.html:306-312`. **Proposed fix:** add `role="status"` (with `aria-busy`/announced text) — see finding 23 for the in-package positive example in `src/graph/**`.
    5. **cron-builder `[role]="button"` broken.** `cron-builder.component.html:62` binds `[role]="button"` with `button` undefined → the role attribute is removed; `(keydown)` fires on every key (`cron-builder.component.html:75`); `arai-hidden`/`maxlengh` typos at `cron-builder.component.html:53,201`. **Proposed fix:** use a real `<button>` (or fix the role binding), switch to `(keydown.enter)`, and fix the typos.
    6. **modal-confirm malformed `aria-label`.** `modal-confirm.component.html:9,37` — malformed `aria-label` binding plus the `title?.lengh` typo. **Proposed fix:** correct the translate binding quoting and fix the `lengh` → `length` typo.
    7. **`role="form"` unnamed.** `cron-selector.component.html:3`. **Proposed fix:** remove the role or give the form an accessible name.
    8. **Invalid media queries.** `list-item.component.scss:190,199,231,256` use undefined `--dcf-width-*` custom properties inside `@media` conditions — `var()` is not resolvable in media features, so the blocks are silently dropped (`core.scss` emits only `--dcf-width-s/m/l/xl`, and `--dcf-width-sm` exists nowhere). **Proposed fix:** use SCSS breakpoint variables/mixins for media queries instead of CSS custom properties.

---

## 3. Proven findings — design system & tokens (P1)

12. **`--dcf-color-gray-4` hardcoded `#b3b3b3` in for-angular `:root`** overrides the styles-package scale (`#98a2b3`) — wins the built cascade (verified byte offsets in `www/styles.css` at review time) — and is used **as text** (`stepped-form.component.scss:87`, `fieldset.component.scss:119`, `filter.component.scss:71`): 2.10:1 on white. WCAG 1.4.3.
    - **Proposed fix:** remove the for-angular `:root` override so the styles-package scale wins, and stop using gray-4 as text (migrate to a text-safe variant).
13. **Contrast failures** (all verified independently by two reviewers, exact to 2 dp):

| Pair | Ratio | Verdict |
|---|---|---|
| primary #5b2ecc on white | 7.76 | AAA ✅ |
| text-primary #151827 | 17.62 | AAA ✅ |
| text-secondary #667085 | 4.97 | AA ✅ |
| secondary #2563eb | 5.17 | AA ✅ |
| danger #eb445a | 3.81 | large-only ⚠️ |
| text-tertiary #8a91a3 | 3.15 | fails normal text ❌ |
| **warning #ffa420 as text** | **1.98** | **fail ❌** |
| **success #00bfa5 as text** | **2.33** | **fail ❌** |
| gray-4 #b3b3b3 as text | 2.10 | fail ❌ |
| focus ring rgba(91,46,204,.16) | ~1.5 | fails 3:1 (2.4.11) ❌ |
| gray-3/gray-2 borders | 1.44/1.20 | fail 3:1 (1.4.11) ❌ |
| dark text-tertiary #6b7194 | 3.70 | large-only ⚠️ |

    **Proposed fix:** define text-safe `*-text` variants (warning ≥#8a5300, success ≥#00857a); keep raw values for fills/icons/tints; darken tertiary/danger-text; solid ≥3:1 focus ring; borders via `--dcf-color-outline` where they are the sole boundary.

14. **Broken/undefined tokens** (all verified against built CSS or both token sources): `$dcf-color-gray-4: red !important` debug leftover (`variables.scss:80`, latent); `--ion-color-step-300: var(--dcf-color-gray-43)` — `gray-43` exists nowhere (`variables.scss:606`); `--dcf-box-shadow-compact` undefined (`global.scss:121`); `--dcf-shadow-glass` never emitted (`cron-selector.component.scss:14-15`); `--dcf-graph-sidebar-width`, `--dcf-primary`, `--dcf-text-primary/secondary`, `--dcf-space-px` undefined (`sidebar-menu.component.scss:17`, `home.component.scss:18,25,29-30`, `ng-diagram.scss:58`).
    - **Proposed fix:** define each missing token at its canonical source or correct/replace the references (P1 remediation).
15. **Alias/clash debt:** `--dcf-border-radius-sm` → radius-md (12px, larger than the 8px default; 15 live references); `--dcf-font-size-caption: 1.5rem` (= h2); dual shadow families (`--dcf-shadow-*` vs `--dcf-box-shadow-*`); `--dcf-radius-*` declared **twice** in the same `:root` block (`variables.scss:551-554` vs `590-593`); gray-4 override shadowing (finding 12).
    - **Proposed fix:** reconcile the aliases — point radius-sm at the intended value or migrate usages, right-size the caption size, merge the shadow families into one, and deduplicate the `:root` radius block.
16. **Dark-mode token layer dead:** `$dcf-dark-*` (311–346) never emitted as custom properties; dark styling via per-component `isDarkMode` branching (25 hits/8 files) with `IconComponent` constructing `new NgxMediaService()` per icon instance (`icon.component.ts:93`). **Proposed fix:** emit the tokens under `.dcf-palette-dark`, consume them, and inject the media service via DI.
17. **`!important` debt:** 338 in `src/lib` SCSS (601 package-wide incl. app/global/assets); 60 `::ng-deep` occurrences across 24 files (29 in `src/lib`); dead commented CSS in `global.scss:200-205,237-244,301-303`; hardcoded hex bypassing tokens (`main.scss:78,89`, `switcher.component.scss:163,176,197`, `graph.page.scss`, `dashboard.component.scss:23,37,77,79`).
    - **Proposed fix:** retire `!important`/`::ng-deep` debt behind a documented override API (P3); delete the dead CSS blocks; tokenize the remaining hex values.
18. **Ionic mode drift:** searchbar + cron segment `mode="ios"` vs card/table/crud-field `mode="md"`.
    - **Proposed fix:** unify the Ionic `mode` across components (P3).
19. **Minor defects:** `Dashboboard.ts` filename typo (`src/app/layouts/Dashboboard.ts`); duplicate `dcf-card-separator` binding (`card.component.html:5,8`); duplicate `[match]="false"` (`stepped-form.component.html:78,84`); deprecated `<ion-label position="stacked">`; empty `prefers-color-scheme` blocks (`filter.component.scss:125-129`); unused `.dcf-button-toggle` 40×22 switch with no `role="switch"`.
    - **Proposed fix:** rename the file, deduplicate the bindings, replace the deprecated label position, delete the empty blocks, and either add `role="switch"` semantics or remove the unused toggle (P3 hygiene).

---

## 4. Proven findings — micro-interactions & motion (P1/P2)

20. **No `prefers-reduced-motion` support anywhere** (`rg` = 0 in `src/**` and the styles package) despite a complete motion-token set and live entrance/looping animations (login, switcher, layout, fieldset, app, global `dcf-animation-*` 0.5s ease-out). WCAG 2.3.3/2.2.2.
    - **Proposed fix:** package-level reduced-motion guard (P2 remediation).
21. **Off-token motion durations** throughout (0.05s in file-upload, 0.1s–0.3s literals vs the 140/240/400/800ms tokens); hover-only feedback with no `:focus-visible` parity; hover-gated `dcf-animation-toggle`.
    - **Proposed fix:** replace duration literals with the motion tokens and add `:focus-visible` parity for hover-only feedback.
22. **Touch targets:** pagination 34px vs the 42px `--dcf-size-touch` token (AA 24px still met); switcher tabs ~24–30px.
    - **Proposed fix:** size pagination (and switcher tabs) up to the `--dcf-size-touch` token.
23. **Strengths worth keeping:** skeleton loading (list/file-upload/stepped-form/crud-field); empty-state distinguishing "no data" vs "no search results" with contextual action; pull-to-refresh + infinite-scroll/pagination switching; header overlay-menu fallback works; `src/graph/**` already uses `role="status"`/`aria-live` correctly (positive in-package example).

---

## 5. Proven findings — security (SAA-2009, F1–F6)

- **F1 (P1):** XSS via empty-state search subtitle — the headline security finding; full evidence, demonstration, and fix in finding 1 above.
- **F2 (P2):** modal `bypassSecurityTrustHtml` on developer-supplied `inlineContent` strings, unconditional (`modal.component.ts:354,356`), API-invited misuse (`getNgxInlineModal`/`getNgxLightboxModal`); card's equivalent stays sanitized — the inconsistency proves it's not a documented trust boundary. **Proposed fix:** drop the bypass on the string branch or accept only `SafeHtml`.
- **F3 (P2):** `NgxMediaService.loadSvgObserver` writes fetched SVG text raw to `target.innerHTML` (`NgxMediaService.ts:323`, inside `runOutsideAngular`) — SVG scripts execute; user-influenced icon paths become same-origin script execution + SSRF-lite. **Proposed fix:** sanitize before injection and reject cross-origin paths.
- **F4/F5 (P3):** tooltip denylist regex is display-only (safe sinks today — label it as such); misleading "sanitizes" JSDoc on both bypass sites; dead `DomSanitizer` injection in file-upload. **Proposed fix:** document the denylist as display-only, correct the JSDoc on both bypass sites, and remove the dead injection.
- **F6:** all 24 other `innerHTML` binding surfaces traced — default-sanitized, no `iframe`/`srcdoc`/`webview` anywhere. Consumer guidance issued in [SAA-2009](/SAA/issues/SAA-2009).

---

## 6. Prioritized remediation plan

- **P0 (now):** F1 XSS fix + regression test (empty-state `searchValue`); remove zoom-blocking viewport attrs (`index.html:13`); add `ariaLabel` input on `IconComponent` propagating to inner `ion-button` and label every icon-only call site; wire `aria-describedby`/`aria-invalid` + live region into crud-field errors; unique option IDs (`path + '.' + index`); real `<button>`s for pagination with `aria-current`/Space/focus ring/`aria-disabled`.
- **P1 (next):** ARIA-correct filter combobox + switcher tabs (APG patterns); always-render list-item end slot (or discoverable overflow) and remove the JS `windowWidth` gates; text-safe warning/success/tertiary/danger variants + gray-4 text migration; fix all undefined/duplicate tokens (`gray-43`, `box-shadow-compact`, `shadow-glass`, radius-sm, caption); emit dark-mode tokens and delete per-component branching; translate hardcoded strings; sanitize modal `inlineContent` and SVG service (F2/F3).
- **P2 (near-term):** global `prefers-reduced-motion` guard + token-based durations; `role="status"` spinners; `dcf-focusable` rollout to pagination/filter/switcher/cron; table interactive-cell semantics.
- **P3 (hygiene):** retire `!important`/`::ng-deep` debt behind a documented override API; unify Ionic `mode`; tokenize remaining hex; delete dead CSS/empty media blocks; rename `Dashboboard.ts`; remove unused `.dcf-button-toggle`; fix `arai-hidden`/`maxlengh`/`lengh` typos.

> Storybook-coverage remediation items from the source review (accessibility addon/tooling, interaction play-tests, missing stories) are omitted here under the standing board directive that Storybook-coverage findings are excluded from this record; they are tracked separately.

---

## 7. Review scope & what was not done

No code changes, commits, or PRs by anyone in the review chain; no builds or test suites executed; contrast computed from token values (cross-verified by two reviewers), not against rendered output — rendered verification becomes cheap once the P2 accessibility tooling lands. The Security Engineer stands ready to file F1/F2/F3 remediation child issues on request; ownership of `for-angular` fixes belongs to the package owners.
