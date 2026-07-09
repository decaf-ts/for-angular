import {
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  input,
  output,
  ViewChild,
  signal,
  effect,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { IonTextarea } from '@ionic/angular/standalone';

export type CodeEditorMode = 'formula' | 'code';

async function loadCodeMirror(): Promise<{
  EditorState: typeof import('@codemirror/state')['EditorState'];
  EditorView: typeof import('@codemirror/view')['EditorView'];
  Compartment: typeof import('@codemirror/state')['Compartment'];
  keymap: typeof import('@codemirror/view')['keymap'];
  lineNumbers: typeof import('@codemirror/view')['lineNumbers'];
  highlightActiveLine: typeof import('@codemirror/view')['highlightActiveLine'];
  drawSelection: typeof import('@codemirror/view')['drawSelection'];
  defaultKeymap: typeof import('@codemirror/commands')['defaultKeymap'];
  history: typeof import('@codemirror/commands')['history'];
  historyKeymap: typeof import('@codemirror/commands')['historyKeymap'];
  javascript: typeof import('@codemirror/lang-javascript')['javascript'];
  indentOnInput: typeof import('@codemirror/language')['indentOnInput'];
  bracketMatching: typeof import('@codemirror/language')['bracketMatching'];
  foldGutter: typeof import('@codemirror/language')['foldGutter'];
  foldKeymap: typeof import('@codemirror/language')['foldKeymap'];
  autocompletion: typeof import('@codemirror/autocomplete')['autocompletion'];
  completionKeymap: typeof import('@codemirror/autocomplete')['completionKeymap'];
  closeBrackets: typeof import('@codemirror/autocomplete')['closeBrackets'];
  closeBracketsKeymap: typeof import('@codemirror/autocomplete')['closeBracketsKeymap'];
  oneDark: typeof import('@codemirror/theme-one-dark')['oneDark'];
  linter: typeof import('@codemirror/lint')['linter'];
  lintGutter: typeof import('@codemirror/lint')['lintGutter'];
} | null> {
  try {
    const [stateMod, viewMod, commandsMod, langJsMod, langMod, autocompleteMod, themeMod, lintMod] =
      await Promise.all([
        import('@codemirror/state'),
        import('@codemirror/view'),
        import('@codemirror/commands'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/language'),
        import('@codemirror/autocomplete'),
        import('@codemirror/theme-one-dark'),
        import('@codemirror/lint'),
      ]);
    return {
      EditorState: stateMod.EditorState,
      EditorView: viewMod.EditorView,
      Compartment: stateMod.Compartment,
      keymap: viewMod.keymap,
      lineNumbers: viewMod.lineNumbers,
      highlightActiveLine: viewMod.highlightActiveLine,
      drawSelection: viewMod.drawSelection,
      defaultKeymap: commandsMod.defaultKeymap,
      history: commandsMod.history,
      historyKeymap: commandsMod.historyKeymap,
      javascript: langJsMod.javascript,
      indentOnInput: langMod.indentOnInput,
      bracketMatching: langMod.bracketMatching,
      foldGutter: langMod.foldGutter,
      foldKeymap: langMod.foldKeymap,
      autocompletion: autocompleteMod.autocompletion,
      completionKeymap: autocompleteMod.completionKeymap,
      closeBrackets: autocompleteMod.closeBrackets,
      closeBracketsKeymap: autocompleteMod.closeBracketsKeymap,
      oneDark: themeMod.oneDark,
      linter: lintMod.linter,
      lintGutter: lintMod.lintGutter,
    };
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [IonTextarea],
  template: `
    <div #host
      class="code-editor-host"
      [class.code-editor-host--formula]="mode() === 'formula'"
    ></div>
    @if (showFallback()) {
      <ion-textarea
        class="code-editor-fallback"
        [value]="code()"
        (ionInput)="onFallbackChange($event)"
        [placeholder]="placeholder()"
        [rows]="mode() === 'formula' ? 1 : 8"
        [autoGrow]="mode() === 'formula'"
      ></ion-textarea>
    }
  `,
  styles: [
    `
      .code-editor-host {
        width: 100%;
        border-radius: 6px;
        overflow: hidden;
      }

      .code-editor-host--formula {
        min-height: 28px;
        max-height: 120px;
        overflow: hidden;
      }

      .code-editor-host:not(.code-editor-host--formula) {
        min-height: 160px;
        height: 160px;
        resize: vertical;
      }

      .cm-editor {
        height: 100%;
        font-family: 'Fira Code', 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
      }

      .cm-editor.cm-focused {
        outline: 2px solid rgba(59, 130, 246, 0.5);
      }

      .code-editor-host--formula .cm-editor {
        min-height: 28px;
      }

      .code-editor-host--formula .cm-scroller {
        white-space: nowrap;
        overflow-x: auto;
      }

      .cm-scroller {
        font-family: 'Fira Code', 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
      }

      .code-editor-fallback {
        width: 100%;
        font-family: monospace;
        font-size: 13px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy {
  readonly mode = input<CodeEditorMode>('code');
  readonly code = input<string>('');
  readonly placeholder = input<string>('');
  readonly codeChange = output<string>();

  @ViewChild('host', { static: true }) host?: ElementRef<HTMLElement>;

  private view: InstanceType<typeof import('@codemirror/view')['EditorView']> | null = null;
  private lastEmitted = '';
  readonly showFallback = signal(false);

  constructor() {
    effect(() => {
      const value = this.code() ?? '';
      if (!this.view) return;
      // Skip echoes: if this is the value we just emitted, the editor
      // already has it — dispatching would reset the cursor.
      if (value === this.lastEmitted) return;
      const current = this.view.state.doc.toString();
      if (current === value) return;
      this.view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const cm = await loadCodeMirror();
    if (!cm || !this.host) {
      this.showFallback.set(true);
      return;
    }

    const isFormula = this.mode() === 'formula';

    const extensions = [
      cm.history(),
      cm.drawSelection(),
      cm.EditorState.allowMultipleSelections.of(true),
      cm.indentOnInput(),
      cm.bracketMatching(),
      cm.closeBrackets(),
      cm.autocompletion(),
      cm.highlightActiveLine(),
      cm.keymap.of([
        ...cm.closeBracketsKeymap,
        ...cm.defaultKeymap,
        ...cm.historyKeymap,
        ...cm.completionKeymap,
      ]),
      cm.javascript({ typescript: false }),
      cm.oneDark,
      cm.EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.lastEmitted = update.state.doc.toString();
          this.codeChange.emit(this.lastEmitted);
        }
      }),
    ];

    if (!isFormula) {
      const syntaxLinter = cm.linter((view) => {
        const doc = view.state.doc.toString();
        if (!doc.trim()) return [];
        const diagnostics: { from: number; to: number; severity: 'error'; message: string }[] = [];
        try {
          const hasReturn = /\breturn\b[\s;]/.test(doc);
          const body = hasReturn ? doc : `return (${doc});`;
          new Function(body);
        } catch (err) {
          diagnostics.push({
            from: 0,
            to: doc.length,
            severity: 'error',
            message: `Syntax: ${(err as Error).message}`,
          });
        }
        return diagnostics;
      });
      extensions.push(syntaxLinter, cm.lintGutter());
      extensions.unshift(
        cm.lineNumbers(),
        cm.foldGutter(),
        ...cm.foldKeymap ? [cm.keymap.of(cm.foldKeymap)] : [],
      );
    }

    const state = cm.EditorState.create({
      doc: this.code() || '',
      extensions,
    });

    this.view = new cm.EditorView({
      state,
      parent: this.host.nativeElement,
      root: document,
    });
  }

  ngOnDestroy(): void {
    this.view?.destroy();
    this.view = null;
  }

  onFallbackChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.codeChange.emit(target.value);
  }
}
