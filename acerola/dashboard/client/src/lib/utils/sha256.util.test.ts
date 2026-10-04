import { describe, expect, it } from 'vitest';

import { sha256Hex, sha256HexFallback } from './sha256.util';

const bytesOf = (text: string) => new TextEncoder().encode(text);

/* Os vetores de teste da própria norma (FIPS 180-4). */
const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const TWO_BLOCKS = '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1';

describe('sha256HexFallback', () => {
  // feliz
  it('gives the fingerprint the standard says', () => {
    expect(sha256HexFallback(bytesOf('abc'))).toBe(ABC);
    expect(
      sha256HexFallback(bytesOf('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')),
    ).toBe(TWO_BLOCKS);
  });

  it('agrees with the browser on a file bigger than a few blocks', async () => {
    const file = Uint8Array.from({ length: 5000 }, (_, index) => (index * 31) % 256);

    expect(sha256HexFallback(file)).toBe(await sha256Hex(file));
  });

  // triste
  it('still gives a fingerprint for an empty file', () => {
    expect(sha256HexFallback(new Uint8Array())).toBe(EMPTY);
  });

  /* É a propriedade que a conferência usa: um byte diferente, outra impressão digital. */
  it('changes completely when a single byte changes', () => {
    expect(sha256HexFallback(bytesOf('abd'))).not.toBe(ABC);
  });
});

describe('sha256Hex', () => {
  // feliz
  it('gives the same fingerprint through the browser', async () => {
    expect(await sha256Hex(bytesOf('abc'))).toBe(ABC);
  });
});
