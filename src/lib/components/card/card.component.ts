/**
 * @module lib.components.card
 * @description Reusable Card UI component module.
 * @summary
 * Exports the `CardComponent`, a standalone Angular component built on Ionic's `IonCard` primitives.
 * The component exposes inputs to control visual style, content and layout and integrates with
 * the application's media service to react to dark-mode changes. See {@link CardComponent}.
 */
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Color } from '@ionic/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle , IonCardSubtitle } from '@ionic/angular/standalone';
import { Dynamic } from '../../engine/decorators';
import { NgxComponentDirective, } from '../../engine/NgxComponentDirective';
import { SafeHtml } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { AngularEngineKeys } from '../../engine/constants';

/**
 * @description Reusable, presentational card UI component for use across the application.
 * @summary
 * CardComponent is a standalone Angular component built on Ionic's `IonCard` primitives.
 * It exposes several `@Input()` properties to control appearance and content:
 * `type`, `title`, `body`, `subtitle`, `color`, `separator`, `borders`, `inlineContent`, and `inlineContentPosition`.
 * The component integrates with the application's media service to react to dark-mode changes
 * and toggles the dark-palette CSS class on the host element accordingly.
 *
 * @param {('clear'|'shadow')} type - Visual rendering style for the card; 'clear' (default) or 'shadow'.
 * @param {string} title - Primary title text displayed in the card header.
 * @param {('small'|'default'|'blank')} body - Body size preset controlling padding/typography; defaults to 'default'.
 * @param {string} subtitle - Optional subtitle rendered under the title.
 * @param {import('@ionic/core').Color} color - Ionic color token applied to the card header/title.
 * @param {boolean} separator - When true, renders a divider between header and body.
 * @param {boolean} borders - Controls whether borders are rendered; defaults to true.
 * @param {string|import('@angular/platform-browser').SafeHtml} inlineContent - Inline HTML/SafeHtml to render inside the body.
 * @param {('top'|'bottom')} inlineContentPosition - Where to render `inlineContent` relative to the body; defaults to 'bottom'.
 * @return {void}
 * @class CardComponent
 * @example
 * <ngx-decaf-card
 *   [type]="'shadow'"
 *   [title]="'Account overview'"
 *   [subtitle]="'Summary for the current user'"
 *   [color]="'primary'"
 *   [separator]="true"
 *   [borders]="true"
 *   [inlineContent]="safeHtmlValue"
 *   inlineContentPosition="top"
 * >
 *   <!-- card content here -->
 * </ngx-decaf-card>
 *
 * @mermaid
 * sequenceDiagram
 *   participant App as Consumer
 *   participant Card as CardComponent
 *   participant Media as MediaService
 *   App->>Card: instantiate
 *   Card->>Media: isDarkMode()
 *   Media-->>Card: Observable<boolean> (isDark)
 *   Card->>Card: toggleClass(..., isDark)
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [TranslatePipe, IonCard, IonCardHeader, IonCardContent, IonCardTitle, IonCardSubtitle],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
})
export class CardComponent extends NgxComponentDirective implements OnInit {

  /**
   * @description Visual rendering style for the card.
   * @summary Controls the card's surface treatment. Use 'clear' for a flat look or 'shadow' to add elevation.
   * @type {'clear'|'shadow'}
   * @default 'clear'
   */
  @Input()
  type: 'clear' | 'shadow' = 'clear';

  /**
   * @description Primary title text for the card header.
   * @summary Rendered prominently at the top of the card; consumers should pass a short, human-friendly string.
   * @type {string}
   * @default ''
   */
  @Input()
  title: string = '';

  /**
   * @description Body size preset for the card.
   * @summary Adjusts padding and typographic scale inside the card body. 'small' reduces spacing, 'blank' hides the body area.
   * @type {'small'|'default'|'blank'}
   * @default 'default'
   */
  @Input()
  body: 'small'| 'default' | 'blank' = 'default';

  /**
   * @description Optional subtitle shown below the title in the header area.
   * @summary Use for short secondary text such as an explanation or contextual note.
   * @type {string}
   * @default ''
   */
  @Input()
  subtitle: string = '';

  /**
   * @description Ionic color token applied to the card.
   * @summary When provided, the color token (for example 'primary' or 'tertiary') is applied to title/header elements where supported.
   * @type {import('@ionic/core').Color}
   * @default ''
   */
  @Input()
  color: Color = '';

  /**
   * @description Toggle to render a visual separator between header and content.
   * @summary When true, a divider line (or equivalent styling) is rendered to separate the header from the body.
   * @type {boolean}
   * @default false
   */
  @Input()
  separator: boolean = false;

  /**
   * @description Controls whether the card renders borders.
   * @summary Set to false to remove borders for inline or transparent card designs. Marked `override` to explicitly shadow the base directive's value.
   * @type {boolean}
   * @default true
   */
  @Input()
  override borders: boolean = true;

  /**
   * @description Inline HTML or SafeHtml content to render inside the card body.
   * @summary Useful for short snippets of rich content provided by the consumer. When passing raw HTML prefer `SafeHtml` to avoid sanitization issues.
   * @type {string|import('@angular/platform-browser').SafeHtml}
   */
  @Input()
  inlineContent?: string | SafeHtml;

  /**
   * @description Position where `inlineContent` is rendered within the body.
   * @summary Pass 'top' to render inline content above the body or 'bottom' to render it below. Defaults to 'bottom'.
   * @type {'top'|'bottom'}
   */
  @Input()
  inlineContentPosition: 'top' | 'bottom'  = 'bottom';

  /**
   * @description Internal component identifier used by the base `NgxComponentDirective`.
   * @summary Read-only-ish string identifying the concrete component class for instrumentation, styling helpers and debug logs.
   * @type {string}
   */
  protected override componentName: string  = 'CardComponent';

 /**
  * @description Angular lifecycle hook: component initialization.
  * @summary
  * ngOnInit sets the component as initialized and subscribes to the application's media service
  * dark-mode observable. On each emission it updates the local isDarkMode flag and calls the
  * media service helper to toggle the dark-palette CSS class on the component host element.
  * The subscription uses the provided mediaService observable and performs side effects only.
  *
  * @return {void}
  */
  ngOnInit(): void {
    console.log(this.componentName, this.borders);
    this.mediaService.isDarkMode().subscribe(isDark => {
      this.isDarkMode = isDark;
      this.mediaService.toggleClass(
        [this.component],
        AngularEngineKeys.DARK_PALETTE_CLASS,
        this.isDarkMode
      );
    });
    this.initialize();
  }
}
