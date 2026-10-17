import { createMutation, createQuery } from '@tanstack/svelte-query';
import { isValidTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type MyTicket, type PublicTicket } from '@template/shared/schemas/ticket.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type TicketLookupModel = {
  data: {
    protocol: string;
    ticket: PublicTicket | null;
    /** Os chamados que a pessoa logada abriu. */
    mine: MyTicket[];
  };
  state: {
    isSearching: boolean;
    /** O que foi digitado não dá um protocolo — o botão fica desligado. */
    isInvalid: boolean;
    /** Procurou e não achou. Diferente de "ainda não procurou". */
    isNotFound: boolean;
    error: string | null;
    isLoadingMine: boolean;
    mineError: string | null;
  };
  actions: {
    onProtocolChange: (protocol: string) => void;
    onSearch: () => void;
    /** Abre o chamado de um link de consulta (o link assinado das mensagens de WhatsApp). */
    onOpenLink: (token: string) => void;
    /** Abre um dos chamados da lista "Meus chamados", pelo número. */
    onOpenMine: (protocol: string) => void;
  };
};

/**
 * A consulta pelo NÚMERO do chamado, e a lista "Meus chamados" — de quem está logado.
 *
 * É uma `mutation`, e não uma `query`, porque a busca acontece quando a pessoa clica — não
 * quando o texto muda. Como `query`, cada tecla digitada viraria uma requisição, e o "não
 * encontrado" piscaria na tela enquanto ela ainda estava escrevendo o número.
 *
 * O chamado que volta traz menos campos que o do painel: telefone, responsável e solução
 * ficam no servidor. Protocolo é sequencial, e por isso o servidor só devolve chamado de quem
 * abriu (ou de uma área que a pessoa atende) — os outros números respondem "não encontrado".
 */
export function useTicketLookupModel(): TicketLookupModel {
  let protocol = $state('');

  const search = mirrorStore(
    createMutation({
      /* Dois caminhos para o mesmo chamado: o protocolo digitado, ou o link assinado. */
      mutationFn: (input: { protocol: string } | { token: string }) =>
        'token' in input
          ? ticketsApi.findByAccessToken(input.token)
          : ticketsApi.findByProtocol(input.protocol),
      /* Veio pelo link: o campo passa a mostrar o protocolo do chamado que abriu. */
      onSuccess: (ticket: PublicTicket) => {
        protocol = ticket.protocol;
      },
    }),
  );

  /* "Meus chamados" — uma vez, ao abrir a tela. Falhou? A lista mostra o motivo, e a consulta
     pelo número continua funcionando. */
  const mine = mirrorStore(
    createQuery(writable({ queryKey: ['tickets', 'mine'], queryFn: () => ticketsApi.mine() })),
  );

  return {
    get data() {
      return { protocol, ticket: search.current.data ?? null, mine: mine.current.data ?? [] };
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
        isLoadingMine: mine.current.isPending,
        mineError: mine.current.isError ? readError(mine.current.error) : null,
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
        search.current.mutate({ protocol: protocol.trim() });
      },
      onOpenLink: (token) => search.current.mutate({ token }),
      onOpenMine: (value) => {
        protocol = value;
        search.current.mutate({ protocol: value });
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
