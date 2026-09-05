/**
 * @module for-angular/graph/parameters/GraphParameterFormControls.spec
 * @summary DECAF-50 §4.12 follow-up (SAA-596): schema-driven parameter
 * control coverage — dynamic options, resource locator, credential picker,
 * and the registered-UI fallback.
 * @description Fixture-driven unit spec exercising the schema-driven
 * parameter rendering path through {@link GraphParameterFormBuilder} and the
 * renderer registry:
 *
 * - **Dynamic options**: the `graph-options-parameter` control resolving
 *   options through a catalogue-backed `loadOptions` context callback
 *   (stubbed `GraphNodeCatalogApi`-shaped `invokeMethod` source), including
 *   loading states, entry coercion, and selected-value wiring.
 * - **Resource locator**: the `graph-resource-locator-parameter` control —
 *   mode listing, mode/value record binding, and locator record emission.
 * - **Credential picker**: the credential control handling
 *   `{credentialId, credentialType}` references only — including a
 *   property-access probe asserting no secret material is ever read.
 * - **Registered-UI fallback**: unregistered parameter types resolve to the
 *   registered generic fallback renderer (P4 phase-gate criterion).
 */
import { TestBed } from '@angular/core/testing';
import type {
  GraphCredentialReference,
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
  GraphParameterOption,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphParameterValueIssue } from './GraphParameterRendererContract';
import type { GraphParameterFormContext } from './GraphParameterRendererContract';
import { GraphParameterFormBuilder } from './GraphParameterFormBuilder';
import {
  GraphParameterRendererRegistry,
  graphRegisterParameterRenderers,
} from './GraphParameterRendererRegistry';
import { graphParameterValidationIssuesOf } from './GraphParameterValidationMapper';
import { GraphGenericParameterComponent } from './components/graph-generic-parameter.component';
import { GraphOptionsParameterComponent } from './components/graph-options-parameter.component';
import { GraphResourceLocatorParameterComponent } from './components/graph-resource-locator-parameter.component';
import { GraphCredentialParameterComponent } from './components/graph-credential-parameter.component';

const NODE_ID = 'node-1';
const NODE_KIND = 'test/http-request';

/** Manifest fixture covering every parameter shape under test. */
function manifestFixture(): GraphNodeManifest {
  return {
    kind: NODE_KIND,
    label: 'HTTP Request',
    parameters: [
      {
        id: 'method',
        type: 'options',
        label: 'HTTP Method',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
        ],
      },
      {
        id: 'workspace',
        type: 'options',
        label: 'Workspace',
        loadOptionsMethod: 'listWorkspaces',
      } as GraphParameterDefinition,
      {
        id: 'resource',
        type: 'resourceLocator',
        label: 'Target Resource',
        modes: ['list', 'dynamic'],
      } as GraphParameterDefinition,
      {
        id: 'auth',
        type: 'credential',
        label: 'Credentials',
        credentialType: 'http-basic',
      } as GraphParameterDefinition,
      {
        id: 'token',
        type: 'hidden',
        label: 'Internal Token',
      } as GraphParameterDefinition,
    ],
  } as unknown as GraphNodeManifest;
}

/** Node instance fixture with pre-set parameter values. */
function nodeFixture(parameters: Record<string, GraphJsonValue | undefined>): GraphNodeInstance {
  return {
    id: NODE_ID,
    kind: NODE_KIND,
    parameters,
  } as unknown as GraphNodeInstance;
}

/**
 * Stub catalogue source shaped like `GraphNodeCatalogApi`: `loadOptions` in
 * the form context is expected to be backed by the node catalogue's
 * `invokeMethod` surface (`POST graph/node-types/:kind/methods/:method`).
 */
class StubCatalogueSource {
  readonly invokeMethod = jest.fn<
    Promise<GraphJsonValue>,
    [string, string, Record<string, GraphJsonValue>]
  >((_kind, method, _request) =>
    Promise.reject(new Error(`No stub registered for method '${method}'`))
  );

  /** Builds the catalogue-backed `loadOptions` context callback. */
  loadOptions(
    parameter: GraphParameterDefinition,
    request: Record<string, GraphJsonValue>
  ): Promise<GraphJsonValue> {
    const method = String(request['method'] ?? '');
    return this.invokeMethod(NODE_KIND, method, { parameterId: parameter.id, ...request });
  }
}

/** Builds a form context bound to the stub catalogue source. */
function contextFixture(
  node: GraphNodeInstance,
  manifest: GraphNodeManifest,
  values: Record<string, GraphJsonValue | undefined>,
  catalogue: StubCatalogueSource,
  credentialOptions?: GraphCredentialReference[]
): GraphParameterFormContext {
  return {
    node,
    manifest,
    values,
    loadOptions: (parameter, request) => catalogue.loadOptions(parameter, request),
    ...(credentialOptions ? { credentialOptions } : {}),
  };
}

/** A DOM-flavoured change event, exactly as the Ionic controls receive them. */
function changeEvent(value: unknown): Event {
  return { target: { value } } as unknown as Event;
}

beforeEach(() => {
  TestBed.configureTestingModule({});
});

describe('GraphParameterFormBuilder (schema-driven form state)', () => {
  it('discovers dynamic-option parameters and preserves hidden values verbatim', () => {
    const builder = TestBed.inject(GraphParameterFormBuilder);
    const manifest = manifestFixture();
    const node = nodeFixture({ token: 'secret-internal-token', method: 'POST' });

    const state = builder.buildForm(node, manifest);

    expect(state.dynamicOptionsParameters).toEqual(['workspace']);
    expect(state.values['token']).toBe('secret-internal-token');
    expect(state.values['method']).toBe('POST');
    expect(state.renderedParameters.map((parameter) => parameter.id)).toEqual([
      'method',
      'workspace',
      'resource',
      'auth',
    ]);
    expect(state.renderedParameters).not.toContain(
      expect.objectContaining({ id: 'token' }) as unknown as GraphParameterDefinition
    );
  });

  it('applies manifest defaultValues for unset parameters', () => {
    const builder = TestBed.inject(GraphParameterFormBuilder);
    const manifest = {
      kind: NODE_KIND,
      parameters: [
        { id: 'region', type: 'string', defaultValue: 'eu-west-1' },
      ],
    } as unknown as GraphNodeManifest;

    const state = builder.buildForm(nodeFixture({}), manifest);

    expect(state.values['region']).toBe('eu-west-1');
  });
});

describe('GraphParameterRendererRegistry (registered-UI fallback)', () => {
  it('resolves every registered parameter type to its dedicated component', () => {
    const registry = graphRegisterParameterRenderers(new GraphParameterRendererRegistry());

    expect(registry.resolve({ id: 'p', type: 'options' } as GraphParameterDefinition)).toBe(
      GraphOptionsParameterComponent
    );
    expect(
      registry.resolve({ id: 'p', type: 'resourceLocator' } as unknown as GraphParameterDefinition)
    ).toBe(GraphResourceLocatorParameterComponent);
    expect(
      registry.resolve({ id: 'p', type: 'credential' } as unknown as GraphParameterDefinition)
    ).toBe(GraphCredentialParameterComponent);
    expect(registry.has('options')).toBe(true);
  });

  it('falls back to the generic renderer for unregistered control types', () => {
    const registry = graphRegisterParameterRenderers(new GraphParameterRendererRegistry());
    const unregistered = {
      id: 'p',
      type: 'vendor-custom-control',
    } as unknown as GraphParameterDefinition;

    expect(registry.has('vendor-custom-control')).toBe(false);
    expect(registry.resolve(unregistered)).toBe(GraphGenericParameterComponent);
  });

  // NOTE: mounting renderers through `GraphParameterFieldComponent` is not
  // covered here: the field host crashes on first change detection (its
  // static `@ViewChild('anchor')` cannot resolve the anchor inside the
  // `@if` block at hook time). Reported as a functional finding on SAA-596;
  // the fallback contract is asserted at the registry level above.
});

describe('GraphOptionsParameterComponent (dynamic options)', () => {
  const parameter = {
    id: 'workspace',
    type: 'options',
    label: 'Workspace',
    loadOptionsMethod: 'listWorkspaces',
    placeholder: 'Select a workspace',
  } as GraphParameterDefinition;

  function mount(
    value?: GraphJsonValue,
    context?: GraphParameterFormContext
  ) {
    const fixture = TestBed.createComponent(GraphOptionsParameterComponent);
    const component = fixture.componentInstance;
    component.parameter = parameter;
    component.value = value;
    component.context = context;
    // Direct property assignment does not fire `ngOnChanges` (no host
    // bindings in the TestBed harness), so drive the dynamic-load trigger
    // exactly as the change-detection cycle would.
    component.ngOnChanges({ context: true });
    return { fixture, component };
  }

  it('stays in the loading fallback until the catalogue resolves options', async () => {
    const catalogue = new StubCatalogueSource();
    let resolveLoad: (value: GraphJsonValue) => void = () => undefined;
    catalogue.invokeMethod.mockImplementation((_kind: string, method: string) => {
      expect(method).toBe('listWorkspaces');
      return new Promise<GraphJsonValue>((resolve) => {
        resolveLoad = resolve;
      });
    });
    const manifest = manifestFixture();
    const node = nodeFixture({});
    const context = contextFixture(node, manifest, {}, catalogue);

    const { fixture, component } = mount(undefined, context);
    fixture.detectChanges();

    // Loading state: no resolved options yet, so the control renders the
    // text-input fallback instead of the select.
    expect(component.isStaticOrResolved()).toBe(false);
    expect(component.options).toEqual([]);

    resolveLoad([
      { label: 'Acme', value: 'acme' },
      'plain-primitive',
      { invalid: 'entry' },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    // The load went through the catalogue-shaped invokeMethod surface with
    // the manifest method name and the node id.
    expect(catalogue.invokeMethod).toHaveBeenCalledWith(
      NODE_KIND,
      'listWorkspaces',
      expect.objectContaining({ method: 'listWorkspaces', nodeId: NODE_ID })
    );
    expect(component.isStaticOrResolved()).toBe(true);
    // Catalogue entries are coerced to option records; invalid entries are dropped.
    expect(component.options).toEqual([
      { label: 'Acme', value: 'acme' },
      { label: 'plain-primitive', value: 'plain-primitive' },
    ]);
  });

  // NOTE: a failed catalogue load is intentionally not covered by a passing
  // test: the component fires `void this.loadDynamicOptions()` without any
  // rejection handler, so a failing catalogue-backed `loadOptions` escapes
  // as an unhandled promise rejection (jest/zone abort the test with the
  // raw error) and the control stays stuck in its loading fallback with no
  // `errorChange` emission. Reported as a functional finding on SAA-596;
  // when fixed, assert the error mapping here (e.g. `errorChange` carries a
  // `GraphParameterValueIssue` for the failed load).

  it('renders static manifest options immediately and wires the selected value', () => {
    const fixture = TestBed.createComponent(GraphOptionsParameterComponent);
    const component = fixture.componentInstance;
    component.parameter = {
      id: 'method',
      type: 'options',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ],
    } as GraphParameterDefinition;
    component.value = 'POST';
    fixture.detectChanges();

    expect(component.isStaticOrResolved()).toBe(true);
    expect(component.options).toEqual([
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
    ]);
    expect(component.selected()).toBe('POST');

    const emitted: Array<GraphJsonValue | undefined> = [];
    component.valueChange.subscribe((next) => emitted.push(next));
    component.onSelectChange(changeEvent('GET'));
    expect(emitted).toEqual(['GET']);
  });

  it('rejects non-primitive selections and filters multi-selects to primitives', () => {
    const multi = {
      id: 'tags',
      type: 'options',
      multiple: true,
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    } as GraphParameterDefinition;
    const fixture = TestBed.createComponent(GraphOptionsParameterComponent);
    const component = fixture.componentInstance;
    component.parameter = multi;
    component.value = ['a'];
    fixture.detectChanges();

    expect(component.selected()).toEqual(['a']);

    const emitted: Array<GraphJsonValue | undefined> = [];
    component.valueChange.subscribe((next) => emitted.push(next));
    component.onSelectChange(changeEvent(['a', { sneaky: 'object' }, 'b']));
    expect(emitted).toEqual([['a', 'b']]);
  });

  it('maps option values to validation issues (error mapping)', () => {
    const single = { id: 'method', type: 'options' } as GraphParameterDefinition;
    const multi = { id: 'tags', type: 'options', multiple: true } as GraphParameterDefinition;

    expect(graphParameterValidationIssuesOf(single, { not: 'primitive' })).toEqual([
      expect.objectContaining({ parameterId: 'method', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(multi, 'not-an-array')).toEqual([
      expect.objectContaining({ parameterId: 'tags', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(multi, ['a', { object: true }])).toEqual([
      expect.objectContaining({ parameterId: 'tags', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(single, 'GET')).toEqual([]);
  });
});

describe('GraphResourceLocatorParameterComponent (resource locator)', () => {
  const parameter = {
    id: 'resource',
    type: 'resourceLocator',
    label: 'Target Resource',
    modes: ['list', 'dynamic'],
    placeholder: 'resource id',
  } as unknown as GraphParameterDefinition;

  function mount(value?: GraphJsonValue) {
    const fixture = TestBed.createComponent(GraphResourceLocatorParameterComponent);
    const component = fixture.componentInstance;
    component.parameter = parameter;
    component.value = value;
    return { fixture, component };
  }

  it('lists the manifest locator modes and binds the current locator record', () => {
    const { fixture, component } = mount({ mode: 'dynamic', value: 'res-9' });
    fixture.detectChanges();

    expect(component.locatorModes).toEqual(['list', 'dynamic']);
    expect(component.mode).toBe('dynamic');
    expect(component.locatorText).toBe('res-9');

    const modeOptions = fixture.debugElement
      .queryAll((element) => element.name === 'ion-select-option')
      .map((option) => option.properties['value']);
    expect(modeOptions).toEqual(['list', 'dynamic']);
  });

  it('defaults to list mode for values without a recognized mode', () => {
    const { component } = mount(undefined);
    expect(component.mode).toBe('list');
    expect(component.locatorText).toBe('');
  });

  it('emits a locator record on mode change, preserving the current value', () => {
    const { fixture, component } = mount({ mode: 'list', value: 'res-1' });
    const emitted: Array<GraphJsonValue | undefined> = [];
    component.valueChange.subscribe((next) => emitted.push(next));
    fixture.detectChanges();

    component.onModeChange(changeEvent('dynamic'));
    expect(emitted).toEqual([{ mode: 'dynamic', value: 'res-1' }]);
  });

  it('emits a trimmed locator record on input and drops empty values', () => {
    const { fixture, component } = mount({ mode: 'dynamic' });
    const emitted: Array<GraphJsonValue | undefined> = [];
    component.valueChange.subscribe((next) => emitted.push(next));
    fixture.detectChanges();

    component.onValuesChanged(changeEvent('  res-42  '));
    expect(emitted).toEqual([{ mode: 'dynamic', value: 'res-42' }]);

    component.onValuesChanged(changeEvent('   '));
    expect(emitted[1]).toEqual({ mode: 'dynamic' });
    expect('value' in (emitted[1] as Record<string, unknown>)).toBe(false);
  });

  it('maps malformed locator values to validation issues (error mapping)', () => {
    const malformed = graphParameterValidationIssuesOf(parameter, 'res-1');
    expect(malformed).toEqual([
      expect.objectContaining({ parameterId: 'resource', level: 'error' }),
    ]);

    const badMode = graphParameterValidationIssuesOf(parameter, { mode: 'bogus' });
    expect(badMode).toEqual([
      expect.objectContaining({ parameterId: 'resource', level: 'error' }),
    ]);

    expect(graphParameterValidationIssuesOf(parameter, { mode: 'list', value: 'res-1' })).toEqual([]);
  });
});

describe('GraphCredentialParameterComponent (credential picker)', () => {
  const parameter = {
    id: 'auth',
    type: 'credential',
    label: 'Credentials',
    credentialType: 'http-basic',
  } as unknown as GraphParameterDefinition;

  const authorized: GraphCredentialReference[] = [
    { credentialId: 'ci-jenkins', credentialType: 'http-basic' },
    { credentialId: 'ci-gitlab', credentialType: 'http-basic' },
    { credentialId: 'vault-token', credentialType: 'vault-token' },
  ];

  function mount(value?: GraphJsonValue, credentialOptions?: GraphCredentialReference[]) {
    const fixture = TestBed.createComponent(GraphCredentialParameterComponent);
    const component = fixture.componentInstance;
    component.parameter = parameter;
    component.value = value;
    component.context = {
      node: nodeFixture({}),
      manifest: manifestFixture(),
      values: {},
      credentialOptions,
    };
    return { fixture, component };
  }

  it('lists only credential references matching the parameter credentialType', () => {
    const { fixture, component } = mount(undefined, authorized);
    fixture.detectChanges();

    expect(component.credentialOptions).toEqual([
      { credentialId: 'ci-jenkins', credentialType: 'http-basic' },
      { credentialId: 'ci-gitlab', credentialType: 'http-basic' },
    ]);

    const rendered = fixture.debugElement
      .queryAll((element) => element.name === 'ion-select-option')
      .map((option) => (option.nativeElement as HTMLElement).textContent?.trim());
    expect(rendered).toContain('Unset');
    expect(rendered).toContain('ci-jenkins');
    expect(rendered).toContain('ci-gitlab');
    expect(rendered).not.toContain('vault-token');
    expect(rendered).not.toContain('http-basic');
  });

  it('binds the selected credentialId from the current reference value', () => {
    const { component } = mount({ credentialId: 'ci-jenkins', credentialType: 'http-basic' }, authorized);
    expect(component.credentialId).toBe('ci-jenkins');

    const nonReference = mount('not-an-object', authorized);
    expect(nonReference.component.credentialId).toBe('');
  });

  it('emits a bare {credentialId, credentialType} reference and undefined on unset', () => {
    const { fixture, component } = mount(undefined, authorized);
    const emitted: Array<GraphJsonValue | undefined> = [];
    component.valueChange.subscribe((next) => emitted.push(next));
    fixture.detectChanges();

    component.onCredentialChange(changeEvent('ci-gitlab'));
    expect(emitted).toEqual([{ credentialId: 'ci-gitlab', credentialType: 'http-basic' }]);

    // The emitted reference carries exactly the two reference keys — no
    // secret material can ride along from the picker.
    expect(Object.keys(emitted[0] as Record<string, unknown>).sort()).toEqual([
      'credentialId',
      'credentialType',
    ]);

    component.onCredentialChange(changeEvent(''));
    expect(emitted[1]).toBeUndefined();
  });

  it('never reads secret-bearing properties from the current value (credential-reference pin)', () => {
    const accessed = new Set<string>();
    const probingValue = new Proxy(
      {
        credentialId: 'ci-jenkins',
        credentialType: 'http-basic',
        secret: 'super-secret-value',
        token: 'super-secret-token',
        password: 'super-secret-password',
      },
      {
        get(target, property: string) {
          accessed.add(property);
          return (target as Record<string, unknown>)[property];
        },
      }
    );

    const { fixture, component } = mount(probingValue as unknown as GraphJsonValue, authorized);
    fixture.detectChanges();

    expect(component.credentialId).toBe('ci-jenkins');
    expect(accessed).toEqual(new Set(['credentialId']));

    // Rendered output mentions the credential id only.
    const renderedText = fixture.debugElement
      .queryAll((element) => element.name === 'ion-select-option')
      .map((option) => (option.nativeElement as HTMLElement).textContent?.trim())
      .join('\n');
    expect(renderedText).toContain('ci-jenkins');
    expect(renderedText).not.toContain('super-secret');
  });

  it('maps credential values to validation issues, rejecting mismatched reference types', () => {
    const matching = graphParameterValidationIssuesOf(parameter, {
      credentialId: 'ci-jenkins',
      credentialType: 'http-basic',
    });
    expect(matching).toEqual([]);

    const mismatched = graphParameterValidationIssuesOf(parameter, {
      credentialId: 'vault-token',
      credentialType: 'vault-token',
    });
    expect(mismatched).toEqual([
      expect.objectContaining({ parameterId: 'auth', level: 'error' }),
    ]);

    expect(graphParameterValidationIssuesOf(parameter, 'ci-jenkins')).toEqual([
      expect.objectContaining({ parameterId: 'auth', level: 'error' }),
    ]);
  });
});
