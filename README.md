# Papudim — Sistema de Pedidos Online

Este repositório contém o frontend e o backend do sistema de pedidos do Papudim. Abaixo estão as informações atualizadas sobre como o sistema está funcionando hoje, incluindo alterações operacionais e medidas de segurança atualmente em vigor.

## Visão geral atual

- Frontend estático em `frontend/public` (cardápio, checkout e painel admin).
- Backend em Node.js/Express em `server/` que persiste pedidos no Firebase Firestore.
- A integração com o gateway Asaas está _desativada_ (código mantido em `server/services/asaasService.js`). O fluxo principal hoje registra pedidos e envia notificações via WhatsApp (CallMeBot).

## O que mudou / estado operacional

- Asaas: funcionalidade comentada/desativada — para reativar consulte [REATIVAR_ASAAS.md](REATIVAR_ASAAS.md).
- Pagamentos: o sistema grava pedidos e envia notificação via CallMeBot (WhatsApp). Há um webhook para receber confirmações externas (quando aplicável).
- Autenticação admin: login via `/api/login` que emite um JWT usado nas rotas administrativas; logout limpa o cookie JWT.
- Rate limiting: proteção ativa contra spam de pedidos. Veja [server/middlewares/rateLimit.js](server/middlewares/rateLimit.js) — atualmente `pedidoLimiter` permite 1 pedido por IP a cada 5 minutos.

## Endpoints principais

- GET `/api/cardapio` — retorna o cardápio (rota pública)
- POST `/api/pagar` — cria um pedido (aplicado `pedidoLimiter`)
- POST `/api/pagamento-webhook` — webhook para atualizações de pagamento
- GET `/api/status-pedido` — consulta status do pedido (limitado)
- GET `/api/admin-pedidos` — lista de pedidos (requer autenticação)
- PUT `/api/atualizar-status` — atualizar status de pedido (requer autenticação)
- DELETE `/api/deletar-pedido/:id` — remover pedido (requer autenticação)
- POST `/api/login` — login do admin (rate-limited)
- POST `/api/logout` — logout (limpa cookie)
- GET `/` e `/health` — health-checks
- POST `/api/test-webhook` — endpoint de debug para webhooks

Arquivos de rota e controllers relevantes: [server/routes/pedidoRoutes.js](server/routes/pedidoRoutes.js), [server/controllers/pedidoController.js](server/controllers/pedidoController.js).

## Segurança e limitações

- Sanitização: entrada do cliente é sanitizada via `server/utils/sanitize.js`.
- Rate limiting global e específico para login/pedidos em `server/middlewares/rateLimit.js`.
- Proteção de rotas administrativas via `server/middlewares/authMiddleware.js` (JWT).
- CORS restrito no `server/index.js` para domínios configurados.

## Variáveis de ambiente importantes

- `JWT_SECRET` — segredo para assinar JWTs
- `JWT_COOKIE_NAME` — nome do cookie usado para o token admin (opcional)
- `CALLMEBOT_NUMERO` e `CALLMEBOT_APIKEY` — usados para enviar notificações WhatsApp
- `FIREBASE_CONFIG_JSON` — credenciais do Service Account (JSON serializado)
- `KEEP_AWAKE`, `PING_URL` — usados para manter o servidor acordado (opcional)
- `ASAAS_ACCESS_TOKEN`, `ASAAS_API` — usados apenas se reativar Asaas

Não versionar segredos. Exemplo: veja `.env` local (não comitar).

## Observações operacionais

- Para aplicar mudanças de código no backend, reinicie o servidor Node.js.
- O rate limiter atual (`pedidoLimiter`) já protege a rota de criação de pedidos (`POST /api/pagar`). Se você executar múltiplas instâncias do servidor no futuro, considere usar um store centralizado (Redis) para rate limiting distribuído.
- Para reativar pagamentos via Asaas, siga as instruções em [REATIVAR_ASAAS.md](REATIVAR_ASAAS.md) e revise `server/services/asaasService.js`.

## Próximos passos sugeridos (opcionais)

- Adicionar blacklist temporária/ban após N infrações usando Redis para persistência.
- Migrar rate limiter para `rate-limit-redis` se for necessário suportar múltiplas instâncias.
- Adicionar testes automatizados para endpoints críticos (criação de pedido, webhook).

---

Se quiser, eu atualizo o README com exemplos de `.env` (com placeholders) ou adiciono um script de deploy/healthcheck. Quer que eu adicione um exemplo de `.env` seguro no README?
