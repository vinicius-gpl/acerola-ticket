import { createQuery } from '@tanstack/svelte-query';
import { isSameServiceOrderFile } from '@template/shared/domain/service-order.util';
import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';
import { writable } from 'svelte/store';

import { ApiError, readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { sha256Hex } from '$lib/utils/sha256.util';

const NOT_FOUND = 404;

/** Uma ordem de serviço tem poucos kilobytes; acima disto o arquivo certamente é outra coisa. */
export const MAX_CHECKED_FILE_BYTES = 25 * 1024 * 1024;

/**
 * O resultado de conferir um arquivo.
 *
 * `idle` ainda não escolheu · `checking` calculando · `match` é o arquivo emitido · `mismatch`
 * foi alterado (ou é de outra emissão) · `unreadable` não deu para ler o arquivo.
 */
export type FileCheck = 'idle' | 'checking' | 'match' | 'mismatch' | 'unreadable';

export type ServiceOrderVerifyModel = {
  data: {
    /** O registro público da emissão. Nulo enquanto carrega, ou quando o código não existe. */
    order: PublicServiceOrder | null;
    /** O nome do arquivo que a pessoa escolheu para conferir. */
    checkedFileName: string | null;
  };
  state: {
    isLoading: boolean;
    /** O código não corresponde a nenhuma emissão. Resposta, não falha do sistema. */
    isNotFound: boolean;
    error: string | null;
    fileCheck: FileCheck;
  };
  actions: {
    onRetry: () => void;
    onFileChosen: (file: File | null) => void;
  };
};

/**
 * A CONFERÊNCIA PÚBLICA de uma ordem de serviço.
 *
 * Dois níveis, de propósito:
 * 1. O código (do link ou do rodapé) acha o REGISTRO da emissão — prova que ela existe e mostra
 *    o que o sistema emitiu naquele dia.
 * 2. Escolher o ARQUIVO prova que aquele PDF é exatamente o emitido: a impressão digital dele é
 *    calculada aqui, no navegador, e comparada com a registrada. O arquivo não é enviado.
 *
 * O segundo nível existe porque o primeiro não basta: quem altera um PDF pode deixar o link
 * intacto.
 */
export function useServiceOrderVerifyModel(reference: string): ServiceOrderVerifyModel {
  const order = mirrorStore(
    createQuery(
      writable({
        queryKey: ['service-orders', 'verify', reference],
        queryFn: () => ticketsApi.verifyServiceOrder(reference),
        /* 404 não muda tentando de novo: repetir só atrasa o aviso. */
        retry: false,
      }),
    ),
  );

  let fileCheck = $state<FileCheck>('idle');
  let checkedFileName = $state<string | null>(null);

  async function check(file: File, issuedHash: string): Promise<void> {
    checkedFileName = file.name;
    fileCheck = 'checking';
    fileCheck = await checkFile(file, issuedHash);
  }

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      return { order: order.current.data ?? null, checkedFileName };
    },
    get state() {
      const isNotFound = statusOf(order.current.error) === NOT_FOUND;

      return {
        isLoading: order.current.isPending,
        isNotFound,
        error: isNotFound ? null : readError(order.current.error),
        fileCheck,
      };
    },
    actions: {
      onRetry: () => void order.current.refetch(),
      onFileChosen: (file) => {
        const issued = order.current.data;

        if (!file || !issued) {
          fileCheck = 'idle';
          checkedFileName = null;

          return;
        }

        void check(file, issued.fileHash);
      },
    },
  };
}

/**
 * Confere UM arquivo contra a impressão digital registrada.
 *
 * Nunca lança: falha ao ler vira `unreadable`, e a tela diz isso em vez de ficar "conferindo"
 * para sempre.
 */
export async function checkFile(file: File, issuedHash: string): Promise<FileCheck> {
  if (file.size > MAX_CHECKED_FILE_BYTES) return 'unreadable';

  try {
    const hash = await sha256Hex(new Uint8Array(await file.arrayBuffer()));

    return isSameServiceOrderFile(hash, issuedHash) ? 'match' : 'mismatch';
  } catch {
    return 'unreadable';
  }
}

function statusOf(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}
