<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import UserProfileDialog from './acerola-user-profile-dialog.svelte';

  const baseUser = {
    name: 'Vinícius Gabriel',
    email: 'vinicius@empresa.com.br',
    role: 'Administrador',
    roles: {
      sistema: 'admin' as const,
      infra: 'user' as const,
      manutencao: 'manager' as const,
    },
  };

  const baseActions = {
    onClose: fn(),
    onViewRoles: fn(),
    onLogout: fn(),
  };

  const { Story } = defineMeta({
    title: 'Components/AcerolaUserProfileDialog',
    component: UserProfileDialog,
  });
</script>

<Story
  name="Default"
  args={{
    data: { user: baseUser },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>

<Story
  name="StandardUser"
  args={{
    data: {
      user: {
        name: 'Carlos Oliveira',
        email: 'carlos@empresa.com.br',
        role: 'Usuário',
        roles: {
          sistema: 'user' as const,
          infra: 'user' as const,
          manutencao: 'user' as const,
        },
      },
    },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>
