<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Collapsible from './acerola-collapsible.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaCollapsible',
    component: Collapsible,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default">
  <Collapsible data={{ title: 'Filtros avançados' }}>
    <p>Setor, responsável e período da última manutenção.</p>
  </Collapsible>
</Story>

<Story name="Open">
  <Collapsible data={{ title: 'Filtros avançados' }} state={{ isOpen: true }}>
    <p>Setor, responsável e período da última manutenção.</p>
  </Collapsible>
</Story>

<Story name="Disabled">
  <Collapsible data={{ title: 'Filtros avançados' }} state={{ isDisabled: true }}>
    <p>Setor, responsável e período da última manutenção.</p>
  </Collapsible>
</Story>

<!-- Caso limite: título comprido em coluna estreita — quebra linha e a seta não é empurrada. -->
<Story name="LongTitleInNarrowColumn">
  <Collapsible
    data={{ title: 'Por que esta máquina aparece como travada mesmo estando ligada na tomada' }}
    ui={{ className: 'max-w-[260px]' }}
    state={{ isOpen: true }}
  >
    <p>O agente parou de enviar leituras há mais de dez minutos.</p>
  </Collapsible>
</Story>
