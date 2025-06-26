# Configuração do Webhook Asaas

## URLs dos Webhooks

### Produção
- **URL do Webhook:** `https://homepudimback.onrender.com/api/pagamento-webhook`
- **Health Check:** `https://homepudimback.onrender.com/api/webhook-health`

### Desenvolvimento
- **URL do Webhook:** `http://localhost:3000/api/pagamento-webhook`
- **Health Check:** `http://localhost:3000/api/webhook-health`

## Como Configurar no Asaas

1. **Acesse o painel do Asaas** (sandbox ou produção)
2. **Vá em Configurações > Webhooks**
3. **Adicione a URL do webhook:**
   - URL: `https://homepudimback.onrender.com/api/pagamento-webhook`
   - Eventos: Selecione os eventos de pagamento
4. **Teste a conectividade** acessando o health check

## Eventos Suportados

O webhook aceita os seguintes eventos do Asaas:
- `PAYMENT_CONFIRMED` - Pagamento confirmado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_APPROVED` - Pagamento aprovado
- `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` - Captura do cartão recusada
- `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` - Aguardando estorno
- `PAYMENT_DUNNING_RECEIVED` - Cobrança recebida
- `PAYMENT_BANK_SLIP_VIEWED` - Boleto visualizado
- `PAYMENT_CHECKOUT_VIEWED` - Checkout visualizado

## Estrutura do Payload

```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_123456789",
    "externalReference": "pedido-1234567890",
    "status": "RECEIVED",
    "value": 100.00,
    "dateCreated": "2025-06-26T00:00:00.000Z",
    "customer": {
      "id": "cus_123456789",
      "name": "Nome do Cliente"
    }
  }
}
```

## Testando o Webhook

### Teste Manual via cURL

```bash
curl -X POST "https://homepudimback.onrender.com/api/pagamento-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test",
      "externalReference": "pedido-ID-AQUI",
      "status": "RECEIVED",
      "value": 100.0
    }
  }'
```

### Teste via PowerShell

```powershell
Invoke-RestMethod -Uri "https://homepudimback.onrender.com/api/pagamento-webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"event":"PAYMENT_CONFIRMED","payment":{"id":"pay_test","externalReference":"pedido-ID-AQUI","status":"RECEIVED","value":100.0}}'
```

### Teste via Node.js

```javascript
node webhook-test.js
```

## Verificando Status do Pedido

Após o webhook ser processado, você pode verificar se o status foi atualizado:

```javascript
node check-status.js
```

## Logs

O webhook gera logs detalhados que podem ser visualizados nos logs do Render:
- `🚨` Logs de entrada do webhook
- `🔔` Logs de processamento
- `✅` Logs de sucesso
- `❌` Logs de erro

## Troubleshooting

### Webhook não está sendo chamado
1. Verifique se a URL está configurada corretamente no Asaas
2. Teste o health check: `https://homepudimback.onrender.com/api/webhook-health`
3. Verifique os logs do servidor para ver se há tentativas de conexão

### Pedido não está sendo atualizado
1. Verifique se o `externalReference` no webhook corresponde ao ID do pedido
2. Verifique se o evento está na lista de eventos aceitos
3. Teste o webhook manualmente para validar a lógica

### Erro de CORS
- O webhook tem middleware específico que bypassa as restrições de CORS
- Webhooks não enviam Origin header, então são aceitos automaticamente
