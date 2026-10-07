import { expect, test, type Page } from '@playwright/test';

/**
 * O PORTAL PÚBLICO do chamado, que é o escopo desta tela: abrir e acompanhar, sem senha.
 *
 * **Este arquivo não faz login, e isso é o desenho e não uma falta.** A tela existe justamente
 * para quem não tem conta no painel — quem está sem impressora. Um teste dela que começasse
 * entrando no sistema testaria outra coisa, e passaria a depender de uma conta na nuvem para
 * provar um caminho que não usa conta nenhuma.
 *
 * O ATENDIMENTO (o TI responder) é provado no E2E da API, em `server/test/tickets.e2e.ts`: lá
 * o chamado é respondido com identidade de verdade e a consulta pública é conferida depois,
 * mostrando a situação nova e escondendo responsável e solução.
 *
 * O que só quebra aqui, e o E2E da API não pega: o formulário tem QUATRO etapas, e o protocolo
 * é um número que sai numa tela e é digitado em outra. Um "Avançar" que pare de avançar, ou um
 * protocolo formatado diferente do que a consulta aceita, passa em todo teste de componente e
 * derruba o pedido de socorro de verdade.
 *
 * Sem `TEST_DATABASE_URL` (ver `playwright.config.ts`) tudo é pulado, em vez de arriscar rodar
 * contra o banco de trabalho.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'Precisa de TEST_DATABASE_URL no server/.env');

const PEDIDO = {
  nome: 'Marta da Recepção',
  whatsapp: '62999991234',
  /* MAIÚSCULO porque é assim que o catálogo de departamentos escreve o rótulo. */
  departamento: 'RECEPÇÃO',
  tipo: 'Impressora',
};

/** A descrição leva a hora para o teste não depender do que já está no banco. */
function descricaoUnica(): string {
  return `A impressora da recepção não puxa papel — E2E ${Date.now()}`;
}

/**
 * Escolhe num `OptionPicker`, que não é um `<select>` nativo.
 *
 * Com até seis opções ele vira pastilhas clicáveis; com mais, um botão que abre a lista. O
 * departamento tem onze e o tipo de problema nove, então os dois caem no segundo caso — e o
 * botão é achado pelo `aria-label`, porque o texto dele é o placeholder.
 */
async function escolher(page: Page, campo: string, opcao: string): Promise<void> {
  await page.getByRole('button', { name: campo, exact: true }).click();
  await page.getByRole('button', { name: opcao, exact: true }).click();
}

/** Percorre as quatro etapas do portal e devolve o protocolo que apareceu na tela. */
async function abrirChamado(page: Page, descricao: string): Promise<string> {
  await page.goto('/support');

  /* Etapa 1 — quem é você. */
  await page.getByLabel('Seu nome').fill(PEDIDO.nome);
  await page.getByLabel('Seu WhatsApp (com DDD)').fill(PEDIDO.whatsapp);
  await page.getByRole('button', { name: 'Avançar' }).click();

  /* Etapa 2 — sobre o problema. A urgência já vem escolhida: média é o padrão. */
  await escolher(page, 'Departamento', PEDIDO.departamento);
  await escolher(page, 'Tipo de problema', PEDIDO.tipo);
  await page.getByRole('button', { name: 'Avançar' }).click();

  /* Etapa 3 — o que aconteceu. */
  await page.getByLabel('Descrição do problema').fill(descricao);
  await page.getByRole('button', { name: 'Avançar' }).click();

  /* Etapa 4 — como te avisamos. Aqui o botão deixa de ser "Avançar". */
  await page.getByRole('button', { name: 'Abrir chamado' }).click();

  await expect(page.getByText('Chamado aberto. Seu protocolo é:')).toBeVisible();

  return page.getByText(/^CH-\d{4,}$/).innerText();
}

async function consultar(page: Page, protocolo: string): Promise<void> {
  await page.getByRole('button', { name: 'Consultar chamado' }).click();
  await page.getByLabel('Número do protocolo').fill(protocolo);
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
}

// feliz
test('opens a ticket with no login and looks it up by the protocol it just showed', async ({
  page,
}) => {
  const descricao = descricaoUnica();

  const protocolo = await abrirChamado(page, descricao);
  expect(protocolo).toMatch(/^CH-\d{4,}$/);

  /* A CONSULTA, na mesma tela e sem senha: é o que a pessoa faz no dia seguinte para saber se
     alguém pegou o chamado dela. */
  await consultar(page, protocolo);

  await expect(page.getByText(protocolo).first()).toBeVisible();
  await expect(page.getByText(descricao)).toBeVisible();
});

/* Quem anotou o protocolo no papel raramente escreve o traço — e a consulta aceita assim. */
test('accepts the protocol typed without the dash and without the leading zeros', async ({
  page,
}) => {
  const descricao = descricaoUnica();
  const protocolo = await abrirChamado(page, descricao);
  const soOsDigitos = protocolo.replace('CH-', '').replace(/^0+/, '');

  await consultar(page, soOsDigitos);

  await expect(page.getByText(descricao)).toBeVisible();
});

test('walks back a step without losing what was already typed', async ({ page }) => {
  await page.goto('/support');

  await page.getByLabel('Seu nome').fill(PEDIDO.nome);
  await page.getByLabel('Seu WhatsApp (com DDD)').fill(PEDIDO.whatsapp);
  await page.getByRole('button', { name: 'Avançar' }).click();

  await page.getByRole('button', { name: 'Voltar' }).click();

  await expect(page.getByLabel('Seu nome')).toHaveValue(PEDIDO.nome);
});

// triste
test('refuses to advance while the first step is empty, and says which field is missing', async ({
  page,
}) => {
  await page.goto('/support');

  await page.getByRole('button', { name: 'Avançar' }).click();

  /* Trava E diz o que falta: recusar sem dizer o motivo faz a pessoa clicar de novo achando
     que o botão está quebrado. */
  await expect(page.getByText('Informe seu nome')).toBeVisible();

  await page.getByLabel('Seu nome').fill(PEDIDO.nome);
  await expect(page.getByText('Informe seu nome')).toBeHidden();
});

test('refuses to advance without the problem description', async ({ page }) => {
  await page.goto('/support');

  await page.getByLabel('Seu nome').fill(PEDIDO.nome);
  await page.getByLabel('Seu WhatsApp (com DDD)').fill(PEDIDO.whatsapp);
  await page.getByRole('button', { name: 'Avançar' }).click();

  await escolher(page, 'Departamento', PEDIDO.departamento);
  await escolher(page, 'Tipo de problema', PEDIDO.tipo);
  await page.getByRole('button', { name: 'Avançar' }).click();

  await page.getByRole('button', { name: 'Avançar' }).click();

  await expect(page.getByText('Descreva o problema')).toBeVisible();
});

test('does not show a ticket for a protocol that does not exist', async ({ page }) => {
  const descricao = descricaoUnica();

  await abrirChamado(page, descricao);

  await page.goto('/support');
  await consultar(page, 'CH-999999');

  await expect(page.getByText(descricao)).toBeHidden();
});

/* A porta do painel continua trancada — e é o único teste daqui que fala dela: sem sessão, a
   tela interna manda a pessoa para o login em vez de mostrar chamado de ninguém. */
test('sends a visitor with no session away from the panel', async ({ page }) => {
  await page.goto('/infra/tickets');

  /* Espera a TELA antes do endereço: o SvelteKit desenha o login primeiro e sincroniza a barra
     de endereço depois, então olhar só a URL testa a parte que chega por último — e falha sem
     que nada esteja errado. O que a pessoa precisa é ver o formulário de entrada. */
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
