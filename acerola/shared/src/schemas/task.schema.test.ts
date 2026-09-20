import { describe, expect, it } from 'vitest';

import {
  createTaskSchema,
  TITLE_MAX_LENGTH,
  taskFormSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from './task.schema';

describe('createTaskSchema', () => {
  // feliz
  it('accepts a title and starts the task as todo', () => {
    expect(createTaskSchema.parse({ title: 'Ligar para o cliente' })).toEqual({
      title: 'Ligar para o cliente',
      status: 'todo',
    });
  });

  it('trims the title before storing it', () => {
    expect(createTaskSchema.parse({ title: '  Revisar contrato  ' }).title).toBe(
      'Revisar contrato',
    );
  });

  it('turns an empty description into null', () => {
    expect(createTaskSchema.parse({ title: 'X', description: '   ' }).description).toBeNull();
  });

  // triste
  it('refuses a title made only of spaces, with a screen message in Portuguese', () => {
    const result = createTaskSchema.safeParse({ title: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe o título');
  });

  it('refuses a missing title with the same message', () => {
    const result = createTaskSchema.safeParse({});

    expect(result.error?.issues[0]?.message).toBe('Informe o título');
  });

  it('refuses a title longer than the limit', () => {
    const result = createTaskSchema.safeParse({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) });

    expect(result.success).toBe(false);
  });

  it('refuses a status that does not exist', () => {
    expect(createTaskSchema.safeParse({ title: 'X', status: 'late' }).success).toBe(false);
  });

  /* Autoria é carimbada no servidor. Um campo a mais no corpo não pode chegar ao banco. */
  it('drops authorship sent in the body', () => {
    const parsed = createTaskSchema.parse({ title: 'X', createdBy: 'someone@else.com' });

    expect(parsed).not.toHaveProperty('createdBy');
  });
});

describe('updateTaskSchema', () => {
  // feliz
  it('accepts a partial change', () => {
    expect(updateTaskSchema.parse({ status: 'done' })).toEqual({ status: 'done' });
  });

  it('keeps null as "clear this field", different from absent', () => {
    expect(updateTaskSchema.parse({ description: null })).toEqual({ description: null });
    expect(updateTaskSchema.parse({})).not.toHaveProperty('description');
  });

  // triste
  it('does not accept clearing the title', () => {
    expect(updateTaskSchema.safeParse({ title: '' }).success).toBe(false);
  });
});

describe('taskListQuerySchema', () => {
  it('applies the pagination defaults', () => {
    expect(taskListQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 50 });
  });

  it('reads numbers that arrive as text in the query string', () => {
    expect(taskListQuerySchema.parse({ page: '2' }).page).toBe(2);
  });

  // triste
  it('refuses a page size above the ceiling', () => {
    expect(taskListQuerySchema.safeParse({ pageSize: '5000' }).success).toBe(false);
  });
});

describe('taskFormSchema', () => {
  // feliz
  it('accepts the form as the screen holds it, with an empty description', () => {
    expect(taskFormSchema.safeParse({ title: 'X', description: '', status: 'todo' }).success).toBe(
      true,
    );
  });

  // triste
  it('uses the same title message as the API contract', () => {
    const result = taskFormSchema.safeParse({ title: ' ', description: '', status: 'todo' });

    expect(result.error?.issues[0]?.message).toBe('Informe o título');
  });
});
