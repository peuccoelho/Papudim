import express from "express";
import { criarPedido, pagamentoWebhook, statusPedido, adminPedidos, atualizarStatusPedido, criarPedidoCripto } from "../controllers/pedidoController.js";
import { autenticar } from "../middlewares/authMiddleware.js";
import { pedidoLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.post("/pagar", pedidoLimiter, criarPedido);
router.post("/pagamento-webhook", pagamentoWebhook);
router.get("/status-pedido", pedidoLimiter, statusPedido);
router.get("/admin-pedidos", pedidoLimiter, autenticar, adminPedidos);
router.put("/atualizar-status", autenticar, atualizarStatusPedido);
router.post("/pagamento-cripto", criarPedidoCripto);

// Endpoint de debug para verificar pedidos
router.get("/debug-pedido", async (req, res) => {
  const { pedidosCollection } = req.app.locals;
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ erro: "ID do pedido é obrigatório" });
  }
  
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