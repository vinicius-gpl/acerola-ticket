import { describe, expect, it } from 'vitest';

import {
  parseGitHubRepo,
  softwareProjectStatusLabel,
} from './software-project.util';

describe('software-project.util', () => {
  it('parses GitHub URLs and owner/repo formats correctly', () => {
    // feliz
    expect(parseGitHubRepo('https://github.com/vinicius-gpl/acerola-ticket')).toEqual({
      owner: 'vinicius-gpl',
      repo: 'acerola-ticket',
    });
    expect(parseGitHubRepo('https://github.com/vinicius-gpl/acerola-ticket.git')).toEqual({
      owner: 'vinicius-gpl',
      repo: 'acerola-ticket',
    });
    expect(parseGitHubRepo('vinicius-gpl/acerola-ticket')).toEqual({
      owner: 'vinicius-gpl',
      repo: 'acerola-ticket',
    });

    // triste
    expect(parseGitHubRepo('')).toBeNull();
    expect(parseGitHubRepo('invalid-format')).toBeNull();
    expect(parseGitHubRepo('https://gitlab.com/owner/repo')).toBeNull();
  });

  it('translates status label to pt-BR', () => {
    expect(softwareProjectStatusLabel('active')).toBe('Ativo');
    expect(softwareProjectStatusLabel('maintenance')).toBe('Manutenção');
    expect(softwareProjectStatusLabel('deprecated')).toBe('Legado / Descontinuado');
  });
});
