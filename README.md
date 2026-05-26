# Mapa Astral Personalizado — Astralia

Produto premium do ecossistema Astralia. Mapa natal completo (10 planetas + 12 casas +
aspectos + dignidades + stelliums), gerado com Claude **Opus 4.7**, entregue como PDF
por e-mail. **Premium ≠ isca**: não confundir com o Mapa Astral grátis/síncrono.

## Fluxo atual (fase de validação de venda)

```
Cliente preenche dados  →  paga via PIX  →  webhook confirma e ENFILEIRA o pedido
                                                       ↓
                              tela "seu mapa chega em até 24h"
                                                       ↓
                          [VOCÊ gera manualmente]  →  envia o PDF por e-mail
```

A geração **não** acontece na hora. O produto é Opus + 10-14 mil palavras: gerar síncrono
estouraria o limite de tempo do Vercel e deixaria o cliente esperando minutos. Por isso,
nesta fase, o site só **captura + cobra + avisa**, e você gera os mapas em lote enquanto o
volume é baixo. Quando o pipeline n8n estiver pronto, ele assume essa geração (ver abaixo).

## Estrutura

```
api/
  check.js        verifica status da sessão (genérico)
  config.js       devolve a public key do Mercado Pago (genérico)
  cliente.js      cadastro/código único do cliente (compartilhado entre produtos via Redis)
  pagamento.js    cria o pagamento PIX (preço do servidor, CPF obrigatório, URL derivada do host)
  webhook.js      confirma pagamento, registra cliente e enfileira para geração
  pedidos.js      PAINEL ADMIN — lista os pedidos pagos aguardando geração (protegido)
  prompt-mapa-astral-personalizado.js   o prompt premium (Opus), pronto para uso
public/
  index.html      captura de dados + PIX + tela de aviso
precos.json        espelho local; em produção use o repo central astralia-precos
vercel.json
```

## Variáveis de ambiente (Vercel)

| Variável | Para quê |
|---|---|
| `REDIS_URL` | sessões, fila de pedidos e cadastro de clientes |
| `MP_ACCESS_TOKEN` | criar e consultar pagamentos no Mercado Pago |
| `MP_PUBLIC_KEY` | front (cartão; PIX não usa, mas mantido por compatibilidade) |
| `ADMIN_SECRET` | proteger o painel `/api/pedidos` |
| `WEBHOOK_URL` *(opcional)* | sobrescreve a notification_url; se ausente, deriva do domínio |
| `ANTHROPIC_API_KEY` | só quando a geração for automatizada |
| `FREEASTROLOGY_API_KEY` | só quando a geração for automatizada (planetas/casas/aspectos) |

> **Bug do PIX evitado:** a `notification_url` é derivada do próprio domínio da requisição
> (`req.headers.host`), nunca de uma variável que pode faltar. E o PIX agora exige `CPF`
> (`payer.identification`), que o Mercado Pago cobra e a versão antiga não enviava.

## Gerar um mapa manualmente (fase atual)

1. `GET /api/pedidos?secret=SEU_ADMIN_SECRET` → lista os pedidos pagos pendentes (com os dados de nascimento).
2. Para cada pedido: rode o `prompt-mapa-astral-personalizado.js` com os dados, usando Opus 4.7.
   (O prompt já devolve JSON por seções, pronto para o template de PDF.)
3. Gere o PDF e envie ao e-mail do cliente.
4. `GET /api/pedidos?secret=SEU_ADMIN_SECRET&marcar=sess_xxx` → marca o pedido como `gerado`.

## Onde o n8n entra (próximo passo)

A fila já existe: cada pagamento aprovado dá `LPUSH` em `fila:mapaastralpersonalizado`.
O n8n vai **consumir essa fila**: pegar o pedido → chamar a FreeAstrology API → montar o
prompt → chamar a Opus em batch (48h) → gerar o PDF → enviar o e-mail → marcar `gerado`.
Nada no front muda quando isso ligar — só a etapa "VOCÊ gera manualmente" vira automática.

## Pendências conhecidas
- Template de PDF (camada compartilhada entre os produtos) — ainda não existe.
- Geração automática (n8n) — ainda não existe; geração é manual nesta fase.
- `precos.json`: em produção, ativar a entrada `mapaastralpersonalizado` no repo central.

## Motor de geração (api/gerar-mapa.js)

Peça nova e central — usada tanto pela geração manual quanto pelo n8n:

```
gerarMapa(dados)  →  FreeAstrology (planetas/casas/aspectos)
                  →  ADAPTADOR (formato EN/strings  →  objeto {Sol:{signo,casa,grau}, ...})
                  →  buildPromptMapaAstralPersonalizado
                  →  Claude Opus 4.7
                  →  extrai JSON {secoes:[...]}  →  pronto para o template de PDF
```

O **adaptador** (`parseFreeAstrology`) é o elo que faltava entre a FreeAstrology e os
prompts novos: o Lilith usa formatadores que viram texto; os prompts novos querem um
objeto estruturado. O adaptador faz essa conversão e serve aos 9 produtos.

Roda FORA do request do Vercel (n8n, worker ou script), então não esbarra no timeout.

### Lacuna conhecida: geocoding
O motor precisa de `lat`, `lon` e `timezone`. O frontend atual captura a cidade como
TEXTO. Falta a etapa cidade → lat/lon/timezone (o Lilith resolve isso no front com um
seletor de cidades). Portar isso é pré-requisito para o motor rodar de ponta a ponta.

### Não testado a partir daqui
A lógica do adaptador foi validada com dados simulados. As chamadas reais à
FreeAstrology e à Anthropic só podem ser testadas no ambiente com as chaves reais.
