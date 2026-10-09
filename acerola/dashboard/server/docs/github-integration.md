# Integração GitHub do módulo Sistema

O GitHub App da organização alimenta os dados compartilhados dos projetos. A autorização individual do próprio GitHub App identifica o administrador; o token individual não é usado para sincronizar os projetos. As permissões de acesso aos repositórios são configuradas no GitHub App e concedidas à instalação.

As roles internas controlam o acesso. Gestores consultam os dados sincronizados sem OAuth. Admins de Sistema e super admins precisam concluir a vinculação individual para acessar o módulo. Gestores não podem cadastrar, editar, excluir nem acionar a sincronização; continuam podendo interagir nos chamados. A role de Sistema vem de `roles.sistema`, sem promover uma role externa `admin` automaticamente.

## Configuração por instalação licenciada

1. Crie um GitHub App e instale-o na organização, selecionando os repositórios que o Acerola pode acessar. Permissões de repositório: **Issues: Read and write**, **Pull requests: Read-only**, **Metadata: Read-only**.
2. Configure no servidor `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` e `GITHUB_APP_PRIVATE_KEY`. A chave é o PEM gerado no GitHub e aceita quebras de linha escapadas como `\n`. Nunca coloque essas credenciais no client.
3. Na página do GitHub App, use o **Client ID** (não o App ID) e gere um **Client secret**. Configure `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI`, `GITHUB_OAUTH_FRONTEND_URL` e `GITHUB_OAUTH_ENCRYPTION_KEY`, conforme `.env.example`. Em “Identifying and authorizing users”, cadastre os callbacks indicados abaixo. A chave de criptografia deve ter 32 bytes em hexadecimal.
4. Execute `npm run db:migrate -w server` na pasta `acerola/dashboard` para criar as tabelas de conexão e estados OAuth.
5. Vincule a conta do admin usando o botão do login ou a tela obrigatória ao entrar em Sistema. Cadastre o repositório no projeto e acione **Sincronizar**. PRs e issues da equipe aparecem na timeline do projeto, inclusive os PRs sem chamado.

Callback de desenvolvimento: `http://localhost:4001/api/integrations/github/callback`.

Callback de produção: `https://os.grupoazuos.com.br/api/integrations/github/callback` (ajuste domínio/protocolo à implantação real).

O Redirect URI é a rota do servidor que valida estado, cookie e PKCE. Depois dela, o navegador retorna a `/system/dashboard`. O login local continua identificando o usuário; vincular GitHub não cria uma nova conta no Acerola.

Os tokens OAuth ficam criptografados no banco. A integração da organização emite tokens de instalação com renovação automática e não depende da conta do gestor. Não há instalação automática do GitHub App, webhook ou sincronização periódica nesta etapa: a configuração é feita no servidor e a atualização é acionada pelo admin. Criar uma issue a partir de um chamado continua ocorrendo ao vinculá-lo a um projeto; vincular automaticamente PRs a chamados ainda exige uma etapa própria.

Referência: [autenticação de uma instalação GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation).
