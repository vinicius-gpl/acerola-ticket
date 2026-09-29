<script lang="ts" module>
  import type { StatusBadgeTone } from '$lib/components/status-badge/status-badge.svelte';

  /**
   * Seletor dinâmico — substitui o `<select>` nativo em filtro e formulário.
   *
   * Com POUCAS opções (até 6, contando "Todos"), vira uma fileira de pastilhas: a pessoa
   * compara e troca com um clique, sem abrir nada. Com MUITAS (departamento, tipo de
   * problema...), pastilha lado a lado viraria uma parede de botões — vira um botão que abre
   * um balão com busca, como o filtro de processos do agente.
   *
   * O tom (verde, vermelho...) é decidido por QUEM CHAMA — o mesmo cuidado do `StatusBadge`,
   * para a cor de uma situação nunca variar de tela pra tela.
   */
  export type OptionPickerOption = { value: string; label: string; tone?: StatusBadgeTone };

  export type OptionPickerProps = {
    data: { value: string; options: OptionPickerOption[] };
    ui?: {
      ariaLabel?: string;
      className?: string;
      /** Prefixa uma opção "Todos os X", representando o valor ''. Só faz sentido em filtro. */
      allLabel?: string;
      placeholder?: string;
      /** Veste o campo de formulário: o degrau `lg` da régua de medidas
       * (`lib/theme/tokens.css`), a mesma altura do `TextField`, do `SelectField` e do
       * `DatePicker`, e o combo esticando até a largura do campo ao lado. Numa barra de
       * filtro isso não vale — lá o controle usa o degrau `sm`, o mesmo do botão que mora
       * dentro de uma linha — por isso o padrão é `false`. */
      fullWidth?: boolean;
    };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };

  const PILL_MAX_OPTIONS = 6;

  const TONE_DOT_CLASSES: Record<StatusBadgeTone, string> = {
    neutral: 'bg-muted-foreground',
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    brand: 'bg-primary',
  };

  const TONE_SELECTED_CLASSES: Record<StatusBadgeTone, string> = {
    neutral: 'border-foreground bg-foreground text-background',
    info: 'border-blue-600 bg-blue-600 text-white',
    success: 'border-emerald-600 bg-emerald-600 text-white',
    warning: 'border-amber-500 bg-amber-500 text-white',
    danger: 'border-red-600 bg-red-600 text-white',
    brand: 'border-primary bg-primary text-primary-foreground',
  };

  function resolveOptions(data: OptionPickerProps['data'], allLabel: string | undefined): OptionPickerOption[] {
    return allLabel ? [{ value: '', label: allLabel }, ...data.options] : data.options;
  }
</script>

<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import SearchIcon from '@lucide/svelte/icons/search';

  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: OptionPickerProps = $props();

  let isOpen = $state(false);
  let query = $state('');

  const options = $derived(resolveOptions(data, ui?.allLabel));
  const isPillMode = $derived(options.length <= PILL_MAX_OPTIONS);
  const selectedOption = $derived(options.find((option) => option.value === data.value) ?? null);

  const filteredOptions = $derived(
    query.trim()
      ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
      : options,
  );

  function select(value: string): void {
    actions.onChange(value);
    isOpen = false;
    query = '';
  }
</script>

{#if isPillMode}
  <div class={cn('flex flex-wrap gap-1.5', ui?.className)} role="group" aria-label={ui?.ariaLabel}>
    {#each options as option (option.value || '__all__')}
      {@const isSelected = option.value === data.value}
      <button
        type="button"
        disabled={fieldState?.isDisabled}
        onclick={() => select(option.value)}
        class={cn(
          /* A RÉGUA DE MEDIDAS decide altura, respiro e raio (`lib/theme/tokens.css`):
             `lg` quando a pastilha veste campo de formulário, `sm` na barra de filtro.
             Pastilha, campo e botão precisam parecer a mesma família de controle. */
          ui?.fullWidth ? 'control-lg' : 'control-sm',
          'rounded-control inline-flex cursor-pointer items-center gap-1.5 border text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60',
          isSelected
            ? cn('shadow-xs font-semibold', TONE_SELECTED_CLASSES[option.tone ?? 'neutral'])
            : 'border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        )}
      >
        {#if option.tone && !isSelected}
          <span class={cn('size-1.5 rounded-full', TONE_DOT_CLASSES[option.tone])} aria-hidden="true"></span>
        {/if}
        {option.label}
      </button>
    {/each}
  </div>
{:else}
  <Popover bind:open={isOpen}>
    <PopoverTrigger
      disabled={fieldState?.isDisabled}
      aria-label={ui?.ariaLabel}
      class={cn(
        ui?.fullWidth ? 'control-lg' : 'control-sm',
        'rounded-control inline-flex w-full cursor-pointer items-center justify-between gap-2 border border-border/70 bg-card text-xs font-medium text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60',
        ui?.fullWidth ? 'sm:w-full' : 'sm:w-auto sm:min-w-[180px]',
        ui?.className,
      )}
    >
      <span class="truncate">{selectedOption?.label ?? ui?.placeholder ?? 'Selecione'}</span>
      <ChevronDownIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </PopoverTrigger>
    <!-- A LARGURA DO BALÃO É AMARRADA À DO BOTÃO, entre um piso e um teto.
         Com largura fixa, ele nascia estreito sob um botão largo (e as opções saíam
         cortadas) ou largo sob um botão estreito (e o balão parecia solto, fora do lugar).
         `--bits-popover-anchor-width` é a largura do gatilho, medida pelo próprio componente:
         daí para baixo ele nunca fica menor que o botão, e o teto impede que uma opção de
         nome comprido estique o balão pela tela — a opção é cortada, não a tela. -->
    <PopoverContent
      class="min-w-(--bits-popover-anchor-width) w-auto max-w-[min(26rem,calc(100vw-2rem))] p-0"
      align="start"
    >
      <div class="relative border-b border-border/70 p-2">
        <SearchIcon
          class="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          bind:value={query}
          placeholder="Buscar…"
          class={cn(
            /* A busca do balão é um controle como os outros: degrau `sm` da régua. */
            'control-sm rounded-control',
            'w-full border border-border/60 bg-muted/30 pr-2 pl-7 text-xs text-foreground outline-none focus:border-primary',
          )}
        />
      </div>
      <!-- `overflow-x-hidden` ao lado do vertical: pelo CSS, pedir rolagem num eixo
           transforma o outro em `auto` sozinho, e uma opção de nome comprido daria barra de
           rolagem horizontal dentro do balão. -->
      <div class="max-h-64 overflow-x-hidden overflow-y-auto p-1">
        {#each filteredOptions as option (option.value || '__all__')}
          {@const isSelected = option.value === data.value}
          <button
            type="button"
            onclick={() => select(option.value)}
            class={cn(
              /* Item de lista dentro de um balão é MIUDEZA, não controle: raio `chip`. */
              'flex w-full cursor-pointer items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-xs transition-colors',
              isSelected ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted/60',
            )}
          >
            {#if option.tone}
              <span class={cn('size-1.5 shrink-0 rounded-full', TONE_DOT_CLASSES[option.tone])} aria-hidden="true"
              ></span>
            {/if}
            <span class="flex-1 truncate">{option.label}</span>
            {#if isSelected}
              <CheckIcon class="size-3.5 shrink-0" aria-hidden="true" />
            {/if}
          </button>
        {:else}
          <p class="px-2.5 py-3 text-center text-xs text-muted-foreground">Nada encontrado.</p>
        {/each}
      </div>
    </PopoverContent>
  </Popover>
{/if}
