import { RamAdapter, RamFlavour } from '@decaf-ts/core/ram';

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
