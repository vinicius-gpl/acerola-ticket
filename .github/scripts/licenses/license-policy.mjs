/**
 * A REGRA de licenças, sem tocar em disco: dada a licença declarada por uma dependência e a
 * política do projeto (`license-policy.json`, na raiz), ela entra ou não entra?
 *
 * Fica separada do verificador (`check-licenses.mjs`) para poder ser testada sozinha: quem lê
 * `node_modules` e chama o `go` é o outro arquivo; aqui só há decisão.
 */

/** Como algumas dependências antigas escrevem licenças que hoje têm nome padrão (SPDX). */
const ALIASES = new Map([
  ['MIT/X11', 'MIT'],
  ['X11', 'MIT'],
  ['Apache 2.0', 'Apache-2.0'],
  ['Apache-2', 'Apache-2.0'],
  ['Apache License 2.0', 'Apache-2.0'],
  ['Apache License, Version 2.0', 'Apache-2.0'],
  ['BSD-3', 'BSD-3-Clause'],
  ['BSD-2', 'BSD-2-Clause'],
]);

export const UNKNOWN_LICENSE = 'UNKNOWN';

/** Uma licença só, no nome padrão: sem o `+` de "ou posterior" e sem apelido antigo. */
export function normalizeLicenseId(id) {
  const trimmed = id.trim().replace(/\+$/, '');

  return ALIASES.get(trimmed) ?? trimmed;
}

/**
 * Quebra a expressão em pedaços: parênteses, `AND`, `OR`, `WITH` e os nomes das licenças.
 *
 * Um nome pode ter espaço ("Apache License 2.0"), então o corte é nos OPERADORES, e não em
 * cada espaço.
 */
function tokenize(expression) {
  return expression
    .replace(/([()])/g, ' $1 ')
    .split(/\s+(AND|OR|WITH)\s+|(?<=[()])|(?=[()])/)
    .filter((part) => part !== undefined)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/**
 * A expressão de licença é ACEITA pela lista?
 *
 * `A OR B` basta uma — quem usa escolhe. `A AND B` precisam as duas. `A WITH exceção` vale
 * pela licença de base. Uma expressão que não dá para ler é recusada: na dúvida, alguém olha.
 */
export function isLicenseAllowed(expression, allowed) {
  if (typeof expression !== 'string' || expression.trim() === '') return false;

  const allow = new Set(allowed.map(normalizeLicenseId));
  const tokens = tokenize(expression);
  let position = 0;

  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseOperand() {
    const token = take();
    if (token === undefined || token === ')' || token === 'AND' || token === 'OR') return null;

    if (token === '(') {
      const inner = parseOr();
      if (take() !== ')') return null;

      return inner;
    }

    let result = allow.has(normalizeLicenseId(token));
    /* `GPL-2.0 WITH Classpath-exception-2.0`: a exceção só afrouxa; decide a licença de base. */
    if (peek() === 'WITH') {
      take();
      if (take() === undefined) return null;
    }

    return result;
  }

  function parseAnd() {
    let left = parseOperand();
    while (left !== null && peek() === 'AND') {
      take();
      const right = parseOperand();
      left = right === null ? null : left && right;
    }

    return left;
  }

  function parseOr() {
    let left = parseAnd();
    while (left !== null && peek() === 'OR') {
      take();
      const right = parseAnd();
      left = right === null ? null : left || right;
    }

    return left;
  }

  const verdict = parseOr();

  return verdict === true && position === tokens.length;
}

/**
 * Confere uma lista de dependências contra a política.
 *
 * Devolve o que foi RECUSADO e as exceções que NÃO FORAM USADAS. Exceção sem uso também
 * reprova: ela é uma porta aberta para um pacote que já saiu — ou que mudou de licença, e
 * aí a exceção antiga não vale mais (ela é amarrada à licença exata que foi avaliada).
 */
export function checkPackages(packages, policy, ecosystem) {
  const exceptions = (policy.exceptions ?? []).filter((item) => item.ecosystem === ecosystem);
  const used = new Set();
  const refused = [];

  for (const dependency of packages) {
    if (isLicenseAllowed(dependency.license, policy.allow)) continue;

    const exception = exceptions.find(
      (item) => item.package === dependency.name && item.license === dependency.license,
    );
    if (exception) {
      used.add(exception);
      continue;
    }

    refused.push(dependency);
  }

  return { refused, unused: exceptions.filter((item) => !used.has(item)) };
}

/** Os endereços de `import`/`require` de um arquivo de código. */
export function importSpecifiersOf(source) {
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

  return [...source.matchAll(pattern)].map((match) => match[1]);
}

/**
 * O `import` proibido que este arquivo faz, se fizer algum.
 *
 * Existe por causa das exceções: uma dependência com licença restritiva pode ficar INSTALADA
 * sem problema enquanto o nosso código não a importa — e é isto que garante que não importa.
 */
export function forbiddenImportsIn(source, forbidden) {
  const specifiers = importSpecifiersOf(source);

  return forbidden.filter((rule) =>
    specifiers.some(
      (specifier) => specifier === rule.pattern || specifier.startsWith(`${rule.pattern}/`),
    ),
  );
}

/**
 * A licença escrita num arquivo LICENSE, quando o `package.json` não a declara.
 *
 * Só reconhece os textos inconfundíveis. Qualquer outra coisa é "desconhecida" — e
 * desconhecida não passa sem alguém olhar e registrar uma exceção.
 */
export function detectLicenseFromText(text) {
  const head = text.slice(0, 1500);

  if (/Apache License\s+Version 2\.0/i.test(head)) return 'Apache-2.0';
  if (/\bMIT License\b|\bMIT\/X11\b|Permission is hereby granted, free of charge/i.test(head)) return 'MIT';
  if (/\bISC License\b|Permission to use, copy, modify, and\/or distribute/i.test(head)) return 'ISC';

  return UNKNOWN_LICENSE;
}

/** A licença que o `package.json` declara, nos formatos que já existiram. */
export function declaredLicenseOf(manifest) {
  const { license, licenses } = manifest;

  if (typeof license === 'string' && license.trim() !== '') return license.trim();
  if (license && typeof license === 'object' && typeof license.type === 'string') return license.type;
  if (Array.isArray(licenses) && licenses.length > 0) {
    return licenses.map((item) => (typeof item === 'string' ? item : item?.type)).filter(Boolean).join(' OR ');
  }

  return null;
}
