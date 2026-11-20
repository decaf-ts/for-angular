import { Component, effect, inject, input, output } from "@angular/core";
import { GenuiActionService } from "../../genui-action.service";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { loadBlockState, saveBlockState } from "../../interaction-store";
import {
  EMPTY_GENUI_CONTEXT,
  GenuiBlockState,
  collectSecretIds,
  type GenuiActionRequest,
  type GenuiOpenLinkEvent,
  type GenuiRenderContext,
} from "../../render-context";
import type { GenuiSpec } from "../../types";
import { GenuiActionProvenanceComponent } from "../genui-action-provenance/genui-action-provenance.component";
import { GenuiNodeComponent } from "../genui-node/genui-node.component";

/**
 * @description Renders one GenUI spec and owns its interaction state
 * @summary Wraps a {@link GenuiNodeComponent} tree with a
 * {@link GenuiBlockState}, restores/persists state through
 * {@link loadBlockState}/{@link saveBlockState}, collects password field ids via
 * {@link collectSecretIds}, and forwards actions to both the host `action`
 * output and {@link GenuiActionService}. A change of session/block/spec identity
 * rehydrates state for the new key.
 * @class GenuiBlockComponent
 * @example
 * ```html
 * <ngx-decaf-genui-block [spec]="spec" [context]="context" (action)="onAction($event)" />
 * ```
 */
@Component({
  selector: "ngx-decaf-genui-block",
  templateUrl: "./genui-block.component.html",
  styleUrls: ["./genui-block.component.scss"],
  imports: [GenuiNodeComponent, GenuiActionProvenanceComponent],
  standalone: true,
})
export class GenuiBlockComponent {
  private readonly actions = inject(GenuiActionService);
  private readonly i18n = inject(GenuiI18nService);

  /** @description Spec to render. */
  readonly spec = input.required<GenuiSpec>();
  /** @description Identity used for state scoping and action provenance. */
  readonly context = input<GenuiRenderContext>(EMPTY_GENUI_CONTEXT);
  /** @description Optional external key hint for persisted state. */
  readonly stateKey = input<string | null>(null);
  /** @description Persist interaction state to `localStorage` (default `true`). */
  readonly persist = input<boolean>(true);

  /** @description Emitted for every action the block fires. */
  readonly action = output<GenuiActionRequest>();
  /** @description Emitted for every validated link the block opens. */
  readonly openLink = output<GenuiOpenLinkEvent>();

  /** @description Reactive interaction state backing the rendered tree. */
  readonly state = new GenuiBlockState();
  /** @description Localizer bound with the component's i18n service. */
  readonly t = (key: Parameters<GenuiI18nService["t"]>[0]) => this.i18n.t(key);

  private configuredKey: string | null = null;

  constructor() {
    effect(() => {
      const spec = this.spec();
      const context = this.context();
      const secret = collectSecretIds(spec);
      this.state.configure(spec, context, secret);
      const key = `${context.sessionId}:${context.blockId}:${context.specId}`;
      if (this.configuredKey !== key) {
        this.configuredKey = key;
        const persisted = this.persist() ? loadBlockState(context, secret) : null;
        if (persisted !== null) this.state.hydrate(persisted);
      }
      this.state.onAction = (name, payload) => this.dispatch(name, payload);
      this.state.onOpenLink = (href) => this.openLink.emit({ href, blockId: context.blockId, specId: context.specId });
    });

    effect(() => {
      if (!this.persist()) return;
      const snapshot = this.state.snapshot();
      const context = this.state.context();
      const secret = this.state.secretIds();
      if (context.sessionId === "" && context.blockId === EMPTY_GENUI_CONTEXT.blockId) return;
      saveBlockState(context, snapshot, secret);
    });
  }

  private dispatch(name: string, payload: Record<string, unknown>): void {
    const context = this.state.context();
    const request: GenuiActionRequest = {
      name,
      payload,
      blockId: context.blockId,
      specId: context.specId,
    };
    this.action.emit(request);
    void this.actions.relay({ ...request, sessionId: context.sessionId }, this.state.secretIds());
  }
}
