/**
 * @module module:pages/dashboard-builder/dashboard-builder.page
 * @description Editable dashboard demo page.
 * @summary Distinct `dashboard-builder` route demonstrating the
 * `ngx-decaf-dashboard` component end to end: create, read, update and delete
 * flows with an in-browser (localStorage) persistence adapter (Decision 6).
 * Does not displace the existing static `app-dashboard` demo (AC-8).
 */

import { Component, OnInit, inject } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { DecafTranslatePipe } from 'src/lib/pipes';
import { DashComponentCatalogService, DashboardComponent } from 'src/lib/components';
import type { DashDocument } from 'src/lib/components';
import { NgxPageDirective } from 'src/lib/engine';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { DemoListComponent, DemoNoteComponent, DemoStatsComponent } from './demo/demo-components';

const STORAGE_KEY = 'dashboard-builder:composition';

/**
 * @description Demo page for the editable dashboard builder.
 * @class DashboardBuilderPage
 * @extends {NgxPageDirective}
 * @memberOf module:pages/dashboard-builder/dashboard-builder.page
 */
@Component({
  selector: 'app-dashboard-builder',
  templateUrl: './dashboard-builder.page.html',
  styleUrls: ['./dashboard-builder.page.scss'],
  standalone: true,
  imports: [
    HeaderComponent,
    IonContent,
    IonButton,
    DecafTranslatePipe,
    DashboardComponent,
    // Statically imported so the `@dashcomponent()` + `@Dynamic()` decorators
    // register the palette at build time (AC-10).
    DemoStatsComponent,
    DemoListComponent,
    DemoNoteComponent,
  ],
})
export class DashboardBuilderPage extends NgxPageDirective implements OnInit {
  mode: CrudOperations = OperationKeys.CREATE;
  document: DashDocument | null = null;
  saved: DashDocument | null = null;

  private readonly catalog = inject(DashComponentCatalogService);

  constructor() {
    super('DashboardBuilderPage');
    // Statically register the demo palette components (AC-10). The
    // `@dashcomponent()` decorator supplies the metadata; this guarantees the
    // catalog instance the dashboard injects sees them.
    this.catalog.register(DemoStatsComponent);
    this.catalog.register(DemoListComponent);
    this.catalog.register(DemoNoteComponent);
  }

  async ngOnInit(): Promise<void> {
    this.document = this.load();
    await super.initialize();
  }

  /**
   * @description Loads the persisted composition from localStorage.
   * @memberOf DashboardBuilderPage
   */
  private load(): DashDocument | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DashDocument) : null;
    } catch {
      return null;
    }
  }

  /**
   * @description Persists the composition to localStorage (Decision 6).
   * @memberOf DashboardBuilderPage
   */
  private persist(): void {
    if (this.document) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.document));
  }

  /**
   * @description Sets the current operation, clearing/refreshing state.
   * @memberOf DashboardBuilderPage
   */
  setOperation(operation: string): void {
    this.mode = operation as CrudOperations;
    if (operation === OperationKeys.READ || operation === OperationKeys.UPDATE || operation === OperationKeys.DELETE) {
      this.document = this.load() ?? this.makeEmpty();
    }
  }

  private makeEmpty(): DashDocument {
    return { name: `Dashboard${Date.now()}`, cols: 4, rows: 4, placements: [] };
  }

  /**
   * @description Handles a dashboard save (create/update).
   * @memberOf DashboardBuilderPage
   */
  onSave($event: DashDocument): void {
    this.document = $event;
    this.saved = $event;
    this.persist();
    this.mode = OperationKeys.READ;
  }

  /**
   * @description Resets the composition back to empty (create).
   * @memberOf DashboardBuilderPage
   */
  newDashboard(): void {
    this.document = this.makeEmpty();
    this.mode = OperationKeys.CREATE;
  }

  /**
   * @description Deletes the saved composition.
   * @memberOf DashboardBuilderPage
   */
  onDelete(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.document = null;
    this.saved = null;
    this.mode = OperationKeys.CREATE;
  }
}
