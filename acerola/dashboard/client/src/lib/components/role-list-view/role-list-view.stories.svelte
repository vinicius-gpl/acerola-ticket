<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import { fn } from 'storybook/test';

  import RoleListView from './role-list-view.svelte';

  const mockRoles: InternalRole[] = [
    {
      id: 1,
      userId: 'usr_1',
      userEmail: 'vinicius@empresa.com.br',
      context: 'infra',
      role: 'user',
      createdAt: '2026-10-01T12:00:00.000Z',
      createdBy: 'admin@empresa.com.br',
      updatedAt: null,
      updatedBy: null,
    },
    {
      id: 2,
      userId: 'usr_1',
      userEmail: 'vinicius@empresa.com.br',
      context: 'sistema',
      role: 'admin',
      createdAt: '2026-10-01T12:00:00.000Z',
      createdBy: 'admin@empresa.com.br',
      updatedAt: null,
      updatedBy: null,
    },
    {
      id: 3,
      userId: 'usr_1',
      userEmail: 'vinicius@empresa.com.br',
      context: 'manutencao',
      role: 'manager',
      createdAt: '2026-10-01T12:00:00.000Z',
      createdBy: 'admin@empresa.com.br',
      updatedAt: null,
      updatedBy: null,
    },
  ];

  const baseActions = {
    onCreate: fn(),
    onEdit: fn(),
    onAskDelete: fn(),
    onSearchChange: fn(),
    onContextChange: fn(),
    onClearFilters: fn(),
    onRetry: fn(),
  };

  const { Story } = defineMeta({
    title: 'Components/RoleListView',
    component: RoleListView,
  });
</script>

<Story
  name="Default"
  args={{
    data: { roles: mockRoles, total: 3, filter: { search: '', context: '' } },
    state: { isLoading: false, isEmpty: false, isFilteredOut: false, error: null },
    actions: baseActions,
  }}
/>

<!-- A MESMA tela em 400px: a tabela sai de cena e entra o cartão empilhado (skill `ui-standards`). -->
<Story
  name="Celular" globals={{ viewport: { value: 'celular' } }}
  args={{
    data: { roles: mockRoles, total: 3, filter: { search: '', context: '' } },
    state: { isLoading: false, isEmpty: false, isFilteredOut: false, error: null },
    actions: baseActions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { roles: [], total: 0, filter: { search: '', context: '' } },
    state: { isLoading: true, isEmpty: false, isFilteredOut: false, error: null },
    actions: baseActions,
  }}
/>

<Story
  name="Empty"
  args={{
    data: { roles: [], total: 0, filter: { search: '', context: '' } },
    state: { isLoading: false, isEmpty: true, isFilteredOut: false, error: null },
    actions: baseActions,
  }}
/>

<Story
  name="FilteredOut"
  args={{
    data: { roles: [], total: 3, filter: { search: 'sem-resultado', context: '' } },
    state: { isLoading: false, isEmpty: false, isFilteredOut: true, error: null },
    actions: baseActions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { roles: [], total: 0, filter: { search: '', context: '' } },
    state: {
      isLoading: false,
      isEmpty: false,
      isFilteredOut: false,
      error: 'Não foi possível carregar os cargos.',
    },
    actions: baseActions,
  }}
/>
