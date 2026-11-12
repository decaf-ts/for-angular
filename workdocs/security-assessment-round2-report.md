# for-angular — ROUND 2 Security Assessment Report: Findings and Demonstrating POC Tests

## Provenance

- **User directive** (verbatim, SAA-1608 comment `97c41fc7`, 2026-11-12): *"create a report, stored in for-angular workdocs, detailing each finding and the test demonstrating it"*.
- **Source of truth:** the accepted ROUND 2 consolidated findings report — document `round2-findings-report` on [SAA-1623](/SAA/issues/SAA-1623), authored by the Red Team Leader at the close of the round-2 engagement ([SAA-1624](/SAA/issues/SAA-1624) verdict). This report consolidates that content into a durable in-repo record and adds the per-finding → POC-test mapping. No finding was re-derived, re-ranked, or re-exploited here; the accepted findings are reproduced as-is in report form.
- **Assessment method (round 2):** four disjoint workstreams — white-box source review (SAA-1629), browser-facing runtime review via the repo's jest jsdom harness (SAA-1630), CLI/server-facing + credential + dependency review (SAA-1631), independent validation + exploit-POC authoring (SAA-1632). Leader merged, deduplicated, and ranked; one discoverer conflict was resolved by independent validation (see R2-1).

### Verified revision pins

- **Monorepo** `decaf-ts`: `54b4d3743f768934ec27920c93966ac7068c9808` ("DECAF-895 improvemnts")
- **`@decaf-ts/for-angular`**: `abb26f50a0b795d50daf4895c161fdf77762bf26` (**v0.12.5**, "DECAF-895 ts6 updates")
- Re-verified against the checkout on **2026-11-12** by the CTO when authoring this report — no deviation. Manifest rev `63b2aeb4` on SAA-1608 pins the same values.
- **POC suites re-run by the CTO at this revision on 2026-11-12:** `npx jest tests/security-poc` → **6 suites, 31/31 passed (~6 s)**, matching the leader's merge-time verification. Core `file:line` references spot-checked at the same revision (list/table/empty-state search wiring, `overrides.ts` event-auth path, `GraphRunEventClient.ts` EventSource path, `safe-html.pipe.ts` sink, `en.json:171` template, `angular.json:138-139` asset entries, `@noble/hashes` override).

### Rules of engagement observed by this record

- **Report file addition only.** No production code was changed; the POC suites (`tests/security-poc/`) and probe suites (`src/lib/security-probes/`) were not modified.
- **No commit, no staging, no push, no branches/PRs.** This report and the POC suites remain uncommitted working-tree output; commit authority is a separate user decision pending on the parent [SAA-1608](/SAA/issues/SAA-1608) (question card `2b060c71`).
- **Location note:** this report lives at `workdocs/` root (following the tracked `workdocs/ui-ux-accessibility-review.md` precedent for hand-written consolidated review records) rather than `workdocs/reports/`, which is gitignored (`.gitignore:49`, `/workdocs/reports/*`) as generated-report output and therefore could never be committed alongside the POC suites.

### Running the POC suites

```bash
cd for-angular
npx jest tests/security-poc
```

All suites are jsdom-based, use inert payloads and a mocked `HttpClient`, and make no network calls. Each suite file carries a `[SECURITY-POC]` header comment.

---

## Executive summary

| Bucket | Count | Items |
|---|---|---|
| Confirmed — Medium | 1 | R2-1 (reopens round-1 FA-1) |
| Confirmed — Low | 3 | R2-2, R2-3 (latent), R2-4 |
| Low — hardening | 11 | R2-5 … R2-15 |
| Informational / not-an-issue | 6 | N2, N3, N8, N10, CF-6/N6, N-4 (positive assurance) |
| Prior round-1 findings closed as remediated | 2 | FA-2, FA-4 |
| Excluded per round-1 user direction | 2 | FA-7, FA-8 |

**Headline:** one confirmed Medium XSS — the round-1 FA-1 "fixed" verdict is reopened: the `escapeHtml` remediation is defeated by double interpolation on the real list/table searching wiring. Everything else is Low hardening, latent, informational, or confirmed-fixed. The dependency lockfile is clean against known CVE fix versions.

**Exploit-POC deliverable:** 6 POC suites / 31 tests under `tests/security-poc/`, all passing on the pinned revision (re-verified 2026-11-12). Per the engagement rules of engagement these suites are **not committed**; the parent's user-approval path owns any commit.

---

## Finding → POC mapping table

This is the core of the report: every round-2 finding mapped to the POC test that demonstrates it, or the stated justification for why no POC exists.

| Finding | Severity | Classification | Demonstrating test (suite file · tests · names) | What the demonstration proves |
|---|---|---|---|---|
| **R2-1** | Medium | Confirmed (reopens FA-1) | `tests/security-poc/fa1-empty-state-double-interpolation.security-poc.spec.ts` — 5 tests: "upstream translate interpolates the RAW payload into the real production template (no escaping)"; "ngx-translate returns an already-interpolated (non-key) subtitle VERBATIM and discards the escaped param"; "FA-1 BYPASS: real list searching-branch wiring injects an `<img onerror>` through the trusted safeHtml sink"; "FA-1 BYPASS: a `<script>` element survives the trusted sink (markup injection, inert in jsdom)"; "CONTROL: KEY-shape subtitle (shipped-regression / probe shape) is neutralized — escape path holds" | End-to-end XSS through the real list searching-branch wiring and real production `en.json`: the raw search term is interpolated upstream of empty-state, `escapeHtml` lands on a discarded param, and attacker markup reaches the trusted `safeHtml` sink. The KEY-shape control explains why prior runtime verification reported FA-1 remediated. |
| **R2-2** | Low | Confirmed | `tests/security-poc/cf2-object-searchvalue.security-poc.spec.ts` — 3 tests: "object searchValue (URL-derived filter shape) makes ngOnInit reject with TypeError"; "empty object searchValue also breaks initialization (truthy object)"; "CONTROL: string searchValue initializes normally and builds the search subtitle" | Object-shaped `searchValue` (the URL-params filter shape the table component produces) throws inside `escapeHtml` during awaited `ngOnInit`, breaking initialization; string shape works. |
| **R2-3** | Low (latent) | Confirmed | `tests/security-poc/n5-sse-event-auth.security-poc.spec.ts` — 4 tests: "D1: invoked the way for-http invokes it (resolver.call(config)), the resolver returns {} despite token set"; "D1 corollary: the resolver reads this.token off whatever this it is called with"; "D2: even correctly bound, the nested resolver shape is discarded by for-http string-only projection"; "IMPACT: with the static token set, event calls still go out with no Authorization header" | Both compounding defect modes on the real code path: unbound resolver (empty headers despite token set) and the nested header shape that for-http's string-only projection discards — SSE event streams silently unauthenticated when token auth is configured. |
| **R2-4** | Low | Confirmed (hardening gap) | `tests/security-poc/cf4-events-url.security-poc.spec.ts` — 3 tests: "protocol-relative eventsUrl from the backend response yields a CROSS-ORIGIN credentialed SSE URL"; "absolute cross-origin eventsUrl is concatenated verbatim — no same-origin check is performed"; "CONTROL: a well-formed relative eventsUrl is passed through unchanged (expected benign behavior)" | Backend-supplied `eventsUrl` passes into a credentialed `EventSource` with only a non-empty check — protocol-relative/absolute URLs yield a cross-origin credentialed SSE connection. Stub `EventSource`, no network. |
| **R2-5** | Low | Hardening (render confirmations) | `tests/security-poc/n1-cf5-hardening-confirmations.security-poc.spec.ts` — describe `[SECURITY-POC] N-1 data-driven [innerHTML] renders stored markup (content spoofing, no execution)`, 2 tests: "stored value markup survives the default sanitizer as a spoofable element (no script, no handlers, no style attrs)"; "CONTROL: plain text value renders as text only (no element injection)" | Data-driven values rendered through plain `[innerHTML]` can inject spoofable markup (Angular's sanitizer strips scripts/handlers/`style`/`data-*` — no execution). |
| **R2-6** | Low | Hardening (config confirmations) | `tests/security-poc/n1-cf5-hardening-confirmations.security-poc.spec.ts` — describe `[SECURITY-POC] CF-5 build ships library/CLI TypeScript sources as static assets`, 2 tests: "angular.json build assets include src/cli-module.ts and src/lib/**/*"; "prior build output (www/) contains the shipped cli-module.ts source verbatim" | Production build config ships full library + CLI TypeScript sources as public static assets; prior build output confirms the source ships verbatim. |
| **R2-7** | Low | Hardening | No POC — justified: *not POC-able in the harness (requires the demo logging pipeline / level config)*. | — |
| **R2-8** | Low | Hardening | No POC — justified: *dormant capability (opt-in `session` flavour, zero in-repo consumers)*. | — |
| **R2-9** | Low | Hardening | No POC — justified: *no unsafe caller exists today (both discoverers concur)*; string path sanitized, live-verified. | — |
| **R2-10** | Low | Hardening | No POC — justified: *data-integrity concern, not an exploit*. | — |
| **R2-11** | Low | Hardening | No POC — justified: *pattern hardening (content currently validated upstream)*. | — |
| **R2-12** | Low | Hardening | No POC — justified: *local-privilege exposure (token visible in `/proc/<pid>/cmdline` to local co-users during push)*. | — |
| **R2-13** | Low | Hardening | No POC — justified: *dev-time tool, developer-is-actor*. | — |
| **R2-14** | Low | Hardening | No POC — justified: *server contract out of module scope (backend must enforce authorization against the session)*. | — |
| **R2-15** | Low | Hardening | No POC — justified: *lockfile metadata (no known CVE at the pinned version; downward pin blocks patch flow)*. | — |
| **FA-2 (round-1, closed fixed)** | Medium | Verification (sanitizer holds) | `tests/security-poc/fa2-svg-sanitizer-bypass.security-poc.spec.ts` — 12 tests: V1 "CDATA-smuggled `<img onerror>` inside allowed `<text>` does not become markup at the sink"; V2 "CDATA close + real `<img>` element inside allowed `<text>` is removed"; V3 "double-percent-encoded javascript: xlink:href is removed"; V4 "non-ASCII scheme separator (U+00A0) does not smuggle a javascript: href"; V5 "foreignObject subtree with hostile `<img>` is removed (attributes quoted so the XML parses)"; V6 "casing tricks (`<SVG ONLOAD=...>`) are normalized away"; V7 "HTML namespace breakout (`<svg><p><style><!--</style><img onerror>`) is stripped"; V8 "data: URI in `<use xlink:href>` is removed; in-document #ref survives"; V9 "`<animate>`/`<set>` targeting href are removed"; V10 "malformed XML (undefined entity) fails closed to empty output"; V11 "non-SVG root fails closed to empty output"; V12 "BENIGN CONTROL: defs/symbol/use #ref structure still renders after sanitization" | Hostile SVG vectors through the real `loadSvgObserver` all neutralized; benign `defs`/`symbol`/`use #ref` structure still renders. Confirms the FA-2 remediation holds at this revision. |
| **N-4 (informational)** | — | Positive assurance | No dedicated POC suite — corroborated by `src/lib/security-probes/` (barcode probes) and the shipped fuzz suite passing. | Barcode pipeline verified safe end-to-end (see Informational section). |
| **N2, N3, N8, N10, CF-6/N6** | — | Informational | No POC — informational/not-an-issue records by definition. | — |

**Suite coverage check:** all 6 POC suites appear in the table — `fa1-…` (R2-1), `cf2-…` (R2-2), `n5-…` (R2-3), `cf4-…` (R2-4), `n1-cf5-…` (R2-5 + R2-6), `fa2-…` (FA-2 closure verification). 5 + 3 + 4 + 3 + 4 + 12 = 31 tests.

---

## Confirmed findings (detail)

### R2-1 — [Medium] XSS: `escapeHtml` defeated by double interpolation in the search-results empty state — CONFIRMED, POC

*Reopens round-1 FA-1 (SAA-1609 had it Medium; round-2 static audit found the mitigation bypassed; the runtime workstream initially reported it remediated; the Exploit Validator independently derived the bypass and confirmed with runtime POC — discoverer conflict resolved, false-negative root-caused).*

- **Classification:** Confirmed vulnerability (end-to-end data flow statically verified, independently reproduced at runtime on the pinned revision).
- **Affected paths:**
  - `src/lib/components/list/list.component.html:164-173` and `src/lib/components/table/table.component.html:226-244` — searching branches bind `[subtitle]=" 'component.list.search.subtitle' | translate: { '0': parseSearchValue() }"` with the **raw** search term;
  - `src/lib/components/empty-state/empty-state.component.ts:313-320, 388-392` — `getSearchSubtitle` escapes a term that is no longer a placeholder (escaped value computed and discarded);
  - `src/lib/pipes/safe-html.pipe.ts:50-52` — `bypassSecurityTrustHtml` sink;
  - payload template `src/lib/i18n/data/en.json:171` — `component.list.search.subtitle` wraps `{0}` in real `<ion-text>` markup.
- **Description:** the list/table searching branches pre-interpolate the raw user search term into the translation template **upstream** of empty-state. `EmptyStateComponent` then escapes `searchValue` and re-translates the *already-interpolated* sentence; ngx-translate v17 returns missing/non-key strings verbatim with params discarded, so the escape never lands on the rendered string. The poisoned sentence reaches `[innerHTML]="searchSubtitle | safeHtml"` → attacker markup injected through a trusted sink.
- **Exploitability note:** default trigger is user-typed search → **self-XSS**. Escalates to **reflected XSS** wherever a host app pre-populates the search value programmatically with attacker-controlled string data. The table's URL-params path (`?filter=...`, `table.component.ts:204-219`) builds an *object* searchValue that instead trips R2-2, masking this exact prefill vector — any string-typed prefill (searchbar event seeding, host bindings) executes. POC proves `<img onerror>` and `<script>` element injection through the real wiring + real production `en.json`.
- **Remediation:** interpolate in exactly one place. (a) Pass the translation *key* to empty-state from the list/table searching branches and let `getSearchSubtitle` perform the sole interpolation with the escaped param (its current intent) — remove the `| translate: {'0': parseSearchValue()}` upstream; or (b) drop the `safeHtml` bypass for this binding. Systemic: `I18nParser` never escapes params while some templates carry trusted HTML — audit every translated string fed to `safeHtml`; add a regression spec on the real host wiring shape, not only the key shape.
- **Demonstrating POC:** `tests/security-poc/fa1-empty-state-double-interpolation.security-poc.spec.ts` — 5/5 (see mapping table for exact test names), including the KEY-shape control proving the shipped-regression/probe shape is neutralized (why prior runtime verification missed it).

### R2-2 — [Low] Unhandled rejection / broken init when `searchValue` is an object — CONFIRMED, POC

- **Classification:** Confirmed robustness/availability defect.
- **Affected paths:** `src/lib/components/empty-state/empty-state.component.ts:389, 62-70` (`escapeHtml(object)` throws TypeError inside awaited `ngOnInit`); trigger shape `src/lib/components/table/table.component.ts:204-219` + `NgxRepositoryDirective.ts:119` (object `IFilterQuery` searchValue from URL params).
- **Description:** `escapeHtml` does `text.replace(...)` unguarded for non-strings. The table component binds an object searchValue when search criteria come from URL params; the TypeError rejects the async init chain, `super.initialize()` never runs, and the empty-state renders nothing.
- **Exploitability note:** availability/robustness defect reachable via crafted URL query params in host apps using the table search-criteria path; also masks R2-1 on that specific path. No script execution.
- **Remediation:** type-check in `escapeHtml`/`getSearchSubtitle` (accept string only) and normalize object search values (parseSearchValue-equivalent) before escaping.
- **Demonstrating POC:** `tests/security-poc/cf2-object-searchvalue.security-poc.spec.ts` — 3/3 (object shapes reproduce the rejection; string control initializes fine).

### R2-3 — [Low, latent] SSE event-stream authentication is dead code (silent unauthenticated events when token auth is configured) — CONFIRMED, POC

- **Classification:** Confirmed defect (latent exploitability) — independently validated against the real path.
- **Affected paths:** `src/lib/engine/overrides.ts:40` (`getEventHeaders` passed unbound → `this.token` undefined → `{}`), `:54-63` (nested `{withCredentials, headers:{authorization}}` shape incompatible with for-http's string-only header projection — see `../for-http/src/adapter.ts:211`), `:183-191` (context-derived overrides discarded when static token set); `DecafAxiosHttpAdapter.token` public static (`overrides.ts:32`).
- **Description:** two compounding defects make event/subscribe calls silently omit the Authorization header. Even correctly binding the resolver would not work (shape mismatch). Latent today: the static token is never assigned in-repo (grep-verified); any consumer that sets it gets unauthenticated event streams.
- **Exploitability note:** not exploitable in-repo as shipped (latent); correctness-with-security-impact for downstream consumers of the documented static-token API.
- **Remediation:** bind the resolver, flatten the header shape, prefer context-scoped auth over the static class token.
- **Demonstrating POC:** `tests/security-poc/n5-sse-event-auth.security-poc.spec.ts` — 4/4 (real code path, both defect modes).

### R2-4 — [Low, hardening] Backend-supplied `eventsUrl` used in credentialed EventSource without same-origin validation — CONFIRMED, POC

- **Classification:** Confirmed hardening gap (validated).
- **Affected paths:** `src/diagrams/components/graph/runs/GraphRunEventClient.ts:223-226`; source of descriptor `GraphRunClient.ts:174-180`.
- **Description:** `new EventSource(`${backendUrl}${eventsUrl}?afterSequence=...`, { withCredentials: true })` — `eventsUrl` only checked non-empty; protocol-relative/absolute URLs pass through, so a compromised/malicious backend 202 response can point the credentialed SSE connection cross-origin.
- **Exploitability note:** requires a compromised backend (the trust anchor) — hardening, not a standalone exploit.
- **Remediation:** require `eventsUrl`/`resultUrl` to be same-origin relative paths before use.
- **Demonstrating POC:** `tests/security-poc/cf4-events-url.security-poc.spec.ts` — 3/3 (stub `EventSource`, no network).

---

## Low hardening findings (detail)

No execution demonstrated for these; where feasible they carry render/config confirmations in the POC suites (R2-5, R2-6), otherwise the no-POC justification from the accepted findings is stated.

### R2-5 — Data-driven values rendered through plain `[innerHTML]` (content-spoofing surface)

- **Affected paths:** `table.component.html:128,131`, `list-item.component.html:60,70,75`, `crud-field.component.html:47,176,233,317`, `card.component.html:27,33`.
- **Description:** Angular's sanitizer strips scripts/handlers/`style`/`data-*` (validator-corrected: the full-screen-overlay redress example does **not** survive) — structural/textual spoofing only, no execution. Prefer `{{ }}` for data.
- **Demonstrating POC:** `tests/security-poc/n1-cf5-hardening-confirmations.security-poc.spec.ts`, describe `[SECURITY-POC] N-1 data-driven [innerHTML] renders stored markup (content spoofing, no execution)` — 2 tests (spoofable-element survival + plain-text control).

### R2-6 — Production build ships library + CLI TypeScript sources as public static assets

- **Affected paths:** `angular.json` build `:138-139`, test `:215-216`; prior output `www/cli-module.ts`.
- **Description:** full library source downloadable on any deployed build. Remove asset entries unless a documented consumer needs them.
- **Demonstrating POC:** `tests/security-poc/n1-cf5-hardening-confirmations.security-poc.spec.ts`, describe `[SECURITY-POC] CF-5 build ships library/CLI TypeScript sources as static assets` — 2 tests (config contents + verbatim prior build output).

### R2-7 — FA-5 residual: full PII request payloads logged at debug (demo app)

- **Affected paths:** `src/app/user-requests/handlers/user-data-handler.ts:56,65`.
- **Description:** name/email PII in logs; lib-side payload logging already remediated (`overrides.ts:225`). Scrub or gate behind an explicit dev flag.
- **No POC — justification:** not POC-able in the harness (requires the demo logging pipeline / level config).

### R2-8 — FA-6: cleartext localStorage persistence of full model snapshots (dormant capability)

- **Affected paths:** `src/lib/engine/SessionRamAdapter.ts:122-130, 87-112, 44-51`.
- **Description:** opt-in `session` flavour, zero in-repo consumers; no credentials currently join web storage (`AccountModel.ts:245, 40-44`, `LoginHandler.ts:32`). Encrypt-or-drop; document at-rest expectations.
- **No POC — justification:** dormant capability (nothing to demonstrate at runtime today).

### R2-9 — FA-3/CF-3: modal `HTMLElement` inline-content path bypasses all sanitization (trust boundary unenforced)

- **Affected paths:** `modal.component.ts:181, 325-343, 557-608`; string path sanitized (live-verified); current callers safe.
- **Description:** document HTMLElement/SafeHtml paths as developer-trusted-only; consider a debug-mode warning; clone-and-sanitize or fail closed.
- **No POC — justification:** no unsafe caller exists today (both discoverers concur).

### R2-10 — `NgxFormService.getFormData` HTML-escapes outbound form values (misplaced encoding layer)

- **Affected paths:** `src/lib/services/NgxFormService.ts:748-768` (escaping at `:758`).
- **Description:** encode at render boundaries only; output-encoding at storage double-encodes re-escaping consumers and mangles raw-text consumers (exports/integrations).
- **No POC — justification:** data-integrity concern, not an exploit.

### R2-11 — Hand-crafted `SafeHtml` fallback in DatamatrixModalHandler

- **Affected paths:** `src/app/ew/fabric/handlers/DatamatrixModalHandler.ts:76-78`.
- **Description:** `{ changingThisBreaksApplicationSecurity: outerHTML }` fabricated when no `DomSanitizer` is resolvable; content is currently validated upstream, but the pattern silently trusts future content. Fail closed instead.
- **No POC — justification:** pattern hardening.

### R2-12 — Release token expanded into git push URL argv

- **Affected paths:** `bin/tag-release.sh:198`.
- **Description:** token visible in `/proc/<pid>/cmdline` to local co-users during push; `.token`/`.npmtoken`/`.confluence-token` verified gitignored (`git check-ignore`). Use a credential helper / `GIT_ASKPASS` / `http.extraheader`.
- **No POC — justification:** local-privilege exposure, not a remote exploit.

### R2-13 — Schematics interpolate unvalidated `routePath`/`name` into generated source

- **Affected paths:** `schematics/src/page/index.ts:39`.
- **Description:** dev-time tool, developer-is-actor; validate `routePath` characters in the schema.
- **No POC — justification:** dev-time.

### R2-14 — Client-asserted identity in AgentChatService transport payload

- **Affected paths:** `src/agent/services/AgentChatService.ts:325-329, ~153`.
- **Description:** `userId` from `window.loggedUser` (or config) is client-controlled; backend must enforce authorization against the session — flagged for backend-facing review tracks.
- **No POC — justification:** server contract out of module scope.

### R2-15 — `@noble/hashes` override pinned **down** to 1.4.0 (2023)

- **Affected paths:** `package.json` `overrides` block.
- **Description:** no known CVE cited at that version, but a downward pin blocks patch flow for a crypto-adjacent package. Re-base the override.
- **No POC — justification:** lockfile metadata.

### Residual FA-2 hardening notes

Sinks confirmed-fixed, sanitizer holds: `use`+`id` DOM-clobbering surface in sanitized SVGs; cross-origin SVG fetch permitted by design; svg-restriction lives in the directive not the service (`svg.directive.ts:98-107` vs `NgxMediaService.ts:486`). Folded into the R2-11/R2-5 backlog triage.

---

## Informational / not-an-issue (recorded to prevent misreads)

- **N2** — `Dockerfile:11` copies `.mpmrc` absent from the repo (build fails unless CI generates it); builder-layer bake risk if it ever carries registry credentials — use BuildKit secret mount + `.dockerignore`.
- **N3** — stale git-tracked `cli-module.js.map` (374 B, no `sourcesContent`, no credential material) — repo hygiene.
- **N8** — `safeHtml` pipe is an intentional bypass whose only in-repo consumer feeds the empty-state search subtitle (i.e., R2-1's sink) — keep documented trusted-input-only. `modal-diffs` audit values go through Angular's default sanitizer (no bypass). `AuditHandler.downloadAsCsv` escapes quotes but not leading `=+-@` (CSV formula-injection hardening). `LeafletResolver.urlString` unconsumed in-module — SSRF/open-redirect is the downstream consumer's responsibility.
- **N10** — `ffmpeg-static@5.2.0` (dev) downloads a prebuilt binary at install time — dev-only supply-chain surface for CI provenance.
- **CF-6/N6** — demo login stub accepts any credentials (`LoginHandler.ts:28-44`) — demo scaffolding, not shipped auth; no client-side guards in `src` by design.
- **N-4 (positive assurance)** — barcode pipeline verified safe end-to-end: user payload → `@bwip-js/browser` → `validateBarcodeSvg` (fail-closed, same parser as sink, element/attribute allowlists, rejects text nodes/comments/CDATA/schemes) → trusted HTML; `alttext` cannot smuggle markup; shipped fuzz suite passes.

---

## Prior round-1 findings at this revision

| Round-1 finding | ROUND 2 verdict | Demonstrating/verifying tests |
|---|---|---|
| FA-1 (Medium, XSS) | **REOPENED → R2-1 confirmed** (mitigation present but defeated; round-1 "fixed" status invalid at this revision) | `fa1-empty-state-double-interpolation.security-poc.spec.ts` (5 tests) |
| FA-2 (Medium, HTTP SVG → innerHTML) | **Fixed — sanitizer holds.** 23 hostile vectors across two independent teams (11 + 12) through the real `loadSvgObserver`, all neutralized; benign `defs`/`symbol`/`use #ref` renders. Residual notes folded into hardening backlog. | `fa2-svg-sanitizer-bypass.security-poc.spec.ts` (12 vectors + benign control) |
| FA-3 (Low, modal trusted HTML) | Unchanged mechanism → R2-9 hardening (no unsafe caller today) | — |
| FA-4 (Low, CLI command injection) | **Fixed** — `NAME_PATTERN` gate (`cli-module.ts:22,52-53`, introduced `e405efc`), enum/normalization validation, no shell metacharacter reaches `execute()`; no remaining command-injection sink in `bin/`/`schematics` | — |
| FA-5 (Low, payload logging) | Largely fixed; residual → R2-7 | — |
| FA-6 (Low, cleartext storage) | Present as dormant capability → R2-8 | — |
| FA-7/FA-8 | **Excluded per round-1 user direction** — not re-reviewed in round 2 | — |

---

## POC suite inventory (6 suites / 31 tests, all passing at the pinned revision)

Re-run by the CTO on 2026-11-12: `npx jest tests/security-poc` → 6 suites, 31/31 passed (~6 s). Untracked per ROE, clearly marked `[SECURITY-POC]`, inert payloads, jsdom, mocked `HttpClient`, no network.

| Suite | Tests | Demonstrates |
|---|---|---|
| `fa1-empty-state-double-interpolation.security-poc.spec.ts` | 5 | R2-1 end-to-end XSS through the real searching wiring + KEY-shape false-negative control |
| `cf2-object-searchvalue.security-poc.spec.ts` | 3 | R2-2 object searchValue init rejection + string control |
| `n5-sse-event-auth.security-poc.spec.ts` | 4 | R2-3 both SSE auth defect modes + impact |
| `cf4-events-url.security-poc.spec.ts` | 3 | R2-4 cross-origin credentialed EventSource + benign control |
| `n1-cf5-hardening-confirmations.security-poc.spec.ts` | 4 | R2-5 render confirmations (2) + R2-6 config confirmations (2) |
| `fa2-svg-sanitizer-bypass.security-poc.spec.ts` | 12 | FA-2 closure verification: 11 hostile vectors neutralized + benign control |

---

## Coverage statement and limitations

Condensed from the accepted round-2 findings report (full detail on SAA-1623):

- **Angular DOM/sanitizer surface:** all 4 non-spec `bypassSecurityTrust*` sites enumerated and dispositioned (safe-html pipe → R2-1; barcode page + DatamatrixModalHandler validated upstream); ~40 `[innerHTML]` template bindings + 2 direct-DOM assignments dispositioned (Angular default sanitizer holds; the two direct sinks take sanitized/validated input); no `insertAdjacentHTML`/`createContextualFragment`/`document.write`/`outerHTML=` writes; no `bypassSecurityTrustUrl/ResourceUrl/Script/Style` anywhere; dynamic rendering engine registry-only, no runtime template compilation; three `new Function` sites are compile-only syntax checks, never invoked; tooltip/file-upload/pagination/icon/svg-directive/i18n-pipes probed clean at runtime.
- **Auth/token/credential handling:** no tokens/credentials in web storage; AccountModel token field removed; SSE auth dead code → R2-3; client-asserted identity → R2-14; release-token argv exposure → R2-12; gitignored token files verified; demo login stub informational.
- **Server/CLI-facing code:** FA-4 closed fixed; no remaining command-injection sink (`spawn` with `shell:false` + character guard in bundled utils); schematics dev-time interpolation → R2-13; Dockerfile/`angular.json` findings → N2, R2-6.
- **Dependency risk:** lockfile (package.json + package-lock.json at the pinned revision) clean against known CVE fix versions — axios 1.21.0, esbuild 0.28.2, webpack-dev-middleware 7.4.6, http-proxy-middleware 3.0.10, multer 2.5.0, undici 7.30.1, js-yaml 4.3.2, braces 3.0.3, micromatch 4.0.8, brace-expansion 5.0.12, form-data 4.0.6, xml2js 0.6.2, vite 7.3.7 all at/above fixes; the `overrides` block demonstrably enforces. Exceptions: R2-15 (downward crypto-adjacent pin), N10 (dev supply-chain). Method: lockfile metadata + CVE knowledge — confidence medium-high.
- **Limitations:** (1) `paperclip-strix` could not run (operator-side provider configuration; reported for fix) — compensated with full manual sweep + jsdom runtime probes. (2) Static review + jsdom harness only per ROE — no browser execution environment (jsdom does not execute injected scripts; markup injection proven, script execution inferred from sink semantics). (3) FA-7/FA-8 excluded per user direction. (4) `.cjs` bundles in `bin/` excluded from line-level review per scope. (5) R2-7 not POC-able in harness (justified above).
- **Probe suites** (separate from the POC deliverable, untracked `src/lib/security-probes/`, do-not-commit markers): 34/34 passed (`fa1` 10, `fa2` 12, `fa3` 4, `barcode` 5, `tooltip-and-escape` 3). Shipped-regression corroboration: `npx jest src/lib/components/empty-state src/lib/components/modal src/barcode/components/barcode-renderer.spec.ts` → 240/240 passed.

---

## Workspace residue and commit status

- This engagement's residue in the working tree is exactly: the pre-existing untracked `tests/security-poc/` (6 POC suites — deliverable awaiting the parent's user-approval commit path), the pre-existing untracked `src/lib/security-probes/` (probes, marked do-not-commit), and this report file (`workdocs/security-assessment-round2-report.md`). No production code changed; no existing test modified or weakened.
- **No commit, no staging, no push, no branches/PRs** were made by this work. The unrelated pre-existing working-tree diffs (`.github/workflows/`, `README.md`, `workdocs/2-Badges.md`) were not touched and must not be swept into any future commit of the engagement output.

## Handoff

- **R2-1 (Medium, confirmed) → remediation** for the single-interpolation fix + regression coverage on the real wiring shape; R2-2 rides along in the same component.
- R2-3 … R2-15 → remediation backlog triage (Low).
- FA-2/FA-4 close as remediated; round-1 FA-1 status must be reopened.
- POC-suite commit and remediation scope go through the parent [SAA-1608](/SAA/issues/SAA-1608) user-approval path (question card `2b060c71`).
