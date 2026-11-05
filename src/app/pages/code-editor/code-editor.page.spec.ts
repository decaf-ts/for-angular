/**
 * @module for-angular/app/pages/code-editor/code-editor.page.spec
 * @summary SAA-1473 `/code-editor` demo page contract.
 * @description Proves the mode selector switches the editor between code and
 * formula presentation, `codeChange` keeps the counted/validated source in sync,
 * snippet loading replaces both mode and code, structural syntax errors surface
 * in the status, and reset clears the editor.
 */
import type { Signal, WritableSignal } from '@angular/core';
import type { CodeEditorMode } from '@decaf-ts/for-angular/code-editor';
import { CodeEditorPage } from './code-editor.page';

interface EditorStatus {
  state: 'empty' | 'valid' | 'invalid' | 'formula';
  message?: string;
}

interface CodeSnippet {
  id: string;
  labelKey: string;
  mode: CodeEditorMode;
  code: string;
}

interface CodeEditorPageInternals {
  snippets: CodeSnippet[];
  mode: WritableSignal<CodeEditorMode>;
  code: WritableSignal<string>;
  lastEmitted: WritableSignal<string>;
  lineCount: Signal<number>;
  characterCount: Signal<number>;
  placeholderKey: Signal<string>;
  status: Signal<EditorStatus>;
  onModeChange(event: Event): void;
  onCodeChange(value: string): void;
  loadSnippet(snippet: CodeSnippet): void;
  reset(): void;
}

function createPage(): CodeEditorPageInternals {
  return new CodeEditorPage() as unknown as CodeEditorPageInternals;
}

function selectEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}

describe('CodeEditorPage — mode, emission, and validation (SAA-1473)', () => {
  it('starts in code mode with the transform snippet and a valid status', () => {
    const page = createPage();

    expect(page.mode()).toBe('code');
    expect(page.code()).toContain('return value * 2 + 1;');
    expect(page.lineCount()).toBe(2);
    expect(page.characterCount()).toBe(page.code().length);
    expect(page.status().state).toBe('valid');
    expect(page.placeholderKey()).toBe('code_editor.placeholder_code');
    expect(page.lastEmitted()).toBe('');
  });

  it('records every codeChange emission and keeps the counters in sync', () => {
    const page = createPage();
    const next = 'const x = 1;\nconst y = 2;\nreturn x + y;';

    page.onCodeChange(next);

    expect(page.code()).toBe(next);
    expect(page.lastEmitted()).toBe(next);
    expect(page.lineCount()).toBe(3);
    expect(page.characterCount()).toBe(next.length);
    expect(page.status().state).toBe('valid');
  });

  it('reports a structural syntax error instead of throwing', () => {
    const page = createPage();

    page.onCodeChange('const value = ;');

    expect(page.status().state).toBe('invalid');
    expect(page.status().message).toBeTruthy();
  });

  it('accepts multi-statement code without a return statement (SAA-1483 D2)', () => {
    const page = createPage();

    page.onCodeChange('const answer = 42;');
    expect(page.status().state).toBe('valid');

    page.onCodeChange('const answer = 42;\nconst doubled = answer * 2;');
    expect(page.status().state).toBe('valid');
  });

  it('still rejects malformed multi-statement code (SAA-1483 D2)', () => {
    const page = createPage();

    page.onCodeChange('const answer = 42;\nconst broken = ;');

    expect(page.status().state).toBe('invalid');
    expect(page.status().message).toBeTruthy();
  });

  it('switches to formula mode and back', () => {
    const page = createPage();

    page.onModeChange(selectEvent('formula'));
    expect(page.mode()).toBe('formula');
    expect(page.status()).toEqual({ state: 'formula' });
    expect(page.placeholderKey()).toBe('code_editor.placeholder_formula');

    page.onModeChange(selectEvent('code'));
    expect(page.mode()).toBe('code');
    expect(page.status().state).toBe('valid');
    expect(page.placeholderKey()).toBe('code_editor.placeholder_code');
  });

  it('loads a snippet with its own mode and code', () => {
    const page = createPage();

    page.loadSnippet(page.snippets[2]);

    expect(page.mode()).toBe('formula');
    expect(page.code()).toBe('$input.value > 0 && $input.value < 100');
    expect(page.status().state).toBe('formula');
  });

  it('reset clears the code, the counters, and the last emission', () => {
    const page = createPage();

    page.onCodeChange('const value = 1;');
    page.onModeChange(selectEvent('formula'));
    page.reset();

    expect(page.mode()).toBe('code');
    expect(page.code()).toBe('');
    expect(page.lastEmitted()).toBe('');
    expect(page.lineCount()).toBe(0);
    expect(page.characterCount()).toBe(0);
    expect(page.status().state).toBe('empty');
  });
});
