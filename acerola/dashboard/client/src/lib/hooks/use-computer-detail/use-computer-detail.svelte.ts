import {
  createMutation,
  createQuery,
  keepPreviousData,
  useQueryClient,
} from '@tanstack/svelte-query';
import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';
import {
  type Computer,
  ALERT_PAGE_SIZE,
  type ComputerAlert,
  type ComputerSample,
  type DisposeComputerInput,
  type UpdateComputerInput,
} from '@template/shared/schemas/computer.schema';
import { type Maintenance } from '@template/shared/schemas/maintenance.schema';
import { type PartMovement } from '@template/shared/schemas/part.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { type Transfer } from '@template/shared/schemas/transfer.schema';
import { derived, writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { maintenancesApi } from '$lib/api/maintenances.api';
import { partsApi } from '$lib/api/parts.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { transfersApi } from '$lib/api/transfers.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import {
  COMPUTER_NAME_REFRESH_MS,
  COMPUTERS_QUERY_KEY,
} from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { MAINTENANCES_QUERY_KEY } from '$lib/hooks/use-maintenance-list/use-maintenance-list.svelte';
import { PARTS_QUERY_KEY } from '$lib/hooks/use-part-list/use-part-list.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { TRANSFERS_QUERY_KEY } from '$lib/hooks/use-transfer-form/use-transfer-form.svelte';

/** Onde a pessoa está numa lista paginada, e de que tamanho é a lista inteira. */
export type ListPaging = { page: number; pageSize: number; total: number };

export type ComputerDetailModel = {
  data: {
    computer: Computer | null;
    samples: ComputerSample[];
    alerts: ComputerAlert[];
    /**
     * ONDE a pessoa está em cada lista longa, e QUANTOS itens existem ao todo.
     *
     * As duas listas são paginadas no servidor: a máquina que dá trabalho acumula centenas de
     * episódios, e trazer todos para cortar na tela gastaria banco, rede e memória do
     * navegador para jogar fora quase tudo.
     */
    alertPaging: ListPaging;
    ticketPaging: ListPaging;
    /** O que está acontecendo na máquina AGORA. Nulo enquanto ela nunca tiver enviado nada. */
    live: ComputerLive | null;
    /** O que já foi feito NESTA máquina — o histórico que sustenta trocar em vez de remendar. */
    maintenances: Maintenance[];
    /** Os chamados abertos APONTANDO para esta máquina — quem vincula é quem atende. */
    tickets: Ticket[];
    /** As peças que saíram do depósito para esta máquina. */
    partMovements: PartMovement[];
    /** Por onde esta máquina já andou — a mudança de departamento é um evento, não um campo. */
    transfers: Transfer[];
    /**
     * O token recém-gerado, em texto puro. Existe só enquanto a tela estiver aberta: ele não
     * pode ser pedido de novo, e guardá-lo em algum lugar seria guardar uma credencial.
     */
    newToken: string | null;
  };
  state: {
    isLoading: boolean;
    isSamplesLoading: boolean;
    isAlertsLoading: boolean;
    isLiveLoading: boolean;
    isMaintenancesLoading: boolean;
    isTicketsLoading: boolean;
    isPartsLoading: boolean;
    isTransfersLoading: boolean;
    /** A máquina não existe (ou foi apagada por fora): a tela diz isso, não fica em branco. */
    isMissing: boolean;
    isSaving: boolean;
    error: string | null;
    /** A falha de uma AÇÃO (arquivar, bloquear, gerar token), separada da falha de carregar. */
    actionError: string | null;
  };
  actions: {
    onArchivedChange: (isArchived: boolean) => void;
    onBlockedChange: (isBlocked: boolean, reason?: string) => void;
    onRegenerateToken: () => void;
    onDispose: (input: DisposeComputerInput) => void;
    onRestore: () => void;
    onDismissToken: () => void;
    onRetry: () => void;
    onAlertPageChange: (page: number) => void;
    onTicketPageChange: (page: number) => void;
  };
};

/**
 * A ficha de uma máquina: o cadastro, o uso das últimas horas e os episódios de alerta.
 *
 * As três consultas são SEPARADAS de propósito. O gráfico de uso e o histórico de alerta são
 * pesados e não mudam a decisão de quem só quer saber de quem é a máquina; buscando tudo
 * junto, a ficha inteira esperaria pela parte mais lenta para mostrar o nome do responsável.
 *
 * Editar a identificação não está aqui: tem view-model próprio (`use-computer-form`), porque
 * é formulário e formulário morre junto com o diálogo que o abriu.
 */
/**
 * De quanto em quanto tempo a ficha pede a leitura nova.
 *
 * Um segundo porque, com a ficha aberta, é esse o ritmo em que o agente passa a enviar: o
 * próprio pedido avisa o servidor que alguém está olhando, e ele manda a máquina acelerar
 * (ver `live-watch.service` na API). Pedir mais devagar do que a máquina envia jogaria fora
 * justamente as leituras que existem por causa desta tela.
 */
const LIVE_REFRESH_MS = 1000;

/**
 * Os chamados da máquina também vão de 25 em 25, como os alertas.
 *
 * O número é DESTA tela, e não do contrato de chamados: na tela de Chamados a lista é o
 * assunto e cabe página maior; aqui ela é um bloco no meio de uma ficha que já tem gráfico,
 * alertas, manutenções e peças.
 */
const TICKET_PAGE_SIZE = 25;

export function useComputerDetailModel(id: number): ComputerDetailModel {
  const queryClient = useQueryClient();

  const computer = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'detail', id],
        queryFn: () => computersApi.findById(id),
        refetchInterval: COMPUTER_NAME_REFRESH_MS,
      }),
    ),
  );

  const samples = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'samples', id],
        queryFn: () => computersApi.samples(id),
      }),
    ),
  );

  /**
   * A PÁGINA de alertas e a de chamados vivem em STORES, e não em `$state`.
   *
   * Esta versão do @tanstack/svelte-query recebe as opções como store, e é ela quem decide
   * quando refazer a busca. Trocar a página escreve na store, e a consulta vai buscar a
   * página nova no servidor — que é o ponto: nenhuma das duas listas traz tudo para cortar
   * aqui dentro.
   */
  const alertPageStore = writable(1);
  const alertPage = mirrorStore(alertPageStore);

  const ticketPageStore = writable(1);
  const ticketPage = mirrorStore(ticketPageStore);

  const alerts = mirrorStore(
    createQuery(
      derived(alertPageStore, (page) => ({
        queryKey: [...COMPUTERS_QUERY_KEY, 'alerts', id, page],
        queryFn: () => computersApi.alerts(id, { page, pageSize: ALERT_PAGE_SIZE }),
        /* A página anterior fica na tela enquanto a nova vem: sem isto a lista pisca para
           vazio a cada clique, e a barra de página pula de lugar junto. */
        placeholderData: keepPreviousData,
      })),
    ),
  );

  /**
   * A leitura ao vivo se REFAZ sozinha enquanto a ficha estiver aberta.
   *
   * É o que faz a tela responder "o que está acontecendo nesta máquina agora" em vez de
   * mostrar o retrato de quando a página foi aberta. E não é só a tela que fica mais rápida:
   * cada pedido conta ao servidor que esta máquina está sendo olhada, e ele pede ao agente
   * dela para enviar de segundo em segundo enquanto isso durar.
   */
  const live = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'live', id],
        queryFn: () => computersApi.live(id),
        refetchInterval: LIVE_REFRESH_MS,
        /* Sem isto a atualização para quando a janela perde o foco, e quem deixa a ficha
           aberta num monitor ao lado — que é o uso desta tela — veria um valor congelado. */
        refetchIntervalInBackground: true,
      }),
    ),
  );

  /* Os chamados moram na feature de Chamados, e a ficha só os LÊ: a chave é a de lá, então
     vincular um chamado a esta máquina atualiza as duas telas. */
  const tickets = mirrorStore(
    createQuery(
      derived(ticketPageStore, (page) => ({
        queryKey: [...TICKETS_QUERY_KEY, 'list', { computerId: id, page }],
        queryFn: () => ticketsApi.list({ computerId: id, page, pageSize: TICKET_PAGE_SIZE }),
        placeholderData: keepPreviousData,
      })),
    ),
  );

  /* O histórico de manutenção mora na feature de Manutenção, e a ficha só o LÊ: a chave da
     consulta é a de lá, então registrar um serviço por aqui atualiza as duas telas. */
  const maintenances = mirrorStore(
    createQuery(
      writable({
        queryKey: [...MAINTENANCES_QUERY_KEY, 'list', { computerId: id }],
        queryFn: () => maintenancesApi.list({ computerId: id, page: 1, pageSize: 50 }),
      }),
    ),
  );

  /* As peças também moram em outra feature (o Depósito), e a ficha só LÊ: a chave da
     consulta é a de lá, então dar baixa numa peça por aqui atualizaria as duas telas. */
  const partMovements = mirrorStore(
    createQuery(
      writable({
        queryKey: [...PARTS_QUERY_KEY, 'movements', { computerId: id }],
        queryFn: () => partsApi.movements({ computerId: id, page: 1, pageSize: 50 }),
      }),
    ),
  );

  /* O histórico de transferências é da própria máquina, e só de leitura aqui: quem escreve
     nele é o diálogo de transferir, que tem view-model próprio. */
  const transfers = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TRANSFERS_QUERY_KEY, id, 'list'],
        queryFn: () => transfersApi.list(id),
      }),
    ),
  );

  const save = mirrorStore(
    createMutation({
      mutationFn: (body: UpdateComputerInput) => computersApi.update(id, body),
      onSuccess: () => invalidate(queryClient),
    }),
  );

  /* O token novo mora numa store, e não em `$state`: ele nasce da resposta da mutação, que
     vive fora do componente. */
  const newToken = writable<string | null>(null);
  const token = mirrorStore(newToken);

  /* Descartar e devolver ao inventário. Mesma mutação de escrita do resto da ficha: a falha
     chega pelo mesmo `actionError`, e a tela não precisa saber qual botão falhou. */
  const dispose = mirrorStore(
    createMutation({
      mutationFn: (input: DisposeComputerInput) => computersApi.dispose(id, input),
      onSuccess: () => invalidate(queryClient),
    }),
  );

  const restore = mirrorStore(
    createMutation({
      mutationFn: () => computersApi.restore(id),
      onSuccess: () => invalidate(queryClient),
    }),
  );

  const regenerate = mirrorStore(
    createMutation({
      mutationFn: () => computersApi.regenerateToken(id),
      onSuccess: (created) => {
        newToken.set(created.token);

        return invalidate(queryClient);
      },
    }),
  );

  return {
    get data() {
      return buildDetailData({
        computer: computer.current.data,
        samples: samples.current.data,
        alerts: alerts.current.data?.items,
        alertPaging: {
          page: alertPage.current,
          pageSize: ALERT_PAGE_SIZE,
          total: alerts.current.data?.total ?? 0,
        },
        live: live.current.data,
        maintenances: maintenances.current.data?.items,
        tickets: tickets.current.data?.items,
        ticketPaging: {
          page: ticketPage.current,
          pageSize: TICKET_PAGE_SIZE,
          total: tickets.current.data?.total ?? 0,
        },
        partMovements: partMovements.current.data?.items,
        transfers: transfers.current.data,
        newToken: token.current,
      });
    },
    get state() {
      return buildDetailState({
        computer: computer.current,
        isSamplesLoading: samples.current.isPending,
        isAlertsLoading: alerts.current.isPending,
        isLiveLoading: live.current.isPending,
        isMaintenancesLoading: maintenances.current.isPending,
        isTicketsLoading: tickets.current.isPending,
        isPartsLoading: partMovements.current.isPending,
        isTransfersLoading: transfers.current.isPending,
        isSaving:
          save.current.isPending ||
          regenerate.current.isPending ||
          dispose.current.isPending ||
          restore.current.isPending,
        actionError: firstError([
          save.current.error,
          regenerate.current.error,
          dispose.current.error,
          restore.current.error,
        ]),
      });
    },
    actions: {
      onArchivedChange: (isArchived) => save.current.mutate({ isArchived }),
      /* Desbloquear limpa o motivo junto: um motivo pendurado numa máquina liberada faria a
         ficha contar uma história que já não é verdade. */
      onBlockedChange: (isBlocked, reason) =>
        save.current.mutate({ isBlocked, blockReason: isBlocked ? (reason ?? '') : '' }),
      onRegenerateToken: () => regenerate.current.mutate(),
      onDispose: (input) => dispose.current.mutate(input),
      onRestore: () => restore.current.mutate(),
      onDismissToken: () => newToken.set(null),
      /* Trocar a página escreve na store, e é a consulta que vai buscar a página nova no
         servidor: a tela não corta nada por conta própria. */
      onAlertPageChange: (page) => alertPageStore.set(page),
      onTicketPageChange: (page) => ticketPageStore.set(page),
      onRetry: () => {
        void computer.current.refetch();
        void samples.current.refetch();
        void alerts.current.refetch();
        void maintenances.current.refetch();
        void partMovements.current.refetch();
        void transfers.current.refetch();
      },
    },
  };
}

/**
 * A primeira falha que existir, entre as ações de escrita da ficha.
 *
 * Uma só mensagem na tela: a pessoa clicou em UM botão, e ver duas recusas empilhadas de
 * ações diferentes só a faria procurar um problema que não existe.
 */
function firstError(errors: readonly unknown[]): string | null {
  for (const error of errors) {
    const message = readError(error);
    if (message) return message;
  }

  return null;
}

async function invalidate(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: COMPUTERS_QUERY_KEY });
}

type DetailQueryLike = {
  isPending: boolean;
  error: unknown;
  data: Computer | undefined;
};

/**
 * O mesmo motivo do `buildDetailState`: cada `??` conta como decisão, e a ficha lê oito
 * consultas. Nenhuma delas é decisão de verdade — é só "ainda não chegou" virando vazio.
 */
function buildDetailData(input: {
  computer: Computer | undefined;
  samples: ComputerSample[] | undefined;
  alerts: ComputerAlert[] | undefined;
  alertPaging: ListPaging;
  live: ComputerLive | null | undefined;
  maintenances: Maintenance[] | undefined;
  tickets: Ticket[] | undefined;
  ticketPaging: ListPaging;
  partMovements: PartMovement[] | undefined;
  transfers: Transfer[] | undefined;
  newToken: string | null;
}): ComputerDetailModel['data'] {
  return {
    computer: input.computer ?? null,
    samples: input.samples ?? [],
    alerts: input.alerts ?? [],
    alertPaging: input.alertPaging,
    live: input.live ?? null,
    maintenances: input.maintenances ?? [],
    tickets: input.tickets ?? [],
    ticketPaging: input.ticketPaging,
    partMovements: input.partMovements ?? [],
    transfers: input.transfers ?? [],
    newToken: input.newToken,
  };
}

/**
 * Separado do model porque cada `??` conta como decisão, e o hook passava do teto de
 * complexidade sem ter nenhuma decisão de verdade dentro.
 */
function buildDetailState(input: {
  computer: DetailQueryLike;
  isSamplesLoading: boolean;
  isAlertsLoading: boolean;
  isLiveLoading: boolean;
  isMaintenancesLoading: boolean;
  isTicketsLoading: boolean;
  isPartsLoading: boolean;
  isTransfersLoading: boolean;
  isSaving: boolean;
  actionError: string | null;
}): ComputerDetailModel['state'] {
  const status = input.computer.error instanceof Error ? readStatus(input.computer.error) : null;

  return {
    isLoading: input.computer.isPending,
    isSamplesLoading: input.isSamplesLoading,
    isAlertsLoading: input.isAlertsLoading,
    isLiveLoading: input.isLiveLoading,
    isMaintenancesLoading: input.isMaintenancesLoading,
    isTicketsLoading: input.isTicketsLoading,
    isPartsLoading: input.isPartsLoading,
    isTransfersLoading: input.isTransfersLoading,
    /* 404 não é falha de sistema: é uma máquina que não existe mais. A tela diz isso com
       texto próprio, em vez de oferecer "tentar de novo" para algo que nunca vai dar certo. */
    isMissing: status === 404,
    isSaving: input.isSaving,
    error: status === 404 ? null : readError(input.computer.error),
    actionError: input.actionError,
  };
}

function readStatus(error: Error): number | null {
  if (!('status' in error)) return null;

  const { status } = error as { status?: unknown };

  return typeof status === 'number' ? status : null;
}
