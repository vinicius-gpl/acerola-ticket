/**
 * "O ARQUIVO NÃO EXISTE" E "O STORAGE NÃO RESPONDEU" SÃO RESPOSTAS DIFERENTES.
 *
 * A primeira é da pessoa — o arquivo temporário já foi limpo, ela anexa de novo — e vira 404.
 * A segunda é nossa, e tem de chegar à tela como falha do servidor: tratá-la como 404 diria a
 * quem anexou que o arquivo sumiu, quando ele está lá e quem caiu foi o Storage.
 *
 * O storage responde "não existe" com `null` (`FileStorage.get`/`head`); é o repository que
 * transforma esse `null` neste erro, para o service decidir a resposta.
 */
export class StorageObjectNotFoundError extends Error {
  constructor(storageKey: string) {
    super(`Storage object not found: ${storageKey}`);
    this.name = 'StorageObjectNotFoundError';
  }
}
