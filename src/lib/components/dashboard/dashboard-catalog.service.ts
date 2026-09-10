/**
 * @module module:lib/components/dashboard/dashboard-catalog.service
 * @description Palette catalog service for dashboard-selectable components.
 * @summary Consumes the flavor-neutral `@dashcomponent()` registry in
 * `@decaf-ts/ui-decorators` and exposes a resolved palette plus a tag
 * whitelist used to validate untrusted persisted compositions (AC-12).
 */

import { Injectable } from '@angular/core';
import { dashComponents, dashComponentDefinitionOf } from '@decaf-ts/ui-decorators';
import type { DashPaletteEntry } from './dashboard.types';
import type { Constructor } from '@decaf-ts/decoration';

/**
 * @description Resolves the dashboard palette from the `@dashcomponent()` registry.
 * @summary Any constructor registered by `@dashcomponent()` is statically
 * importable (AC-10) and becomes a palette entry. The palette is bounded by
 * that registry, so undecorated components never appear (AC-2).
 * @class DashComponentCatalogService
 * @memberOf module:lib/components/dashboard/dashboard-catalog.service
 */
@Injectable({ providedIn: 'root' })
export class DashComponentCatalogService {
  /** Locally registered palette entries, keyed by component tag. */
  private readonly local = new Map<string, DashPaletteEntry>();

  /**
   * @description Registers a `@dashcomponent()`-decorated constructor with this
   * catalog instance.
   * @summary The decorator self-registers into ui-decorators' module-level
   * registry, but that registry is not reliably shared across a bundled app's
   * entrypoints (the metadata itself is shared globally via reflect-metadata).
   * This explicit registration keeps the palette bounded by the
   * `@dashcomponent()` decorator (AC-10) while guaranteeing this catalog (the
   * one the dashboard injects) sees every statically imported component.
   * @param ctor the `@dashcomponent()`-decorated constructor.
   * @memberOf DashComponentCatalogService
   */
  register(ctor: Constructor): void {
    const def = dashComponentDefinitionOf(ctor);
    this.local.set(def.tag, { ...def, ctor });
  }

  /**
   * @description Returns the resolved palette entries.
   * @summary Merges the locally registered entries with the ui-decorators
   * registry so late registration is picked up deterministically.
   * @returns the resolved palette entries.
   * @memberOf DashComponentCatalogService
   */
  palette(): DashPaletteEntry[] {
    const fromDecorator = dashComponents().map((ctor) => ({
      ...dashComponentDefinitionOf(ctor),
      ctor,
    }));
    const merged = new Map<string, DashPaletteEntry>();
    for (const entry of fromDecorator) merged.set(entry.tag, entry);
    for (const [tag, entry] of this.local) merged.set(tag, entry);
    return [...merged.values()];
  }

  /**
   * @description Validates a component tag against the palette registry.
   * @summary The tag whitelist for untrusted persisted compositions (AC-12):
   * unknown tags are rejected and never resolved to a component.
   * @param tag the tag to validate.
   * @returns true when the tag belongs to a registered palette component.
   * @memberOf DashComponentCatalogService
   */
  isRegistered(tag: string): boolean {
    return this.palette().some((entry) => entry.tag === tag);
  }

  /**
   * @description Resolves a single palette entry by tag.
   * @summary Returns the normalized definition (with constructor) or undefined
   * when the tag is not registered.
   * @param tag the component tag to resolve.
   * @returns the palette entry, or undefined.
   * @memberOf DashComponentCatalogService
   */
  resolve(tag: string): DashPaletteEntry | undefined {
    return this.palette().find((entry) => entry.tag === tag);
  }
}
