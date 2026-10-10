# Proxy na frente do sistema (Traefik, Caddy ou nginx)

Em produção o sistema roda atrás de um proxy reverso — o programa que recebe o endereço público
(`https://chamados.exemplo.com`) e repassa para o container. Parte da proteção fica **no proxy**,
e não no código. Este arquivo diz o que configurar nele, com um exemplo pronto para cada um.

Os exemplos usam `chamados.exemplo.com` e a porta `3005` (o valor de `API_PORT`). Troque pelos seus.

## O que o proxy precisa fazer

| O quê | Por quê |
|---|---|
| HTTPS | O login viaja nessas requisições. |
| Limitar o tamanho da requisição | Abrir chamado é público e aceita anexos. Sem teto, alguém manda arquivos enormes e derruba o servidor. |
| Limite apertado nas duas rotas públicas | `POST /api/tickets` (abrir chamado) e `GET /api/tickets/protocol/...` (consultar). O protocolo é sequencial; sem limite, dá para varrer todos os chamados. |
| Fechar `/docs` e `/docs-json` | É a documentação da API. Não precisa estar aberta para a internet. |
| Repassar WebSocket em `/agent` | É por onde o agente instalado nas máquinas conversa com o sistema. |

Os números dos exemplos:

- **64 MB por requisição.** O maior anexo aceito é um vídeo de 50 MB. Quem mandar vários vídeos de
  uma vez é recusado pelo proxy e precisa enviar em partes — é o preço de um teto que protege.
- **10 requisições por minuto por IP** nas rotas públicas, com folga para 5 em rajada. Uma pessoa
  abrindo um chamado e consultando o protocolo não chega perto disso.

O webhook da rede (`POST /api/network/webhook`) **não** precisa de regra no proxy: o sistema já o
limita sozinho (`API_WEBHOOK_RATE_LIMIT`).

## O que muda no `server/.env`

```bash
# Um proxy na frente = 1. Dois (por exemplo, Cloudflare + Traefik) = 2.
API_TRUST_PROXY_HOPS=1
# O endereço público da tela.
API_CORS_ORIGIN=https://chamados.exemplo.com
```

**`API_TRUST_PROXY_HOPS` é obrigatório.** Com o padrão `0`, o sistema enxerga todo mundo com o
endereço do proxy, e o limite de requisições passa a ser dividido entre todos os usuários juntos:
uma pessoa ocupada trava as outras. Também não aumente além do número real de proxies — cada salto
a mais é um salto em que o endereço passa a ser o que o cliente **disse** ser.

## Traefik (labels)

Serve para Docker Compose e para o Coolify, que usa Traefik por baixo. As labels vão no serviço do
sistema. Pressupõe um entrypoint `websecure` e um resolvedor de certificado `letsencrypt` já
configurados no Traefik.

```yaml
services:
  app:
    # ... build, env_file e healthcheck como em docker/compose.yml, SEM a seção `ports`:
    # atrás do proxy, a porta não é publicada direto na máquina.
    labels:
      - traefik.enable=true
      - traefik.http.services.acerola.loadbalancer.server.port=3005

      # Teto de 64 MB por requisição, em todas as rotas.
      - traefik.http.middlewares.acerola-body.buffering.maxRequestBodyBytes=67108864

      # 10 por minuto por IP, com rajada de 5 — só para as rotas públicas.
      - traefik.http.middlewares.acerola-public.ratelimit.average=10
      - traefik.http.middlewares.acerola-public.ratelimit.period=1m
      - traefik.http.middlewares.acerola-public.ratelimit.burst=5

      # A documentação da API só abre para a rede interna. Troque pela faixa da sua rede.
      - traefik.http.middlewares.acerola-internal.ipallowlist.sourcerange=10.0.0.0/8,192.168.0.0/16

      # Tudo: tela, API e o WebSocket do agente (o Traefik repassa WebSocket sozinho).
      - traefik.http.routers.acerola.rule=Host(`chamados.exemplo.com`)
      - traefik.http.routers.acerola.entrypoints=websecure
      - traefik.http.routers.acerola.tls.certresolver=letsencrypt
      - traefik.http.routers.acerola.middlewares=acerola-body

      # As duas rotas públicas. A prioridade maior faz esta regra ganhar da de cima.
      - traefik.http.routers.acerola-public.rule=Host(`chamados.exemplo.com`) && ((Method(`POST`) && Path(`/api/tickets`)) || PathPrefix(`/api/tickets/protocol/`))
      - traefik.http.routers.acerola-public.priority=100
      - traefik.http.routers.acerola-public.entrypoints=websecure
      - traefik.http.routers.acerola-public.tls.certresolver=letsencrypt
      - traefik.http.routers.acerola-public.middlewares=acerola-body,acerola-public

      # A documentação da API.
      - traefik.http.routers.acerola-docs.rule=Host(`chamados.exemplo.com`) && (PathPrefix(`/docs`) || Path(`/docs-json`))
      - traefik.http.routers.acerola-docs.priority=100
      - traefik.http.routers.acerola-docs.entrypoints=websecure
      - traefik.http.routers.acerola-docs.tls.certresolver=letsencrypt
      - traefik.http.routers.acerola-docs.middlewares=acerola-internal
```

Com outro proxy na frente do Traefik (Cloudflare, por exemplo), o limite e a lista de rede interna
precisam olhar o cabeçalho `X-Forwarded-For`, e não o endereço da conexão:

```yaml
      - traefik.http.middlewares.acerola-public.ratelimit.sourcecriterion.ipstrategy.depth=1
      - traefik.http.middlewares.acerola-internal.ipallowlist.ipstrategy.depth=1
```

## Caddy (Caddyfile)

O Caddy cuida do HTTPS e do WebSocket sozinho. **O limite de requisições não vem nele**: precisa
do módulo [`caddy-ratelimit`](https://github.com/mholt/caddy-ratelimit), incluído ao montar o
executável com `xcaddy build --with github.com/mholt/caddy-ratelimit`. Sem o módulo, apague o bloco
`rate_limit` — o resto funciona, mas as rotas públicas ficam só com o limite geral do sistema.

```caddyfile
{
	# Só com o módulo caddy-ratelimit: diz em que ponto da cadeia ele entra.
	order rate_limit before reverse_proxy
}

chamados.exemplo.com {
	# Teto de 64 MB por requisição.
	request_body {
		max_size 64MB
	}

	# A documentação da API só abre para a rede interna.
	@docs path /docs /docs/* /docs-json
	@outside not remote_ip 10.0.0.0/8 192.168.0.0/16
	handle @docs {
		respond @outside 403
	}

	# As duas rotas públicas: 10 por minuto por IP.
	@openTicket {
		method POST
		path /api/tickets
	}
	@lookup path /api/tickets/protocol/*
	rate_limit @openTicket {
		zone open_ticket {
			key {remote_host}
			events 10
			window 1m
		}
	}
	rate_limit @lookup {
		zone lookup {
			key {remote_host}
			events 10
			window 1m
		}
	}

	reverse_proxy app:3005
}
```

## nginx

O certificado fica por sua conta (Certbot, por exemplo). As duas linhas `limit_req_zone` e o bloco
`map` vão no contexto `http`, fora do `server`.

```nginx
# 10 por minuto por IP, um balde para cada rota pública.
limit_req_zone $binary_remote_addr zone=acerola_open:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=acerola_lookup:10m rate=10r/m;

# Para o WebSocket do agente.
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    http2 on;
    server_name chamados.exemplo.com;

    ssl_certificate     /etc/letsencrypt/live/chamados.exemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chamados.exemplo.com/privkey.pem;

    # Teto de 64 MB por requisição.
    client_max_body_size 64m;
    # O sistema responde 429 quando o limite dele estoura; o proxy usa o mesmo código.
    limit_req_status 429;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Abrir chamado. A lista de chamados (GET) usa o mesmo caminho e exige login: só o POST,
    # que é público, entra no limite.
    location = /api/tickets {
        limit_except GET HEAD OPTIONS {
            limit_req zone=acerola_open burst=5 nodelay;
        }
        proxy_pass http://app:3005;
    }

    # Consultar pelo protocolo.
    location /api/tickets/protocol/ {
        limit_req zone=acerola_lookup burst=5 nodelay;
        proxy_pass http://app:3005;
    }

    # A documentação da API só abre para a rede interna.
    location ~ ^/docs(-json)?(/|$) {
        allow 10.0.0.0/8;
        allow 192.168.0.0/16;
        deny all;
        proxy_pass http://app:3005;
    }

    # O WebSocket do agente.
    location /agent {
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 1h;
        proxy_pass http://app:3005;
    }

    location / {
        proxy_pass http://app:3005;
    }
}

server {
    listen 80;
    server_name chamados.exemplo.com;
    return 301 https://$host$request_uri;
}
```

## Como conferir depois de subir

```bash
# 1. O teto de tamanho: um arquivo de 70 MB tem que voltar 413.
head -c 73400320 /dev/zero > /tmp/big.bin
curl -s -o /dev/null -w '%{http_code}\n' -F attachments=@/tmp/big.bin https://chamados.exemplo.com/api/tickets

# 2. O limite das rotas públicas: depois de umas 15 consultas seguidas, tem que aparecer 429.
for i in $(seq 1 20); do
  curl -s -o /dev/null -w '%{http_code} ' https://chamados.exemplo.com/api/tickets/protocol/1
done; echo

# 3. A documentação: de fora da rede interna, tem que voltar 403.
curl -s -o /dev/null -w '%{http_code}\n' https://chamados.exemplo.com/docs
```

E, na tela, entre com duas pessoas em redes diferentes: se uma for travada pelo limite quando a
outra é quem está usando muito, o `API_TRUST_PROXY_HOPS` está errado.

> Estes exemplos foram escritos a partir da documentação de cada proxy e das rotas do sistema.
> Não foram executados contra uma instalação real — rode a conferência acima antes de confiar.
