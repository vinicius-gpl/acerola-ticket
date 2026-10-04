<script lang="ts" module>
  /**
   * Campo de seleção — o mesmo em filtro e em formulário.
   *
   * O `EMPTY_VALUE` abaixo resolve um conflito entre duas regras: para o sistema, "nenhum
   * filtro" é a string vazia; para o componente baixado, valor vazio significa "nada
   * selecionado", e ele então mostra o placeholder em vez da opção "Todos". Traduzir a
   * string vazia para uma sentinela na entrada e de volta na saída mantém a opção visível
   * sem contaminar o contrato de quem usa o campo, que continua recebendo `''`.
   */
  export type SelectFieldOption = { value: string; label: string };

  export type AcerolaSelectFieldProps = {
    data: { value: string; options: SelectFieldOption[] };
    ui?: { placeholder?: string; ariaLabel?: string; className?: string };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };

  const EMPTY_VALUE = '__empty__';
</script>

<script lang="ts">
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AcerolaSelectFieldProps = $props();

  const selectedValue = $derived(data.value === '' ? EMPTY_VALUE : data.value);

  /**
   * O RÓTULO DO VALOR ESCOLHIDO, resolvido aqui.
   *
   * O `Select.Value` do componente baixado resolve o rótulo a partir das opções que já
   * foram montadas — e elas só montam quando a lista abre. Antes disso ele mostrava o valor
   * cru: a tela nascia escrevendo "network" e "medium" no lugar de "Internet / Rede" e
   * "Média", e o texto só virava português depois que a pessoa abrisse a lista.
   *
   * Procurar na própria lista de opções não depende de nada ter sido montado, então o
   * rótulo certo aparece já na primeira pintura.
   */
  const selectedLabel = $derived(
    data.options.find((option) => (option.value || EMPTY_VALUE) === selectedValue)?.label ?? '',
  );
</script>

<Select
  type="single"
  value={selectedValue}
  onValueChange={(val: string | undefined) => {
    if (val !== undefined) {
      actions.onChange(val === EMPTY_VALUE ? '' : val);
    }
  }}
  disabled={state?.isDisabled}
>
  <!-- O degrau `lg` da RÉGUA DE MEDIDAS (`lib/theme/tokens.css`): este campo fica sempre ao
       lado de um `TextField` ou dentro de um formulário, e vinha 4px mais baixo e com um raio
       só dele (menor que o dos vizinhos), destoando de tudo em volta.

       `min-w-0` + `max-w-full`: sem os dois, uma opção de nome longo faz o gatilho crescer
       além do espaço que ele tem e empurra a largura de quem está em volta — dentro de um
       diálogo, isso vira barra de rolagem horizontal na tela inteira. O nome completo continua
       acessível pelo `title` e pela lista aberta. -->
  <SelectTrigger
    aria-label={ui?.ariaLabel}
    title={selectedLabel || undefined}
    class={cn('control-lg rounded-control max-w-full min-w-0 text-sm', ui?.className)}
  >
    <!-- `data-slot="select-value"` mantém o recorte de uma linha que o gatilho aplica ao
         filho. O tom de "nada escolhido" continua vindo do próprio gatilho, que recebe
         `data-placeholder` do componente baixado. -->
    <span data-slot="select-value" class="truncate">
      {selectedLabel || (ui?.placeholder ?? '')}
    </span>
  </SelectTrigger>
  <!-- A LARGURA DA LISTA É AMARRADA À DO GATILHO, entre um piso e um teto.
       Sem isso ela se estica até o nome mais comprido da lista: com apelidos como
       "Paralegal — estação compartilhada do corredor (PARALEGAL-08-…)", a lista nascia mais
       larga do que o diálogo inteiro e vazava pelos dois lados. `--bits-select-anchor-width`
       é a largura do gatilho, medida pelo próprio componente. -->
  <SelectContent
    class="min-w-(--bits-select-anchor-width) w-auto max-w-[min(26rem,calc(100vw-2rem))]"
  >
    {#each data.options as option (option.value || EMPTY_VALUE)}
      <SelectItem value={option.value || EMPTY_VALUE} label={option.label}>
        <span class="truncate">{option.label}</span>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
