import express from "express";
import { criarPedido, pagamentoWebhook, statusPedido, adminPedidos, atualizarStatusPedido, deletarPedido } from "../controllers/pedidoController.js";
import { autenticar } from "../middlewares/authMiddleware.js";
import { pedidoLimiter } from "../middlewares/rateLimit.js";
import { cardapio } from "../data/cardapio.js";
import {
  validateCriarPedido,
  validateStatusPedido,
  validateAtualizarStatus,
  validateDeletarPedido,
  validateAdminPedidos,
  validateDebugPedido
} from "../middlewares/validation.js";

const router = express.Router();

// Rota pública para buscar o cardápio
router.get("/cardapio", (req, res) => {
  res.json(cardapio);
});

router.post("/pagar", pedidoLimiter, validateCriarPedido, criarPedido);
router.post("/pagamento-webhook", pagamentoWebhook);
router.get("/status-pedido", pedidoLimiter, validateStatusPedido, statusPedido);
router.get("/admin-pedidos", pedidoLimiter, autenticar, validateAdminPedidos, adminPedidos);
router.put("/atualizar-status", autenticar, validateAtualizarStatus, atualizarStatusPedido);

// Deletar cliente/pedido (admin)
router.delete("/deletar-pedido/:id", autenticar, validateDeletarPedido, deletarPedido);

// endpoint de debug para verificar pedidos
router.get("/debug-pedido", validateDebugPedido, async (req, res) => {
  const { pedidosCollection } = req.app.locals;
  const { id } = req.query;
  
  try {
    const pedidoDoc = await pedidosCollection.doc(id).get();
    
    if (!pedidoDoc.exists) {
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }
    
    const pedido = pedidoDoc.data();
    res.json({
      encontrado: true,
      pedido: pedido,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro no debug:", error);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;