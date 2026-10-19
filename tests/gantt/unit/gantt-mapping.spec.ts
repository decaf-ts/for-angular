/**
 * SAA-1045 — unit coverage for the `/gantt` mapping layer.
 * Pure functions only: no Angular fixture, no vendor rendering.
 */
import { GanttViewType } from '@worktile/gantt';

import {
  buildGanttMapping,
  ganttViewScale,
  ganttViewType,
} from '../../../gantt/src/lib/gantt-mapping';
import {
  ganttConfigFromFields,
  ganttDateOnly,
  ganttDependencyType,
  normalizeGanttDate,
  toGanttDateRange,
  validateGanttModel,
  type GanttConfig,
} from '../../../gantt/src/lib/gantt.types';

interface Task {
  id: string;
  name: string;
  from: string | Date | number;
  to: string | Date | number;
  done?: number;
  parentId?: string;
  deps?: (string | { id: string; type?: 'fs' | 'ff' | 'ss' | 'sf' })[];
  flag?: boolean;
  tone?: string;
  locked?: boolean;
  hint?: string;
}

const CONFIG: GanttConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.name,
  start: (task) => task.from,
  end: (task) => task.to,
  progress: (task) => task.done,
  parent: (task) => task.parentId,
  dependencies: (task) => task.deps,
  milestone: (task) => Boolean(task.flag),
  color: (task) => task.tone,
  editable: (task) => task.locked !== true,
  tooltip: (task) => task.hint,
};

const OPTIONS = { draggable: true };

describe('ganttConfigFromFields', () => {
  it('maps every configured field and defaults editable to true', () => {
    const fields = {
      id: 'id',
      title: 'name',
      start: 'from',
      end: 'to',
      progress: 'done',
      parent: 'parentId',
      dependencies: 'deps',
      milestone: 'flag',
      color: 'tone',
      editable: 'locked',
      tooltip: 'hint',
    } as const;
    const config = ganttConfigFromFields<Task>(fields);
    const task: Task = {
      id: 'a',
      name: 'Alpha',
      from: '2026-10-05',
      to: '2026-10-09',
      done: 0.5,
      parentId: 'root',
      deps: ['root'],
      flag: true,
      tone: '#123456',
      locked: false,
      hint: 'tip',
    };

    expect(config.id(task)).toBe('a');
    expect(config.title(task)).toBe('Alpha');
    expect(config.start(task)).toBe('2026-10-05');
    expect(config.end(task)).toBe('2026-10-09');
    expect(config.progress?.(task)).toBe(0.5);
    expect(config.parent?.(task)).toBe('root');
    expect(config.dependencies?.(task)).toEqual(['root']);
    expect(config.milestone?.(task)).toBe(true);
    expect(config.color?.(task)).toBe('#123456');
    expect(config.editable?.(task)).toBe(false);
    expect(config.tooltip?.(task)).toBe('tip');
  });

  it('reads absent optional fields without throwing', () => {
    const config = ganttConfigFromFields<Task>({
      id: 'id',
      title: 'name',
      start: 'from',
      end: 'to',
    });
    const task = {
      id: 'b',
      name: 'Beta',
      from: '2026-10-05',
      to: '2026-10-06',
    } as Task;

    expect(config.progress?.(task)).toBeUndefined();
    expect(config.parent?.(task)).toBeUndefined();
    expect(config.dependencies?.(task)).toBeUndefined();
    expect(config.milestone?.(task)).toBe(false);
    expect(config.editable?.(task)).toBe(true);
  });
});

describe('date normalization', () => {
  it('treats date-only strings as local calendar dates', () => {
    const date = normalizeGanttDate('2026-10-05');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(5);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
    expect(date?.getSeconds()).toBe(0);
  });

  it('rejects impossible calendar dates instead of rolling them over', () => {
    expect(normalizeGanttDate('2026-02-30')).toBeNull();
    expect(normalizeGanttDate('2026-13-01')).toBeNull();
  });

  it('distinguishes seconds from milliseconds by magnitude', () => {
    const seconds = normalizeGanttDate(1_700_000_000);
    const millis = normalizeGanttDate(1_700_000_000_000);
    expect(seconds?.getTime()).toBe(1_700_000_000_000);
    expect(millis?.getTime()).toBe(1_700_000_000_000);
  });

  it('copies Date instances and rejects invalid values', () => {
    const source = new Date(2026, 9, 5, 12);
    const copy = normalizeGanttDate(source);
    expect(copy?.getTime()).toBe(source.getTime());
    expect(copy).not.toBe(source);

    expect(normalizeGanttDate(null)).toBeNull();
    expect(normalizeGanttDate(undefined)).toBeNull();
    expect(normalizeGanttDate('')).toBeNull();
    expect(normalizeGanttDate('   ')).toBeNull();
    expect(normalizeGanttDate('not-a-date')).toBeNull();
    expect(normalizeGanttDate(Number.NaN)).toBeNull();
    expect(normalizeGanttDate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeGanttDate(new Date(Number.NaN))).toBeNull();
  });

  it('exposes stable date-only strings alongside Date values', () => {
    expect(ganttDateOnly(normalizeGanttDate('2026-10-05'))).toBe('2026-10-05');
    expect(ganttDateOnly(null)).toBeNull();
    expect(toGanttDateRange('2026-10-05', '2026-10-09')).toEqual({
      start: new Date(2026, 9, 5),
      end: new Date(2026, 9, 9),
      startDate: '2026-10-05',
      endDate: '2026-10-09',
    });
  });

  it('normalizes dependency inputs with finish-to-start as the default', () => {
    expect(ganttDependencyType('a')).toEqual({ id: 'a', type: 'fs' });
    expect(ganttDependencyType('  a  ')).toEqual({ id: 'a', type: 'fs' });
    expect(ganttDependencyType({ id: 'a' })).toEqual({ id: 'a', type: 'fs' });
    expect(ganttDependencyType({ id: 'a', type: 'ss' })).toEqual({
      id: 'a',
      type: 'ss',
    });
    expect(ganttDependencyType('')).toBeNull();
    expect(ganttDependencyType({ id: '  ' })).toBeNull();
    expect(ganttDependencyType(null)).toBeNull();
  });

  it('round-trips every view scale', () => {
    const scales = ['day', 'week', 'month', 'quarter', 'year'] as const;
    for (const scale of scales) {
      const vendor = ganttViewType(scale);
      expect(Object.values(GanttViewType)).toContain(vendor);
      expect(ganttViewScale(vendor)).toBe(scale);
    }
    expect(ganttViewScale('bogus' as GanttViewType)).toBeNull();
  });
});

describe('buildGanttMapping', () => {
  it('builds parent/child hierarchy and expands parents only', () => {
    const tasks: Task[] = [
      { id: 'root', name: 'Root', from: '2026-10-01', to: '2026-10-31' },
      {
        id: 'child',
        name: 'Child',
        from: '2026-10-05',
        to: '2026-10-09',
        parentId: 'root',
      },
      {
        id: 'grandchild',
        name: 'Grandchild',
        from: '2026-10-06',
        to: '2026-10-07',
        parentId: 'child',
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.items).toHaveLength(1);
    expect(mapping.items[0].id).toBe('root');
    expect(mapping.items[0].expandable).toBe(true);
    expect(mapping.items[0].children?.map((child) => child.id)).toEqual([
      'child',
    ]);
    expect(mapping.items[0].children?.[0].children?.map((c) => c.id)).toEqual([
      'grandchild',
    ]);
    expect(mapping.byId.get('grandchild')?.editable).toBe(true);
  });

  it('drops unknown and cyclic parents so those tasks stay as roots', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        name: 'A',
        from: '2026-10-01',
        to: '2026-10-02',
        parentId: 'missing',
      },
      {
        id: 'b',
        name: 'B',
        from: '2026-10-01',
        to: '2026-10-02',
        parentId: 'c',
      },
      {
        id: 'c',
        name: 'C',
        from: '2026-10-01',
        to: '2026-10-02',
        parentId: 'b',
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.items.map((item) => item.id).sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('collapses milestones to a single-day instant', () => {
    const tasks: Task[] = [
      {
        id: 'm',
        name: 'Milestone',
        from: '2026-10-28',
        to: '2026-10-31',
        flag: true,
        done: 0,
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    const mapped = mapping.byId.get('m');
    expect(mapped?.milestone).toBe(true);
    expect(mapped?.start?.getTime()).toBe(mapped?.end?.getTime());
    expect(new Date(mapped?.item.start as Date).getTime()).toBe(
      new Date(mapped?.item.end as Date).getTime()
    );
  });

  it('emits predecessor -> successor links with the configured type', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', from: '2026-10-01', to: '2026-10-03' },
      {
        id: 'b',
        name: 'B',
        from: '2026-10-05',
        to: '2026-10-08',
        deps: ['a'],
      },
      {
        id: 'c',
        name: 'C',
        from: '2026-10-06',
        to: '2026-10-09',
        deps: [{ id: 'a', type: 'ss' }],
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    const rootById = new Map(mapping.items.map((item) => [item.id, item]));
    expect(rootById.get('a')?.links).toEqual([
      { type: 1, link: 'b' },
      { type: 3, link: 'c' },
    ]);
    expect(rootById.get('b')?.links).toEqual([]);
    expect(mapping.dependencies.get('b')).toEqual([{ id: 'a', type: 'fs' }]);
    expect(mapping.dependencies.get('c')).toEqual([{ id: 'a', type: 'ss' }]);
  });

  it('ignores duplicate ids, self links, and unknown dependencies', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'First', from: '2026-10-01', to: '2026-10-03' },
      { id: 'a', name: 'Duplicate', from: '2026-10-10', to: '2026-10-12' },
      {
        id: 'b',
        name: 'B',
        from: '2026-10-05',
        to: '2026-10-08',
        deps: ['b', 'missing', 'a'],
      },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.taskCount).toBe(2);
    expect(mapping.byId.get('a')?.title).toBe('First');
    expect(mapping.dependencies.get('b')).toEqual([{ id: 'a', type: 'fs' }]);
  });

  it('keeps invalid-date tasks in the table without a bar and reports them', () => {
    const tasks: Task[] = [
      { id: 'ok', name: 'OK', from: '2026-10-01', to: '2026-10-03' },
      { id: 'bad', name: 'Bad', from: '', to: '2026-10-03' },
      { id: 'reverse', name: 'Reverse', from: '2026-10-09', to: '2026-10-05' },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.byId.get('bad')?.start).toBeNull();
    expect(mapping.byId.get('bad')?.item.start).toBeUndefined();
    expect(mapping.byId.get('reverse')?.end).toBeNull();
    expect(mapping.hasValidTasks).toBe(true);
    expect(validateGanttModel(tasks, CONFIG).map((issue) => issue.code)).toEqual(
      ['invalid-date', 'invalid-date']
    );
  });

  it('clamps unusable progress to null and reports the invalid value', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', from: '2026-10-01', to: '2026-10-02', done: 1.4 },
      { id: 'b', name: 'B', from: '2026-10-01', to: '2026-10-02', done: -0.1 },
      { id: 'c', name: 'C', from: '2026-10-01', to: '2026-10-02', done: 0.5 },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.byId.get('a')?.progress).toBeNull();
    expect(mapping.byId.get('b')?.progress).toBeNull();
    expect(mapping.byId.get('c')?.progress).toBe(0.5);
    expect(validateGanttModel(tasks, CONFIG).map((issue) => issue.code)).toEqual(
      ['invalid-progress', 'invalid-progress']
    );
  });

  it('derives a padded timeline from the valid task range', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', from: '2026-10-05', to: '2026-10-09' },
      { id: 'b', name: 'B', from: '2026-10-12', to: '2026-10-20' },
    ];

    const mapping = buildGanttMapping(tasks, CONFIG, OPTIONS);
    expect(mapping.timelineStart).toEqual(new Date(2026, 9, 4));
    expect(mapping.timelineEnd).toEqual(new Date(2026, 9, 21));
  });

  it('returns an empty root set when there are no usable tasks', () => {
    const mapping = buildGanttMapping<Task>([], CONFIG, OPTIONS);
    expect(mapping.items).toEqual([]);
    expect(mapping.taskCount).toBe(0);
    expect(mapping.hasValidTasks).toBe(false);
    expect(mapping.timelineStart).toBeNull();
    expect(mapping.timelineEnd).toBeNull();
  });
});

describe('validateGanttModel', () => {
  it('reports invalid, duplicate, unknown-parent, and parent-cycle inputs', () => {
    const tasks: Task[] = [
      { id: '', name: 'Empty', from: '2026-10-01', to: '2026-10-02' },
      { id: 'a', name: 'A', from: '2026-10-01', to: '2026-10-02' },
      { id: 'a', name: 'A2', from: '2026-10-01', to: '2026-10-02' },
      {
        id: 'b',
        name: 'B',
        from: '2026-10-01',
        to: '2026-10-02',
        parentId: 'missing',
      },
      {
        id: 'c',
        name: 'C',
        from: '2026-10-01',
        to: '2026-10-02',
        parentId: 'c',
      },
    ];

    const codes = validateGanttModel(tasks, CONFIG).map((issue) => issue.code);
    expect(codes).toContain('invalid-id');
    expect(codes).toContain('duplicate-id');
    expect(codes).toContain('unknown-parent');
    expect(codes).toContain('parent-cycle');
  });

  it('reports unknown, self, invalid-type, cyclic, and violated dependencies', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', from: '2026-10-01', to: '2026-10-09' },
      {
        id: 'b',
        name: 'B',
        from: '2026-10-05',
        to: '2026-10-12',
        deps: ['a'],
      },
      {
        id: 'c',
        name: 'C',
        from: '2026-10-01',
        to: '2026-10-02',
        deps: ['c', 'missing', { id: 'a', type: 'xx' as 'fs' }],
      },
    ];

    const issues = validateGanttModel(tasks, CONFIG);
    const codes = issues.map((issue) => issue.code);
    expect(codes).toContain('self-dependency');
    expect(codes).toContain('unknown-dependency');
    expect(codes).toContain('invalid-dependency-type');
    expect(codes).toContain('dependency-violation');

    const cyclic = validateGanttModel<Task>(
      [
        {
          id: 'x',
          name: 'X',
          from: '2026-10-01',
          to: '2026-10-02',
          deps: ['y'],
        },
        {
          id: 'y',
          name: 'Y',
          from: '2026-10-01',
          to: '2026-10-02',
          deps: ['x'],
        },
      ],
      CONFIG
    );
    expect(cyclic.map((issue) => issue.code)).toContain('dependency-cycle');
  });
});
