# `@decaf-ts/for-angular/gen-ui`

Browser renderer for the decaf harness GenUI plugin. It renders the repaired
`GenuiSpec` produced by `@decaf-ts/harness-genui` from a ```dsh-ui fence or a
`render_ui` tool result, and relays interactions back to `POST /genui/actions`.

## Quick start

```ts
import { provideGenui, GenuiModule } from "@decaf-ts/for-angular/gen-ui";

bootstrapApplication(AppComponent, {
  providers: [provideGenui({ actionUrl: "/genui/actions" })],
});

@NgModule({ imports: [GenuiModule] })
export class AppModule {}
```

```html
<ngx-decaf-genui-fence
  [text]="messageText"
  [context]="{ sessionId, blockId: 'reply-1', specId: 'spec-1' }"
  (action)="onGenuiAction($event)"
/>
```

The `agent` entry point uses `ngx-decaf-genui-fence` for text parts and
`ngx-decaf-genui-block` for `meta.presentationMeta` on `render_ui` tool rows.

## Security boundaries (SAA-2026)

- SVG sinks use the allowlist sanitizer in `sanitize.ts` (A-1), never a regex
  blocklist. Mermaid keeps `securityLevel: "strict"`, the diagram-kind
  allowlist, and `suppressErrorRendering`.
- `safeHref` allows `https`/`mailto`; `safeMediaSrc` allows `http(s)` and
  relative URLs and rejects control characters.
- ECharts options are sanitized and force `tooltip.renderMode: "richText"`.
- Secret (`inputType: "password"`) fields never persist, never join submit or
  action payloads, and never appear in provenance.
- Map specs render offline from coordinates only; no style, source, worker, or
  credential field is read.
- Resource limits come from `GENUI_LIMITS`.

## Heavy engines

`mermaid`, `echarts`, `three`, and `maplibre` are not bundled here. They are
fetched lazily from the harness plugin's `GET /genui/assets/:file?rev=…` route on
first use. `diagram`, `plot`, `svg`, and `chart` render inline and need no
engine. The map renderer is offline-only by default.

## i18n

Renderer chrome ships English and Portuguese dictionaries in
`i18n/genui-i18n.ts`. Model-facing protocol text is not translated.
