import { spawn } from 'node:child_process';

/**
 * A FOTO DO PRODUTO, ENCOLHIDA ANTES DE GUARDAR.
 *
 * Quem cadastra tira a foto com o celular: 4 MB de JPEG para um quadradinho de 200px na
 * tela. Guardar o original significa pagar armazenamento por isso e, pior, fazer a lista do
 * inventário baixar dezenas de megabytes toda vez que alguém abre a tela no 4G.
 *
 * O ffmpeg faz a redução porque já está na máquina e lê os formatos de celular, inclusive os
 * mais novos — e porque uma biblioteca a mais só para redimensionar imagem é dependência que
 * depois precisa de manutenção. A conversa é por PIPE: a imagem entra pela entrada padrão e
 * sai pela saída padrão, sem arquivo temporário em disco (que, em servidor, é lixo que fica
 * quando o processo morre no meio).
 *
 * **Falha do ffmpeg não derruba o cadastro.** Se a conversão não der certo (formato exótico,
 * ffmpeg ausente na máquina), a função devolve nulo e quem chama guarda a imagem original: é
 * melhor um produto com foto pesada do que um produto que não consegue ser cadastrado.
 */

/** A largura máxima da imagem guardada. Acima disso ninguém enxerga diferença na tela. */
export const PHOTO_MAX_WIDTH = 1024;

/** O webp pesa a metade do JPEG na mesma qualidade, e todo navegador atual o mostra. */
export const PHOTO_CONTENT_TYPE = 'image/webp';

/** Qualidade do webp: 80 é o ponto em que a foto ainda está boa e o arquivo já é pequeno. */
const PHOTO_QUALITY = '80';

/** Tempo máximo de conversão. Imagem que passa disso não é foto de produto. */
const TIMEOUT_MS = 20_000;

export type OptimizedPhoto = {
  content: Buffer;
  contentType: string;
};

/**
 * Converte a foto para webp com até `PHOTO_MAX_WIDTH` de largura.
 *
 * `scale='min(iw,1024)':-2` encolhe só o que é maior que o teto (`min` com a largura de
 * entrada) e deixa o ffmpeg calcular a altura mantendo a proporção; o `-2` é o que arredonda
 * essa altura para um número par, que é o que o codificador aceita.
 */
export async function optimizePhoto(input: Buffer): Promise<OptimizedPhoto | null> {
  const content = await runFfmpeg(
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-vf',
      `scale='min(iw,${PHOTO_MAX_WIDTH})':-2`,
      '-frames:v',
      '1',
      '-quality',
      PHOTO_QUALITY,
      '-f',
      'webp',
      'pipe:1',
    ],
    input,
  );

  if (!content || content.length === 0) return null;

  return { content, contentType: PHOTO_CONTENT_TYPE };
}

/** Roda o ffmpeg com a imagem na entrada padrão e devolve a saída — ou nulo, se falhar. */
function runFfmpeg(args: string[], input: Buffer): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', args, { windowsHide: true });
    const chunks: Buffer[] = [];
    let settled = false;

    /* Uma resposta só: erro de escrita no pipe e saída do processo chegam os dois, e sem esta
       trava a Promise seria resolvida duas vezes. */
    const settle = (value: Buffer | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      ffmpeg.kill('SIGKILL');
      settle(null);
    }, TIMEOUT_MS);

    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on('error', () => settle(null));
    ffmpeg.on('close', (code) => settle(code === 0 ? Buffer.concat(chunks) : null));

    /* O ffmpeg fecha a entrada assim que tem o que precisa; escrever depois disso derruba o
       processo do servidor se o erro não for tratado aqui. */
    ffmpeg.stdin.on('error', () => settle(null));
    ffmpeg.stdin.end(input);
  });
}
