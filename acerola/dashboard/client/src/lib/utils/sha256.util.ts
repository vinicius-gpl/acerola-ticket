/**
 * A IMPRESSÃO DIGITAL (SHA-256) de um arquivo, calculada no navegador.
 *
 * O caminho normal é o do próprio navegador (`crypto.subtle`). Só que ele só existe em endereço
 * seguro — `https` ou `localhost`. Num escritório o painel costuma ser aberto por um endereço da
 * rede interna em `http`, e ali ele simplesmente não está lá. Por isso existe o cálculo escrito
 * à mão embaixo: mais lento, mas um PDF de ordem de serviço tem poucos kilobytes.
 *
 * O arquivo NÃO sai da máquina de quem confere: só a impressão digital é comparada.
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return sha256HexFallback(bytes);

  const digest = await subtle.digest('SHA-256', bytes as BufferSource);

  return toHex(new Uint8Array(digest));
}

const BLOCK_BYTES = 64;
const LENGTH_BYTES = 8;
const WORDS_PER_BLOCK = 64;
const BITS_PER_BYTE = 8;

/* As constantes do SHA-256 (FIPS 180-4): as partes fracionárias das raízes cúbicas dos 64
   primeiros primos. São dado, não regra — por isso ficam em hexadecimal, como na norma. */
const ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const INITIAL_STATE = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const rotate = (value: number, bits: number): number => (value >>> bits) | (value << (32 - bits));

/** O mesmo resultado de `crypto.subtle`, para onde ele não existe. Exportado para o teste. */
export function sha256HexFallback(bytes: Uint8Array): string {
  const message = padded(bytes);
  const view = new DataView(message.buffer);
  const state = Uint32Array.from(INITIAL_STATE);
  const words = new Uint32Array(WORDS_PER_BLOCK);

  for (let offset = 0; offset < message.length; offset += BLOCK_BYTES) {
    expand(view, offset, words);
    compress(state, words);
  }

  const digest = new Uint8Array(state.length * 4);
  const out = new DataView(digest.buffer);
  state.forEach((word, index) => out.setUint32(index * 4, word));

  return toHex(digest);
}

/** A mensagem com o enchimento da norma: um bit 1, zeros, e o tamanho em bits no fim. */
function padded(bytes: Uint8Array): Uint8Array {
  const withMarker = bytes.length + 1 + LENGTH_BYTES;
  const total = Math.ceil(withMarker / BLOCK_BYTES) * BLOCK_BYTES;
  const message = new Uint8Array(total);

  message.set(bytes);
  message[bytes.length] = 0x80;

  const view = new DataView(message.buffer);
  const bits = bytes.length * BITS_PER_BYTE;
  view.setUint32(total - 8, Math.floor(bits / 2 ** 32));
  view.setUint32(total - 4, bits >>> 0);

  return message;
}

function expand(view: DataView, offset: number, words: Uint32Array): void {
  for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);

  for (let index = 16; index < WORDS_PER_BLOCK; index += 1) {
    const a = words[index - 15] ?? 0;
    const b = words[index - 2] ?? 0;
    const small0 = rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3);
    const small1 = rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10);

    words[index] = ((words[index - 16] ?? 0) + small0 + (words[index - 7] ?? 0) + small1) >>> 0;
  }
}

/** As oito variáveis de trabalho de uma rodada (a–h, na norma). */
type Working = [number, number, number, number, number, number, number, number];

const at = (list: ArrayLike<number>, index: number): number => list[index] ?? 0;

function compress(state: Uint32Array, words: Uint32Array): void {
  let working = Array.from(state) as Working;

  for (let index = 0; index < WORDS_PER_BLOCK; index += 1) {
    working = round(working, at(ROUND_CONSTANTS, index) + at(words, index));
  }

  working.forEach((value, index) => {
    state[index] = (at(state, index) + value) >>> 0;
  });
}

/** Uma rodada: mistura as oito variáveis com a constante e a palavra da vez. */
function round([a, b, c, d, e, f, g, h]: Working, input: number): Working {
  const big1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
  const choice = (e & f) ^ (~e & g);
  const first = (h + big1 + choice + input) >>> 0;
  const big0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
  const majority = (a & b) ^ (a & c) ^ (b & c);
  const second = (big0 + majority) >>> 0;

  return [(first + second) >>> 0, a, b, c, (d + first) >>> 0, e, f, g];
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
