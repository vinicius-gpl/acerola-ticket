<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';

  import PanelCard from './acerola-panel-card.svelte';

  const periods = [
    { value: 'day', label: 'Dia' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaPanelCard',
    component: PanelCard,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default">
  <PanelCard data={{ title: 'Mapa de problemas', hint: 'O que mais apareceu no mês' }}>
    <p class="text-sm">O conteúdo do bloco — normalmente um gráfico ou uma lista.</p>
  </PanelCard>
</Story>

<!-- Com o controle de recorte no alto, à direita do título. -->
<Story name="WithControl">
  <PanelCard data={{ title: 'Manutenções — o que foi feito' }}>
    {#snippet tools()}
      <OptionPicker
        data={{ value: 'month', options: periods }}
        ui={{ ariaLabel: 'Recorte das manutenções' }}
        actions={{ onChange: () => {} }}
      />
    {/snippet}
    <p class="text-sm">Doze manutenções no mês.</p>
  </PanelCard>
</Story>

<!-- Sem explicação: o título basta quando o bloco é óbvio. -->
<Story name="WithoutHint">
  <PanelCard data={{ title: 'Quem mais pediu socorro' }}>
    <p class="text-sm">Contabilidade, RH e Comercial.</p>
  </PanelCard>
</Story>

<!-- Estado vazio: o bloco continua desenhado, dizendo que não há o que mostrar. -->
<Story name="Empty">
  <PanelCard data={{ title: 'Picos de 100%', hint: 'Máquinas que bateram no teto' }}>
    <p class="text-muted-foreground text-sm">Nenhuma máquina bateu no teto hoje.</p>
  </PanelCard>
</Story>

<!-- Caso limite: título e explicação compridos, com controle, na largura de um celular. -->
<Story name="LongTitleOnPhone">
  <div class="w-[360px]">
    <PanelCard
      data={{
        title: 'Manutenções preventivas planejadas automaticamente para hoje',
        hint: 'Uma máquina por dia útil, da que está há mais tempo sem abrir para a que menos',
      }}
    >
      {#snippet tools()}
        <OptionPicker
          data={{ value: 'week', options: periods }}
          ui={{ ariaLabel: 'Recorte' }}
          actions={{ onChange: () => {} }}
        />
      {/snippet}
      <p class="text-sm">CONTABIL-03</p>
    </PanelCard>
  </div>
</Story>
