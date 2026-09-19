## O que muda

<!-- Uma ou duas frases, em português, sobre o que a pessoa que usa o sistema passa a conseguir fazer. -->

## Como conferir

<!-- O passo a passo para ver funcionando: qual tela abrir, o que clicar, o que deve aparecer. -->

## Definition of Done (CONTRIBUTING §14)

- [ ] Commits no formato `[tipo](local): Mensagem`
- [ ] Branch saiu de `develop` (ou de `main`, se for `hotfix/`)
- [ ] `npm run lint`, `npm run typecheck` e `npm test` verdes
- [ ] Caminho feliz **e** caminho triste testados
- [ ] Story para todo primitivo/compositor novo ou alterado
- [ ] Endpoint novo documentado no Swagger
- [ ] Mudança de banco com migration gerada (`npm run db:generate`) e seed atualizado
- [ ] Nenhum hook de dado dentro de componente de UI
- [ ] Props agrupadas em `data` / `ui` / `state` / `actions`
- [ ] Nada editado dentro de `lib/vendor/`
- [ ] `.env.example` atualizado se entrou variável nova
- [ ] Nenhuma chave, senha ou dado real de cliente no diff — inclusive em seed, story e teste
- [ ] Idioma conferido: nada em inglês na tela, nada em português em log/erro interno/teste
