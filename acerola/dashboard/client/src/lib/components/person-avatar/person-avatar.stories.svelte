<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import PersonAvatar from './person-avatar.svelte';

  const { Story } = defineMeta({
    title: 'Components/PersonAvatar',
    component: PersonAvatar,
  });
</script>

<!-- O caso de hoje: sem provedor de identidade externo, o avatar é sempre iniciais. -->
<Story name="Initials" args={{ name: 'Rafael Camargo' }} />

<!-- O caso de amanhã: `avatarUrl` preenchido troca as iniciais pela foto, sem quem usa
     PersonAvatar mudar uma linha. -->
<Story
  name="WithPhoto"
  args={{ name: 'Camila Duarte', avatarUrl: 'https://i.pravatar.cc/64?img=47' }}
/>

<Story name="Small" args={{ name: 'Ana', ui: { size: 'sm' } }} />

<Story name="Medium" args={{ name: 'Ana', ui: { size: 'md' } }} />

<!-- Caso limite: nome de uma palavra só cai numa inicial só, não duas — não há sobrenome
     de onde tirar a segunda letra. -->
<Story name="SingleWordName" args={{ name: 'Bia' }} />
