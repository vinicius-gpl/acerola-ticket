import { type MaintenanceInsert } from '../../../server/src/lib/db/schema/maintenances.schema';
import { between, chance, pick, pickWeighted, timeRuler } from '../volume.util';

/**
 * AS MANUTENÇÕES EM VOLUME — o que dá conteúdo aos blocos de manutenção do painel.
 *
 * Os doze escritos à mão cobrem a régua da preventiva: a máquina em dia, a vencida, a que
 * nunca foi aberta, a que só levou limpeza (que não zera o relógio) e a que já deu trabalho
 * três vezes. O que falta a eles é QUANTIDADE — com doze, o bloco "o que foi feito" tem uma
 * linha no recorte do dia, o de manutenção pesada tem uma barra só, e o mapa de problemas no
 * lado da manutenção tem três fatias.
 *
 * Nada aqui sorteia: ver `volume.util`. Os ids começam em 100.
 */
const TI = 'suporte@azuos.local';

const { daysAgo } = timeRuler();

const FIRST_GENERATED_MAINTENANCE_ID = 100;

/**
 * Quantas manutenções, e em quantos dias.
 *
 * Cento e oitenta dias porque a régua da preventiva é de três meses: com menos, nenhuma
 * máquina apareceria como "vencida por tempo" e o bloco de preventivas nasceria vazio.
 */
const GENERATED_MAINTENANCES = 170;
const SPREAD_DAYS = 180;

/** Os tipos em ordem de frequência: preventiva é o dia a dia, o resto é exceção. */
const TYPES = [
  'preventive',
  'corrective',
  'cleaning',
  'part_replacement',
  'reinstall',
  'other',
] as const;

const TECHNICIANS = ['Suporte TI', 'Carlos Menezes', 'Rafael Siqueira', 'Marina Bastos'] as const;

/** O que foi feito, por tipo. Texto de tela: português. */
const DESCRIPTIONS: Record<(typeof TYPES)[number], readonly string[]> = {
  preventive: [
    'Limpeza interna, troca da pasta térmica e verificação dos cabos.',
    'Revisão geral: ventoinhas, cabos e atualização do sistema.',
    'Preventiva trimestral: limpeza, testes de memória e disco.',
  ],
  corrective: [
    'Máquina não ligava: fonte substituída.',
    'Travamento constante: memória reassentada e testada.',
    'Não dava vídeo: cabo de vídeo com mau contato, trocado.',
  ],
  cleaning: [
    'Limpeza externa e do teclado, a pedido da pessoa.',
    'Remoção de poeira do gabinete e dos filtros.',
    'Limpeza rápida do cooler, sem abrir a máquina.',
  ],
  part_replacement: [
    'Disco rígido trocado por SSD de 480 GB.',
    'Memória ampliada de 8 GB para 16 GB.',
    'Fonte trocada por uma de 500 W.',
  ],
  reinstall: [
    'Sistema reinstalado do zero e programas do escritório de volta.',
    'Formatação após infecção: dados salvos antes.',
    'Reinstalação do pacote de escritório e do certificado.',
  ],
  other: [
    'Configuração de impressora nova na sala.',
    'Troca de lugar da máquina e recabeamento.',
    'Ajuste do horário e do fuso do sistema.',
  ],
};

function generate(index: number): MaintenanceInsert {
  const type = pickWeighted(TYPES, index);

  /**
   * Metade cai nas máquinas geradas e metade nas escritas à mão, mas com PESO nas primeiras
   * do parque gerado: é o que faz umas poucas máquinas acumularem cinco, seis manutenções —
   * sem isso, cento e setenta serviços espalhados por cinquenta máquinas dariam três para
   * cada, e o bloco "manutenção pesada" não teria candidata nenhuma a apontar.
   */
  const computerId = chance(55, index * 3)
    ? 100 + Math.floor(pickWeighted([...Array(42).keys()], index * 5))
    : between(1, 8, index * 7);

  const performedDaysAgo = between(0, SPREAD_DAYS, index * 11);

  return {
    id: FIRST_GENERATED_MAINTENANCE_ID + index,
    computerId,
    type,
    description: pick(DESCRIPTIONS[type], index * 13),
    performedBy: pick(TECHNICIANS, index * 17),
    performedAt: daysAgo(performedDaysAgo),
    createdAt: daysAgo(performedDaysAgo),
    createdBy: TI,
  };
}

export const GENERATED_MAINTENANCES_SEED: MaintenanceInsert[] = Array.from(
  { length: GENERATED_MAINTENANCES },
  (_value, index) => generate(index),
);
