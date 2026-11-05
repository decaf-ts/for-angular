import { TestBed } from '@angular/core/testing';
import {
  KanbanBoardComponent,
  kanbanConfigFromFields,
  type KanbanConfig,
} from '@decaf-ts/for-angular/kanban';

interface Task {
  id: string;
  title: string;
  status: string;
}

describe('packed kanban smoke', () => {
  it('loads the component and helper from the packed distribution', () => {
    const config = kanbanConfigFromFields<Task>(
      { id: 'id', title: 'title', status: 'status' },
      [{ id: 'todo', title: 'To do' }]
    );
    expect(config.id({ id: 'a', title: 'A', status: 'todo' } as Task)).toBe('a');

    TestBed.configureTestingModule({ imports: [KanbanBoardComponent] });
    const fixture = TestBed.createComponent(KanbanBoardComponent<Task>);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('config', config as KanbanConfig<Task>);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dcf-kanban')).toBeTruthy();
  });
});
