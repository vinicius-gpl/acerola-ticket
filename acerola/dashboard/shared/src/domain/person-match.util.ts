/**
 * QUEM ESTÁ FALANDO NO WHATSAPP — achar a conta da pessoa pelo nome que ela escreveu.
 *
 * O WhatsApp só diz o número. O bot pergunta o nome e compara com as pessoas do escritório:
 *
 *  - o nome bate quando CADA nome escrito aparece no nome da pessoa — inteiro, ou como começo
 *    de um nome com pelo menos três letras ("Ana Sou" acha "Ana Souza"). Acento, maiúscula e
 *    "de/da/dos" não contam;
 *  - entre os nomes que batem, quem já abriu chamado com aquele telefone ganha: se for um só,
 *    é ela;
 *  - sobrando mais de uma, o bot pergunta quem é quem, com o e-mail mascarado para diferenciar;
 *  - nenhuma bate: o pedido segue sem vínculo, e o bot pergunta o e-mail como antes.
 *
 * Tudo aqui é texto puro, sem banco nem WhatsApp.
 */

export type PersonCandidate = { id: string; name: string; email: string };

export type PersonMatch =
  | { kind: 'one'; person: PersonCandidate }
  | { kind: 'many'; people: PersonCandidate[] }
  | { kind: 'none' };

/* A lista do "quem é você?" é respondida com UM dígito: nove opções no máximo. */
export const MAX_PERSON_OPTIONS = 9;

const CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const PREFIX_MIN_LETTERS = 3;
const NONE_ANSWERS = new Set(['0', 'nenhum', 'nenhuma', 'nenhum desses', 'nenhuma dessas']);

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[*_~]/g, '').trim().toLowerCase();
}

/** Os nomes que contam, sem acento e sem "de/da/dos". */
export function nameTokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z']+/)
    .filter((token) => token !== '' && !CONNECTORS.has(token));
}

function tokenMatches(typed: string, candidate: string): boolean {
  if (typed === candidate) return true;

  return typed.length >= PREFIX_MIN_LETTERS && candidate.startsWith(typed);
}

/** O nome escrito cabe no nome da pessoa? */
export function nameMatches(typed: string, candidateName: string): boolean {
  const wanted = nameTokens(typed);
  const available = nameTokens(candidateName);
  if (wanted.length === 0) return false;

  return wanted.every((token) => available.some((candidate) => tokenMatches(token, candidate)));
}

/**
 * Quem é a pessoa, pelo nome escrito, entre as do escritório. `phoneOwnerIds` são as pessoas
 * que já abriram chamado com o telefone de quem escreve.
 */
export function identifyPerson(
  typedName: string,
  candidates: readonly PersonCandidate[],
  phoneOwnerIds: readonly string[],
): PersonMatch {
  const matches = uniqueById(candidates.filter((person) => nameMatches(typedName, person.name)));
  const byPhone = matches.filter((person) => phoneOwnerIds.includes(person.id));
  const [onlyByPhone] = byPhone;
  if (byPhone.length === 1 && onlyByPhone) return { kind: 'one', person: onlyByPhone };

  const [only] = matches;
  if (matches.length === 1 && only) return { kind: 'one', person: only };
  if (matches.length === 0) return { kind: 'none' };

  /* Quem já usou o telefone vem primeiro: é o palpite mais provável. */
  const ranked = [...byPhone, ...matches.filter((person) => !byPhone.includes(person))];

  return { kind: 'many', people: ranked.slice(0, MAX_PERSON_OPTIONS) };
}

function uniqueById(people: PersonCandidate[]): PersonCandidate[] {
  return people.filter(
    (person, index) => people.findIndex((other) => other.id === person.id) === index,
  );
}

/** "ana.souza@empresa.com.br" → "an***@empresa.com.br": diferencia sem expor o endereço. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');

  return `${local.slice(0, 2)}***@${domain}`;
}

/** A lista do "quem é você?", numerada, com a saída "nenhum desses" no fim. */
export function personOptionsText(people: readonly PersonCandidate[]): string {
  const options = people.map(
    (person, index) => `${index + 1}. ${person.name} (${maskEmail(person.email)})`,
  );

  return [...options, '0. Nenhum desses'].join('\n');
}

/** A resposta ao "quem é você?": a pessoa, "nenhum desses" ou nulo quando não deu para entender. */
export function pickPerson(
  text: string,
  people: readonly PersonCandidate[],
): PersonCandidate | 'none' | null {
  const answer = normalize(text);
  if (NONE_ANSWERS.has(answer)) return 'none';

  const byNumber = /^\d+$/.test(answer) ? people[Number(answer) - 1] : undefined;
  if (byNumber) return byNumber;

  const byName = people.filter((person) => nameMatches(answer, person.name));

  return byName.length === 1 ? (byName[0] ?? null) : null;
}
