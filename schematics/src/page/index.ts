import { strings } from '@angular-devkit/core';
import type { Rule, Tree } from '@angular-devkit/schematics';
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
  routePath?: string;
  skipRoute?: boolean;
}

function addRouteToAppRoutes(options: Schema): Rule {
  return (tree: Tree) => {
    // Skip route addition if requested
    if (options.skipRoute) {
      return tree;
    }

    const name = strings.dasherize(options.name);
    const className = strings.classify(options.name) + 'Page';
    const routePath = options.routePath || name;
    const pagePath = options.path || 'src/app/pages';

    // Path to app.routes.ts
    const routesPath = 'src/app/app.routes.ts';

    if (!tree.exists(routesPath)) {
      console.warn(`Could not find ${routesPath}. Route not added.`);
      return tree;
    }

    const routesContent = tree.read(routesPath)!.toString();

    // Create the new route entry
    const relativePath = `${pagePath}/${name}/${name}.page`.replace('src/app/', './');
    const newRoute = `  {\n    path: '${routePath}',\n    loadComponent: () => import('${relativePath}').then( m => m.${className})\n  }`;

    // Find the position to insert the new route (before the last closing bracket)
    const routesArrayMatch = routesContent.match(/export const routes: Routes = \[([\s\S]*)\];/);

    if (!routesArrayMatch) {
      console.warn('Could not parse routes array. Route not added.');
      return tree;
    }

    const routesArrayContent = routesArrayMatch[1];
    const lastRouteMatch = routesArrayContent.trim().match(/.*\}(?!.*\})/s);

    let updatedContent: string;

    if (lastRouteMatch) {
      // Add comma after the last route and insert new route
      const insertPosition = routesContent.lastIndexOf('}', routesContent.lastIndexOf('];'));
      updatedContent = routesContent.slice(0, insertPosition + 1) +
                     ',\n' + newRoute +
                     routesContent.slice(insertPosition + 1);
    } else {
      // Empty routes array, just add the route
      const insertPosition = routesContent.indexOf('[') + 1;
      updatedContent = routesContent.slice(0, insertPosition) +
                     '\n' + newRoute + '\n' +
                     routesContent.slice(insertPosition);
    }

    tree.overwrite(routesPath, updatedContent);
    console.log(`Route added to ${routesPath}: ${routePath} -> ${className}`);

    return tree;
  };
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
      mergeWith(templateSource),
      addRouteToAppRoutes(options)
    ]);
  };
}
