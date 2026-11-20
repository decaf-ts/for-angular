/**
 * Declarative GenUI spec language consumed by `@decaf-ts/for-angular/gen-ui`.
 *
 * The vocabulary is a white list: every node maps to real Angular/DOM nodes.
 * There is no arbitrary-HTML path, and the server-side guard in
 * `@decaf-ts/harness-genui` is the authoritative validator/repairer. This file
 * mirrors that spec contract so the renderer can consume repaired output.
 */

/**
 * @description Supported conditional operators for a {@link GenuiWhen}
 * @summary `eq`/`neq` compare string forms, `in`/`not-in` test membership in an
 * array, `gt`/`gte`/`lt`/`lte` compare numbers, `empty`/`not-empty` test for a
 * blank or empty array, and `checked` tests a boolean/checkbox value.
 * @constant
 * @type {ReadonlyArray<string>}
 * @memberOf module:gen-ui
 */
export const WHEN_OPS = [
  "eq",
  "neq",
  "in",
  "not-in",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "not-empty",
  "checked",
] as const;

/**
 * @description A conditional operator name
 * @typedef {string} GenuiWhenOp
 * @memberOf module:gen-ui
 */
export type GenuiWhenOp = (typeof WHEN_OPS)[number];

/**
 * @description Conditional predicate controlling visibility or enablement
 * @typedef {Object} GenuiWhen
 * @property {string} field Field, answer, or group id to read.
 * @property {GenuiWhenOp} op Comparison operator.
 * @property {string|number|boolean|Array<string|number>} [value] Operand; its
 * meaning depends on `op` (absent for `empty`/`not-empty`/`checked`).
 * @memberOf module:gen-ui
 */
export interface GenuiWhen {
  field: string;
  op: GenuiWhenOp;
  value?: string | number | boolean | (string | number)[];
}

/**
 * @description Layout and conditional hints mixed into every node
 * @typedef {Object} GenuiLayoutHints
 * @property {number} [span] Grid span (columns) for this node.
 * @property {GenuiWhen} [when] Render the node only when this predicate holds.
 * @property {GenuiWhen} [enableWhen] Keep the node visible but disabled until
 * this predicate holds.
 * @property {string} [disabledReason] Localized/plain reason shown while gated.
 * @memberOf module:gen-ui
 */
export interface GenuiLayoutHints {
  span?: number;
  when?: GenuiWhen;
  enableWhen?: GenuiWhen;
  disabledReason?: string;
}

/**
 * @description Number formatting for a computed field
 * @typedef {Object} GenuiComputedFormat
 * @property {string} [locale] BCP 47 locale; defaults to the runtime locale.
 * @property {"decimal"|"currency"|"percent"} [style] Intl number style.
 * @property {string} [currency] ISO currency code for `style: "currency"`.
 * @property {number} [minimumFractionDigits] Minimum fraction digits.
 * @property {number} [maximumFractionDigits] Maximum fraction digits.
 * @memberOf module:gen-ui
 */
export interface GenuiComputedFormat {
  locale?: string;
  style?: "decimal" | "currency" | "percent";
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * @description A derived numeric field evaluated from other values
 * @typedef {Object} GenuiComputed
 * @property {string} id Identifier referenced by `{ $computed: "id" }`.
 * @property {string} expr Sandboxed math expression.
 * @property {GenuiComputedFormat} [format] Optional display formatting.
 * @memberOf module:gen-ui
 */
export interface GenuiComputed {
  id: string;
  expr: string;
  format?: GenuiComputedFormat;
}

/**
 * @description A reference to a computed field inside table/chart data
 * @typedef {Object} GenuiComputedRef
 * @property {string} $computed The computed field id.
 * @memberOf module:gen-ui
 */
export interface GenuiComputedRef {
  $computed: string;
}

/**
 * @description A pre-resolved computed cell with display text
 * @typedef {Object} GenuiComputedCell
 * @property {number} value The numeric value.
 * @property {string} formatted The display string.
 * @memberOf module:gen-ui
 */
export interface GenuiComputedCell {
  value: number;
  formatted: string;
}

/**
 * @description Top-level envelope for a renderable GenUI specification
 * @typedef {Object} GenuiSpec
 * @property {string} [title] Optional block title.
 * @property {number} [gap] Vertical gap between root items.
 * @property {boolean} [panel] Route this spec to the session panel instead of
 * rendering inline.
 * @property {boolean} [append] Append to the existing panel spec instead of
 * replacing it (panel mode only).
 * @property {GenuiComputed[]} [computed] Derived numeric fields.
 * @property {GenuiNode[]} items Root nodes in render order.
 * @memberOf module:gen-ui
 */
export interface GenuiSpec {
  title?: string;
  gap?: number;
  panel?: boolean;
  append?: boolean;
  computed?: GenuiComputed[];
  items: GenuiNode[];
}

/**
 * @description Paragraph text with semantic size and tone
 * @typedef {Object} GenuiText
 * @property {"text"} type Discriminator.
 * @property {"display"|"h1"|"h2"|"h3"|"body"|"muted"|"caption"} [size] Visual size.
 * @property {string} content The text content.
 * @property {boolean} [center] Center-align the text.
 * @property {"danger"|"success"|"warning"|"info"|"muted"} [tone] Semantic color.
 * @property {boolean} [mono] Render in a monospace face.
 * @property {"left"|"center"|"right"} [align] Text alignment.
 * @memberOf module:gen-ui
 */
export interface GenuiText {
  type: "text";
  size?: "display" | "h1" | "h2" | "h3" | "body" | "muted" | "caption";
  content: string;
  center?: boolean;
  tone?: "danger" | "success" | "warning" | "info" | "muted";
  mono?: boolean;
  align?: "left" | "center" | "right";
}

/**
 * @description Multi-line text editor bound to a field id
 * @typedef {Object} GenuiEditor
 * @property {"editor"} type Discriminator.
 * @property {string} id Field id.
 * @property {string} value Initial value.
 * @property {string} [label] Field label.
 * @property {string} [placeholder] Placeholder text.
 * @property {number} [rows] Visible row count.
 * @memberOf module:gen-ui
 */
export interface GenuiEditor {
  type: "editor";
  id: string;
  value: string;
  label?: string;
  placeholder?: string;
  rows?: number;
}

/**
 * @description One label/value row on an entity card
 * @typedef {Object} GenuiEntityMetadata
 * @property {string} label Metadata label.
 * @property {string} value Metadata value.
 * @memberOf module:gen-ui
 */
export interface GenuiEntityMetadata {
  label: string;
  value: string;
}

/**
 * @description One action button on an entity card
 * @typedef {Object} GenuiEntityAction
 * @property {string} label Button label.
 * @property {string} action Action name emitted on click.
 * @property {"primary"|"danger"|"success"|"ghost"} [tone] Button tone.
 * @memberOf module:gen-ui
 */
export interface GenuiEntityAction {
  label: string;
  action: string;
  tone?: "primary" | "danger" | "success" | "ghost";
}

/**
 * @description Rich entity card with media, metadata, and actions
 * @typedef {Object} GenuiEntityCard
 * @property {"entity-card"} type Discriminator.
 * @property {string} name Entity name.
 * @property {string} [image] Image URL (validated with `safeMediaSrc`).
 * @property {string} [imageAlt] Image alt text.
 * @property {string} [description] Short description.
 * @property {GenuiEntityMetadata[]} [metadata] Label/value rows.
 * @property {string} [href] Optional link (validated with `safeHref`).
 * @property {string} [sourceLabel] Label for the source link.
 * @property {GenuiEntityAction[]} [actions] Action buttons.
 * @memberOf module:gen-ui
 */
export interface GenuiEntityCard {
  type: "entity-card";
  name: string;
  image?: string;
  imageAlt?: string;
  description?: string;
  metadata?: GenuiEntityMetadata[];
  href?: string;
  sourceLabel?: string;
  actions?: GenuiEntityAction[];
}

/**
 * @description Inline popover with trigger text and content
 * @typedef {Object} GenuiPopover
 * @property {"popover"} type Discriminator.
 * @property {string} label Trigger text.
 * @property {string} content Popover content.
 * @property {"click"|"hover"} [trigger] Open trigger.
 * @property {string} [placement] Preferred placement side/alignment.
 * @memberOf module:gen-ui
 */
export interface GenuiPopover {
  type: "popover";
  label: string;
  content: string;
  trigger?: "click" | "hover";
  placement?:
    | "top"
    | "top-start"
    | "top-end"
    | "right"
    | "right-start"
    | "right-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "left-start"
    | "left-end";
}

/**
 * @description Plain action button
 * @typedef {Object} GenuiButton
 * @property {"button"} type Discriminator.
 * @property {string} label Button label.
 * @property {"primary"|"danger"|"success"|"ghost"} [tone] Button tone.
 * @property {boolean} [full] Stretch to full width.
 * @property {boolean} [small] Compact size.
 * @property {string} [icon] Icon name.
 * @property {string} [action] Action name emitted on click.
 * @memberOf module:gen-ui
 */
export interface GenuiButton {
  type: "button";
  label: string;
  tone?: "primary" | "danger" | "success" | "ghost";
  full?: boolean;
  small?: boolean;
  icon?: string;
  action?: string;
}

/**
 * @description Single-line input bound to a field
 * @typedef {Object} GenuiInput
 * @property {"input"} type Discriminator.
 * @property {string} [label] Field label.
 * @property {string} [placeholder] Placeholder text.
 * @property {string} [value] Initial value.
 * @property {"text"|"email"|"password"|"color"|"number"} [inputType] Input type;
 * `password` marks the field secret.
 * @property {string} [action] Action emitted on change.
 * @property {string} [id] Field id.
 * @memberOf module:gen-ui
 */
export interface GenuiInput {
  type: "input";
  label?: string;
  placeholder?: string;
  value?: string;
  inputType?: "text" | "email" | "password" | "color" | "number";
  action?: string;
  id?: string;
}

/**
 * @description Dropdown select bound to a field
 * @typedef {Object} GenuiSelect
 * @property {"select"} type Discriminator.
 * @property {string} [label] Field label.
 * @property {string[]} options Option labels.
 * @property {string} [action] Action emitted on change.
 * @property {number} [selected] Initially selected index.
 * @property {string} [id] Field id.
 * @memberOf module:gen-ui
 */
export interface GenuiSelect {
  type: "select";
  label?: string;
  options: string[];
  action?: string;
  selected?: number;
  id?: string;
}

/**
 * @description Date picker for a single date or a range
 * @typedef {Object} GenuiDatePicker
 * @property {"date-picker"} type Discriminator.
 * @property {string} [label] Field label.
 * @property {"single"|"range"} [mode] Selection mode.
 * @property {string} [value] ISO date or `start/end` range value.
 * @property {string} [min] Earliest permitted ISO date.
 * @property {string} [max] Latest permitted ISO date.
 * @property {string} [id] Field id.
 * @memberOf module:gen-ui
 */
export interface GenuiDatePicker {
  type: "date-picker";
  label?: string;
  mode?: "single" | "range";
  value?: string;
  min?: string;
  max?: string;
  id?: string;
}

/**
 * @description Segmented single-choice control
 * @typedef {Object} GenuiSegmentedControl
 * @property {"segmented-control"} type Discriminator.
 * @property {string} [label] Field label.
 * @property {string[]} options Option labels.
 * @property {string} [value] Initially selected label.
 * @property {string} [id] Field id.
 * @property {string} [action] Action emitted on change.
 * @memberOf module:gen-ui
 */
export interface GenuiSegmentedControl {
  type: "segmented-control";
  label?: string;
  options: string[];
  value?: string;
  id?: string;
  action?: string;
}

/**
 * @description Checkbox, optionally part of a multi-select group
 * @typedef {Object} GenuiCheckbox
 * @property {"checkbox"} type Discriminator.
 * @property {string} label Checkbox label.
 * @property {boolean} [checked] Initial checked state.
 * @property {string} [action] Action emitted on toggle.
 * @property {string} [group] Multi-answer group id.
 * @memberOf module:gen-ui
 */
export interface GenuiCheckbox {
  type: "checkbox";
  label: string;
  checked?: boolean;
  action?: string;
  group?: string;
}

/**
 * @description Hyperlink
 * @typedef {Object} GenuiLink
 * @property {"link"} type Discriminator.
 * @property {string} label Link text.
 * @property {string} [href] Destination, validated before use.
 * @memberOf module:gen-ui
 */
export interface GenuiLink {
  type: "link";
  label: string;
  href?: string;
}

/**
 * @description Single image with optional caption
 * @typedef {Object} GenuiImage
 * @property {"image"} type Discriminator.
 * @property {string} src Image source, validated before use.
 * @property {string} [alt] Alt text.
 * @property {string} [caption] Caption text.
 * @memberOf module:gen-ui
 */
export interface GenuiImage {
  type: "image";
  src: string;
  alt?: string;
  caption?: string;
}

/**
 * @description One item in an image group
 * @typedef {Object} GenuiImageGroupItem
 * @property {string} src Image source.
 * @property {string} [alt] Alt text.
 * @property {string} [caption] Caption text.
 * @memberOf module:gen-ui
 */
export interface GenuiImageGroupItem {
  src: string;
  alt?: string;
  caption?: string;
}

/**
 * @description Gallery of images
 * @typedef {Object} GenuiImageGroup
 * @property {"image-group"} type Discriminator.
 * @property {GenuiImageGroupItem[]} items Gallery items.
 * @property {string} [title] Gallery title.
 * @memberOf module:gen-ui
 */
export interface GenuiImageGroup {
  type: "image-group";
  items: GenuiImageGroupItem[];
  title?: string;
}

/**
 * @description One panel of a before/after comparison
 * @typedef {Object} GenuiComparePanel
 * @property {string} src Image source.
 * @property {string} [label] Panel label.
 * @property {string} [alt] Alt text.
 * @property {string} [caption] Caption text.
 * @memberOf module:gen-ui
 */
export interface GenuiComparePanel {
  src: string;
  label?: string;
  alt?: string;
  caption?: string;
}

/**
 * @description One option in a choices node
 * @typedef {Object} GenuiChoiceItem
 * @property {string} label Choice label.
 * @property {string} [hint] Supporting hint.
 * @property {string} [meta] Metadata text.
 * @property {boolean} [recommended] Highlight as recommended.
 * @property {boolean} [disabled] Prevent selection.
 * @property {string} [reason] Reason shown when disabled.
 * @memberOf module:gen-ui
 */
export interface GenuiChoiceItem {
  label: string;
  hint?: string;
  meta?: string;
  recommended?: boolean;
  disabled?: boolean;
  reason?: string;
}

/**
 * @description Single- or multi-select choice card
 * @typedef {Object} GenuiChoices
 * @property {"choices"} type Discriminator.
 * @property {string} [title] Card title.
 * @property {string} [prompt] Prompt text.
 * @property {"single"|"multi"} [mode] Selection mode.
 * @property {GenuiChoiceItem[]} items Choice options.
 * @property {string} [submit] Submit button label.
 * @property {string} [action] Action emitted on submit.
 * @property {number} [max] Maximum selections in multi mode.
 * @property {string} [group] Answer group id.
 * @property {number|string} [answer] Correct answer for graded papers.
 * @property {string} [explanation] Explanation shown after grading.
 * @memberOf module:gen-ui
 */
export interface GenuiChoices {
  type: "choices";
  title?: string;
  prompt?: string;
  mode?: "single" | "multi";
  items: GenuiChoiceItem[];
  submit?: string;
  action?: string;
  max?: number;
  group?: string;
  answer?: number | string;
  explanation?: string;
}

/**
 * @description Before/after image comparison
 * @typedef {Object} GenuiCompare
 * @property {"compare"} type Discriminator.
 * @property {string} [title] Comparison title.
 * @property {GenuiComparePanel} before The "before" panel.
 * @property {GenuiComparePanel} after The "after" panel.
 * @property {"side"|"stack"|"slider"} [mode] Layout mode.
 * @property {number} [height] Render height in pixels.
 * @memberOf module:gen-ui
 */
export interface GenuiCompare {
  type: "compare";
  title?: string;
  before: GenuiComparePanel;
  after: GenuiComparePanel;
  mode?: "side" | "stack" | "slider";
  height?: number;
}

/**
 * @description Horizontally scrolling set of nodes
 * @typedef {Object} GenuiCarousel
 * @property {"carousel"} type Discriminator.
 * @property {GenuiNode[]} items Slide nodes.
 * @property {string} [title] Carousel title.
 * @property {number} [itemWidth] Slide width in pixels.
 * @property {number} [gap] Gap between slides.
 * @memberOf module:gen-ui
 */
export interface GenuiCarousel {
  type: "carousel";
  items: GenuiNode[];
  title?: string;
  itemWidth?: number;
  gap?: number;
}

/**
 * @description Audio player
 * @typedef {Object} GenuiAudio
 * @property {"audio"} type Discriminator.
 * @property {string} src Media source, validated before use.
 * @property {string} [alt] Accessible label.
 * @property {boolean} [loop] Loop playback.
 * @memberOf module:gen-ui
 */
export interface GenuiAudio {
  type: "audio";
  src: string;
  alt?: string;
  loop?: boolean;
}

/**
 * @description Video player
 * @typedef {Object} GenuiVideo
 * @property {"video"} type Discriminator.
 * @property {string} src Media source, validated before use.
 * @property {string} [alt] Accessible label.
 * @property {string} [poster] Poster image source.
 * @property {boolean} [loop] Loop playback.
 * @property {boolean} [muted] Start muted.
 * @property {"16:9"|"4:3"|"1:1"|"9:16"} [aspectRatio] Display aspect ratio.
 * @memberOf module:gen-ui
 */
export interface GenuiVideo {
  type: "video";
  src: string;
  alt?: string;
  poster?: string;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: "16:9" | "4:3" | "1:1" | "9:16";
}

/**
 * @description Small status badge
 * @typedef {Object} GenuiBadge
 * @property {"badge"} type Discriminator.
 * @property {string} label Badge text.
 * @property {"success"|"warn"|"danger"|"accent"} [tone] Badge tone.
 * @property {string} [icon] Icon name.
 * @memberOf module:gen-ui
 */
export interface GenuiBadge {
  type: "badge";
  label: string;
  tone?: "success" | "warn" | "danger" | "accent";
  icon?: string;
}

/**
 * @description Hero headline with an optional metric and sparkline
 * @typedef {Object} GenuiHero
 * @property {"hero"} type Discriminator.
 * @property {string} title Headline.
 * @property {string} [subtitle] Supporting line.
 * @property {string} [value] Primary metric.
 * @property {string} [label] Metric label.
 * @property {string} [delta] Change indicator.
 * @property {number[]} [spark] Sparkline values.
 * @property {"accent"|"success"|"warning"|"danger"} [tone] Tone.
 * @memberOf module:gen-ui
 */
export interface GenuiHero {
  type: "hero";
  title: string;
  subtitle?: string;
  value?: string;
  label?: string;
  delta?: string;
  spark?: number[];
  tone?: "accent" | "success" | "warning" | "danger";
}

/**
 * @description Compact statistic with optional sparkline
 * @typedef {Object} GenuiStat
 * @property {"stat"} type Discriminator.
 * @property {string} label Statistic label.
 * @property {string} value Display value.
 * @property {string} [delta] Change indicator.
 * @property {number[]} [spark] Sparkline values.
 * @property {"hero"} [size] Larger presentation.
 * @memberOf module:gen-ui
 */
export interface GenuiStat {
  type: "stat";
  label: string;
  value: string;
  delta?: string;
  spark?: number[];
  size?: "hero";
}

/**
 * @description Progress bar or ring
 * @typedef {Object} GenuiProgress
 * @property {"progress"} type Discriminator.
 * @property {number} value Current value.
 * @property {string} [label] Progress label.
 * @property {string} [valueLabel] Custom value text.
 * @property {"bar"|"ring"} [variant] Presentation.
 * @property {number} [target] Target value for ratio computation.
 * @memberOf module:gen-ui
 */
export interface GenuiProgress {
  type: "progress";
  value: number;
  label?: string;
  valueLabel?: string;
  variant?: "bar" | "ring";
  target?: number;
}

/**
 * @description Horizontal divider with an optional label
 * @typedef {Object} GenuiDivider
 * @property {"divider"} type Discriminator.
 * @property {string} [label] Optional divider label.
 * @memberOf module:gen-ui
 */
export interface GenuiDivider {
  type: "divider";
  label?: string;
}

/**
 * @description Initials avatar
 * @typedef {Object} GenuiAvatar
 * @property {"avatar"} type Discriminator.
 * @property {string} name Name used to derive initials.
 * @property {string} [color] Background color.
 * @memberOf module:gen-ui
 */
export interface GenuiAvatar {
  type: "avatar";
  name: string;
  color?: string;
}

/**
 * @description Flexible vertical space
 * @typedef {Object} GenuiSpacer
 * @property {"spacer"} type Discriminator.
 * @memberOf module:gen-ui
 */
export interface GenuiSpacer {
  type: "spacer";
}

/**
 * @description Directional arrow with an optional label
 * @typedef {Object} GenuiArrow
 * @property {"arrow"} type Discriminator.
 * @property {"down"|"right"} [dir] Arrow direction.
 * @property {number} [length] Arrow length in pixels.
 * @property {string} [label] Arrow label.
 * @memberOf module:gen-ui
 */
export interface GenuiArrow {
  type: "arrow";
  dir?: "down" | "right";
  length?: number;
  label?: string;
}

/**
 * @description Named icon, optionally in a tile
 * @typedef {Object} GenuiIcon
 * @property {"icon"} type Discriminator.
 * @property {string} name Icon name.
 * @property {string} [label] Accessible label.
 * @property {"default"|"muted"|"info"|"success"|"warning"|"danger"} [tone] Tone.
 * @property {number} [size] Size in pixels.
 * @property {boolean} [tile] Render on a tile background.
 * @memberOf module:gen-ui
 */
export interface GenuiIcon {
  type: "icon";
  name: string;
  label?: string;
  tone?: "default" | "muted" | "info" | "success" | "warning" | "danger";
  size?: number;
  tile?: boolean;
}

/**
 * @description A cell in a blocks matrix
 * @summary Either a plain string, `null` for an empty cell, or an object with
 * display text plus optional color/tone/subtext.
 * @typedef {string|null|Object} GenuiBlockCell
 * @memberOf module:gen-ui
 */
export type GenuiBlockCell =
  | string
  | null
  | {
      text: string;
      color?: string;
      tone?: "accent" | "success" | "warning" | "danger" | "muted";
      sub?: string;
    };

/**
 * @description One row in a blocks matrix
 * @typedef {Object} GenuiBlocksRow
 * @property {string} [label] Row label.
 * @property {GenuiBlockCell[]} cells Row cells.
 * @property {string} [color] Row color override.
 * @property {"fill"|"outline"|"plain"} [variant] Cell presentation.
 * @memberOf module:gen-ui
 */
export interface GenuiBlocksRow {
  label?: string;
  cells: GenuiBlockCell[];
  color?: string;
  variant?: "fill" | "outline" | "plain";
}

/**
 * @description Two-dimensional matrix of colored label cells
 * @typedef {Object} GenuiBlocks
 * @property {"blocks"} type Discriminator.
 * @property {GenuiBlocksRow[]} rows Matrix rows.
 * @property {number} [columns] Number of columns.
 * @property {string} [caption] Caption text.
 * @property {string} [title] Title text.
 * @memberOf module:gen-ui
 */
export interface GenuiBlocks {
  type: "blocks";
  rows: GenuiBlocksRow[];
  columns?: number;
  caption?: string;
  title?: string;
}

/**
 * @description Horizontal flex row
 * @typedef {Object} GenuiRow
 * @property {"row"} type Discriminator.
 * @property {GenuiNode[]} items Row children.
 * @property {boolean} [wrap] Allow wrapping.
 * @property {boolean} [spacer] Insert flexible space.
 * @property {"start"|"center"|"end"|"between"} [justify] Main-axis alignment.
 * @memberOf module:gen-ui
 */
export interface GenuiRow {
  type: "row";
  items: GenuiNode[];
  wrap?: boolean;
  spacer?: boolean;
  justify?: "start" | "center" | "end" | "between";
}

/**
 * @description Vertical flex column
 * @typedef {Object} GenuiCol
 * @property {"col"} type Discriminator.
 * @property {GenuiNode[]} items Column children.
 * @property {number} [gap] Gap between children.
 * @property {number} [width] Fixed width in pixels.
 * @memberOf module:gen-ui
 */
export interface GenuiCol {
  type: "col";
  items: GenuiNode[];
  gap?: number;
  width?: number;
}

/**
 * @description Fixed-column grid
 * @typedef {Object} GenuiGrid
 * @property {"grid"} type Discriminator.
 * @property {number} cols Column count.
 * @property {GenuiNode[]} items Grid children.
 * @memberOf module:gen-ui
 */
export interface GenuiGrid {
  type: "grid";
  cols: number;
  items: GenuiNode[];
}

/**
 * @description Card container with optional title and tone
 * @typedef {Object} GenuiCard
 * @property {"card"} type Discriminator.
 * @property {string} [title] Card title.
 * @property {string} [eyebrow] Small overline text.
 * @property {"info"|"success"|"warning"|"danger"} [tone] Semantic tone.
 * @property {string} [accent] Accent color.
 * @property {boolean} [flat] Remove elevation.
 * @property {GenuiNode[]} items Card children.
 * @memberOf module:gen-ui
 */
export interface GenuiCard {
  type: "card";
  title?: string;
  eyebrow?: string;
  tone?: "info" | "success" | "warning" | "danger";
  accent?: string;
  flat?: boolean;
  items: GenuiNode[];
}

/**
 * @description Bulleted list of text, title/desc pairs, or nodes
 * @typedef {Object} GenuiList
 * @property {"list"} type Discriminator.
 * @property {string} [filter] Filter text.
 * @property {Array<string|Object>} items List entries.
 * @memberOf module:gen-ui
 */
export interface GenuiList {
  type: "list";
  filter?: string;
  items: (string | { title: string; desc?: string } | GenuiNode)[];
}

/**
 * @description Per-column rendering hint for a table
 * @typedef {string} TableCellType
 * @memberOf module:gen-ui
 */
export type TableCellType =
  | "text"
  | "num"
  | "delta"
  | "bar"
  | "badge"
  | "spark"
  | "ring"
  | "index"
  | "group";

/**
 * @description A table cell value
 * @summary A primitive, a computed reference, or a preformatted computed cell.
 * @typedef {string|number|GenuiComputedRef|GenuiComputedCell} GenuiTableCell
 * @memberOf module:gen-ui
 */
export type GenuiTableCell =
  | string
  | number
  | GenuiComputedRef
  | GenuiComputedCell;

/**
 * @description Data table with typed columns and optional detail rows
 * @typedef {Object} GenuiTable
 * @property {"table"} type Discriminator.
 * @property {string[]} columns Column headers.
 * @property {GenuiTableCell[][]} rows Body cells.
 * @property {TableCellType[]} [types] Per-column cell type.
 * @property {boolean} [total] Render a total row.
 * @property {boolean} [export] Offer Markdown/CSV export.
 * @property {Array<GenuiNode[]|null>} [details] Expandable detail nodes per row.
 * @property {string} [filter] Filter text.
 * @property {number} [filterColumn] Column the filter applies to.
 * @property {string} [sortField] Field to sort by.
 * @property {boolean} [wrap] Allow cell wrapping.
 * @memberOf module:gen-ui
 */
export interface GenuiTable {
  type: "table";
  columns: string[];
  rows: GenuiTableCell[][];
  types?: TableCellType[];
  total?: boolean;
  export?: boolean;
  details?: (GenuiNode[] | null)[];
  filter?: string;
  filterColumn?: number;
  sortField?: string;
  wrap?: boolean;
}

/**
 * @description One labeled value in a chart
 * @typedef {Object} GenuiChartDatum
 * @property {string} label Category label.
 * @property {number|GenuiComputedRef|null} value Numeric value or computed ref.
 * @property {string} [color] Explicit color override.
 * @memberOf module:gen-ui
 */
export interface GenuiChartDatum {
  label: string;
  value: number | GenuiComputedRef | null;
  color?: string;
}

/**
 * @description Named data series for grouped charts
 * @typedef {Object} GenuiChartSeries
 * @property {string} label Series label.
 * @property {string} [color] Series color.
 * @property {GenuiChartDatum[]} data Series points.
 * @memberOf module:gen-ui
 */
export interface GenuiChartSeries {
  label: string;
  color?: string;
  data: GenuiChartDatum[];
}

/**
 * @description Lightweight chart rendered without an engine bundle
 * @typedef {Object} GenuiChart
 * @property {"chart"} type Discriminator.
 * @property {"bars"|"line"|"donut"} [kind] Chart kind.
 * @property {GenuiChartDatum[]} data Primary data.
 * @property {GenuiChartSeries[]} [series] Additional grouped series.
 * @property {boolean} [horizontal] Horizontal bar orientation.
 * @property {boolean} [stacked] Stack bar series.
 * @property {string[]} [palette] Color palette override.
 * @property {string} [filter] Filter text.
 * @memberOf module:gen-ui
 */
export interface GenuiChart {
  type: "chart";
  kind?: "bars" | "line" | "donut";
  data: GenuiChartDatum[];
  series?: GenuiChartSeries[];
  horizontal?: boolean;
  stacked?: boolean;
  palette?: string[];
  filter?: string;
}

/**
 * @description One tab and its child nodes
 * @typedef {Object} GenuiTab
 * @property {string} label Tab label.
 * @property {GenuiNode[]} items Tab content.
 * @memberOf module:gen-ui
 */
export interface GenuiTab {
  label: string;
  items: GenuiNode[];
}

/**
 * @description Tabbed container
 * @typedef {Object} GenuiTabs
 * @property {"tabs"} type Discriminator.
 * @property {GenuiTab[]} tabs The tabs.
 * @memberOf module:gen-ui
 */
export interface GenuiTabs {
  type: "tabs";
  tabs: GenuiTab[];
}

/**
 * @description One expression series in a plot
 * @typedef {Object} GenuiPlotSeries
 * @property {string} expr Sandboxed expression in the sample variable `x`.
 * @property {string} [label] Series label.
 * @property {string} [color] Series color.
 * @property {"line"|"area"|"scatter"} [kind] Render kind.
 * @property {Array<Object>} [params] Interactive parameters; each has `name`,
 * `value`, and optional `min`/`max`/`step`/`animateTo`/`durationMs`/`loop`.
 * @memberOf module:gen-ui
 */
export interface GenuiPlotSeries {
  expr: string;
  label?: string;
  color?: string;
  kind?: "line" | "area" | "scatter";
  params?: {
    name: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    animateTo?: number;
    durationMs?: number;
    loop?: boolean;
  }[];
}

/**
 * @description Sampled function plot
 * @typedef {Object} GenuiPlot
 * @property {"plot"} type Discriminator.
 * @property {GenuiPlotSeries[]} series Expression series.
 * @property {number} [xMin] Lower x bound.
 * @property {number} [xMax] Upper x bound.
 * @property {number} [yMin] Lower y bound.
 * @property {number} [yMax] Upper y bound.
 * @property {string} [title] Plot title.
 * @memberOf module:gen-ui
 */
export interface GenuiPlot {
  type: "plot";
  series: GenuiPlotSeries[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  title?: string;
}

/**
 * @description Tonal callout box
 * @typedef {Object} GenuiCallout
 * @property {"callout"} type Discriminator.
 * @property {"info"|"success"|"warning"|"error"} [tone] Tone.
 * @property {string} [title] Callout title.
 * @property {string} content Callout body.
 * @memberOf module:gen-ui
 */
export interface GenuiCallout {
  type: "callout";
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  content: string;
}

/**
 * @description One step in a steps node
 * @typedef {Object} GenuiStep
 * @property {string} title Step title.
 * @property {string} [desc] Step description.
 * @memberOf module:gen-ui
 */
export interface GenuiStep {
  title: string;
  desc?: string;
}

/**
 * @description Ordered progress steps
 * @typedef {Object} GenuiSteps
 * @property {"steps"} type Discriminator.
 * @property {number} [current] Current step index.
 * @property {GenuiStep[]} steps The steps.
 * @memberOf module:gen-ui
 */
export interface GenuiSteps {
  type: "steps";
  current?: number;
  steps: GenuiStep[];
}

/**
 * @description Key/value summary grid
 * @typedef {Object} GenuiKeyValue
 * @property {"keyvalue"} type Discriminator.
 * @property {Array<Object>} pairs The pairs.
 * @memberOf module:gen-ui
 */
export interface GenuiKeyValue {
  type: "keyvalue";
  pairs: { key: string; value: string }[];
}

/**
 * @description Text diff viewer
 * @typedef {Object} GenuiDiff
 * @property {"diff"} type Discriminator.
 * @property {Array<Object>} diffs
 * Changed hunks; `oldText` is `null` for an addition.
 * @memberOf module:gen-ui
 */
export interface GenuiDiff {
  type: "diff";
  diffs: { path: string; oldText: string | null; newText: string }[];
}

/**
 * @description Collapsible JSON viewer
 * @typedef {Object} GenuiJson
 * @property {"json"} type Discriminator.
 * @property {unknown} value The JSON value to render.
 * @memberOf module:gen-ui
 */
export interface GenuiJson {
  type: "json";
  value: unknown;
}

/**
 * @description Code block with syntax language
 * @typedef {Object} GenuiCode
 * @property {"code"} type Discriminator.
 * @property {string} [lang] Language hint.
 * @property {string} code The code text.
 * @memberOf module:gen-ui
 */
export interface GenuiCode {
  type: "code";
  lang?: string;
  code: string;
}

/**
 * @description Radio group, optionally gradable
 * @typedef {Object} GenuiRadio
 * @property {"radio"} type Discriminator.
 * @property {string} [label] Group label.
 * @property {string[]} options Option labels.
 * @property {number} [selected] Initially selected index.
 * @property {string} [action] Action emitted on select.
 * @property {string} [group] Answer group id.
 * @property {number|string} [answer] Correct answer for grading.
 * @property {string} [explanation] Explanation shown after grading.
 * @memberOf module:gen-ui
 */
export interface GenuiRadio {
  type: "radio";
  label?: string;
  options: string[];
  selected?: number;
  action?: string;
  group?: string;
  answer?: number | string;
  explanation?: string;
}

/**
 * @description Form submit button, optionally scoped to groups
 * @typedef {Object} GenuiSubmit
 * @property {"submit"} type Discriminator.
 * @property {string} label Button label.
 * @property {string} [action] Action emitted on submit.
 * @property {string} [resetAction] Action emitted on reset.
 * @property {string[]} [groups] Groups required before submission.
 * @memberOf module:gen-ui
 */
export interface GenuiSubmit {
  type: "submit";
  label: string;
  action?: string;
  resetAction?: string;
  groups?: string[];
}

/**
 * @description Boolean switch
 * @typedef {Object} GenuiSwitch
 * @property {"switch"} type Discriminator.
 * @property {string} label Switch label.
 * @property {boolean} [checked] Initial state.
 * @property {string} [action] Action emitted on toggle.
 * @memberOf module:gen-ui
 */
export interface GenuiSwitch {
  type: "switch";
  label: string;
  checked?: boolean;
  action?: string;
}

/**
 * @description Numeric slider bound to a field
 * @typedef {Object} GenuiSlider
 * @property {"slider"} type Discriminator.
 * @property {string} [label] Field label.
 * @property {number} [min] Minimum value.
 * @property {number} [max] Maximum value.
 * @property {number} [step] Step increment.
 * @property {number} [value] Initial value.
 * @property {string} [action] Action emitted on change.
 * @property {string} [id] Field id.
 * @memberOf module:gen-ui
 */
export interface GenuiSlider {
  type: "slider";
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  action?: string;
  id?: string;
}

/**
 * @description Multi-line textarea bound to a field
 * @typedef {Object} GenuiTextarea
 * @property {"textarea"} type Discriminator.
 * @property {string} [label] Field label.
 * @property {string} [placeholder] Placeholder text.
 * @property {number} [rows] Visible row count.
 * @property {string} [value] Initial value.
 * @property {string} [action] Action emitted on change.
 * @property {string} [id] Field id.
 * @memberOf module:gen-ui
 */
export interface GenuiTextarea {
  type: "textarea";
  label?: string;
  placeholder?: string;
  rows?: number;
  value?: string;
  action?: string;
  id?: string;
}

/**
 * @description One accordion section
 * @typedef {Object} GenuiAccordionItem
 * @property {string} title Section title.
 * @property {GenuiNode[]} items Section content.
 * @memberOf module:gen-ui
 */
export interface GenuiAccordionItem {
  title: string;
  items: GenuiNode[];
}

/**
 * @description Collapsible sections
 * @typedef {Object} GenuiAccordion
 * @property {"accordion"} type Discriminator.
 * @property {GenuiAccordionItem[]} items The sections.
 * @memberOf module:gen-ui
 */
export interface GenuiAccordion {
  type: "accordion";
  items: GenuiAccordionItem[];
}

/**
 * @description Copyable text with optional expand/collapse
 * @typedef {Object} GenuiCopy
 * @property {"copy"} type Discriminator.
 * @property {string} [label] Copy label.
 * @property {string} text The text to copy.
 * @property {boolean} [expandable] Offer expand/collapse.
 * @property {number} [previewLines] Lines shown when collapsed.
 * @memberOf module:gen-ui
 */
export interface GenuiCopy {
  type: "copy";
  label?: string;
  text: string;
  expandable?: boolean;
  previewLines?: number;
}

/**
 * @description Inline sanitized SVG
 * @typedef {Object} GenuiSvg
 * @property {"svg"} type Discriminator.
 * @property {string} code SVG markup; sanitized before rendering.
 * @property {string} [title] Accessible title.
 * @property {number} [height] Maximum render height in pixels.
 * @memberOf module:gen-ui
 */
export interface GenuiSvg {
  type: "svg";
  code: string;
  title?: string;
  height?: number;
}

/**
 * @description Mermaid diagram rendered by the lazy Mermaid engine
 * @typedef {Object} GenuiMermaid
 * @property {"mermaid"} type Discriminator.
 * @property {string} code Mermaid source; the first token must be an allowlisted
 * diagram kind.
 * @memberOf module:gen-ui
 */
export interface GenuiMermaid {
  type: "mermaid";
  code: string;
}

/**
 * @description Primitive shape in a 3D scene
 * @typedef {Object} GenuiMesh
 * @property {"box"|"sphere"|"cone"|"cylinder"|"torus"} shape Mesh shape.
 * @property {string} [color] Mesh color.
 * @property {Array<number>} [position] Position.
 * @property {Array<number>} [rotation] Rotation.
 * @property {number|Array<number>} [scale] Uniform or per-axis scale.
 * @property {number|Array<number>} [size] Uniform or per-axis size.
 * @memberOf module:gen-ui
 */
export interface GenuiMesh {
  shape: "box" | "sphere" | "cone" | "cylinder" | "torus";
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  size?: number | [number, number, number];
}

/**
 * @description 3D scene rendered by the lazy Three.js engine
 * @typedef {Object} GenuiScene3D
 * @property {"scene3d"} type Discriminator.
 * @property {string} [title] Scene title.
 * @property {GenuiMesh[]} meshes Scene meshes.
 * @property {number} [ambient] Ambient light intensity.
 * @property {string} [background] Background color.
 * @memberOf module:gen-ui
 */
export interface GenuiScene3D {
  type: "scene3d";
  title?: string;
  meshes: GenuiMesh[];
  ambient?: number;
  background?: string;
}

/**
 * @description One timeline entry
 * @typedef {Object} GenuiTimelineItem
 * @property {string} title Entry title.
 * @property {string} [desc] Entry description.
 * @property {string} [time] Time label.
 * @memberOf module:gen-ui
 */
export interface GenuiTimelineItem {
  title: string;
  desc?: string;
  time?: string;
}

/**
 * @description Vertical timeline
 * @typedef {Object} GenuiTimeline
 * @property {"timeline"} type Discriminator.
 * @property {GenuiTimelineItem[]} items Timeline entries.
 * @memberOf module:gen-ui
 */
export interface GenuiTimeline {
  type: "timeline";
  items: GenuiTimelineItem[];
}

/**
 * @description One file-tree node
 * @typedef {Object} GenuiFileTreeNode
 * @property {string} name Display name.
 * @property {"file"|"dir"} [type] Node kind.
 * @property {GenuiFileTreeNode[]} [children] Child nodes for directories.
 * @memberOf module:gen-ui
 */
export interface GenuiFileTreeNode {
  name: string;
  type?: "file" | "dir";
  children?: GenuiFileTreeNode[];
}

/**
 * @description Hierarchical file tree
 * @typedef {Object} GenuiFileTree
 * @property {"file-tree"} type Discriminator.
 * @property {GenuiFileTreeNode[]} items Root nodes.
 * @memberOf module:gen-ui
 */
export interface GenuiFileTree {
  type: "file-tree";
  items: GenuiFileTreeNode[];
}

/**
 * @description Breadcrumb trail
 * @typedef {Object} GenuiBreadcrumb
 * @property {"breadcrumb"} type Discriminator.
 * @property {string[]} items Trail labels.
 * @memberOf module:gen-ui
 */
export interface GenuiBreadcrumb {
  type: "breadcrumb";
  items: string[];
}

/**
 * @description One answer option in a quiz
 * @typedef {Object} GenuiQuizOption
 * @property {string} label Option label.
 * @property {boolean} [correct] Whether this option is correct.
 * @property {string} [feedback] Feedback shown for this option.
 * @memberOf module:gen-ui
 */
export interface GenuiQuizOption {
  label: string;
  correct?: boolean;
  feedback?: string;
}

/**
 * @description Single-question quiz with local grading
 * @typedef {Object} GenuiQuiz
 * @property {"quiz"} type Discriminator.
 * @property {string} question Question text.
 * @property {GenuiQuizOption[]} options Answer options.
 * @property {string} [explanation] Explanation shown after grading.
 * @property {string} [id] Block/field id.
 * @property {string} [action] Action emitted on answering.
 * @memberOf module:gen-ui
 */
export interface GenuiQuiz {
  type: "quiz";
  question: string;
  options: GenuiQuizOption[];
  explanation?: string;
  id?: string;
  action?: string;
}

/**
 * @description One node in the SVG diagram engine
 * @typedef {Object} GenuiDiagramNode
 * @property {string} id Node id used by edges.
 * @property {string} label Node label.
 * @property {string} [sub] Secondary label.
 * @property {string} [description] Longer description.
 * @property {"focal"|"backend"|"store"|"external"|"input"|"optional"|"security"} [type]
 * Visual category.
 * @property {number} [x] Explicit x position.
 * @property {number} [y] Explicit y position.
 * @property {number} [w] Explicit width.
 * @property {number} [h] Explicit height.
 * @property {string} [tag] Corner tag text.
 * @memberOf module:gen-ui
 */
export interface GenuiDiagramNode {
  id: string;
  label: string;
  sub?: string;
  description?: string;
  type?:
    | "focal"
    | "backend"
    | "store"
    | "external"
    | "input"
    | "optional"
    | "security";
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  tag?: string;
}

/**
 * @description A directed edge between two diagram nodes
 * @typedef {Object} GenuiDiagramEdge
 * @property {string} from Source node id.
 * @property {string} to Target node id.
 * @property {string} [label] Edge label.
 * @property {"solid"|"dashed"|"accent"|"link"} [kind] Edge style.
 * @property {"auto"|"orthogonal"|"straight"} [route] Routing strategy.
 * @memberOf module:gen-ui
 */
export interface GenuiDiagramEdge {
  from: string;
  to: string;
  label?: string;
  kind?: "solid" | "dashed" | "accent" | "link";
  route?: "auto" | "orthogonal" | "straight";
}

/**
 * @description Color overrides for a diagram
 * @typedef {Object} GenuiDiagramTheme
 * @property {string} [paper] Surface color.
 * @property {string} [paper-2] Alternate surface color.
 * @property {string} [ink] Foreground color.
 * @property {string} [muted] Muted text color.
 * @property {string} [soft] Soft fill color.
 * @property {string} [rule] Rule/line color.
 * @property {string} [accent] Accent color.
 * @property {string} [accent-tint] Accent tint color.
 * @property {string} [link] Link color.
 * @memberOf module:gen-ui
 */
export interface GenuiDiagramTheme {
  paper?: string;
  "paper-2"?: string;
  ink?: string;
  muted?: string;
  soft?: string;
  rule?: string;
  accent?: string;
  "accent-tint"?: string;
  link?: string;
}

/**
 * @description A labeled region drawn behind diagram nodes
 * @typedef {Object} GenuiDiagramZone
 * @property {string} label Zone label.
 * @property {number} [x] Zone x position.
 * @property {number} [y] Zone y position.
 * @property {number} [w] Zone width.
 * @property {number} [h] Zone height.
 * @memberOf module:gen-ui
 */
export interface GenuiDiagramZone {
  label: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

/**
 * @description SVG architecture diagram
 * @typedef {Object} GenuiDiagram
 * @property {"diagram"} type Discriminator.
 * @property {string} [id] Diagram id.
 * @property {string} kind Diagram kind label.
 * @property {"light"|"dark"|"editorial"} [variant] Visual variant.
 * @property {string} [title] Diagram title.
 * @property {GenuiDiagramNode[]} nodes Diagram nodes.
 * @property {GenuiDiagramEdge[]} [edges] Diagram edges.
 * @property {GenuiDiagramZone[]} [zones] Background zones.
 * @property {GenuiDiagramTheme} [theme] Color overrides.
 * @memberOf module:gen-ui
 */
export interface GenuiDiagram {
  type: "diagram";
  id?: string;
  kind: string;
  variant?: "light" | "dark" | "editorial";
  title?: string;
  nodes: GenuiDiagramNode[];
  edges?: GenuiDiagramEdge[];
  zones?: GenuiDiagramZone[];
  theme?: GenuiDiagramTheme;
}

/**
 * @description Chart rendered by the lazy ECharts engine
 * @typedef {Object} GenuiEChart
 * @property {"echart"} type Discriminator.
 * @property {string} [title] Chart title.
 * @property {number} [height] Render height in pixels.
 * @property {string} [preset] Preset name from {@link ECHART_PRESETS}.
 * @property {GenuiChartDatum[]} [data] Preset data.
 * @property {GenuiChartSeries[]} [series] Preset series.
 * @property {Array<Object>} [links]
 * Graph links for the `graph` preset.
 * @property {string[]} [palette] Palette override.
 * @property {Record<string, unknown>} [option] Raw option; sanitized before use.
 * @memberOf module:gen-ui
 */
export interface GenuiEChart {
  type: "echart";
  title?: string;
  height?: number;
  preset?: string;
  data?: GenuiChartDatum[];
  series?: GenuiChartSeries[];
  links?: { from: string; to: string; value?: number }[];
  palette?: string[];
  option?: Record<string, unknown>;
}

/**
 * @description A location on a map node
 * @typedef {Object} GenuiMapLocation
 * @property {string} id Location id.
 * @property {string} label Location label.
 * @property {Array<number>} coordinates `[longitude, latitude]`.
 * @property {string} [description] Location description.
 * @memberOf module:gen-ui
 */
export interface GenuiMapLocation {
  id: string;
  label: string;
  coordinates: [number, number];
  description?: string;
}

/**
 * @description A polyline route on a map node
 * @typedef {Object} GenuiMapRoute
 * @property {string} id Route id.
 * @property {string} label Route label.
 * @property {Array<Array<number>>} coordinates Route points.
 * @memberOf module:gen-ui
 */
export interface GenuiMapRoute {
  id: string;
  label: string;
  coordinates: [number, number][];
}

/**
 * @description Offline coordinate map rendered without external requests
 * @typedef {Object} GenuiMap
 * @property {"map"} type Discriminator.
 * @property {string} [title] Map title.
 * @property {string} [id] Field id holding the selection.
 * @property {GenuiMapLocation[]} locations Map locations.
 * @property {GenuiMapRoute[]} [routes] Map routes.
 * @property {string} [selected] Initially selected location id.
 * @property {Array<number>} [center] Initial center coordinates.
 * @property {number} [zoom] Initial zoom level.
 * @property {number} [height] Render height in pixels.
 * @memberOf module:gen-ui
 */
export interface GenuiMap {
  type: "map";
  title?: string;
  id?: string;
  locations: GenuiMapLocation[];
  routes?: GenuiMapRoute[];
  selected?: string;
  center?: [number, number];
  zoom?: number;
  height?: number;
}

/**
 * @description Any renderable GenUI node
 * @summary A discriminated union of every whitelisted component, intersected
 * with the shared {@link GenuiLayoutHints} so every node can be conditionally
 * shown, enabled, or spanned. Consumers should switch on `type`; unknown types
 * are handled by the renderer fallback.
 * @typedef {GenuiText|GenuiRow|GenuiCol|GenuiGrid|GenuiCard|GenuiButton|GenuiInput|GenuiSelect|GenuiDatePicker|GenuiSegmentedControl|GenuiCheckbox|GenuiLink|GenuiImage|GenuiImageGroup|GenuiCompare|GenuiChoices|GenuiCarousel|GenuiAudio|GenuiVideo|GenuiBadge|GenuiStat|GenuiHero|GenuiProgress|GenuiDivider|GenuiList|GenuiTable|GenuiChart|GenuiTabs|GenuiAvatar|GenuiSpacer|GenuiPlot|GenuiCallout|GenuiSteps|GenuiKeyValue|GenuiDiff|GenuiJson|GenuiCode|GenuiRadio|GenuiSubmit|GenuiSwitch|GenuiSlider|GenuiTextarea|GenuiAccordion|GenuiCopy|GenuiMermaid|GenuiSvg|GenuiScene3D|GenuiMap|GenuiTimeline|GenuiFileTree|GenuiBreadcrumb|GenuiQuiz|GenuiDiagram|GenuiIcon|GenuiBlocks|GenuiArrow|GenuiEditor|GenuiEntityCard|GenuiPopover|GenuiEChart} GenuiNode
 * @memberOf module:gen-ui
 */
export type GenuiNode = (
  | GenuiText
  | GenuiRow
  | GenuiCol
  | GenuiGrid
  | GenuiCard
  | GenuiButton
  | GenuiInput
  | GenuiSelect
  | GenuiDatePicker
  | GenuiSegmentedControl
  | GenuiCheckbox
  | GenuiLink
  | GenuiImage
  | GenuiImageGroup
  | GenuiCompare
  | GenuiChoices
  | GenuiCarousel
  | GenuiAudio
  | GenuiVideo
  | GenuiBadge
  | GenuiStat
  | GenuiHero
  | GenuiProgress
  | GenuiDivider
  | GenuiList
  | GenuiTable
  | GenuiChart
  | GenuiTabs
  | GenuiAvatar
  | GenuiSpacer
  | GenuiPlot
  | GenuiCallout
  | GenuiSteps
  | GenuiKeyValue
  | GenuiDiff
  | GenuiJson
  | GenuiCode
  | GenuiRadio
  | GenuiSubmit
  | GenuiSwitch
  | GenuiSlider
  | GenuiTextarea
  | GenuiAccordion
  | GenuiCopy
  | GenuiMermaid
  | GenuiSvg
  | GenuiScene3D
  | GenuiMap
  | GenuiTimeline
  | GenuiFileTree
  | GenuiBreadcrumb
  | GenuiQuiz
  | GenuiDiagram
  | GenuiIcon
  | GenuiBlocks
  | GenuiArrow
  | GenuiEditor
  | GenuiEntityCard
  | GenuiPopover
  | GenuiEChart
) &
  GenuiLayoutHints;
