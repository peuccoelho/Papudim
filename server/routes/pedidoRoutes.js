import express from "express";
import { criarPedido, pagamentoWebhook, statusPedido, adminPedidos, atualizarStatusPedido, criarPedidoCripto } from "../controllers/pedidoController.js";
import { autenticar } from "../middlewares/authMiddleware.js";
import { pedidoLimiter, webhookLimiter, adminLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.post("/pagar", pedidoLimiter, criarPedido);
router.post("/pagamento-webhook", webhookLimiter, pagamentoWebhook);
router.get("/status-pedido", pedidoLimiter, statusPedido);
router.get("/admin-pedidos", adminLimiter, autenticar, adminPedidos);
router.put("/atualizar-status", adminLimiter, autenticar, atualizarStatusPedido);
router.post("/pagamento-cripto", pedidoLimiter, criarPedidoCripto);

export default router;