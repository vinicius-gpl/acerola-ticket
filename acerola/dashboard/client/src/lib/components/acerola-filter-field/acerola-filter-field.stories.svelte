<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';

  import FilterField from './acerola-filter-field.svelte';

  const statuses = [
    { value: 'open', label: 'Aberto', tone: 'danger' as const },
    { value: 'resolved', label: 'Resolvido', tone: 'success' as const },
  ];

  const departments = ['Financeiro', 'Fiscal', 'Contábil', 'Pessoal', 'Recepção', 'Comercial', 'RH'].map(
    (label) => ({ value: label.toLowerCase(), label }),
  );

  const { Story } = defineMeta({
    title: 'Components/AcerolaFilterField',
    component: FilterField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default">
  <FilterField data={{ label: 'Situação' }}>
    <OptionPicker
      data={{ value: '', options: statuses }}
      ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
      actions={{ onChange: () => {} }}
    />
  </FilterField>
</Story>

<!-- Como aparece numa barra de filtros: vários lado a lado, alinhados pela base. -->
<Story name="InFilterBar">
  <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
    <FilterField data={{ label: 'Situação' }}>
      <OptionPicker
        data={{ value: 'open', options: statuses }}
        ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
        actions={{ onChange: () => {} }}
      />
    </FilterField>
    <FilterField data={{ label: 'Departamento' }}>
      <OptionPicker
        data={{ value: '', options: departments }}
        ui={{ ariaLabel: 'Filtrar por departamento', allLabel: 'Todos os departamentos' }}
        actions={{ onChange: () => {} }}
      />
    </FilterField>
    <!-- Um liga/desliga também é um filtro com nome, e não uma caixa de seleção solta. -->
    <FilterField data={{ label: 'Arquivadas' }}>
      <OptionPicker
        data={{ value: '', options: [{ value: 'yes', label: 'Mostrar' }] }}
        ui={{ ariaLabel: 'Máquinas arquivadas', allLabel: 'Ocultar' }}
        actions={{ onChange: () => {} }}
      />
    </FilterField>
  </div>
</Story>

<!-- Caso limite: coluna estreita — as pastilhas quebram linha, o nome continua em cima. -->
<Story name="NarrowColumn">
  <div class="max-w-[220px]">
    <FilterField data={{ label: 'Situação do chamado nesta fila' }}>
      <OptionPicker
        data={{ value: '', options: statuses }}
        ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
        actions={{ onChange: () => {} }}
      />
    </FilterField>
  </div>
</Story>
