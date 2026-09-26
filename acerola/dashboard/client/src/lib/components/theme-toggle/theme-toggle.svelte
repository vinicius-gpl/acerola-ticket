<script lang="ts">
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import { useThemeModel } from '$lib/theme/theme.svelte';

  /**
   * O botão de trocar entre claro e escuro — do mesmo jeito que o do agente
   * (`acerola/agent/svelte/src/lib/components/acerola-theme-toggle`): cuida do próprio tema,
   * sem precisar que a rota passe estado nenhum. Ícone de lua quando está escuro, sol quando
   * está claro — o ícone mostra o tema DE AGORA, não para onde o clique leva.
   */
  const theme = useThemeModel();
</script>

<ActionButton
  data={{ label: theme.theme === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro' }}
  ui={{ variant: 'ghost', size: 'sm', icon: theme.theme === 'dark' ? Moon : Sun, isIconOnly: true }}
  actions={{ onClick: theme.actions.onToggle }}
/>
