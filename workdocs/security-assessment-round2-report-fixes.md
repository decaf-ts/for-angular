# Security Assessment Round 2 — Remediation Responses

Status log for the findings in [workdocs/security-assessment-round2-report.md](workdocs/security-assessment-round2-report.md).

> **Note:** a Portuguese translation for team discussion lives at [security-responses.pt-BR.md](security-responses.pt-BR.md). Both files are updated in parallel; the English original is canonical.

- **Scope of this pass:** the findings that touch `src/lib` components (R2-1, R2-2, R2-5, R2-9).
- **Date:** 2026-11-13.
- **Branch:** `DECAF-895_secReport`.
- **Baseline:** fixes found in the working tree on top of `abb26f5` (v0.12.5) were reviewed, kept, and committed together with this pass's additions.
- **Still pending their own pass:** R2-4 (`GraphRunEventClient` events URL), and the remaining Low hardening backlog (R2-6 … R2-15).

## R2-3 — SSE event auth: affected adapter removed

**Status: RETIRED from this package (2026-11-20).** Commit `9fc9f7ac`
deleted `src/lib/engine/overrides.ts`, including `DecafAxiosHttpAdapter` and
its static-token event-header resolver. There is no replacement for that
adapter in `for-angular`. The orphaned
`tests/security-poc/n5-sse-event-auth.security-poc.spec.ts` was removed because
it imported the deleted implementation. The original finding and historical
four-test remediation results remain in the assessment report; they do not
describe current test coverage. Consumers configuring an HTTP adapter own
their event-header resolver and its authorization tests.

---

## R2-1 — [Medium] XSS: `escapeHtml` defeated by double interpolation (search empty state)

**Status: REMEDIATED.** The confirmed end-to-end bypass is closed on the same mechanism the report demanded (escape in exactly one place, before interpolation); the sink itself is unchanged by decision (see below).

### What was done

1. `ListComponent.parseSearchValue()` now HTML-escapes the search term **at the single point where host data enters the translation template** — both shapes: plain string and `IFilterQuery` (joined condition text). `TableComponent` inherits it, so both searching branches ([list.component.html:164](src/lib/components/list/list.component.html), [table.component.html:226](src/lib/components/table/table.component.html)) interpolate escaped data only.
2. `escapeHtml` was centralized on `@decaf-ts/ui-decorators` (coercing implementation): the local copy in `empty-state.component.ts` was removed and importers (`empty-state`, `file-upload`) re-pointed to the shared one. **Known gap — accepted, not fixed here:** the shared `escapeHtml` escapes only `& < >`, while the old local one also escaped `"` (`&quot;`) and `'` (`&#39;`). Decision: **no change in the `ui-decorators` package for now.** The two quote assertions in `empty-state.component.spec.ts` (`escaped characters shown literally: "` / `'`) are kept **intentionally failing**, with an in-test comment **and the failure carried in the test names themselves** so the jest output directly states that the fix belongs in `ui-decorators` (`escapeHtml`/`revertHtml` in `decaf-ts/ui-decorators src/ui/utils.ts` — 5-char contract), not in `for-angular`. Security-wise this is inert for the current sinks: quotes cannot break out of an HTML text node, and no in-repo sink interpolates search terms into attributes — the red tests pin the full contract for when the ui-decorators update lands, not an open vulnerability.
3. `EmptyStateComponent.getSearchSubtitle()` carries a contract comment: for an already-interpolated `subtitle`, the param escape is discarded by ngx-translate (missing keys return verbatim) — the caller must pass escaped content. In-repo callers now do.
4. Regression specs added in `empty-state.component.spec.ts`:
   - the **real list/table searching-branch shape** (subtitle arrives pre-interpolated with the escaped term + raw `searchValue`) — the exact shape whose absence caused the round-1 false "fixed" verdict;
   - the **object `searchValue` shape** (see R2-2).
   The pre-existing KEY-shape regression remains as the control.

### Does it satisfy the report? (R2-1)

Yes for the vulnerability (payload reaches the trusted sink as inert text: `&lt;img onerror…&gt;`). Two deliberate deviations from the report's letter:

- **Remediation option (a) ("pass the KEY, let empty-state interpolate") was not taken.** Escaping at `parseSearchValue()` is simpler and strictly safer: the escape sits where host data crosses into the template, covers both components via inheritance, and does not depend on ngx-translate's missing-key behavior. The report's option (b) (drop the `safeHtml` sink) was rejected because the translated template legitimately contains markup (`<ion-text>` in `en.json:171`) that must render.
- **Residual `@Dynamic()` host contract is documented, not enforced.** A host binding an already-interpolated `subtitle` containing unescaped user data plus a truthy `searchValue` still reaches the sink raw. Not enforced because that is the documented trusted-input-only contract of the `safeHtml` pipe (report N8); in-repo consumers are safe. Any future enforcement (e.g. debug-mode warning) belongs to the R2-9 modal trusted-path discussion, not here.

---

## R2-2 — [Low] Unhandled rejection / broken init when `searchValue` is an object

**Status: REMEDIATED** (as a side effect of the R2-1 escape centralization — same commit).

### What was done

The throwing code was the empty-state's former **local** `escapeHtml`, which called `text.replace(...)` directly on a truthy object inside the awaited `ngOnInit` (TypeError → `super.initialize()` never ran). The shared `escapeHtml` from `ui-decorators` coerces via `` `${value}` `` before replacing, so an object degrades to `"[object Object]"` instead of throwing. Regression spec added: `object searchValue (IFilterQuery) must not break initialization` asserts `ngOnInit()` resolves and the empty state renders.

### Does it satisfy the report? (R2-2)

Intent satisfied (no throw, init completes, no `escapeHtml` type-check needed anywhere else). Deviation: the report suggested explicit type-checking + normalizing object search values to a `parseSearchValue`-equivalent string. We accept the coercion display (`[object Object]`) instead: in-repo the only producer of object-shaped `searchValue` (table URL params) never feeds the object to empty-state's escape path anymore — the template interpolates `parseSearchValue()`'s normalized, escaped string — so the degraded display only exists for hypothetical out-of-repo hosts. A nicer label can ride along if a host ever complains.

---

## R2-5 — [Low hardening] Data-driven values rendered through plain `[innerHTML]` (content spoofing)

**Status: ACCEPTED AS DESIGNED — the report's suggested fix (`{{ }}` for data) was deliberately REJECTED after host-code review.** The channel is load-bearing, not accidental.

### Why the suggested fix was rejected (evidence from ew-frontend, production host)

- **Table cells ship icon markup + callbacks**: the `dataMatrix` column renders `<span class="ti ti-qrcode"></span> ${translate('batch.dataMatrix.view')}` as the cell value with `@uionclick(() => DatamatrixModalHandler)` (`ew-frontend/src/app/forms/BatchForm.ts:134-137`) → lands in `<button [innerHTML]="col.value.value">` ([table.component.html:128](src/lib/components/table/table.component.html)). Interpolation would render the icon as literal text and kill the button.
- **crud-field values carry host HTML**: `instance.value = '<span class="ti ti-qrcode"></span> …'` (`ew-frontend/src/app/handlers/DatamatrixModalHandler.ts:15`) → `[innerHTML]="value"` (crud-field).
- **List-item/option texts carry styled markup**: `<span class="dcf-option-description">…</span>` labels (`ew-frontend/src/app/forms/BatchForm.ts:58`).
- **Images flow through the modal `HTMLElement` path, not cell HTML** (barcode SVG via `BwipJs.toSVG` → `presentNgxInlineModal`) — relevant to R2-9, not to these bindings.

Interactions are wired by framework callbacks (`uionclick` → `handleClick`, or `element.onclick` DOM property), never by markup attributes — so the sanitizer stripping handler attributes costs hosts nothing.

### What was done instead

1. **Contract comments** on the channel bindings ([table.component.html](src/lib/components/table/table.component.html), [crud-field.component.html](src/lib/components/crud-field/crud-field.component.html), [list-item.component.html](src/lib/components/list-item/list-item.component.html)): host/model HTML via the **default** sanitizer; never `safeHtml` (bypass) and never `{{ }}` (breaks hosts).
2. **Contract spec** `rich-content-channel.contract.spec.ts` locks the channel from both sides:
   - source-level: the three templates keep their plain `[innerHTML]` data bindings and contain no `| safeHtml`;
   - behavior-level: markup hosts rely on survives (`img` with remote src, icons, safe links), execution vectors are stripped (`script`, handler attributes, `javascript:` URLs), plain text renders as text.
3. The report's residual risk (execution-proof spoofing: fake banner/links from a stored value) is **accepted**: it is a backend-data trust problem, out of module scope; the sanitizer strips `style`/`data-*`, so redress is structural/textual only, as the report itself corrected.

### Does it satisfy the report? (R2-5)

**No, on purpose.** The report's remediation ("prefer `{{ }}` for data") was authored without knowledge of host usage; applying it would break ew-frontend's table cells, option labels and field values. The finding's substance (content-spoofing surface, no execution) is acknowledged, documented as an accepted design trade, and regression-locked. Upgrading any of these bindings to `safeHtml` remains forbidden and is now guarded by the spec.

---

## R2-9 — [Low hardening] Modal: `HTMLElement`/`SafeHtml` inline path unsanitized (trust boundary)

**Status: IMPLEMENTED — the element path is now an enforced images-only channel; SafeHtml stays developer-trusted with a dev warning.**

### What was done (R2-9)

1. **`HTMLElement` inline content is now images-only and execution-proof by construction** (`attachInlineElementContent` + `ModalComponent.extractRenderableImages`): every `img`, `svg` or `canvas` found in the element (root or inside wrappers) is rebuilt as a **fresh `<img>`** carrying only `src`/`alt`/`width`/`height` — event handlers, inline styles and all other attributes from the source node are dropped, so nothing hostile survives the handoff. This implements the report's clone-and-sanitize suggestion with the right mechanism: Angular's HTML sanitizer strips SVG (the old blocker), but SVG serialized into a `data:image/svg+xml` source and rendered inside `<img>` is script-inert and cannot load external resources (browser image sandbox) — vector quality kept, ew barcode untouched.
2. **Non-image element content fails closed**: dropped, with a dev-mode warning (`isDevMode()`-gated) pointing to the sanitized string path for text/HTML. Breaking-change of contract for any host passing live text elements — known callers (ew barcode SVG; file-upload previews, which already use sanitized strings) are unaffected.
3. **`SafeHtml` keeps its bypass** (Angular renders it as-is through `[innerHTML]`) — developer-trusted by contract, now with a dev-mode warning in `ngOnInit`.
4. The string path is unchanged (Angular default sanitizer) and the trust contract is updated on every public surface (`ModalComponent` docs, `presentNgxLightBoxModal`, `presentNgxInlineModal`, `getNgxInlineModal`, deprecated `parseInlineContent`).
5. Spec coverage rewritten to the new contract: svg wrapper → inert data-url img (original node never attached, idempotent); hostile `<img onerror onclick style>` → rebuilt clean (`src`/`alt` kept, handlers/styles dropped); canvas that cannot rasterize → fail-closed; non-image content → dropped.

### Residual (accepted) — R2-9

Images still control their own rectangle (pixel-level spoofing inside the rendered image) — the same accepted content-spoofing surface as R2-5, now with no execution path. Full SVG allowlist validation via the existing `validateBarcodeSvg` pipeline remains optional future hardening if the team wants the barcode case fully constrained.

---

## R2-10 — [Low] `NgxFormService.getFormData` HTML-escapes outbound form values (misplaced encoding layer)

**Status: REMEDIATED — pending sign-off from Tiago.**

### What was done

The default case in `getFormData` ([NgxFormService.ts](src/lib/services/NgxFormService.ts)) no longer HTML-escapes outbound values: `value = typeof value === 'string' ? value.trim() : value` (the old `escapeHtml(value)?.trim()` line is kept commented with a `TODO: talk with Tiago about this`). Form data saved to the backend is now raw — as the report's remediation states, encoding belongs at render boundaries only, and every render sink in this library already protects itself (Angular's default sanitizer on the `[innerHTML]` channel, the R2-1 upstream escape on the search subtitle, the validated barcode pipeline). `.trim()` is kept as benign normalization; the `typeof` guard replaces the coercion the old call masked.

Why this is safe and desirable: the escaping was redundant AND corrupting — searches stopped matching stored `&amp;` values, edit round-trips accumulated `&amp;amp;` on every save, and raw-text consumers (CSV export, integrations) received entities.

### Regression coverage

New `NgxFormService.spec.ts`: string values returned unescaped; already-escaped `&amp;` is not re-escaped; trim preserved; non-string values pass through untouched. Form-related suites (crud-form, stepped-form, crud-field, services) all green after the change.

### Scope note

The same anti-pattern exists in `@decaf-ts/ui-decorators` `parseValueByType` (`src/ui/utils.ts:97`, escapes STRING values at parse time). Per the standing decision not to change the `ui-decorators` package in this pass, it is recorded here as related follow-up — same conversation with Tiago should cover it.

---

## R2-12 — [Low] Release token expanded into git push URL argv

**Status: REMEDIATED — pending sign-off from Tiago.**

### What was done

[`bin/tag-release.sh`](bin/tag-release.sh) no longer embeds the release token in the `git push` URL (which lands in process argv, readable via `/proc/<pid>/cmdline` by any local co-user during the push on a shared host). The token is passed instead through an env-sourced `http.extraheader` (`GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_0`/`GIT_CONFIG_VALUE_0`, git ≥ 2.31): the same `Authorization: Basic x-access-token:<token>` header GitHub already accepts from the URL form, but delivered via the subprocess's environment — visible only via `/proc/<pid>/environ`, readable solely by the process owner (and root), not by other local users.

Marked `R2-12: talk with Tiago about this` in the script, same as R2-10: no behavior change for the push itself (same destination, same credential, same `--follow-tags`/upstream handling, same untouched `.token`-empty branch) — only where the token is visible on the host while the command runs.

### Why `-c http.extraheader=...` was not used

The naive fix (`git -c http.extraheader=... push`) does **not** solve this: `-c` flags are also process argv, so the token would still be in `/proc/<pid>/cmdline`. The env-var form (`GIT_CONFIG_VALUE_0`) is the only one that keeps the secret out of argv.

### Residual (accepted)

If the host's git config also injects an `Authorization` header via a credential helper, GitHub would see it duplicated and reject the push. Not addressed here — the existing script already special-cases an origin with embedded credentials (`PUSH_TARGET` stripping), so this failure mode is not new.

---

## Validation

Verified by running (from `for-angular/`):

```bash
npx jest tests/security-poc src/lib/components/
```

**Result: 31 suites — 29 pass; 191 tests — 188 pass.** The 3 failures are all documented, none is a code defect:

1. `escaped characters shown literally: "` / `'` (empty-state spec) — **intentional**, pending the ui-decorators quote-escaping update (see R2-1 known gap).
2. `prior build output (www/) contains the shipped cli-module.ts source verbatim` (R2-6 POC) — environmental: the `www/` build artifact does not exist on this branch; the R2-6 finding itself (angular.json ships sources) remains open in the hardening backlog.

The fa1 POC suite was updated from the pinned-revision wiring (which predated the fix) to the current wiring: its two bypass tests now demonstrate the **remediation** (`R2-1 FIXED: …`), and the cf2 POC suite's two crash tests likewise assert the fix (`R2-2 FIXED: …`). Also fixed along the way: a `TS2345` in the committed `parseSearchValue` (`typeof x === Primitives.STRING` does not narrow — `escapeHtml(this.searchValue as string)`), which broke compilation of every suite importing the list component.
