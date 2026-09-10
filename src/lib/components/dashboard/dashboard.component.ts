/**
 * @module module:lib/components/dashboard/dashboard.component
 * @description Editable dynamic dashboard component.
 * @summary `DashboardComponent` (selector `ngx-decaf-dashboard`) is a
 * `@Dynamic()`-decorated, `NgxFormDirective`-backed CRUD component that lets a
 * builder compose a runtime dashboard: pick components from a palette bounded
 * by the `@dashcomponent()` registry, position/resize them on a grid with
 * reject-overlap snap, configure each placed component, and persist the
 * composition. Read mode renders the saved composition through the standard
 * rendering engine with no editing affordances; per-component delete routes
 * through a confirmation screen.
 */

import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NgZone } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { IonButton } from '@ionic/angular/standalone';
import { Dynamic } from '../../engine/decorators';
import { DecafTranslatePipe } from '../../pipes';
import { NgxFormDirective } from '../../engine/NgxFormDirective';
import { IconComponent } from '../icon/icon.component';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';
import { DashComponentCatalogService } from './dashboard-catalog.service';
import type { DashPaletteEntry, DashPlacement, DashDocument, DragState, ResizeState, GridRange } from './dashboard.types';
import {
  buildDashboardModel,
  canPlace,
  serializeDocument,
  snapDrag,
  snapResize,
} from './dashboard.utils';

/**
 * @description The editable dashboard component.
 * @summary Extends {@link NgxFormDirective} to inherit operation semantics,
 * submit-event machinery and the CRUD model binding. It manages a list of
 * placed components, exposes the palette, and drives the drag/resize/snap
 * interaction overlay while in create/update mode.
 * @class DashboardComponent
 * @extends {NgxFormDirective}
 * @memberOf module:lib/components/dashboard/dashboard.component
 */
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [DecafTranslatePipe, IonButton, IconComponent, ModelRendererComponent],
  host: { '[attr.id]': 'uid' },
})
export class DashboardComponent extends NgxFormDirective implements OnInit {
  /** Grid column count. */
  @Input() override cols: number = 4;

  /** Grid row count. */
  @Input() override rows: number = 4;

  /** Optional preloaded/saved composition (AC-9 restore). */
  @Input() document?: DashDocument;

  /** Emits the serialized composition on save (create/update). */
  @Output() save: EventEmitter<DashDocument> = new EventEmitter<DashDocument>();

  /** Emits when the whole dashboard is deleted (operation=delete). */
  @Output() deleted: EventEmitter<void> = new EventEmitter<void>();

  /** Reference to the placement canvas for pointer→grid conversion. */
  @ViewChild('canvas', { static: false, read: ElementRef }) canvasEl?: ElementRef<HTMLElement>;

  /** Palette entries resolved from the `@dashcomponent()` registry. */
  palette: DashPaletteEntry[] = [];

  /** Placed components on the grid. */
  items: DashPlacement[] = [];

  /** Active drag gesture state. */
  dragging: DragState | null = null;

  /** Active resize gesture state. */
  resizing: ResizeState | null = null;

  /** Dotted drop preview while the mouse is held (AC-5). */
  dropPreview: GridRange | null = null;

  /** Marks the preview as invalid (collision) so it renders rejected. */
  previewInvalid: boolean = false;

  /** Placement awaiting delete confirmation. */
  pendingDelete: DashPlacement | null = null;

  /** Renderable read-mode model (read operation). */
  readModel: Model | null = null;

  private rafPending = false;

  constructor(
    private readonly catalog: DashComponentCatalogService,
    private readonly zone: NgZone
  ) {
    super('DashboardComponent');
  }

  async ngOnInit(): Promise<void> {
    this.palette = this.catalog.palette();
    if (this.document?.placements?.length) {
      this.restoreDocument(this.document);
    }
    this.afterItemsChanged();
    await super.initialize();
  }

  /**
   * @description True when the dashboard is being composed (create/update).
   * @summary Editing affordances (palette, drag, resize, delete) are exposed
   * only in create/update mode (AC-6).
   * @returns true when editing.
   * @memberOf DashboardComponent
   */
  get isEditing(): boolean {
    return this.operation === OperationKeys.CREATE || this.operation === OperationKeys.UPDATE;
  }

  /**
   * @description True in read mode.
   * @summary Read renders the saved composition with no editing affordances.
   * @returns true when reading.
   * @memberOf DashboardComponent
   */
  get isRead(): boolean {
    return this.operation === OperationKeys.READ;
  }

  get isDelete(): boolean {
    return this.operation === OperationKeys.DELETE;
  }

  /**
   * @description Adds a palette component to the grid at the first free cell.
   * @summary Finds the top-left cell that accepts the component's default
   * footprint; no-op when the grid is full (reject-overlap).
   * @param entry the palette entry to place.
   * @memberOf DashboardComponent
   */
  addFromPalette(entry: DashPaletteEntry): void {
    const footprint = entry.defaultSize || { cols: 1, rows: 1 };
    for (let row = 1; row <= this.rows; row++) {
      for (let col = 1; col <= this.cols; col++) {
        const candidate: DashPlacement = {
          id: `dash_${Date.now().toString(36)}_${this.items.length}`,
          tag: entry.tag,
          labelKey: entry.label,
          col,
          row,
          cols: footprint.cols,
          rows: footprint.rows,
          config: {},
        };
        if (canPlace(candidate, col, row, this.items, this.cols, this.rows)) {
          this.items = [...this.items, candidate];
          this.afterItemsChanged();
          return;
        }
      }
    }
  }

  /**
   * @description Restores a saved composition into editable items (AC-9).
   * @summary Validates each placement tag against the palette whitelist and
   * drops unknown tags (AC-12). Reads are never trusted at face value.
   * @param document the persisted composition.
   * @memberOf DashboardComponent
   */
  restoreDocument(document: DashDocument): void {
    this.cols = document.cols || this.cols;
    this.rows = document.rows || this.rows;
    this.items = document.placements
      .filter((p) => this.catalog.isRegistered(p.tag))
      .map((p) => ({ ...p, config: { ...p.config } }));
  }

  /**
   * @description Recomputes the read-mode renderable model.
   * @memberOf DashboardComponent
   */
  private afterItemsChanged(): void {
    if (this.isRead || this.isDelete) {
      this.readModel = buildDashboardModel(
        `Dashboard${this.uid || Date.now()}`,
        this.cols,
        this.rows,
        this.items
      );
    } else {
      this.readModel = null;
    }
  }

  /**
   * @description Serializes the composition and emits the save event.
   * @memberOf DashboardComponent
   */
  handleSave(): void {
    const doc = serializeDocument(`Dashboard${this.uid || Date.now()}`, this.cols, this.rows, this.items);
    this.save.emit(doc);
    this.submitEventEmit(doc, 'DashboardComponent');
  }

  /**
   * @description Converts a client pointer position to fractional grid units.
   * @memberOf DashboardComponent
   */
  private pointerToGrid(clientX: number, clientY: number): { col: number; row: number } {
    const el = this.canvasEl?.nativeElement;
    if (!el) return { col: 1, row: 1 };
    const rect = el.getBoundingClientRect();
    const col = ((clientX - rect.left) / rect.width) * this.cols + 1;
    const row = ((clientY - rect.top) / rect.height) * this.rows + 1;
    return { col, row };
  }

  /**
   * @description Begins a drag gesture for a placement.
   * @memberOf DashboardComponent
   */
  onDragStart(placement: DashPlacement, event: PointerEvent): void {
    if (!this.isEditing) return;
    event.preventDefault();
    const { col, row } = this.pointerToGrid(event.clientX, event.clientY);
    this.dragging = { placementId: placement.id, pointerCol: col, pointerRow: row, target: null };
    this.scheduleDrag(col, row);
    this.zone.runOutsideAngular(() => undefined);
  }

  /**
   * @description Updates the drag preview on pointer move (rAF-throttled, zone-free).
   * @memberOf DashboardComponent
   */
  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging && !this.resizing) return;
    const { col, row } = this.pointerToGrid(event.clientX, event.clientY);
    if (this.dragging) this.scheduleDrag(col, row);
    else this.scheduleResize(col, row);
  }

  /**
   * @description Ends a drag/resize gesture and commits the snapped position.
   * @memberOf DashboardComponent
   */
  @HostListener('document:pointerup')
  onPointerUp(): void {
    if (this.dragging) {
      const { placementId, target } = this.dragging;
      if (target) {
        this.applyPlacement(placementId, target);
      }
      this.dragging = null;
    }
    if (this.resizing) {
      const { placementId, target } = this.resizing;
      if (target) {
        this.applyPlacement(placementId, target);
      }
      this.resizing = null;
    }
    this.dropPreview = null;
    this.previewInvalid = false;
  }

  /**
   * @description Begins a border-resize gesture for a placement.
   * @memberOf DashboardComponent
   */
  onResizeStart(placement: DashPlacement, event: PointerEvent): void {
    if (!this.isEditing) return;
    event.preventDefault();
    event.stopPropagation();
    const { col, row } = this.pointerToGrid(event.clientX, event.clientY);
    this.resizing = { placementId: placement.id, pointerCol: col, pointerRow: row, target: null };
    this.scheduleResize(col, row);
  }

  /**
   * @description rAF-throttles the drag preview update.
   * @memberOf DashboardComponent
   */
  private scheduleDrag(col: number, row: number): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      if (!this.dragging) return;
      const placement = this.findPlacement(this.dragging.placementId);
      if (!placement) return;
      const target = snapDrag(placement, col, row, this.items, this.cols, this.rows);
      this.dragging = { ...this.dragging, pointerCol: col, pointerRow: row, target };
      this.dropPreview = target;
      this.previewInvalid = !target;
    });
  }

  /**
   * @description rAF-throttles the resize preview update.
   * @memberOf DashboardComponent
   */
  private scheduleResize(col: number, row: number): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      if (!this.resizing) return;
      const placement = this.findPlacement(this.resizing.placementId);
      if (!placement) return;
      const target = snapResize(placement, col, row, this.items, this.cols, this.rows);
      this.resizing = { ...this.resizing, pointerCol: col, pointerRow: row, target };
      this.dropPreview = target;
      this.previewInvalid = !target;
    });
  }

  /**
   * @description Commits a snapped range onto a placement.
   * @memberOf DashboardComponent
   */
  private applyPlacement(placementId: string, target: GridRange): void {
    this.items = this.items.map((item) =>
      item.id === placementId ? { ...item, col: target.col, row: target.row, cols: target.cols, rows: target.rows } : item
    );
  }

  /**
   * @description Finds a placement by id.
   * @memberOf DashboardComponent
   */
  findPlacement(placementId: string): DashPlacement | undefined {
    return this.items.find((item) => item.id === placementId);
  }

  /**
   * @description Requests deletion of a placed component (top-right x).
   * @memberOf DashboardComponent
   */
  requestDelete(placement: DashPlacement): void {
    if (!this.isEditing) return;
    this.pendingDelete = placement;
  }

  /**
   * @description Confirms placement deletion.
   * @memberOf DashboardComponent
   */
  confirmDelete(): void {
    if (this.pendingDelete) {
      this.items = this.items.filter((item) => item.id !== this.pendingDelete!.id);
    }
    this.pendingDelete = null;
    this.afterItemsChanged();
  }

  /**
   * @description Cancels placement deletion.
   * @memberOf DashboardComponent
   */
  cancelDelete(): void {
    this.pendingDelete = null;
  }

  /**
   * @description Deletes the whole dashboard (operation=delete confirmation path).
   * @memberOf DashboardComponent
   */
  handleDelete(): void {
    this.deleted.emit();
    this.submitEventEmit(this.model, 'DashboardComponent', undefined, this.handlers, OperationKeys.DELETE);
  }
}
