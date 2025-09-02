import { strings } from '@angular-devkit/core';
import type { Rule } from '@angular-devkit/schematics';
import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  url,
} from '@angular-devkit/schematics';

interface Schema {
  name: string;
  path?: string;
  project?: string;
}

export function page(options: Schema): Rule {
  return () => {
    const name = strings.dasherize(options.name);
    const path = options.path || 'src/app/pages';

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ...options,
        name,
      }),
      move(`${path}/${name}`),
    ]);

    return chain([
      mergeWith(templateSource)
    ]);
  };
}
