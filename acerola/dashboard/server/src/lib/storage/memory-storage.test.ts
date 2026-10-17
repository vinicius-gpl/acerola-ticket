import { describe, expect, it } from 'vitest';

import { MemoryStorage } from './memory-storage';

describe('MemoryStorage', () => {
  // feliz
  it('gives back what was stored, with its type and size', async () => {
    const storage = new MemoryStorage();
    await storage.put('tmp/a.pdf', Buffer.from('pdf'), 'application/pdf');

    expect((await storage.get('tmp/a.pdf'))?.content.toString()).toBe('pdf');
    expect(await storage.head('tmp/a.pdf')).toEqual({ size: 3, contentType: 'application/pdf' });
  });

  it('moves a file out of the staging area', async () => {
    const storage = new MemoryStorage();
    await storage.put('tmp/a.pdf', Buffer.from('a'), 'application/pdf');

    await storage.move('tmp/a.pdf', 'ticket-attachments/8.pdf');

    expect(await storage.get('tmp/a.pdf')).toBeNull();
    expect(await storage.get('ticket-attachments/8.pdf')).not.toBeNull();
  });

  it('lists only the folder asked for, filtered by the caller', async () => {
    const storage = new MemoryStorage();
    await storage.put('tmp/old.pdf', Buffer.from('a'), null, new Date('2026-10-01'));
    await storage.put('tmp/new.pdf', Buffer.from('b'), null, new Date('2026-10-15'));
    await storage.put('ticket-attachments/x.pdf', Buffer.from('c'), null, new Date('2026-10-01'));

    const old = await storage.list(
      'tmp/',
      10,
      (file) => file.lastModified! < new Date('2026-10-10'),
    );

    expect(old.map((file) => file.key)).toEqual(['tmp/old.pdf']);
  });

  // triste
  it('answers null for a key that does not exist', async () => {
    expect(await new MemoryStorage().get('tmp/nothing')).toBeNull();
    expect(await new MemoryStorage().head('tmp/nothing')).toBeNull();
  });

  it('does not fail when removing a key that is already gone', async () => {
    await expect(new MemoryStorage().remove(['tmp/gone'])).resolves.toBeUndefined();
  });
});
