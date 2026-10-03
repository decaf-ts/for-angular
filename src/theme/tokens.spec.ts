import * as sass from 'sass';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let tokenCss: string | undefined;
function compileTokens(): string {
  if (!tokenCss) {
    try {
      tokenCss = sass.compile(join(root, 'src/assets/theme/variables.scss')).css;
    } catch (error) {
      throw new Error(`Could not compile theme tokens: ${String(error)}`);
    }
  }
  return tokenCss;
}

const tokens = [
  '--dcf-box-shadow-compact', '--dcf-shadow-glass', '--dcf-box-shadow-small',
  '--dcf-box-shadow-large', '--dcf-graph-sidebar-width', '--dcf-primary',
  '--dcf-text-primary', '--dcf-text-secondary', '--dcf-space-px',
  '--dcf-border-radius-small', '--dcf-color-warning-text', '--dcf-color-success-text',
  '--dcf-color-danger-text', '--dcf-color-text-tertiary-text',
];

function rootValue(css: string, token: string): string | undefined {
  const rootBlock = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
  return rootBlock.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1].trim();
}

function contrast(hex: string): number {
  const channels = hex.replace('#', '').match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
  const luminance = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return 1.05 / (luminance + 0.05);
}

describe('theme token completion', () => {
  it('token completion block emitted', () => {
    const css = compileTokens();
    for (const token of tokens) expect(rootValue(css, token)).toBeDefined();
  });

  it('consumed tokens resolve', () => {
    const css = compileTokens();
    const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : /\.(scss|css|html|ts)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : [];
    });
    const source = sourceFiles(join(root, 'src')).join('\n');
    for (const token of tokens.slice(0, 10)) {
      expect(source).toContain(token);
      expect(rootValue(css, token)).toBeDefined();
    }
  });

  it('text variants contrast', () => {
    const css = compileTokens();
    for (const token of tokens.slice(10)) {
      const value = rootValue(css, token);
      expect(value).toMatch(/^#[\da-f]{6}$/i);
      expect(contrast(value!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('media queries compile real', () => {
    let css: string;
    try {
      css = sass.compile(join(root, 'src/lib/components/list-item/list-item.component.scss'), {
        loadPaths: [join(root, 'node_modules')],
      }).css;
    } catch (error) {
      throw new Error(`Could not compile list-item styles: ${String(error)}`);
    }
    expect(css).not.toMatch(/@media[^\{]*var\(/);
    for (const width of [576, 768]) expect(css).toContain(`${width}px`);
  });
});
