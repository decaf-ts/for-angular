import { strings } from '@angular-devkit/core';
import { buildDefaultPath } from '@schematics/angular/utility/workspace';

export function buildSelector(options: any, projectPrefix: string): string {
  let selector = strings.dasherize(options.name);

  if (options.prefix) {
    selector = `${options.prefix}-${selector}`;
  } else if (options.prefix === undefined && projectPrefix) {
    selector = `${projectPrefix}-${selector}`;
  }

  return selector;
}

export function mergeSchemaOptions<T>(options: any, project: Record<string, any>): T {
  const type = options.type.toLowerCase();
  const optionsScheme =
    project?.extensions?.['schematics']?.[type] ||
    project?.extensions?.['schematics']?.[`@schematics/angular:${type}`] ||
    {};
  const path = optionsScheme?.path || project?.sourceRoot || buildDefaultPath(project as any);
  return {
    ...options,
    ...{ path: options.path || path },
  };
}
