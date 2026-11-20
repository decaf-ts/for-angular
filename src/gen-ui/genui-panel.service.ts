import { Injectable, computed, signal } from "@angular/core";
import { mergePanelSpecs } from "./panel";
import type { GenuiSpec } from "./types";

/**
 * @description Holds the session panel spec published by inline fences
 * @summary A fence with `panel: true` routes its spec here instead of rendering
 * inline. The service keeps one spec per session, merging `append` updates
 * through {@link mergePanelSpecs}. Exposed as signals so the panel dock stays
 * reactive.
 * @class GenuiPanelService
 * @example
 * ```typescript
 * const panels = inject(GenuiPanelService);
 * panels.publish("session-1", { items: [], title: "Details" });
 * console.log(panels.forSession("session-1")?.title); // "Details"
 * ```
 */
@Injectable({ providedIn: "root" })
export class GenuiPanelService {
  private readonly panels = signal<Readonly<Record<string, GenuiSpec>>>({});

  readonly all = computed(() => this.panels());

  /**
   * @description Read the published spec for a session
   * @param {string} sessionId The session to look up.
   * @returns {GenuiSpec|null} The published spec, or `null` when none exists.
   */
  forSession(sessionId: string): GenuiSpec | null {
    return this.panels()[sessionId] ?? null;
  }

  /**
   * @description Publish a spec for a session, merging when requested
   * @summary When `next.append` is `true`, the spec is merged into the existing
   * one; otherwise it replaces it.
   * @param {string} sessionId The session to publish to.
   * @param {GenuiSpec} next The incoming spec.
   * @returns {void}
   */
  publish(sessionId: string, next: GenuiSpec): void {
    this.panels.update((current) => {
      const previous = current[sessionId] ?? null;
      const merged = next.append === true ? mergePanelSpecs(previous, next) : next;
      return { ...current, [sessionId]: merged };
    });
  }

  /**
   * @description Clear the published spec for a session
   * @param {string} sessionId The session to clear.
   * @returns {void}
   */
  clear(sessionId: string): void {
    this.panels.update((current) => {
      if (!Object.hasOwn(current, sessionId)) return current;
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
  }
}
