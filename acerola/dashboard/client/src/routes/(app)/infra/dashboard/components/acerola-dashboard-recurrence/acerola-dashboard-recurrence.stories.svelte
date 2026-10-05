<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import DashboardRecurrence from './acerola-dashboard-recurrence.svelte';

  const byPerson = [
    { requesterName: 'Daniela Prado', department: 'recepcao', problemType: 'printer', count: 4 },
    { requesterName: 'Bia Costa', department: 'financeiro', problemType: 'network', count: 3 },
  ];

  const byMachine = [
    { computerId: 2, computerName: 'CONTABIL-02', problemType: 'slow_computer', count: 4 },
    { computerId: 5, computerName: 'RECEPCAO-01', problemType: 'printer', count: 3 },
  ];

  const { Story } = defineMeta({
    title: 'Features/Dashboard/AcerolaDashboardRecurrence',
    component: DashboardRecurrence,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { byPerson, byMachine } }} />

<Story name="Loading" args={{ data: { byPerson: [], byMachine: [] }, state: { isLoading: true } }} />

<!-- A melhor notícia possível deste bloco: nada se repetiu. -->
<Story name="Empty" args={{ data: { byPerson: [], byMachine: [] } }} />

<!-- Caso limite: alguém repete, mas nenhuma máquina — cada lado tem o próprio vazio. -->
<Story name="OnlyPeople" args={{ data: { byPerson, byMachine: [] } }} />

<!-- Caso limite: nomes compridos de gente e de máquina, deitados para caberem. -->
<Story
  name="LongNames"
  args={{
    data: {
      byPerson: [
        {
          requesterName: 'Maria Aparecida do Nascimento Oliveira',
          department: 'contabil',
          problemType: 'slow_computer',
          count: 6,
        },
      ],
      byMachine: [
        {
          computerId: 9,
          computerName: 'CONTABIL-FECHAMENTO-MENSAL-09',
          problemType: 'printer',
          count: 5,
        },
      ],
    },
  }}
/>

<!-- Caso limite: na largura de um celular. -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <DashboardRecurrence data={{ byPerson, byMachine }} />
  </div>
</Story>
