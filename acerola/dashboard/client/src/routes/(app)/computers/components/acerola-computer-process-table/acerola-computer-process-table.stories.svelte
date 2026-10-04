<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ComputerProcessTable from './acerola-computer-process-table.svelte';

  type Process = {
    name: string;
    instanceCount: number;
    cpuPercent: number;
    memPercent: number;
    memBytes: number;
    instances: [];
  };

  function process(name: string, cpuPercent: number, memGb: number, instanceCount = 1): Process {
    return {
      name,
      instanceCount,
      cpuPercent,
      memPercent: Math.round((memGb / 16) * 100),
      memBytes: Math.round(memGb * 1024 * 1024 * 1024),
      instances: [],
    };
  }

  const processes = [
    process('chrome.exe', 34, 3.2, 21),
    process('Teams.exe', 12, 1.1, 6),
    process('excel.exe', 8, 0.8),
    process('outlook.exe', 4, 0.6),
    process('explorer.exe', 2, 0.2),
  ];

  const many = Array.from({ length: 18 }, (_value, index) =>
    process(`servico-${index + 1}.exe`, Math.max(0, 20 - index), 1.5 - index * 0.05),
  );

  const { Story } = defineMeta({
    title: 'Features/Computers/AcerolaComputerProcessTable',
    component: ComputerProcessTable,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { processes } }} />

<!-- Lista nunca é truncada calada: o que sobrou vira uma linha dizendo quanto sobrou. -->
<Story name="Truncated" args={{ data: { processes: many } }} />

<!-- Com o limite apertado, para ver a linha do "e mais N". -->
<Story name="SmallLimit" args={{ data: { processes }, ui: { limit: 2 } }} />

<Story name="Loading" args={{ data: { processes: [] }, state: { isLoading: true } }} />

<!-- Vazio só é vazio depois que a leitura terminou. -->
<Story name="Empty" args={{ data: { processes: [] } }} />

<!-- Caso limite: um aplicativo só, e um nome comprido que precisa ser cortado. -->
<Story
  name="SingleLongName"
  args={{
    data: {
      processes: [
        process('Microsoft.Sistema.Integracao.ServicoDeSincronizacao.Host.exe', 61, 2.4, 3),
      ],
    },
  }}
/>
