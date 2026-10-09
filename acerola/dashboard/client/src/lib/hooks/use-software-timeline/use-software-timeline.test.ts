import { QueryClient } from '@tanstack/svelte-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSoftwareTimelineModel } from './use-software-timeline.svelte';

let mockQueryState = {
  isPending: false,
  data: { items: [] as Array<{ id: number; title: string; type: string; timestamp: string }> },
  error: null as unknown,
};

vi.mock('$lib/api/software-timeline.api', () => ({
  softwareTimelineApi: {
    list: vi.fn(),
  },
}));

vi.mock('$lib/hooks/use-mirror-store/use-mirror-store.svelte', () => ({
  mirrorStore: vi.fn(() => ({
    get current() {
      return mockQueryState;
    },
  })),
}));

vi.mock('@tanstack/svelte-query', () => ({
  createQuery: vi.fn((store) => store),
  useQueryClient: vi.fn(() => new QueryClient()),
}));

describe('useSoftwareTimelineModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryState = {
      isPending: false,
      data: { items: [] },
      error: null,
    };
  });

  // feliz
  it('loads timeline items for the given project', () => {
    const model = useSoftwareTimelineModel(1);
    expect(model.data.items).toEqual([]);
    expect(model.state.isLoading).toBe(false);
    expect(model.state.error).toBeNull();
  });

  // triste
  it('handles error state properly when timeline query fails', () => {
    mockQueryState = {
      isPending: false,
      data: { items: [] },
      error: new Error('Network error'),
    };
    const model = useSoftwareTimelineModel(999);
    expect(model.state.isLoading).toBe(false);
    expect(model.state.error).toBeTruthy();
  });
});
