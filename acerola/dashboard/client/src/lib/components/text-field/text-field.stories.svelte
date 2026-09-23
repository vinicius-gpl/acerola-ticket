<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import TextField from './text-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/TextField',
    component: TextField,
  });
</script>

<Story
  name="Default"
  args={{
    data: { label: 'E-mail', name: 'email', value: '', placeholder: 'voce@empresa.com.br' },
    ui: { type: 'email' },
  }}
/>

<Story
  name="Filled"
  args={{
    data: { label: 'E-mail', name: 'email', value: 'ana@empresa.com.br' },
    ui: { type: 'email' },
  }}
/>

<!-- Senha traz o botão de revelar — o resto do campo é o mesmo. -->
<Story
  name="Password"
  args={{
    data: { label: 'Senha', name: 'password', value: 'senha-secreta' },
    ui: { type: 'password' },
  }}
/>

<!-- O estado que mais aparece em produção e menos aparece em desenvolvimento: quem programa
     digita a senha certa; quem usa, não. -->
<Story
  name="WithError"
  args={{
    data: { label: 'E-mail', name: 'email', value: 'leyla' },
    ui: { type: 'email' },
    state: { error: 'Esse e-mail não parece válido' },
  }}
/>

<Story
  name="Disabled"
  args={{
    data: { label: 'E-mail', name: 'email', value: 'ana@empresa.com.br' },
    ui: { type: 'email' },
    state: { isDisabled: true },
  }}
/>

<!-- Data: o mesmo campo, só com o seletor do navegador. -->
<Story
  name="Date"
  args={{
    data: { label: 'Data do serviço', name: 'performedAt', value: '2026-09-20' },
    ui: { type: 'date' },
  }}
/>

<!-- Caso limite: mensagem de erro que quebra em duas linhas dentro de uma coluna estreita. -->
<Story
  name="LongErrorInNarrowColumn"
  args={{
    data: { label: 'Senha', name: 'password', value: 'curta' },
    ui: { type: 'password' },
    state: { error: 'A senha precisa ter ao menos 8 caracteres' },
  }}
>
  {#snippet template(args: ComponentProps<typeof TextField>)}
    <div class="border-ink-300 w-56 border border-dashed p-2">
      <TextField {...args} />
    </div>
  {/snippet}
</Story>
