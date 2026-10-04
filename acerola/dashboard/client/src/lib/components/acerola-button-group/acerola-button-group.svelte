<script lang="ts" module>
  /**
   * Botões que são UMA escolha só, colados um no outro (Dia · Semana · Mês). Envolve o
   * `ui/button-group` do shadcn, que arredonda só as pontas do grupo.
   *
   * Para muitas opções ou espaço estreito, use o `acerola-option-picker` (quebra linha e vira
   * seletor); este aqui é para duas a quatro opções curtas que cabem numa fileira.
   */
  export type ButtonGroupOption = { value: string; label: string };

  export type AcerolaButtonGroupProps = {
    data: { options: ButtonGroupOption[]; value: string };
    ui: {
      /** O que o grupo escolhe, para quem usa leitor de tela. */
      ariaLabel: string;
      orientation?: 'horizontal' | 'vertical';
      className?: string;
    };
    state?: { isDisabled?: boolean };
    actions?: { onChange?: (value: string) => void };
  };
</script>

<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { ButtonGroup } from '$lib/components/ui/button-group';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: groupState, actions }: AcerolaButtonGroupProps = $props();
</script>

<ButtonGroup aria-label={ui.ariaLabel} orientation={ui.orientation} class={ui.className}>
  {#each data.options as option (option.value)}
    {@const isSelected = option.value === data.value}
    <Button
      type="button"
      variant={isSelected ? 'default' : 'outline'}
      aria-pressed={isSelected}
      disabled={groupState?.isDisabled}
      class={cn('control-md rounded-control', !isSelected && 'bg-card')}
      onclick={() => actions?.onChange?.(option.value)}
    >
      {option.label}
    </Button>
  {/each}
</ButtonGroup>
