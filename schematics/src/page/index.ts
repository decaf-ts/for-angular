import { strings } from '@angular-devkit/core';
import type { Rule, Tree } from '@angular-devkit/schematics';
import { apply, applyTemplates, chain, mergeWith, move, url } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import { mergeSchemaOptions } from '../util';

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
    // R2-13: routePath is interpolated into generated source (dev-time tool, developer-is-actor),
    // but a hostile value could smuggle code into app.routes.ts. Fail closed on anything outside
    // the URL-path character set. (Schema pattern enforces the same rule at option parsing.)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-_/]*$/.test(routePath)) {
      throw new Error(
        `Invalid routePath "${routePath}": only letters, digits, "-", "_" and "/" are allowed (must start with a letter or digit).`
      );
    }
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
      updatedContent =
        routesContent.slice(0, insertPosition + 1) + ',\n' + newRoute + routesContent.slice(insertPosition + 1);
    } else {
      // Empty routes array, just add the route
      const insertPosition = routesContent.indexOf('[') + 1;
      updatedContent =
        routesContent.slice(0, insertPosition) + '\n' + newRoute + '\n' + routesContent.slice(insertPosition);
    }

    tree.overwrite(routesPath, updatedContent);
    console.log(`Route added to ${routesPath}: ${routePath} -> ${className}`);

    return tree;
  };
}

export function page(options: Schema): Rule {
  return async (host: Tree) => {
    const name = strings.dasherize(options.name);
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project as string);
    options = { ...options, ...{ type: 'Page' } };

    options = mergeSchemaOptions<Schema>(options, project || {});

    console.log(`Generating Decaf custom page schematic...`, JSON.stringify(options, null, 2));

    const path = options.path || 'src/app/pages';
    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ...options,
        name,
      }),
      move(`${path}/${name}`),
    ]);

    return chain([mergeWith(templateSource), addRouteToAppRoutes(options)]);
  };
}
