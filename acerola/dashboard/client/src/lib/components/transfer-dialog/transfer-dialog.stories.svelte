<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  import TransferDialog, { type PeripheralChoice } from './transfer-dialog.svelte';

  const computer = {
    id: 2,
    name: 'FINANCEIRO-02',
    displayName: 'Financeiro — mesa 2',
    department: 'financeiro',
  } as Computer;

  const departments = [
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'fiscal', label: 'Fiscal' },
    { value: 'contabil', label: 'Contábil' },
    { value: '', label: 'Sem departamento (volta para a prateleira)' },
  ];

  const machines = [
    { value: '3', label: 'Contábil — mesa do fechamento (CONTABIL-03)' },
    { value: '4', label: 'FISCAL-04' },
  ];

  function peripheral(over: Partial<PeripheralChoice> = {}): PeripheralChoice {
    return {
      partId: 7,
      label: 'Teclado USB ABNT2 — Teclado',
      quantity: 1,
      destiny: 'machine',
      destinationComputerId: '',
      ...over,
    };
  }

  const peripherals = [
    peripheral(),
    peripheral({ partId: 8, label: 'Monitor 22 polegadas — Monitor', quantity: 2 }),
  ];

  const actions = {
    onDepartmentChange: () => {},
    onResponsibleChange: () => {},
    onNoteChange: () => {},
    onDestinyChange: () => {},
    onDestinationChange: () => {},
    onSubmit: () => {},
    onClose: () => {},
  };

  const base = {
    computer,
    toDepartment: 'financeiro',
    responsible: '',
    note: '',
    departments,
    machines,
    peripherals,
  };

  const open = { isOpen: true };

  const { Story } = defineMeta({
    title: 'Components/TransferDialog',
    component: TransferDialog,
  });
</script>

<Story name="Default" args={{ data: base, state: open, actions }} />

<!-- Volta para a prateleira: o aviso diz o que a máquina perde. -->
<Story
  name="Back to the shelf"
  args={{ data: { ...base, toDepartment: '' }, state: open, actions }}
/>

<!-- Uma peça fica na estação: aparece o seletor da máquina que assume. -->
<Story
  name="Peripheral staying"
  args={{
    data: {
      ...base,
      peripherals: [peripheral({ destiny: 'station', destinationComputerId: '3' }), peripherals[1]!],
    },
    state: open,
    actions,
  }}
/>

<!-- Falta dizer quem assume: o botão trava e a tela explica por quê. -->
<Story
  name="Missing destination"
  args={{
    data: { ...base, peripherals: [peripheral({ destiny: 'station' })] },
    state: { ...open, isIncomplete: true },
    actions,
  }}
/>

<!-- Máquina sem periférico nenhum: a pergunta some, em vez de aparecer vazia. -->
<Story
  name="No peripherals"
  args={{ data: { ...base, peripherals: [] }, state: open, actions }}
/>

<Story
  name="Loading peripherals"
  args={{
    data: { ...base, peripherals: [] },
    state: { ...open, isLoadingPeripherals: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: base,
    state: { ...open, error: 'A máquina já está nesse departamento. Escolha um destino diferente.' },
    actions,
  }}
/>
