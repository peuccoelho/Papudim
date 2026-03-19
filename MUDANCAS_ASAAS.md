# Mudanças na Integração Asaas

**Data:** Março 2026  
**Motivo:** Cliente optou por receber pedidos via WhatsApp em vez de pagamento online

---

## Resumo das Alterações

O sistema de pagamento online via Asaas foi **comentado** (não removido) para permitir reativação futura. Agora, ao finalizar um pedido, o cliente é redirecionado para o WhatsApp com uma mensagem pré-formatada.

---

## Arquivos Modificados

### Backend (`server/`)

| Arquivo | Alteração |
|---------|-----------|
| `services/asaasService.js` | Todo o código foi comentado |
| `index.js` | Import do asaasService e configuração do webhook comentados |
| `controllers/pedidoController.js` | Chamadas `criarClienteAsaas` e `criarCobrancaAsaas` comentadas; novo retorno JSON para WhatsApp |

### Frontend (`frontend/public/`)

| Arquivo | Alteração |
|---------|-----------|
| `script.js` | `btnConfirmarResumo` agora gera link WhatsApp; variáveis de pagamento comentadas |
| `cardapio.html` | Campos de pagamento (PIX/Cartão/Parcelas) comentados; botão alterado para "Enviar Pedido via WhatsApp" |

---

## Novo Fluxo de Pedido

1. Cliente preenche: nome, e-mail, celular
2. Seleciona itens do cardápio
3. Clica em "Enviar Pedido via WhatsApp"
4. Modal de confirmação exibe resumo
5. Ao confirmar:
   - Pedido é salvo no Firebase com status `aguardando_contato`
   - Abre WhatsApp com mensagem formatada
6. Cliente combina pagamento diretamente pelo WhatsApp

---

## Formato da Mensagem WhatsApp

```
🍮 *Novo Pedido - Papudim*

*Cliente:* João Silva
*E-mail:* joao@email.com
*Celular:* 71999999999

*Itens:*
- Pudim Tradicional x2 - R$ 15,80
- Pudim de Coco x1 - R$ 9,30

*Total:* R$ 25,10

Aguardo confirmação para finalizar o pedido! 😊
```

---

## Número WhatsApp Configurado

O número está definido diretamente no `script.js`:
```javascript
const numeroWhatsApp = "5571986961217";
```

Para alterar, edite essa linha em `frontend/public/script.js`.

---

## Status de Pedido Adicionado

Novo status `aguardando_contato` foi adicionado em:
- `controllers/pedidoController.js` (linha ~94)
- Lista de status válidos (linha ~289)

---

## Próximos Passos

Para reativar os pagamentos online via Asaas, consulte o arquivo `REATIVAR_ASAAS.md`.
