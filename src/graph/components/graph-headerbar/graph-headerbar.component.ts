import { CommonModule } from '@angular/common'
import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core'

type GraphHeaderTab = 'editor' | 'executions' | 'evaluations'

interface GraphHeaderAction {
  id: string
  label: string
  icon: 'download' | 'copy' | 'settings'
}

@Component({
  selector: 'ngx-decaf-graph-headerbar',
  templateUrl: './graph-headerbar.component.html',
  styleUrls: ['./graph-headerbar.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class GraphHeaderbarComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>)

  readonly projectName = input('Personal')
  readonly workflowName = input('My workflow 2')

  readonly activeTab = signal<GraphHeaderTab>('editor')
  readonly editingName = signal(false)
  readonly draftWorkflowName = signal('')
  readonly actionsOpen = signal(false)
  readonly tags = signal<string[]>([])
  readonly addingTag = signal(false)
  readonly draftTag = signal('')
  readonly selectedAction = signal<string | null>(null)

  readonly actions: GraphHeaderAction[] = [
    { id: 'duplicate', label: 'Duplicate workflow', icon: 'copy' },
    { id: 'download', label: 'Download JSON', icon: 'download' },
    { id: 'settings', label: 'Workflow settings', icon: 'settings' },
  ]

  startEditingName(): void {
    this.draftWorkflowName.set(this.workflowName())
    this.editingName.set(true)
  }

  saveWorkflowName(): void {
    const nextName = this.draftWorkflowName().trim()
    if (!nextName) {
      this.cancelEditingName()
      return
    }

    this.draftWorkflowName.set(nextName)
    this.editingName.set(false)
  }

  cancelEditingName(): void {
    this.draftWorkflowName.set(this.workflowName())
    this.editingName.set(false)
  }

  setActiveTab(tab: GraphHeaderTab): void {
    this.activeTab.set(tab)
  }

  toggleActionsMenu(): void {
    this.actionsOpen.update((open) => !open)
  }

  runAction(actionId: string): void {
    this.selectedAction.set(actionId)
    this.actionsOpen.set(false)
  }

  openTagInput(): void {
    this.draftTag.set('')
    this.addingTag.set(true)
  }

  addTag(): void {
    const nextTag = this.draftTag().trim()
    if (!nextTag) {
      this.addingTag.set(false)
      return
    }

    if (!this.tags().includes(nextTag)) {
      this.tags.update((tags) => [...tags, nextTag])
    }

    this.draftTag.set('')
    this.addingTag.set(false)
  }

  cancelTag(): void {
    this.draftTag.set('')
    this.addingTag.set(false)
  }

  removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((entry) => entry !== tag))
  }

  trackAction(_: number, action: GraphHeaderAction): string {
    return action.id
  }

  trackTag(_: number, tag: string): string {
    return tag
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.actionsOpen.set(false)
      this.addingTag.set(false)
      if (this.editingName()) {
        this.cancelEditingName()
      }
    }
  }
}
