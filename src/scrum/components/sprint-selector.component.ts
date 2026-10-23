import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { type ScrumSprint, type SprintSelectionEvent } from './scrum.types';

let nextSprintSelectorInstance = 0;

/**
 * Controlled sprint selector. The host owns the sprint list, the selection and
 * the lifecycle policy; this component only renders the options and emits the
 * selected id.
 */
@Component({
  selector: 'decaf-sprint-selector',
  standalone: true,
  templateUrl: './sprint-selector.component.html',
  styleUrls: ['./sprint-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dcf-sprint-selector-host',
  },
})
export class SprintSelectorComponent {
  private readonly generatedInstanceId = `decaf-sprint-selector-${++nextSprintSelectorInstance}`;

  readonly sprints = input<readonly ScrumSprint[]>([]);
  readonly selectedSprintId = input<string | null>(null);
  readonly label = input('Sprint');
  readonly placeholder = input('Select a sprint');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly instanceId = input('');

  readonly sprintSelected = output<SprintSelectionEvent>();

  readonly resolvedInstanceId = computed(
    () => this.instanceId() || this.generatedInstanceId
  );
  readonly selectId = computed(() => `${this.resolvedInstanceId()}-select`);
  readonly isDisabled = computed(() => this.disabled() || this.loading());
  readonly statusId = computed(() => `${this.resolvedInstanceId()}-status`);
  readonly describe = computed(() =>
    this.loading() || !this.sprints().length ? this.statusId() : null
  );

  onChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = select?.value ?? '';
    if (select) {
      select.value = this.selectedSprintId() ?? '';
    }
    this.sprintSelected.emit({ sprintId: value || null });
  }
}
