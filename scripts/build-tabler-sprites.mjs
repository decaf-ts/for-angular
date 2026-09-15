#!/usr/bin/env node
// Copies the full outline sprite from @tabler/icons-sprite into src/assets.
// Full set on purpose: this repo is a shared lib, downstream apps decide
// which icons they use — trimming here would silently break icons the lib
// itself never references.
import { copyFileSync } from 'node:fs';

const repoRoot = new URL('..', import.meta.url).pathname;
copyFileSync(
  `${repoRoot}/node_modules/@tabler/icons-sprite/dist/tabler-sprite.svg`,
  `${repoRoot}/src/assets/tabler-sprite.svg`
);
console.log('tabler-sprite.svg synced (full outline set).');
