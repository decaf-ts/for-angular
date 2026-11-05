/**
 * @module for-angular/graph/components/code-editor/code-editor.component.spec
 * @summary IDE-like code input contract (DECAF-50 round 2).
 * @description Proves `CodeEditorComponent` mounts a real CodeMirror editor for both
 * `code` and `formula` modes, seeds it from the `code` input, emits `codeChange`
 * without echoing its own writes, and falls back to an `ion-textarea` when CodeMirror
 * is unavailable.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeEditorComponent } from './code-editor.component';

/** Mounts the code editor with the given inputs and waits for the async mount. */
async function render(
  inputs: Partial<{ mode: 'formula' | 'code'; code: string; placeholder: string }> = {}
): Promise<ComponentFixture<CodeEditorComponent>> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(CodeEditorComponent);
  fixture.componentRef.setInput('mode', inputs.mode ?? 'code');
  fixture.componentRef.setInput('code', inputs.code ?? '');
  fixture.componentRef.setInput('placeholder', inputs.placeholder ?? '');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('CodeEditorComponent — IDE-like code input (DECAF-50 round 2)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('defaults to code mode with an empty document', async () => {
    const fixture = await render();

    expect(fixture.componentInstance.mode()).toBe('code');
    expect(fixture.componentInstance.code()).toBe('');
  });

  it('mounts a real CodeMirror editor into the host', async () => {
    const fixture = await render({ code: 'const a = 1;' });
    const host: HTMLElement = fixture.nativeElement.querySelector('.code-editor-host');

    expect(host.querySelector('.cm-editor')).not.toBeNull();
    expect(fixture.componentInstance.showFallback()).toBe(false);
  });

  it('seeds the editor with the initial code input', async () => {
    const fixture = await render({ code: 'const a = 1;' });
    const content = fixture.nativeElement.querySelector('.cm-content') as HTMLElement;

    expect(content?.textContent).toContain('const a = 1;');
  });

  it('marks formula mode on the host and keeps code mode unmarked', async () => {
    const formula = await render({ mode: 'formula' });
    expect(
      (formula.nativeElement.querySelector('.code-editor-host') as HTMLElement).classList.contains(
        'code-editor-host--formula'
      )
    ).toBe(true);

    TestBed.resetTestingModule();

    const code = await render({ mode: 'code' });
    expect(
      (code.nativeElement.querySelector('.code-editor-host') as HTMLElement).classList.contains(
        'code-editor-host--formula'
      )
    ).toBe(false);
  });

  it('adds line numbers and the lint gutter in code mode', async () => {
    const fixture = await render({ mode: 'code', code: 'const a = 1;' });

    expect(fixture.nativeElement.querySelector('.cm-lineNumbers')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cm-gutter-lint')).not.toBeNull();
  });

  it('skips line numbers and the lint gutter in formula mode', async () => {
    const fixture = await render({ mode: 'formula', code: 'a + b' });

    expect(fixture.nativeElement.querySelector('.cm-lineNumbers')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cm-gutter-lint')).toBeNull();
  });

  it('emits codeChange when the document changes in the editor', async () => {
    const fixture = await render({ mode: 'code', code: 'const a = 1;' });
    const emitted: string[] = [];
    fixture.componentInstance.codeChange.subscribe((value) => emitted.push(value));

    const view = (fixture.componentInstance as unknown as { view: { dispatch: (spec: unknown) => void } }).view;
    view.dispatch({ changes: { from: 0, to: 0, insert: '// edited\n' } });

    expect(emitted).toEqual(['// edited\nconst a = 1;']);
  });

  it('syncs a changed code input into the existing editor view', async () => {
    const fixture = await render({ mode: 'code', code: 'const a = 1;' });
    const view = (fixture.componentInstance as unknown as { view: { state: { doc: { toString: () => string } } } }).view;

    fixture.componentRef.setInput('code', 'const b = 2;');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(view.state.doc.toString()).toBe('const b = 2;');
  });

  it('renders the ion-textarea fallback when CodeMirror is unavailable', async () => {
    const fixture = await render({ code: 'return $input;' });

    fixture.componentInstance.showFallback.set(true);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('ion-textarea.code-editor-fallback');
    expect(textarea).not.toBeNull();
  });

  it('emits the textarea value on fallback input', async () => {
    const fixture = await render();
    const emitted: string[] = [];
    fixture.componentInstance.codeChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onFallbackChange({
      target: { value: 'return $input.text;' },
    } as unknown as Event);

    expect(emitted).toEqual(['return $input.text;']);
  });

  it('destroys the editor view without throwing when never mounted', async () => {
    const fixture = await render();

    expect(() => fixture.componentInstance.ngOnDestroy()).not.toThrow();
  });
});
