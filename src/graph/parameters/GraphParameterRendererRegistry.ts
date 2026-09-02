import { Injectable, Type } from '@angular/core';
import type { GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import type { GraphParameterRendererContract } from './GraphParameterRendererContract';
import { GraphGenericParameterComponent } from './components/graph-generic-parameter.component';
import { GraphTextParameterComponent } from './components/graph-text-parameter.component';
import { GraphNumberParameterComponent } from './components/graph-number-parameter.component';
import { GraphBooleanParameterComponent } from './components/graph-boolean-parameter.component';
import { GraphOptionsParameterComponent } from './components/graph-options-parameter.component';
import { GraphCollectionParameterComponent } from './components/graph-collection-parameter.component';
import { GraphObjectParameterComponent } from './components/graph-object-parameter.component';
import { GraphCodeParameterComponent } from './components/graph-code-parameter.component';
import { GraphExpressionParameterComponent } from './components/graph-expression-parameter.component';
import { GraphResourceLocatorParameterComponent } from './components/graph-resource-locator-parameter.component';
import { GraphCredentialParameterComponent } from './components/graph-credential-parameter.component';
import { GraphNoticeParameterComponent } from './components/graph-notice-parameter.component';
import { GraphHiddenParameterComponent } from './components/graph-hidden-parameter.component';

/**
 * Resolves the {@link GraphParameterRendererContract} implementation class used to
 * render one manifest parameter.
 *
 * Custom frontend components are explicitly registered at build time; unregistered
 * parameter types fall back to generic rendering so arbitrary JavaScript is never
 * downloaded from backend-installed nodes and custom UI cannot override backend
 * validation.
 */
@Injectable({ providedIn: 'root' })
export class GraphParameterRendererRegistry {
  private readonly renderers = new Map<string, Type<GraphParameterRendererContract>>();

  register(
    type: GraphParameterDefinition['type'],
    component: Type<GraphParameterRendererContract>
  ): this {
    this.renderers.set(type, component);
    return this;
  }

  resolve(parameter: GraphParameterDefinition): Type<GraphParameterRendererContract> {
    return this.renderers.get(parameter.type) ?? GraphGenericParameterComponent;
  }

  has(type: string): boolean {
    return this.renderers.has(type);
  }
}

/**
 * Registers every built-in {@link GraphParameterRendererContract} implementation
 * documented in the manifest parameter type union into {@link registry}, keyed by
 * the parameter definition type. Must be invoked once before a registry entry is
 * resolved; unregistered types keep resolving to {@link GraphGenericParameterComponent}.
 *
 * @example
 * ```ts
 * graphRegisterParameterRenderers(registry);
 * registry.resolve(parameter); // → GraphTextParameterComponent for type 'string'
 * ```
 */
export function graphRegisterParameterRenderers(
  registry: GraphParameterRendererRegistry
): GraphParameterRendererRegistry {
  return registry
    .register('string', GraphTextParameterComponent)
    .register('number', GraphNumberParameterComponent)
    .register('boolean', GraphBooleanParameterComponent)
    .register('options', GraphOptionsParameterComponent)
    .register('collection', GraphCollectionParameterComponent)
    .register('object', GraphObjectParameterComponent)
    .register('code', GraphCodeParameterComponent)
    .register('expression', GraphExpressionParameterComponent)
    .register('resourceLocator', GraphResourceLocatorParameterComponent)
    .register('credential', GraphCredentialParameterComponent)
    .register('notice', GraphNoticeParameterComponent)
    .register('hidden', GraphHiddenParameterComponent);
}
