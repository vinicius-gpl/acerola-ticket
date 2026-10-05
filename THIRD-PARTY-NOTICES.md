# Avisos sobre software de terceiros

O código **deste projeto** é distribuído sob a licença MIT — veja [`LICENSE`](./LICENSE).

A licença MIT vale para o que foi escrito neste repositório. **Ela não se estende às
dependências**: cada biblioteca que o projeto instala continua sob a licença do autor dela. A
lista do que é aceito, e das exceções avaliadas, fica em
[`license-policy.json`](./license-policy.json).

Este arquivo destaca o que **não** é software de código aberto, ou que merece atenção de quem
for usar, modificar ou redistribuir o projeto.

> **English summary.** This project's own source code is MIT-licensed. That license does not
> cover third-party dependencies. In particular, **GSAP is not open-source software**: it is
> distributed under Webflow's proprietary "Standard License" and is not relicensed by this
> project. See below.

---

## GSAP — não é código aberto

**O que é:** a biblioteca de animação usada na tela do painel
(`acerola/dashboard/client/src/lib/motion/motion.ts`).

**Licença:** [GSAP Standard License](https://gsap.com/community/standard-license/) — a licença
"sem custo" da Webflow, Inc. Não é MIT, não é BSD e não é uma licença aprovada como código
aberto.

**Aviso:**

- O GSAP **não faz parte** do que este projeto licencia sob MIT. Ele é instalado a partir do
  npm e continua sendo propriedade da Webflow, sob os termos dela.
- Este projeto **não relicencia, não modifica e não concede direito nenhum** sobre o GSAP. Quem
  usa ou redistribui este projeto precisa aceitar e cumprir a licença do GSAP por conta
  própria.
- A licença do GSAP permite o uso gratuito, inclusive comercial, mas **proíbe** usá-lo em
  ferramentas que permitam montar animações visuais sem código em concorrência com a Webflow,
  e fazer engenharia reversa dele para criar produto concorrente. Se o seu uso deste projeto
  se aproximar disso, o GSAP precisa ser removido ou substituído.
- A Webflow **pode alterar** os termos dessa licença e **pode encerrá-la** para quem a
  descumprir. Este projeto não tem controle sobre isso.
- Nada aqui é aconselhamento jurídico. Leia a licença original antes de redistribuir.

**Como remover:** o GSAP é usado em um único arquivo (`motion.ts`), em cinco efeitos. Trocar
esse arquivo por animações nativas do navegador elimina a dependência — e esta seção.

---

## Dependências AGPL instaladas, mas não usadas

A biblioteca de login da Neon (`@neondatabase/neon-js`) instala junto um kit de telas React
que este projeto **não importa**. Esse kit depende de pacotes sob AGPL-3.0:
`@triplit/client`, `@triplit/db`, `@triplit/logger`, `@triplit/react` e `ua-parser-js`.

- Eles ficam em `node_modules`, mas **não entram no que é entregue**: o projeto usa só o
  cliente de sessão (`@neondatabase/neon-js/auth`), que não os alcança.
- O verificador de licenças **reprova** qualquer arquivo do projeto que passe a importá-los
  (lista `forbiddenImports` em `license-policy.json`).
- Quem modificar o projeto para usar esse kit de telas passa a estar sujeito à AGPL-3.0.

---

## Pacote sem licença declarada

`buffers` (de 2011) não declara licença no `package.json` nem traz arquivo de licença. Ele
chega pelo `exceljs`, usado na exportação de relatórios em Excel. O autor publica os demais
pacotes dele como MIT/X11, mas a licença **deste** não está escrita em lugar nenhum — é um
risco residual conhecido, a rever se o `exceljs` for trocado.

---

## Conferir

```bash
mise run licenses:check    # reprova dependência fora da política
mise run licenses:list     # a licença de cada dependência instalada
```
