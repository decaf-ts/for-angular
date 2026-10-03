import * as fs from 'fs';
import * as path from 'path';

interface ControlSite {
  name: string;
  file: string;
  type: 'labelled' | 'decorative';
  pattern: RegExp;
}

export const SITES: ControlSite[] = [
  // 28 labelled sites
  {
    name: 'table filter-clear',
    file: 'src/lib/components/table/table.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="locale \+ '\.filter\.clear' \| translate"/,
  },
  {
    name: 'table read',
    file: 'src/lib/components/table/table.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="\s*locale \+ '\.operations\.read' \| translate\s*"/,
  },
  {
    name: 'table update',
    file: 'src/lib/components/table/table.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="\s*locale \+ '\.operations\.update' \| translate\s*"/,
  },
  {
    name: 'table delete',
    file: 'src/lib/components/table/table.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="\s*locale \+ '\.operations\.delete' \| translate\s*"/,
  },
  {
    name: 'list-item non-popover action',
    file: 'src/lib/components/list-item/list-item.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="\s*locale \+ '\.operations\.' \+ operation \| translate\s*"/,
  },
  {
    name: 'list-item swipe update',
    file: 'src/lib/components/list-item/list-item.component.html',
    type: 'labelled',
    pattern: /class="dcf-update"[^>]*\[attr\.aria-label\]="locale \+ '\.operations\.update' \| translate"/,
  },
  {
    name: 'list-item swipe delete',
    file: 'src/lib/components/list-item/list-item.component.html',
    type: 'labelled',
    pattern: /class="dcf-delete"[^>]*\[attr\.aria-label\]="locale \+ '\.operations\.delete' \| translate"/,
  },
  {
    name: 'file-upload clear-all',
    file: 'src/lib/components/file-upload/file-upload.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="locale \+ '\.buttons\.clear' \| translate"/,
  },
  {
    name: 'file-upload preview',
    file: 'src/lib/components/file-upload/file-upload.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="\s*locale \+ '\.buttons\.preview' \| translate\s*"/,
  },
  {
    name: 'file-upload remove',
    file: 'src/lib/components/file-upload/file-upload.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="\s*locale \+ '\.buttons\.remove' \| translate\s*"/,
  },
  {
    name: 'filter clear',
    file: 'src/lib/components/filter/filter.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="locale \+ '\.clear' \| translate"/,
  },
  {
    name: 'filter search',
    file: 'src/lib/components/filter/filter.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="locale \+ '\.search' \| translate"/,
  },
  {
    name: 'filter sort',
    file: 'src/lib/components/filter/filter.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="\s*locale \+ \(sortDirection === 'desc' \? '\.sort_desc' : '\.sort_asc'\)\s*\| translate\s*"/,
  },
  {
    name: 'dashboard tile delete',
    file: 'src/lib/components/dashboard/dashboard.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'component\.dashboard\.deleteTitle' \| translate"/,
  },
  {
    name: 'layout toggle',
    file: 'src/lib/components/layout/layout.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="locale \+ '\.toggle' \| translate"/,
  },
  {
    name: 'header create',
    file: 'src/app/components/header/header.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'create' \| translate"/,
  },
  {
    name: 'header read',
    file: 'src/app/components/header/header.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'read' \| translate"/,
  },
  {
    name: 'header update',
    file: 'src/app/components/header/header.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'update' \| translate"/,
  },
  {
    name: 'crud-field clear',
    file: 'src/lib/components/crud-field/crud-field.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'component\.crud_field\.clear' \| translate"/,
  },
  {
    name: 'back-button',
    file: 'src/app/components/back-button/back-button.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'back' \| translate"/,
  },
  {
    name: 'header theme toggle',
    file: 'src/app/components/header/header.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'theme\.toggle' \| translate"/,
  },
  {
    name: 'product-item update',
    file: 'src/app/components/product-item/product-item.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="'operations\.update\.title' \| translate"/,
  },
  {
    name: 'product-item delete',
    file: 'src/app/components/product-item/product-item.component.html',
    type: 'labelled',
    pattern: /\[ariaLabel\]="'operations\.delete\.title' \| translate"/,
  },
  {
    name: 'select-field clear',
    file: 'src/app/components/select-field/select-field.component.html',
    type: 'labelled',
    pattern: /\[attr\.aria-label\]="'component\.crud_field\.clear' \| translate"/,
  },
  {
    name: 'model-builder toggle',
    file: 'src/lib/components/model-builder/model-builder.component.html',
    type: 'labelled',
    pattern: /class="model-builder__property-toggle"[^>]*aria-label="Toggle property"/,
  },
  {
    name: 'model-builder move up',
    file: 'src/lib/components/model-builder/model-builder.component.html',
    type: 'labelled',
    pattern: /aria-label="Move up"/,
  },
  {
    name: 'model-builder move down',
    file: 'src/lib/components/model-builder/model-builder.component.html',
    type: 'labelled',
    pattern: /aria-label="Move down"/,
  },
  {
    name: 'model-builder remove',
    file: 'src/lib/components/model-builder/model-builder.component.html',
    type: 'labelled',
    pattern: /aria-label="Remove property"/,
  },
  // 2 decorative sites
  {
    name: 'list-item popover item icon',
    file: 'src/lib/components/list-item/list-item.component.html',
    type: 'decorative',
    pattern: /<ngx-decaf-icon\s+\[button\]="false"\s+slot="icon-only"/,
  },
  {
    name: 'file-upload file-type icon',
    file: 'src/lib/components/file-upload/file-upload.component.html',
    type: 'decorative',
    pattern: /<ngx-decaf-icon\s+\[button\]="false"\s+\[slot\]="'icon-only'"/,
  },
];

describe('icon-only controls', () => {
  it('icon-only controls have names', () => {
    expect(SITES.length).toBe(30);
    const labelled = SITES.filter((s) => s.type === 'labelled');
    const decorative = SITES.filter((s) => s.type === 'decorative');
    expect(labelled.length).toBe(28);
    expect(decorative.length).toBe(2);

    for (const site of SITES) {
      const fullPath = path.resolve(process.cwd(), site.file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = site.pattern.test(content);
      if (!matches) {
        throw new Error(`Site "${site.name}" in ${site.file} did not match pattern ${site.pattern}`);
      }
      expect(matches).toBe(true);
    }
  });

  it('model builder toggle has aria-expanded', () => {
    const fullPath = path.resolve(
      process.cwd(),
      'src/lib/components/model-builder/model-builder.component.html'
    );
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasAriaExpanded = /class="model-builder__property-toggle"[^>]*\[attr\.aria-expanded\]="prop\.expanded"/.test(
      content
    );
    expect(hasAriaExpanded).toBe(true);
  });
});
