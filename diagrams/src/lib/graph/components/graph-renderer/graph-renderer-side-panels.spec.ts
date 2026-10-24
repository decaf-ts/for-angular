/**
 * @module for-angular/graph/components/graph-renderer/graph-renderer-side-panels.spec
 * @summary SAA-1362 reqs 8-9 — floating collapsible side panels, typed inputs
 * derived from the calculated workflow model, and drag/place onto the canvas.
 * @description Exercises the real renderer template (the `ng-diagram` canvas
 * stays un-mounted because a document store owns the canvas, so the panel and
 * form markup renders for real) against a real {@link GraphWorkflowDocumentStore}:
 *
 * - both side panels toggle their collapsed state and the canvas fit padding
 *   follows the open/collapsed widths plus the console height;
 * - the run form merges control types/validators from the decorated workflow
 *   model (`count` renders `input[type=number]`, `text` renders a textarea) and
 *   `workflowInputPayload()` submits `count` as a number;
 * - required model validators still surface in the panel;
 * - dragging a field header (or clicking its `+`) dispatches the canonical
 *   `boundary.moves` command and persists `ui.boundaryPositions`; a port that
 *   is absent from the document is never mutated.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Model, model, required } from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { graph, input } from '@decaf-ts/as-graph/shared';
import type { GraphWorkflowDocument, GraphWorkflowPortInstance } from '@decaf-ts/as-graph/shared';

import { GraphRendererComponent } from './graph-renderer.component';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import { GraphWorkflowValidateClient } from '../../validation';
import { GRAPH_DEV_MODE } from '../../tokens/graph-configuration.tokens';
import { graphRunLog } from '../../execution/GraphRunLogStore';
import type { WorkflowInputFieldDefinition } from '../../workflow-inputs';

/**
 * Minimal decorated workflow root sharing the demo's `count`/`text` contract:
 * a numeric `count` input and a multi-line `text` input, both required.
 */
@graph('saa-1367-test-workflow', {
  kind: 'workflow',
  nodes: [],
  relations: [],
  metadata: { title: 'Test workflow' },
})
@model()
class TestWorkflow extends Model {
  @required()
  @uielement('input', { label: 'Count', placeholder: 'Number of items' })
  @input({ handle: 'count' })
  count!: number;

  @required()
  @uielement('textarea', { label: 'Text', placeholder: 'Text to split' })
  @input({ handle: 'text' })
  text!: string;
}

const DEFAULT_INPUTS: GraphWorkflowPortInstance[] = [
  { id: 'count', label: 'Count', schema: { type: 'model', name: 'Number' }, defaultValue: 1 },
  { id: 'text', label: 'Text', schema: { type: 'model', name: 'String' }, defaultValue: 'a\nb' },
];

/** Builds a minimal canonical document owning the given input ports. */
function documentWith(inputs: GraphWorkflowPortInstance[]): GraphWorkflowDocument {
  return {
    id: 'saa-1367-doc',
    name: 'SAA-1367 document',
    inputs,
    outputs: [],
    nodes: [],
    edges: [],
  };
}

interface Rendered {
  fixture: ComponentFixture<GraphRendererComponent>;
  component: GraphRendererComponent;
  store: GraphWorkflowDocumentStore;
}

/** Renders the real component template against a real document store. */
function render(inputs: GraphWorkflowPortInstance[] = DEFAULT_INPUTS): Rendered {
  const store = new GraphWorkflowDocumentStore();
  store.initialize(documentWith(inputs));

  TestBed.configureTestingModule({
    providers: [
      { provide: GraphWorkflowDocumentStore, useValue: store },
      { provide: GraphWorkflowValidateClient, useValue: null },
      { provide: GRAPH_DEV_MODE, useValue: false },
    ],
  });

  const fixture = TestBed.createComponent(GraphRendererComponent);
  fixture.componentRef.setInput('graphRoot', TestWorkflow);
  (fixture.componentInstance as unknown as { catalogService: unknown }).catalogService = null;
  fixture.detectChanges();

  return { fixture, component: fixture.componentInstance, store };
}

/** The editable field card whose label matches `label`. */
function fieldCard(host: HTMLElement, label: string): HTMLElement {
  const cards = Array.from(host.querySelectorAll('.graph-renderer__field')) as HTMLElement[];
  const card = cards.find(
    (candidate) =>
      candidate.querySelector('.graph-renderer__field-label')?.textContent?.trim() === label
  );
  if (!card) throw new Error(`workflow input field '${label}' was not rendered`);
  return card;
}

/** A DataTransfer stand-in jsdom does not provide. */
interface TransferStub {
  effectAllowed: string;
  dropEffect: string;
  readonly types: string[];
  setData(type: string, value: string): void;
  getData(type: string): string;
}

/** In-memory DataTransfer used by the drag/drop event dispatch. */
function transferStub(): TransferStub {
  const values = new Map<string, string>();
  return {
    effectAllowed: 'uninitialized',
    dropEffect: 'none',
    get types() {
      return Array.from(values.keys());
    },
    setData(type: string, value: string) {
      values.set(type, value);
    },
    getData(type: string) {
      return values.get(type) ?? '';
    },
  };
}

/** Dispatches an event carrying a DataTransfer payload. */
function dispatchWithTransfer(
  target: EventTarget,
  type: 'dragstart' | 'drop',
  transfer: TransferStub,
  init: MouseEventInit = {}
): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  target.dispatchEvent(event);
}

/** Minimal field definition for the "absent port" negative path. */
function syntheticField(path: string): WorkflowInputFieldDefinition {
  return {
    property: path,
    path,
    controlName: path,
    label: path,
    controlType: 'text',
    value: undefined,
    validators: [],
    required: false,
  };
}

describe('GraphRendererComponent — floating panels and typed inputs (SAA-1362 reqs 8-9)', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    graphRunLog.reset();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    graphRunLog.reset();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
    TestBed.resetTestingModule();
  });

  describe('side panel collapse and canvas fit padding', () => {
    it('toggles both panels and derives diagramConfig padding from widths and console state', () => {
      const { fixture, component } = render();

      expect(component.inputsPanelCollapsed()).toBe(false);
      expect(component.outputsPanelCollapsed()).toBe(false);
      expect(component.diagramConfig().zoom.zoomToFit.padding).toEqual([24, 304, 88, 304]);

      const inputsToggle = fixture.nativeElement.querySelector(
        '.graph-renderer__side--inputs .graph-renderer__side-toggle'
      ) as HTMLButtonElement;
      inputsToggle.click();
      fixture.detectChanges();

      expect(component.inputsPanelCollapsed()).toBe(true);
      expect(
        fixture.nativeElement
          .querySelector('.graph-renderer__side--inputs')
          .classList.contains('graph-renderer__side--collapsed')
      ).toBe(true);
      expect(component.diagramConfig().zoom.zoomToFit.padding).toEqual([24, 304, 88, 72]);

      const outputsToggle = fixture.nativeElement.querySelector(
        '.graph-renderer__side--outputs .graph-renderer__side-toggle'
      ) as HTMLButtonElement;
      outputsToggle.click();
      fixture.detectChanges();

      expect(component.outputsPanelCollapsed()).toBe(true);
      expect(component.diagramConfig().zoom.zoomToFit.padding).toEqual([24, 72, 88, 72]);

      graphRunLog.setOpen(true);
      fixture.detectChanges();
      expect(component.diagramConfig().zoom.zoomToFit.padding).toEqual([24, 72, 404, 72]);

      graphRunLog.setCollapsed(true);
      fixture.detectChanges();
      expect(component.diagramConfig().zoom.zoomToFit.padding).toEqual([24, 72, 88, 72]);
    });

    it('uses the measured open panel widths in the fit padding', () => {
      const { component } = render();
      component.inputsPanelWidth.set(320);
      component.outputsPanelWidth.set(300);

      expect(component.diagramConfig().zoom.zoomToFit.padding).toEqual([24, 324, 88, 344]);
    });

    it('falls back to the uniform stacked padding below the side-panel breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 });
      const { component } = render();

      expect(component.diagramConfig().zoom.zoomToFit.padding).toEqual([24, 24, 24, 24]);
    });
  });

  describe('typed inputs merged from the calculated workflow model', () => {
    it('renders count as input[type=number] and text as a textarea', () => {
      const { fixture, component } = render();

      const count = fixture.nativeElement.querySelector('#graph-input-count') as HTMLElement;
      const text = fixture.nativeElement.querySelector('#graph-input-text') as HTMLElement;

      expect(count.tagName).toBe('INPUT');
      expect(count.getAttribute('type')).toBe('number');
      expect(text.tagName).toBe('TEXTAREA');

      const fields = component.workflowInputFields();
      expect(fields.find((field) => field.path === 'count')?.controlType).toBe('number');
      expect(fields.find((field) => field.path === 'count')?.valueType).toBe('number');
      expect(fields.find((field) => field.path === 'text')?.controlType).toBe('textarea');
    });

    it('surfaces the model required validator in the field panel', () => {
      const { fixture, component } = render();
      const control = component.workflowInputForm().get('count');
      expect(control).not.toBeNull();

      control?.setValue('');
      control?.markAsDirty();
      fixture.detectChanges();

      const errors = Array.from(
        fixture.nativeElement.querySelectorAll('.graph-renderer__errors li')
      ).map((element) => (element as HTMLElement).textContent?.trim() ?? '');

      expect(errors).toContain('Count is required');
      const payload = component.workflowInputPayload();
      expect(payload.valid).toBe(false);
      expect(payload.errors.map((error) => error.path)).toContain('count');
    });

    it('submits count as a number through workflowInputPayload()', () => {
      const { component } = render();
      component.workflowInputForm().get('count')?.setValue('7');

      const payload = component.workflowInputPayload();

      expect(payload.valid).toBe(true);
      expect(payload.inputs['count']).toBe(7);
      expect(payload.inputs['text']).toBe('a\nb');
    });
  });

  describe('drag and place onto the canvas', () => {
    it('dispatches boundary.moves for input-<portId> on a header drag and persists ui.boundaryPositions', () => {
      const { fixture, component, store } = render();
      const dragSpy = jest.spyOn(store, 'dispatchCommand');
      const card = fieldCard(fixture.nativeElement, 'Count');
      const transfer = transferStub();

      dispatchWithTransfer(
        card.querySelector('.graph-renderer__field-head') as HTMLElement,
        'dragstart',
        transfer
      );
      fixture.detectChanges();
      expect(component.draggingInputPath()).toBe('count');

      dispatchWithTransfer(
        fixture.nativeElement.querySelector('.graph-renderer__canvas') as HTMLElement,
        'drop',
        transfer,
        { clientX: 400, clientY: 300 }
      );
      fixture.detectChanges();

      expect(dragSpy).toHaveBeenCalledWith({
        type: 'boundary.moves',
        moves: [{ nodeId: 'input-count', position: { x: 400, y: 300 } }],
      });
      expect(store.document()?.ui?.['boundaryPositions']).toEqual({
        'input-count': { x: 400, y: 300 },
      });
      expect(component.draggingInputPath()).toBeNull();
    });

    it('places the field from its + button through the same boundary.moves command', () => {
      const { fixture, component, store } = render();
      const dragSpy = jest.spyOn(store, 'dispatchCommand');
      const card = fieldCard(fixture.nativeElement, 'Count');

      (card.querySelector('.graph-renderer__field-place') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(dragSpy).toHaveBeenCalledWith({
        type: 'boundary.moves',
        moves: [{ nodeId: 'input-count', position: { x: 120, y: 160 } }],
      });
      expect(
        (store.document()?.ui?.['boundaryPositions'] as Record<string, unknown>)?.['input-count']
      ).toBeDefined();
      expect(component.draggingInputPath()).toBeNull();
    });

    it('does not mutate the document when the dropped port is absent', () => {
      const { fixture, component, store } = render([
        { id: 'text', label: 'Text', schema: { type: 'model', name: 'String' } },
      ]);
      const dragSpy = jest.spyOn(store, 'dispatchCommand');
      const before = store.version();

      component.addInputToCanvas(syntheticField('count'));
      fixture.detectChanges();

      expect(dragSpy).not.toHaveBeenCalled();
      expect(store.version()).toBe(before);
      expect(store.document()?.ui?.['boundaryPositions']).toBeUndefined();
    });
  });
});
