<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type PreventiveDue } from '@template/shared/schemas/maintenance.schema';

  import PreventiveBoard from './preventive-board.svelte';

  const DAY = 24 * 60 * 60 * 1000;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

  function row(over: Partial<PreventiveDue> = {}): PreventiveDue {
    return {
      computerId: 2,
      computerName: 'FINANCEIRO-02',
      computerDisplayName: 'Financeiro — mesa 2',
      computerDepartment: 'financeiro',
      lastDoneAt: daysAgo(150),
      status: 'due',
      maintenanceCount: 3,
      ...over,
    };
  }

  const rows: PreventiveDue[] = [
    row(),
    row({
      computerId: 8,
      computerName: 'PARALEGAL-08-ESTACAO-COMPARTILHADA',
      computerDisplayName: 'Paralegal — estação compartilhada do corredor',
      computerDepartment: 'paralegal',
      lastDoneAt: null,
      status: 'never',
      maintenanceCount: 1,
    }),
    row({
      computerId: 1,
      computerName: 'RECEPCAO-01',
      computerDisplayName: 'Recepção — balcão',
      computerDepartment: 'recepcao',
      lastDoneAt: daysAgo(20),
      status: 'ok',
      maintenanceCount: 1,
    }),
  ];

  const actions = { onRegister: () => {} };

  const { Story } = defineMeta({
    title: 'Components/PreventiveBoard',
    component: PreventiveBoard,
  });
</script>

<!-- O caso comum: duas máquinas pendentes e uma em dia (que não entra na lista). -->
<Story name="Default" args={{ data: { rows }, actions }} />

<Story name="Loading" args={{ data: { rows: [] }, state: { isLoading: true }, actions }} />

<!-- Parque inteiro em dia: a boa notícia é dita, não é uma lista vazia. -->
<Story
  name="All up to date"
  args={{ data: { rows: [rows[2]!, { ...rows[2]!, computerId: 5, computerName: 'COMERCIAL-05' }] }, actions }}
/>

<!-- Nenhuma máquina cadastrada ainda: o texto explica por que não há nada a cobrar. -->
<Story name="No machines" args={{ data: { rows: [] }, actions }} />

<!-- CASO LIMITE: máquina com nome comprido e muitas manutenções na mesma linha. -->
<Story
  name="Long name and many services"
  args={{
    data: {
      rows: [
        row({
          computerId: 8,
          computerName: 'PARALEGAL-08-ESTACAO-COMPARTILHADA',
          computerDisplayName:
            'Paralegal — estação compartilhada do corredor (usada por mais de uma pessoa)',
          maintenanceCount: 11,
        }),
      ],
    },
    actions,
  }}
/>
