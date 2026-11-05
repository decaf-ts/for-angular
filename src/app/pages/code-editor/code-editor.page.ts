import { Component, computed, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import {
  CodeEditorComponent,
  type CodeEditorMode,
} from '@decaf-ts/for-angular/code-editor';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/lib/components';

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

const SNIPPETS: CodeSnippet[] = [
  {
    id: 'transform',
    labelKey: 'code_editor.snippet_transform',
    mode: 'code',
    code: 'const value = Number($input.value ?? 0);\nreturn value * 2 + 1;',
  },
  {
    id: 'filter',
    labelKey: 'code_editor.snippet_filter',
    mode: 'code',
    code: 'const items = Array.isArray($input.items) ? $input.items : [];\nreturn items.filter((item) => item.active);',
  },
  {
    id: 'formula',
    labelKey: 'code_editor.snippet_formula',
    mode: 'formula',
    code: '$input.value > 0 && $input.value < 100',
  },
];

const DEFAULT_CODE = SNIPPETS[0].code;

/**
 * `/code-editor` demo page: hosts `CodeEditorComponent` from
 * `@decaf-ts/for-angular/code-editor`, switches between code and formula modes,
 * loads snippets and syntax-checks the edited script in place.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-code-editor-page',
  imports: [
    IonContent,
    HeaderComponent,
    ContainerComponent,
    TranslatePipe,
    CodeEditorComponent,
  ],
  templateUrl: './code-editor.page.html',
  styleUrl: './code-editor.page.scss',
})
export class CodeEditorPage {
  protected readonly snippets = SNIPPETS;

  protected readonly mode = signal<CodeEditorMode>('code');

  protected readonly code = signal(DEFAULT_CODE);

  protected readonly lastEmitted = signal('');

  protected readonly lineCount = computed(() => {
    const code = this.code();
    return code.length ? code.split('\n').length : 0;
  });

  protected readonly characterCount = computed(() => this.code().length);

  protected readonly placeholderKey = computed(() =>
    this.mode() === 'formula'
      ? 'code_editor.placeholder_formula'
      : 'code_editor.placeholder_code'
  );

  protected readonly status = computed<EditorStatus>(() => {
    if (this.mode() === 'formula') {
      return { state: 'formula' };
    }
    const code = this.code().trim();
    if (!code) {
      return { state: 'empty' };
    }
    try {
      new Function(code);
      return { state: 'valid' };
    } catch (error) {
      return {
        state: 'invalid',
        message: (error as Error).message,
      };
    }
  });

  protected onModeChange(event: Event): void {
    this.mode.set((event.target as HTMLSelectElement).value as CodeEditorMode);
  }

  protected onCodeChange(value: string): void {
    this.code.set(value);
    this.lastEmitted.set(value);
  }

  protected loadSnippet(snippet: CodeSnippet): void {
    this.mode.set(snippet.mode);
    this.code.set(snippet.code);
  }

  protected reset(): void {
    this.mode.set('code');
    this.code.set('');
    this.lastEmitted.set('');
  }
}
