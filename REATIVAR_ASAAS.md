# Como Reativar Pagamentos via Asaas

Este guia descreve o passo a passo para reativar a integração com o gateway de pagamento Asaas.

---

## Pré-requisitos

- Conta ativa no Asaas (sandbox ou produção)
- Token de acesso configurado em `.env`
- Variáveis de ambiente:
  ```
  ASAAS_ACCESS_TOKEN=seu_token_aqui
  WEBHOOK_URL=https://homepudimback.onrender.com/api/pagamento-webhook
  ```

---

## Passo 1: Backend - `server/services/asaasService.js`

Descomentar todo o código do arquivo (remover `//` das linhas 12-116).

O arquivo deve voltar a ter:
```javascript
import fetch from "node-fetch";

export async function criarClienteAsaas(...) { ... }
export async function criarCobrancaAsaas(...) { ... }
export async function configurarWebhookAsaas(...) { ... }
```

---

## Passo 2: Backend - `server/index.js`

### 2.1 Descomentar o import (linha ~29):
```javascript
import { configurarWebhookAsaas } from "./services/asaasService.js";
```

### 2.2 Descomentar log do token (linha ~32):
```javascript
console.log("Token carregado:", process.env.ASAAS_ACCESS_TOKEN?.slice(0, 10) + "...");
```

### 2.3 Descomentar variáveis e webhook (linhas ~52-56):
```javascript
const ASAAS_ACCESS_TOKEN = process.env.ASAAS_ACCESS_TOKEN;
const ASAAS_API = "https://api-sandbox.asaas.com/";
configurarWebhookAsaas(ASAAS_API, ASAAS_ACCESS_TOKEN);
```

### 2.4 Descomentar app.locals (linhas ~102-104):
```javascript
app.locals.ASAAS_API = ASAAS_API;
app.locals.ASAAS_ACCESS_TOKEN = ASAAS_ACCESS_TOKEN;
```

---

## Passo 3: Backend - `server/controllers/pedidoController.js`

### 3.1 Descomentar import (linha ~23):
```javascript
import { criarClienteAsaas, criarCobrancaAsaas } from "../services/asaasService.js";
```

### 3.2 Na função `criarPedido`:

#### 3.2.1 Restaurar destructuring com Asaas (linha ~36):
```javascript
const { pedidosCollection, ASAAS_API, ASAAS_ACCESS_TOKEN } = req.app.locals;
```

#### 3.2.2 Restaurar validação de pagamento (linha ~44):
Adicionar `!pedido.pagamento ||` na condição de validação.

#### 3.2.3 Restaurar status para "pendente" (linha ~94):
```javascript
pedido.status = "pendente";
```

#### 3.2.4 Descomentar chamadas Asaas e remover retorno WhatsApp (linhas ~107-136):
```javascript
const clienteData = await criarClienteAsaas(...);
const cobranca = await criarCobrancaAsaas(...);
res.json({ url: cobranca.invoiceUrl, pedidoId: pedidoId });
```

---

## Passo 4: Frontend - `frontend/public/cardapio.html`

### 4.1 Descomentar campos de pagamento (linhas ~151-170):
```html
<select id="formaPagamento">...</select>
<select id="parcelas">...</select>
```

### 4.2 Restaurar texto do botão:
```html
Finalizar Pedido
```

### 4.3 Remover parágrafo explicativo sobre WhatsApp.

---

## Passo 5: Frontend - `frontend/public/script.js`

### 5.1 Descomentar variáveis (linhas ~17-18):
```javascript
const formaPagamentoInput = document.getElementById("formaPagamento");
const selectParcelas = document.getElementById("parcelas");
```

### 5.2 Restaurar `btnFinalizar` com validação de pagamento.

### 5.3 Restaurar `pedidoParaEnviar` com campos `pagamento` e `parcelas`.

### 5.4 Restaurar `btnConfirmarResumo` para redirecionar para URL de pagamento:
```javascript
if (data.url) {
  window.location.href = data.url;
}
```

### 5.5 Restaurar `validarFormulario` para incluir `!pagamento`.

### 5.6 Restaurar listeners do select de pagamento.

---

## Passo 6: Testar

1. Reiniciar o servidor backend
2. Verificar log: `Token carregado: ...`
3. Verificar log: `Webhook configurado com sucesso`
4. Fazer pedido de teste no sandbox
5. Verificar se webhook atualiza status do pedido

---

## Ambiente de Produção

Para usar em produção, alterar:
```javascript
const ASAAS_API = "https://api.asaas.com/"; // Remover "-sandbox"
```

E usar token de produção no `.env`.

---

## Suporte

Em caso de dúvidas, consulte:
- [Documentação Asaas](https://docs.asaas.com/)
- Arquivo `MUDANCAS_ASAAS.md` para ver o que foi alterado
