<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';

  import ComputerLivePanel from './acerola-computer-live-panel.svelte';

  const GB = 1024 * 1024 * 1024;

  const base: ComputerLive = {
    computerId: 1,
    measuredAt: '2026-09-23T14:00:00.000-03:00',
    receivedAt: '2026-09-23T17:00:00.000Z',
    isOnline: true,
    cpu: { percentTotal: 42, percentPerCore: [30, 54, 28, 61] },
    memory: {
      totalBytes: 16 * GB,
      usedBytes: 12 * GB,
      freeBytes: 4 * GB,
      usedPercent: 75,
      swapTotalBytes: 0,
      swapUsedBytes: 0,
      swapUsedPercent: 0,
    },
    disks: [
      {
        mountpoint: 'C:',
        fstype: 'NTFS',
        totalBytes: 240 * GB,
        usedBytes: 200 * GB,
        freeBytes: 40 * GB,
        usedPercent: 83,
      },
    ],
    diskIo: { readBytesPerSec: 2 * 1024 * 1024, writeBytesPerSec: 512 * 1024 },
    network: [
      { name: 'Ethernet', bytesSentPerSec: 1024, bytesRecvPerSec: 4096 },
      { name: 'Loopback', bytesSentPerSec: 0, bytesRecvPerSec: 0 },
    ],
    processes: [],
  };

  const { Story } = defineMeta({
    title: 'Features/Computers/AcerolaComputerLivePanel',
    component: ComputerLivePanel,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { live: base } }} />

<!-- Máquina no talo: é o estado em que alguém abre esta tela. -->
<Story
  name="UnderPressure"
  args={{
    data: {
      live: {
        ...base,
        cpu: { percentTotal: 97, percentPerCore: [99, 96, 98, 95] },
        memory: {
          ...base.memory,
          usedBytes: 15.4 * GB,
          freeBytes: 0.6 * GB,
          usedPercent: 96,
          swapTotalBytes: 8 * GB,
          swapUsedBytes: 6 * GB,
          swapUsedPercent: 75,
        },
        disks: [{ ...base.disks[0]!, freeBytes: 6 * GB, usedPercent: 97 }],
      },
    },
  }}
/>

<!-- Vários volumes, incluindo um de rede. -->
<Story
  name="ManyVolumes"
  args={{
    data: {
      live: {
        ...base,
        disks: [
          base.disks[0]!,
          {
            mountpoint: 'D:',
            fstype: 'NTFS',
            totalBytes: 1024 * GB,
            usedBytes: 300 * GB,
            freeBytes: 724 * GB,
            usedPercent: 29,
          },
          {
            mountpoint: 'Z: (contabilidade)',
            fstype: 'CIFS',
            totalBytes: 2048 * GB,
            usedBytes: 1800 * GB,
            freeBytes: 248 * GB,
            usedPercent: 88,
          },
        ],
      },
    },
  }}
/>

<Story name="Loading" args={{ data: { live: null }, state: { isLoading: true } }} />

<!-- O agente nunca conectou nesta máquina: outra conversa, com outro botão. -->
<Story name="NeverReported" args={{ data: { live: null } }} />

<!-- Caso limite: agente antigo, que não informa núcleo, volume nem tráfego. -->
<Story
  name="OldAgent"
  args={{
    data: {
      live: {
        ...base,
        cpu: { percentTotal: 42, percentPerCore: [] },
        disks: [],
        network: [],
      },
    },
  }}
/>
