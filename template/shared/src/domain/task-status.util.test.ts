import { describe, expect, it } from 'vitest';

import {
  calculateTaskProgress,
  isTaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  taskStatusTone,
} from './task-status.util';

describe('TASK_STATUS_LABELS', () => {
  it('has a screen label for every status', () => {
    for (const status of TASK_STATUSES) {
      expect(TASK_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe('taskStatusTone', () => {
  // feliz
  it('paints a finished task as success', () => {
    expect(taskStatusTone('done')).toBe('success');
  });

  it('gives each status its own tone, so they can be told apart at a glance', () => {
    const tones = TASK_STATUSES.map(taskStatusTone);

    expect(new Set(tones).size).toBe(TASK_STATUSES.length);
  });
});

describe('isTaskStatus', () => {
  // feliz
  it('accepts a known status', () => {
    expect(isTaskStatus('doing')).toBe(true);
  });

  // triste
  it('refuses the screen label, which is not the stored value', () => {
    expect(isTaskStatus('Concluída')).toBe(false);
  });

  it('refuses anything that is not a string', () => {
    expect(isTaskStatus(null)).toBe(false);
    expect(isTaskStatus(1)).toBe(false);
  });
});

describe('calculateTaskProgress', () => {
  // feliz
  it('counts the finished ones over the total', () => {
    expect(calculateTaskProgress(['done', 'todo', 'doing', 'done'])).toEqual({
      percentage: 50,
      done: 2,
      total: 4,
    });
  });

  it('rounds the percentage instead of showing decimals', () => {
    expect(calculateTaskProgress(['done', 'todo', 'todo']).percentage).toBe(33);
  });

  // triste
  it('does not divide by zero on an empty list, and says the total is zero', () => {
    expect(calculateTaskProgress([])).toEqual({ percentage: 0, done: 0, total: 0 });
  });

  it('does not count work in progress as done', () => {
    expect(calculateTaskProgress(['doing', 'doing']).done).toBe(0);
  });
});
