import { describe, expect, it } from 'vitest';

import {
  createSoftwareProjectSchema,
  softwareProjectSchema,
} from './software-project.schema';

describe('software-project.schema', () => {
  it('validates a complete software project object', () => {
    // feliz
    const valid = {
      id: 1,
      name: 'Portal Financeiro',
      description: 'Sistema legado de emissão de NF',
      repositoryUrl: 'https://github.com/acme/financeiro',
      status: 'active',
      color: 'blue',
      githubRepoOwner: 'acme',
      githubRepoName: 'financeiro',
      openTicketsCount: 3,
      pullRequestsCount: 12,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    expect(softwareProjectSchema.parse(valid)).toMatchObject({
      id: 1,
      name: 'Portal Financeiro',
    });
  });

  it('validates creation payload and assigns defaults', () => {
    // feliz
    const input = {
      name: 'Novo ERP',
      repositoryUrl: 'acme/erp',
    };

    const parsed = createSoftwareProjectSchema.parse(input);
    expect(parsed.name).toBe('Novo ERP');
    expect(parsed.status).toBe('active');
    expect(parsed.color).toBe('blue');

    // triste - sem nome
    expect(() => createSoftwareProjectSchema.parse({ repositoryUrl: 'acme/erp' })).toThrow(
      'Informe o nome do sistema',
    );
  });
});
