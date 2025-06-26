import express from "express";
import { criarPedido, statusPedido, adminPedidos, atualizarStatusPedido, criarPedidoCripto, testeWebhook } from "../controllers/pedidoController.js";
import { pagamentoWebhookSimples } from "../controllers/pedidoControllerWebhook.js";
import { autenticar } from "../middlewares/authMiddleware.js";
import { pedidoLimiter, webhookLimiter, adminLimiter, statusLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.post("/pagar", pedidoLimiter, criarPedido);
router.post("/pagamento-webhook", webhookLimiter, pagamentoWebhookSimples); // Usar versão simples
router.post("/teste-webhook", pedidoLimiter, testeWebhook); // Endpoint de teste
router.get("/status-pedido", statusLimiter, statusPedido); // Usar rate limiter mais permissivo
router.get("/admin-pedidos", adminLimiter, autenticar, adminPedidos);
router.put("/atualizar-status", adminLimiter, autenticar, atualizarStatusPedido);
router.post("/pagamento-cripto", pedidoLimiter, criarPedidoCripto);

export default router;