import { signal } from '@angular/core';
import type { GraphNodeEditResult } from '../components/graph-node-edit-modal/graph-node-edit-modal.component';

export interface GraphNodeConfig {
  values: Record<string, unknown>;
  portModes: Record<string, 'port' | 'value'>;
  outputSplits: string[];
}

class GraphNodeConfigStore {
  readonly configs = signal<Record<string, GraphNodeConfig>>({});

  setConfig(nodeId: string, config: GraphNodeConfig) {
    this.configs.update((current) => ({
      ...current,
      [nodeId]: config,
    }));
  }

  getConfig(nodeId: string): GraphNodeConfig | undefined {
    return this.configs()[nodeId];
  }

  applyResult(result: GraphNodeEditResult) {
    this.setConfig(result.nodeId, {
      values: result.values,
      portModes: result.portModes,
      outputSplits: result.outputSplits,
    });
  }

  reset() {
    this.configs.set({});
  }

  serialize(): Record<string, GraphNodeConfig> {
    return this.configs();
  }

  deserialize(data: Record<string, GraphNodeConfig>) {
    this.configs.set(data || {});
  }
}

export const graphNodeConfig = new GraphNodeConfigStore();
