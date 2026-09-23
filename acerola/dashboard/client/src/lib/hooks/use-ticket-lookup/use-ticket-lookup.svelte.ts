import { createMutation } from '@tanstack/svelte-query';
import { isValidTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type PublicTicket } from '@template/shared/schemas/ticket.schema';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type TicketLookupModel = {
  data: {
    protocol: string;
    ticket: PublicTicket | null;
  };
  state: {
    isSearching: boolean;
    /** O que foi digitado não dá um protocolo — o botão fica desligado. */
    isInvalid: boolean;
    /** Procurou e não achou. Diferente de "ainda não procurou". */
    isNotFound: boolean;
    error: string | null;
  };
  actions: {
    onProtocolChange: (protocol: string) => void;
    onSearch: () => void;
  };
};

/**
 * A consulta PÚBLICA por protocolo.
 *
 * É uma `mutation`, e não uma `query`, porque a busca acontece quando a pessoa clica — não
 * quando o texto muda. Como `query`, cada tecla digitada viraria uma requisição, e o "não
 * encontrado" piscaria na tela enquanto ela ainda estava escrevendo o número.
 *
 * O chamado que volta traz menos campos que o do painel: telefone, responsável e solução
 * ficam no servidor. Protocolo é sequencial, e quem consulta confere o que pediu — não lê o
 * cadastro dos outros.
 */
export function useTicketLookupModel(): TicketLookupModel {
  let protocol = $state('');

  const search = mirrorStore(
    createMutation({
      mutationFn: (value: string) => ticketsApi.findByProtocol(value),
    }),
  );

  return {
    get data() {
      return { protocol, ticket: search.current.data ?? null };
    },
    get state() {
      const notFoundStatus = 404;

      return {
        isSearching: search.current.isPending,
        isInvalid: protocol.trim() !== '' && !isValidTicketProtocol(protocol),
        isNotFound: isNotFoundError(search.current.error, notFoundStatus),
        error: isNotFoundError(search.current.error, notFoundStatus)
          ? null
          : readError(search.current.error),
      };
    },
    actions: {
      /* Digitar limpa o resultado anterior: deixar o chamado antigo na tela enquanto a pessoa
         escreve outro número faria ela ler a situação do chamado errado. */
      onProtocolChange: (value) => {
        protocol = value;
        search.current.reset();
      },
      onSearch: () => {
        if (!isValidTicketProtocol(protocol)) return;
        search.current.mutate(protocol.trim());
      },
    },
  };
}

/**
 * "Não encontrado" não é falha do sistema: é resposta. Por isso ele vira um aviso próprio na
 * tela, e não a mensagem vermelha de erro — que faria a pessoa achar que o site quebrou.
 */
function isNotFoundError(error: unknown, notFoundStatus: number): boolean {
  if (!error) return false;

  return (error as { status?: number }).status === notFoundStatus;
}
