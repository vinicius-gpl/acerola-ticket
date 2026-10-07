<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import { tv } from 'tailwind-variants';

  import type { StatusBadgeTone } from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';

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
  /** `icon` é opcional: um desenho na frente do texto, para a opção não ser só uma palavra. */
  export type OptionPickerOption = {
    value: string;
    label: string;
    tone?: StatusBadgeTone;
    icon?: LucideIcon;
  };

  export type AcerolaOptionPickerProps = {
    data: { value: string; options: OptionPickerOption[] };
    ui?: {
      ariaLabel?: string;
      className?: string;
      /** Prefixa uma opção "Todos os X", representando o valor ''. Só faz sentido em filtro. */
      allLabel?: string;
      placeholder?: string;
      /** Estica o combo até a largura do campo ao lado, como num formulário. A ALTURA não
       * depende disto: pastilha ou combo, filtro ou formulário, o controle tem sempre os 40px
       * de todo campo (`control-lg`), a mesma do `TextField`, do `SelectField` e do
       * `DatePicker`. */
      fullWidth?: boolean;
    };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };

  /**
   * Até quantas opções o controle é uma fileira de pastilhas; acima disso vira a lista que abre.
   *
   * Em FILTRO a barra tem a largura da tela e as pastilhas podem quebrar linha: seis ainda se
   * leem de relance. Em FORMULÁRIO (dentro de um diálogo) a largura é a de um campo, e pastilha
   * só serve enquanto cabe em UMA linha — com mais de três, elas quebram em duas ou três
   * fileiras e o campo passa a ocupar mais altura do que todos os outros juntos. Ali a lista
   * que abre escala para qualquer quantidade, e ainda tem busca.
   */
  const PILL_MAX_OPTIONS = { filter: 6, form: 3 } as const;

  /**
   * O TRILHO das pastilhas.
   *
   * A altura de campo é a do trilho inteiro (40px, com a borda e o respiro dele), não a de cada
   * pastilha: com a pastilha em 32px o trilho somava 42px e ficava mais alto que o seletor ao
   * lado. `min-h`, e não `h`: no celular as opções quebram em mais de uma linha.
   *
   * `layout` é onde o controle mora. Em FILTRO as pastilhas seguem em fileira, cada uma do
   * tamanho do próprio texto, e quebram linha em vez de rolar para o lado. Em FORMULÁRIO são
   * no máximo três (ver `PILL_MAX_OPTIONS`) e dividem a largura do campo em colunas iguais,
   * numa linha só.
   */
  const optionTrack = tv({
    base: 'items-stretch gap-1 rounded-control border border-border/70 bg-muted/50 p-1 min-h-(--control-lg)',
    variants: {
      layout: {
        filter: 'inline-flex flex-wrap',
        form: 'grid w-full',
      },
      /* Só vale na grade do formulário: uma coluna por opção. */
      columns: { 1: '', 2: '', 3: '' },
    },
    compoundVariants: [
      { layout: 'form', columns: 1, class: 'grid-cols-1' },
      { layout: 'form', columns: 2, class: 'grid-cols-2' },
      { layout: 'form', columns: 3, class: 'grid-cols-3' },
    ],
    defaultVariants: { layout: 'filter', columns: 3 },
  });

  /**
   * A PASTILHA. Preenche a altura do trilho (que é quem tem os 40px de campo), e o raio é
   * `box`, um degrau abaixo do `control` do trilho: filho menor que o pai.
   *
   * A cor só entra quando a pastilha está escolhida, e aí é a do tom — o mesmo cuidado do
   * `StatusBadge`, para a cor de uma situação nunca variar de tela para tela.
   */
  const optionPill = tv({
    base: 'rounded-box inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60',
    variants: {
      layout: {
        filter: '',
        /* Na grade o texto fica centrado na coluna. Sem altura mínima própria: a pastilha
           preenche o trilho, e é o trilho que tem os 40px — com um mínimo aqui ele passava a
           42px e desalinhava do seletor ao lado. */
        form: 'justify-center text-center',
      },
      isSelected: {
        true: 'shadow-xs font-semibold',
        false: 'border-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground',
      },
      tone: { neutral: '', info: '', success: '', warning: '', danger: '', brand: '' },
    },
    compoundVariants: [
      { isSelected: true, tone: 'neutral', class: 'border-foreground bg-foreground text-background' },
      { isSelected: true, tone: 'info', class: 'border-info bg-info text-primary-foreground' },
      { isSelected: true, tone: 'success', class: 'border-success bg-success text-primary-foreground' },
      { isSelected: true, tone: 'warning', class: 'border-warning bg-warning text-primary-foreground' },
      {
        isSelected: true,
        tone: 'danger',
        class: 'border-destructive bg-destructive text-destructive-foreground',
      },
      { isSelected: true, tone: 'brand', class: 'border-primary bg-primary text-primary-foreground' },
    ],
    defaultVariants: { layout: 'filter', isSelected: false, tone: 'neutral' },
  });

  /** A bolinha do tom, ao lado do texto de uma opção que não está escolhida. */
  const optionDot = tv({
    base: 'size-1.5 shrink-0 rounded-full',
    variants: {
      tone: {
        neutral: 'bg-muted-foreground',
        info: 'bg-info',
        success: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-destructive',
        brand: 'bg-primary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  });

  /* Uma coluna por opção. Em formulário nunca passam de três — acima disso não há pastilhas. */
  function resolveGridColumns(count: number): 1 | 2 | 3 {
    if (count <= 1) return 1;

    return count === 2 ? 2 : 3;
  }

  function resolveOptions(data: AcerolaOptionPickerProps['data'], allLabel: string | undefined): OptionPickerOption[] {
    return allLabel ? [{ value: '', label: allLabel }, ...data.options] : data.options;
  }
</script>

<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import SearchIcon from '@lucide/svelte/icons/search';

  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AcerolaOptionPickerProps = $props();

  let isOpen = $state(false);
  let query = $state('');

  const options = $derived(resolveOptions(data, ui?.allLabel));
  const layout = $derived(ui?.fullWidth ? 'form' : 'filter');
  const isPillMode = $derived(options.length <= PILL_MAX_OPTIONS[layout]);
  const gridColumns = $derived(resolveGridColumns(options.length));
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
  <!-- Grupo de botões num TRILHO só — uma pastilha ativa "flutuando" dentro de uma tira com
     fundo próprio, em vez de cada opção ser um botão bordado e solto. É o que faz ler como
     UM controle com vários estados, não uma fileira de botões separados. -->
  <div
    class={cn(optionTrack({ layout, columns: gridColumns }), ui?.className)}
    role="group"
    aria-label={ui?.ariaLabel}
  >
    {#each options as option (option.value || '__all__')}
      {@const isSelected = option.value === data.value}
      <button
        type="button"
        disabled={fieldState?.isDisabled}
        onclick={() => select(option.value)}
        class={optionPill({ layout, isSelected, tone: option.tone })}
      >
        {#if option.icon}
          <option.icon class="size-3.5 shrink-0" aria-hidden="true" />
        {:else if option.tone && !isSelected}
          <span class={optionDot({ tone: option.tone })} aria-hidden="true"></span>
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
        /* Os mesmos 40px do trilho de pastilhas e de todo campo: os dois modos deste componente
           moram lado a lado numa barra de filtro e têm de alinhar. */
        'control-lg',
        'rounded-control inline-flex w-full cursor-pointer items-center justify-between gap-2 border border-border/70 bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60',
        ui?.fullWidth ? 'sm:w-full' : 'sm:w-auto sm:min-w-[180px]',
        ui?.className,
      )}
    >
      <!-- A bolinha do tom acompanha a opção escolhida: sem ela, ao virar lista o tipo perderia
           a cor que tinha como pastilha. -->
      <span class="flex min-w-0 items-center gap-2">
        {#if selectedOption?.icon}
          <selectedOption.icon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {:else if selectedOption?.tone}
          <span class={optionDot({ tone: selectedOption.tone })} aria-hidden="true"></span>
        {/if}
        <span class="truncate">{selectedOption?.label ?? ui?.placeholder ?? 'Selecione'}</span>
      </span>
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
            {#if option.icon}
              <option.icon class="size-3.5 shrink-0" aria-hidden="true" />
            {:else if option.tone}
              <span class={optionDot({ tone: option.tone })} aria-hidden="true"></span>
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
