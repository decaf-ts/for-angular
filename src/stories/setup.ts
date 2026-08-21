import { RamAdapter, RamFlavour } from '@decaf-ts/core/ram';
import { seedRamData } from './seed';

globalThis.process = globalThis.process || {
  env: {
    env: 'development',
  },
};

try {
  RamAdapter.decoration();
  RamAdapter.setCurrent(RamFlavour);
} catch (e: unknown) {
  console.error(e);
}

// Populates the RamAdapter repositories used by the repo-driven stories
// (list, table, filter, crud form, model renderer) so they render with real rows.
void seedRamData();
