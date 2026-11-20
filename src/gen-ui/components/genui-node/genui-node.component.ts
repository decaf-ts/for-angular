import { NgClass } from "@angular/common";
import { Component, forwardRef, inject, input, signal } from "@angular/core";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { isNodeEnabled, isNodeVisible } from "../../conditions";
import { GENUI_LIMITS } from "../../limits";
import type { GenuiBlockState } from "../../render-context";
import { safeHref, safeMediaSrc } from "../../sanitize";
import type { GenuiChartDatum, GenuiNode, GenuiQuizOption, TableCellType } from "../../types";
import { GenuiDiagramComponent } from "../engines/genui-diagram.component";
import { GenuiEchartComponent } from "../engines/genui-echart.component";
import { GenuiMapComponent } from "../engines/genui-map.component";
import { GenuiMermaidComponent } from "../engines/genui-mermaid.component";
import { GenuiPlotComponent } from "../engines/genui-plot.component";
import { GenuiScene3dComponent } from "../engines/genui-scene3d.component";
import { GenuiSvgComponent } from "../engines/genui-svg.component";

interface QuizGrade {
  correct: boolean;
  score: number;
  total: number;
  results: boolean[];
}

@Component({
  selector: "ngx-decaf-genui-node",
  templateUrl: "./genui-node.component.html",
  styleUrls: ["./genui-node.component.scss"],
  imports: [
    NgClass,
    forwardRef(() => GenuiNodeComponent),
    GenuiDiagramComponent,
    GenuiEchartComponent,
    GenuiMapComponent,
    GenuiMermaidComponent,
    GenuiPlotComponent,
    GenuiScene3dComponent,
    GenuiSvgComponent,
  ],
  standalone: true,
})
/**
 * @description Renders one GenUI node and its children
 * @summary The component's template switches on `node.type` across the whole
 * whitelisted vocabulary, delegating heavy visual nodes to the engine
 * components. It reads conditions and field values from {@link GenuiBlockState},
 * applies sanitizers to links/media, and fires model-defined actions through
 * `state.fire`. Template helper methods intentionally accept loose shapes
 * because the server guard, not the renderer, performs full validation.
 * @class GenuiNodeComponent
 * @example
 * ```html
 * <ngx-decaf-genui-node [node]="node" [state]="state" [depth]="0" />
 * ```
 */
export class GenuiNodeComponent {
  private readonly i18n = inject(GenuiI18nService);

  /** @description Node to render. */
  readonly node = input.required<GenuiNode>();
  /** @description Reactive block state shared by the subtree. */
  readonly state = input.required<GenuiBlockState>();
  /** @description Current nesting depth, checked against the render limit. */
  readonly depth = input<number>(0);

  /** @description Active tab index for tabs/radio nodes. */
  readonly tabIndex = signal(0);
  /** @description Selected quiz option index. */
  readonly quizChoice = signal<number | null>(null);
  /** @description Local quiz grade after submission. */
  readonly grade = signal<QuizGrade | null>(null);
  /** @description Selected labels for a choices node. */
  readonly selectedChoices = signal<string[]>([]);
  /** @description Open accordion/detail panels by index. */
  readonly openPanels = signal<ReadonlySet<number>>(new Set<number>());
  /** @description Key of the most recently copied value. */
  readonly copied = signal<string | null>(null);

  /**
   * @description Localize a UI key
   * @param {string} key The dictionary key.
   * @param {Record<string, string|number>} [params] Placeholder values.
   * @returns {string} The localized text.
   */
  t(key: Parameters<GenuiI18nService["t"]>[0], params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }

  /**
   * @description Re-type an unknown value as a node for template use
   * @param {unknown} node The value.
   * @returns {GenuiNode} The same value typed as a node.
   */
  asNode(node: unknown): GenuiNode {
    return node as GenuiNode;
  }

  // Loose view of the validated node for the template switch.
  /**
   * @description Loose view of the current node for the template switch
   * @returns {Record<string, any>} The node as a plain record.
   */
  n(): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return this.node() as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  /**
   * @description Read the object children of a container node
   * @param {GenuiNode} node The container.
   * @returns {GenuiNode[]} Child nodes (empty for non-containers).
   */
  children(node: GenuiNode): GenuiNode[] {
    const items = (node as unknown as { items?: unknown }).items;
    return Array.isArray(items)
      ? (items.filter((item) => item !== null && typeof item === "object" && "type" in item) as GenuiNode[])
      : [];
  }

  /**
   * @description Read list entries without narrowing their shapes
   * @param {GenuiNode} node The list node.
   * @returns {Array<string|Object>} Entries.
   */
  listItems(node: GenuiNode): (string | { title: string; desc?: string } | GenuiNode)[] {
    return ((node as unknown as { items?: unknown }).items ?? []) as (string | { title: string; desc?: string } | GenuiNode)[];
  }

  /**
   * @description Render a list entry as display text
   * @param {string|Object} item The entry.
   * @returns {string} Display text (empty for node entries).
   */
  listText(item: string | { title: string; desc?: string } | GenuiNode): string {
    if (typeof item === "string") return item;
    if ("type" in item) return "";
    return `${item.title}${item.desc === undefined ? "" : ` — ${item.desc}`}`;
  }

  /**
   * @description Narrow a list entry to a renderable node
   * @param {string|Object} item The entry.
   * @returns {boolean} `true` when the entry is a node.
   */
  isNodeItem(item: string | { title: string; desc?: string } | GenuiNode): item is GenuiNode {
    return typeof item === "object" && item !== null && "type" in item;
  }

  /**
   * @description Whether the node should render given current conditions
   * @param {GenuiNode} node The node.
   * @returns {boolean} Visibility result.
   */
  visible(node: GenuiNode): boolean {
    return isNodeVisible(node, this.state().conditions());
  }

  /**
   * @description Whether the node should accept interaction
   * @param {GenuiNode} node The node.
   * @returns {boolean} Enablement result.
   */
  enabled(node: GenuiNode): boolean {
    return isNodeEnabled(node, this.state().conditions());
  }

  /**
   * @description Whether the node is visible but gated by `enableWhen`
   * @param {GenuiNode} node The node.
   * @returns {boolean} `true` when disabled due to a condition.
   */
  gated(node: GenuiNode): boolean {
    return node.enableWhen !== undefined && !this.enabled(node);
  }

  /**
   * @description Whether the current depth is within the render limit
   * @returns {boolean} `true` while depth is allowed.
   */
  withinDepth(): boolean {
    return this.depth() <= GENUI_LIMITS.maxDepth;
  }

  /**
   * @description Fire a model-defined action through block state
   * @param {string|undefined} action The action name.
   * @param {Record<string, unknown>} payload Collected values.
   * @returns {void}
   */
  fire(action: string | undefined, payload: Record<string, unknown>): void {
    this.state().fire(action, payload);
  }

  /**
   * @description Read a field value, defaulting to an empty string
   * @param {string|undefined} id Field id.
   * @returns {string} The value or `""`.
   */
  fieldValue(id: string | undefined): string {
    return id === undefined ? "" : (this.state().fields()[id] ?? "");
  }

  /**
   * @description Read a field as a finite number
   * @param {string|undefined} id Field id.
   * @param {number} [fallback=0] Value to use when absent or non-numeric.
   * @returns {number} The numeric value or the fallback.
   */
  numericValue(id: string | undefined, fallback = 0): number {
    if (id === undefined) return fallback;
    const raw = this.state().fields()[id];
    const parsed = raw === undefined || raw === "" ? Number.NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * @description Handle a text/textarea input change
   * @param {Event} event The DOM change event.
   * @param {string|undefined} id Field id to store under.
   * @param {string} [action] Action to fire on change.
   * @returns {void}
   */
  onText(event: Event, id: string | undefined, action?: string): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (id !== undefined) this.state().setField(id, value);
    if (action !== undefined) this.fire(action, { id, value });
  }

  /**
   * @description Handle a numeric input change
   * @param {Event} event The DOM change event.
   * @param {string|undefined} id Field id to store under.
   * @param {string} [action] Action to fire on change.
   * @returns {void}
   */
  onNumber(event: Event, id: string | undefined, action?: string): void {
    const value = (event.target as HTMLInputElement).value;
    if (id !== undefined) this.state().setField(id, value);
    if (action !== undefined) this.fire(action, { id, value: Number(value) });
  }

  /**
   * @description Handle a select change
   * @param {Event} event The DOM change event.
   * @param {string|undefined} id Field id to store under.
   * @param {string} [action] Action to fire on change.
   * @returns {void}
   */
  onSelect(event: Event, id: string | undefined, action?: string): void {
    const value = (event.target as HTMLSelectElement).value;
    if (id !== undefined) this.state().setField(id, value);
    if (action !== undefined) this.fire(action, { id, value });
  }

  /**
   * @description Handle a segmented-control selection
   * @param {string|undefined} id Field id to store under.
   * @param {string} option The chosen option.
   * @param {string} [action] Action to fire on change.
   * @returns {void}
   */
  onSegmented(id: string | undefined, option: string, action?: string): void {
    if (id !== undefined) this.state().setField(id, option);
    if (action !== undefined) this.fire(action, { id, value: option });
  }

  /**
   * @description Handle a checkbox/switch toggle
   * @summary Grouped toggles update the multi-answer store; ungrouped toggles
   * fire their action directly.
   * @param {Event} event The DOM change event.
   * @param {string} label The option label.
   * @param {string} [action] Action to fire.
   * @param {string} [group] Multi-answer group id.
   * @returns {void}
   */
  onToggle(event: Event, label: string, action?: string, group?: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (group !== undefined) {
      this.state().toggleMulti(group, label, checked);
      return;
    }
    if (action !== undefined) this.fire(action, { label, checked });
  }

  /**
   * @description Toggle a choices-node selection, honoring mode and max
   * @param {string} label The option label.
   * @param {boolean} [disabled] Whether the option is disabled.
   * @param {number} [max] Maximum selections in multi mode.
   * @returns {void}
   */
  toggleChoice(label: string, disabled?: boolean, max?: number): void {
    if (disabled === true) return;
    this.selectedChoices.update((current) => {
      if (current.includes(label)) return current.filter((entry) => entry !== label);
      if (max !== undefined && current.length >= max) return current;
      const mode = (this.node() as unknown as { mode?: string }).mode ?? "single";
      return mode === "multi" ? [...current, label] : [label];
    });
  }

  /**
   * @description Whether a choices option is currently selected
   * @param {string} label The option label.
   * @returns {boolean} Selection state.
   */
  isChosen(label: string): boolean {
    return this.selectedChoices().includes(label);
  }

  /**
   * @description Submit the current choices-node selection as an action
   * @returns {void}
   */
  submittedChoices(): void {
    const node = this.node() as unknown as {
      action?: string;
      prompt?: string;
      title?: string;
      mode?: string;
      group?: string;
    };
    const selected = this.selectedChoices();
    if (node.group !== undefined) {
      for (const label of selected) this.state().setAnswer(node.group, label);
    }
    this.fire(node.action, {
      question: node.prompt ?? node.title ?? "",
      selected,
      mode: node.mode ?? "single",
    });
  }

  /**
   * @description Read a single-answer value for a group
   * @param {string|undefined} group Answer group id.
   * @param {string} fallback Value to use when the group has no answer.
   * @returns {string} The answer or the fallback.
   */
  answerValue(group: string | undefined, fallback: string): string {
    return group === undefined ? fallback : (this.state().answers()[group] ?? fallback);
  }

  /**
   * @description Select a radio option
   * @param {string|undefined} group Answer group id.
   * @param {string} label The selected label.
   * @param {number} index The option index.
   * @param {string} [action] Action to fire.
   * @returns {void}
   */
  selectRadio(group: string | undefined, label: string, index: number, action?: string): void {
    if (group !== undefined) this.state().setAnswer(group, label);
    else this.tabIndex.set(index);
    if (action !== undefined) this.fire(action, { label, index });
  }

  // Radio nodes without a `group` keep a local selection.
  /** @description Local radio selection for ungrouped radio nodes. */
  readonly localRadio = signal<string | null>(null);
  /**
   * @description Whether a local radio option is selected
   * @param {string} label The option label.
   * @param {number} index The option index.
   * @returns {boolean} Selection state.
   */
  isLocalRadio(label: string, index: number): boolean {
    return this.localRadio() === label || (this.localRadio() === null && index === this.defaultSelected());
  }
  /**
   * @description Select an ungrouped radio option locally and fire its action
   * @param {string} label The selected label.
   * @param {number} index The option index.
   * @param {string} [action] Action to fire.
   * @returns {void}
   */
  chooseLocal(label: string, index: number, action?: string): void {
    this.localRadio.set(label);
    if (action !== undefined) this.fire(action, { label, index });
  }
  /**
   * @description Index of the node's declared default selection
   * @returns {number} Default index, or `-1` when unset.
   */
  defaultSelected(): number {
    const node = this.node() as unknown as { selected?: number };
    return typeof node.selected === "number" ? node.selected : -1;
  }

  /**
   * @description Toggle an inline detail panel by row/index
   * @param {number} index Panel index.
   * @returns {void}
   */
  togglePanel(index: number): void {
    this.openPanels.update((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /**
   * @description Whether an inline detail panel is open
   * @param {number} index Panel index.
   * @returns {boolean} Open state.
   */
  isPanelOpen(index: number): boolean {
    return this.openPanels().has(index);
  }

  /**
   * @description Select a tab by index
   * @param {number} index Tab index.
   * @returns {void}
   */
  selectTab(index: number): void {
    this.tabIndex.set(index);
  }

  /**
   * @description Validate and return a media URL
   * @param {string|undefined} src The candidate source.
   * @returns {string|null} The accepted source, or `null`.
   */
  safeUrl(src: string | undefined): string | null {
    return safeMediaSrc(src);
  }

  /**
   * @description Validate and return a hyperlink
   * @param {string|undefined} value The candidate href.
   * @returns {string|null} The accepted href, or `null`.
   */
  href(value: string | undefined): string | null {
    return safeHref(value);
  }

  /**
   * @description Handle a link click without navigating directly
   * @summary Unsafe destinations are blocked; safe destinations are reported
   * through {@link GenuiBlockState.fireFileLink} so the host owns navigation.
   * @param {Event} event The click event.
   * @param {string|undefined} value The candidate href.
   * @returns {void}
   */
  onLink(event: Event, value: string | undefined): void {
    const href = safeHref(value);
    if (href === null) {
      event.preventDefault();
      return;
    }
    this.state().fireFileLink(href);
  }

  /**
   * @description Derive up to two uppercase initials from a name
   * @param {string} name The display name.
   * @returns {string} The initials.
   */
  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter((part) => part !== "")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  /**
   * @description Map a small icon-name vocabulary to a text glyph
   * @param {string} name The icon name.
   * @returns {string} The glyph to render.
   */
  iconText(name: string): string {
    switch (name.toLowerCase()) {
      case "check":
        return "✓";
      case "x":
      case "close":
        return "✕";
      case "heart":
        return "♥";
      case "star":
        return "★";
      default:
        return "◆";
    }
  }

  /**
   * @description Build SVG polyline points for a sparkline
   * @param {number[]|undefined} values Sparkline values.
   * @returns {string} Space-separated points, or `""` when unusable.
   */
  sparkPoints(values: number[] | undefined): string {
    if (!Array.isArray(values) || values.length < 2) return "";
    const finite = values.filter((value) => Number.isFinite(value));
    if (finite.length < 2) return "";
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const span = max - min || 1;
    return finite
      .map((value, index) => `${(index / (finite.length - 1)) * 96},${22 - ((value - min) / span) * 20}`)
      .join(" ");
  }

  /**
   * @description Build a filled sparkline area path
   * @param {number[]|undefined} values Sparkline values.
   * @returns {string} SVG path data, or `""` when unusable.
   */
  sparkArea(values: number[] | undefined): string {
    const points = this.sparkPoints(values);
    if (points === "") return "";
    return `M 0,24 L ${points.split(" ").join(" L ")} L 96,24 Z`;
  }

  /**
   * @description Resolve a chart node's data, including computed refs
   * @param {GenuiNode} node The chart node.
   * @returns {Array<Object>} Chart data.
   */
  chartData(node: GenuiNode): { label: string; value: number; color?: string }[] {
    const chart = node as unknown as { data?: GenuiChartDatum[] };
    return (chart.data ?? []).map((datum) => ({
      label: datum.label,
      value:
        datum.value === null
          ? 0
          : typeof datum.value === "object"
            ? (this.state().resolveComputedRef(datum.value) ?? 0)
            : Number(datum.value),
      ...(datum.color === undefined ? {} : { color: datum.color }),
    }));
  }

  /**
   * @description Largest non-negative chart value, at least 1
   * @param {GenuiNode} node The chart node.
   * @returns {number} The scale maximum.
   */
  chartMax(node: GenuiNode): number {
    const values = this.chartData(node).map((datum) => Math.max(0, datum.value));
    return Math.max(1, ...values);
  }

  /**
   * @description Percentage width of a bar relative to the chart maximum
   * @param {GenuiNode} node The chart node.
   * @param {number} value The bar value.
   * @returns {number} Width percentage clamped to 0–100.
   */
  barWidth(node: GenuiNode, value: number): number {
    return Math.max(0, Math.min(100, (value / this.chartMax(node)) * 100));
  }

  /**
   * @description Build a conic-gradient string for a donut chart
   * @param {GenuiNode} node The chart node.
   * @returns {string} A CSS gradient, or `conic-gradient()` when empty.
   */
  donutGradient(node: GenuiNode): string {
    const data = this.chartData(node);
    const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0) || 1;
    let cursor = 0;
    const stops: string[] = [];
    const palette = ["#3b5bdb", "#22a06b", "#e8590c", "#9c36b5", "#1f9ed4", "#c2255c"];
    data.forEach((datum, index) => {
      const start = cursor;
      cursor += (Math.max(0, datum.value) / total) * 100;
      const color = datum.color ?? palette[index % palette.length]!;
      stops.push(`${color} ${start}% ${cursor}%`);
    });
    return `conic-gradient(${stops.join(", ")})`;
  }

  /**
   * @description Build an SVG line path for a line chart
   * @param {GenuiNode} node The chart node.
   * @returns {string} SVG path data, or `""` when there is no data.
   */
  linePath(node: GenuiNode): string {
    const data = this.chartData(node);
    if (data.length === 0) return "";
    const max = this.chartMax(node);
    const width = 100;
    const height = 40;
    return data
      .map((datum, index) => {
        const x = data.length === 1 ? 0 : (index / (data.length - 1)) * width;
        const y = height - (Math.max(0, datum.value) / max) * (height - 4) - 2;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }

  /**
   * @description Read table body rows, capped by the renderer limit
   * @param {GenuiNode} node The table node.
   * @returns {unknown[][]} Rows.
   */
  tableRows(node: GenuiNode): unknown[][] {
    const table = node as unknown as { rows?: unknown[][] };
    return (table.rows ?? []).slice(0, GENUI_LIMITS.maxTableRows);
  }

  /**
   * @description Compute CSS classes for a typed table cell
   * @param {TableCellType|undefined} type Declared column type.
   * @param {unknown} cell The cell value.
   * @returns {Record<string, boolean>} Class map.
   */
  tableCellClass(type: TableCellType | undefined, cell: unknown): Record<string, boolean> {
    const numeric = this.state().numericCell(cell);
    return {
      "genui-table__cell--num": type === "num" || type === "delta" || (type === undefined && numeric !== undefined),
      "genui-table__cell--delta": type === "delta",
      "genui-table__cell--badge": type === "badge",
      "genui-table__cell--negative": type === "delta" && numeric !== undefined && numeric < 0,
    };
  }

  /**
   * @description Render a table cell to display text
   * @param {unknown} cell The cell value.
   * @returns {string} Display text.
   */
  cellText(cell: unknown): string {
    return this.state().resolveCell(cell);
  }

  /**
   * @description Bar-fill percentage for a table cell
   * @param {unknown} cell The cell value.
   * @returns {number} Percentage clamped to 0–100.
   */
  cellBar(cell: unknown): number {
    const value = this.state().numericCell(cell);
    return Math.max(0, Math.min(100, value ?? 0));
  }

  /**
   * @description Build sparkline points from a comma-separated cell value
   * @param {unknown} cell The cell value.
   * @returns {string} SVG points, or `""`.
   */
  cellSpark(cell: unknown): string {
    const text = this.cellText(cell);
    const values = text.split(",").map((entry) => Number(entry.trim())).filter((entry) => Number.isFinite(entry));
    return this.sparkPoints(values);
  }

  /**
   * @description Sum a numeric table column, rounded to two decimals
   * @param {GenuiNode} node The table node.
   * @param {number} column Column index.
   * @returns {string} The total as a string.
   */
  tableTotal(node: GenuiNode, column: number): string {
    const rows = this.tableRows(node);
    const sum = rows.reduce((total, row) => {
      const value = this.state().numericCell(row[column]);
      return total + (value ?? 0);
    }, 0);
    return String(Math.round(sum * 100) / 100);
  }

  /**
   * @description Copy text to the clipboard and briefly mark it copied
   * @param {string} text The text to copy.
   * @param {string} key Identifier stored in the `copied` signal.
   * @returns {Promise<void>} Resolves after the copy attempt.
   */
  async copy(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(key);
      setTimeout(() => this.copied.set(null), 1500);
    } catch {
      this.copied.set(null);
    }
  }

  /**
   * @description Serialize a table node as Markdown
   * @param {GenuiNode} node The table node.
   * @returns {string} Markdown table.
   */
  tableMarkdown(node: GenuiNode): string {
    const table = node as unknown as { columns?: string[] };
    const columns = table.columns ?? [];
    const rows = this.tableRows(node).map((row) => columns.map((_, index) => this.cellText(row[index])).join(" | "));
    return [`| ${columns.join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row} |`)].join("\n");
  }

  /**
   * @description Serialize a table node as CSV
   * @param {GenuiNode} node The table node.
   * @returns {string} CSV text with quoted cells.
   */
  tableCsv(node: GenuiNode): string {
    return this.tableRows(node)
      .map((row) => row.map((cell) => `"${this.cellText(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }

  /**
   * @description Record a quiz answer and fire its action
   * @summary Ignored once the quiz is graded. The emitted payload includes
   * whether the chosen option is the correct one.
   * @param {GenuiQuizOption} option The chosen option.
   * @param {number} index The option index.
   * @returns {void}
   */
  answerOption(option: GenuiQuizOption, index: number): void {
    if (this.grade() !== null) return;
    this.quizChoice.set(index);
    const node = this.node() as unknown as { action?: string; question?: string };
    this.fire(node.action, {
      type: "quiz",
      question: node.question ?? "",
      answer: option.label,
      correct: option.correct === true,
    });
  }

  /**
   * @description Grade the selected quiz option locally
   * @summary Does nothing until an option is chosen; sets `grade` with the
   * per-option result, score, and total.
   * @returns {void}
   */
  gradeQuiz(): void {
    const node = this.node() as unknown as { options?: GenuiQuizOption[] };
    const options = node.options ?? [];
    const choice = this.quizChoice();
    if (choice === null) return;
    const results = options.map((option, index) => option.correct === true && index === choice);
    const score = results.filter(Boolean).length;
    this.grade.set({ correct: score === 1, score, total: options.length, results });
  }

  /**
   * @description Count answered fields/groups for a submit node
   * @summary With `groups`, counts only those groups; otherwise counts every
   * non-empty field and recorded answer.
   * @param {GenuiNode} node The submit (or container) node.
   * @returns {number} Number of answered items.
   */
  answeredCount(node: GenuiNode): number {
    const submit = node as unknown as { groups?: string[] };
    const groups = submit.groups;
    if (groups === undefined) {
      const state = this.state();
      return (
        Object.values(state.fields()).filter((value) => value.trim() !== "").length +
        Object.keys(state.answers()).length +
        Object.values(state.multiAnswers()).filter((value) => value.length > 0).length
      );
    }
    const state = this.state();
    return groups.filter((group) => {
      if (Object.hasOwn(state.answers(), group)) return true;
      if (Object.hasOwn(state.multiAnswers(), group)) return (state.multiAnswers()[group] ?? []).length > 0;
      return (state.fields()[group] ?? "").trim() !== "";
    }).length;
  }

  /**
   * @description Whether a submit node may be submitted
   * @summary Requires every declared group to be answered, or at least one
   * answer when no groups are declared.
   * @param {GenuiNode} node The submit node.
   * @returns {boolean} Submittable state.
   */
  canSubmit(node: GenuiNode): boolean {
    const submit = node as unknown as { groups?: string[] };
    if (submit.groups !== undefined) return this.answeredCount(node) >= submit.groups.length;
    return this.answeredCount(node) > 0;
  }

  /**
   * @description Submit the form, excluding hidden/secret values, and lock it
   * @summary Captures non-empty, non-secret fields plus answers and
   * multi-answers. A paper made only of gradable radio groups is submitted
   * without field values, mirroring upstream behavior.
   * @param {GenuiNode} node The submit node.
   * @returns {void}
   */
  submit(node: GenuiNode): void {
    if (!this.canSubmit(node)) return;
    const submitNode = node as unknown as { action?: string; groups?: string[] };
    const state = this.state();
    const secret = state.secretIds();
    const fields = Object.fromEntries(
      Object.entries(state.fields()).filter(([id, value]) => !secret.has(id) && value.trim() !== ""),
    );
    const answers = state.answers();
    const multiAnswers = state.multiAnswers();
    // Pure radio papers grade locally, mirroring the upstream behaviour.
    const radioGroups = new Set<string>();
    const walk = (nodes: GenuiNode[]): void => {
      for (const entry of nodes) {
        const anyNode = entry as unknown as { type?: string; group?: string; answer?: unknown; explanation?: string };
        if (anyNode.type === "radio" && anyNode.group !== undefined && anyNode.answer !== undefined) {
          radioGroups.add(anyNode.group);
        }
        walk(this.children(entry));
      }
    };
    walk(state.spec().items);
    const scoped = submitNode.groups ?? [...radioGroups];
    const gradeable = scoped.length > 0 && scoped.every((group) => radioGroups.has(group));
    if (gradeable) {
      state.locked.set(true);
      this.fire(submitNode.action, { answers, fields, total: scoped.length, answered: scoped.length });
      return;
    }
    state.locked.set(true);
    this.fire(submitNode.action, {
      answers,
      multiAnswers,
      fields,
      total: submitNode.groups?.length ?? this.answeredCount(node),
      answered: this.answeredCount(node),
    });
  }

  /**
   * @description Reset a graded paper and clear interaction state
   * @param {GenuiNode} node The submit node carrying `resetAction`.
   * @returns {void}
   */
  resetPaper(node: GenuiNode): void {
    const submit = node as unknown as { resetAction?: string };
    this.grade.set(null);
    this.quizChoice.set(null);
    this.state().reset();
    this.fire(submit.resetAction, { reset: true });
  }

  /**
   * @description Map a step index to its visual state
   * @param {number} index The step index.
   * @param {number|undefined} current The current step index.
   * @returns {"done"|"current"|"todo"} Step state.
   */
  stepState(index: number, current: number | undefined): "done" | "current" | "todo" {
    if (current === undefined) return "todo";
    if (index < current) return "done";
    if (index === current) return "current";
    return "todo";
  }

  /**
   * @description Pretty-print a value as JSON, falling back to `String`
   * @param {unknown} value The value.
   * @returns {string} The serialized value.
   */
  stringify(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }

  /**
   * @description Read the root children of a file tree
   * @param {GenuiNode} node The file-tree node.
   * @returns {Array<Object>} Nodes.
   */
  fileTreeChildren(node: GenuiNode): { name: string; type?: string; children?: unknown[] }[] {
    return ((node as unknown as { items?: unknown[] }).items ?? []) as {
      name: string;
      type?: string;
      children?: unknown[];
    }[];
  }

  /**
   * @description Read the display text of a blocks-matrix cell
   * @param {unknown} cell The cell.
   * @returns {string} The text.
   */
  blockCellText(cell: unknown): string {
    if (cell === null) return "";
    if (typeof cell === "string") return cell;
    return String((cell as { text?: unknown }).text ?? "");
  }

  /**
   * @description Read the subtext of a blocks-matrix cell
   * @param {unknown} cell The cell.
   * @returns {string} The subtext, or `""`.
   */
  blockCellSub(cell: unknown): string {
    return cell !== null && typeof cell === "object" ? String((cell as { sub?: unknown }).sub ?? "") : "";
  }

  /**
   * @description Read the tone of a blocks-matrix cell
   * @param {unknown} cell The cell.
   * @returns {string|null} The tone, or `null`.
   */
  blockCellTone(cell: unknown): string | null {
    return cell !== null && typeof cell === "object"
      ? ((cell as { tone?: string }).tone ?? null)
      : null;
  }

  /**
   * @description Read the color of a blocks-matrix cell
   * @param {unknown} cell The cell.
   * @returns {string|null} The color, or `null`.
   */
  blockCellColor(cell: unknown): string | null {
    return cell !== null && typeof cell === "object"
      ? ((cell as { color?: string }).color ?? null)
      : null;
  }

  /**
   * @description Read the rows of a blocks-matrix node
   * @param {GenuiNode} node The blocks node.
   * @returns {Array<Object>} Rows.
   */
  blockRows(node: GenuiNode): { label?: string; cells: unknown[]; color?: string; variant?: string }[] {
    return ((node as unknown as { rows?: unknown[] }).rows ?? []) as {
      label?: string;
      cells: unknown[];
      color?: string;
      variant?: string;
    }[];
  }
}
