// Controller APENAS para webhook - ZERO dependências externas
// Criado para resolver o problema de ERR_MODULE_NOT_FOUND
// Foca apenas na atualização do status do pedido

// WEBHOOK SIMPLIFICADO PARA RESOLVER O PROBLEMA DE STATUS
export async function pagamentoWebhookSimples(req, res) {
  console.log("🟢 ===== WEBHOOK SIMPLES CHAMADO =====");
  console.log("🟢 Body:", JSON.stringify(req.body, null, 2));
  console.log("🟢 IP:", req.ip);
  console.log("🟢 Timestamp:", new Date().toISOString());
    const { pedidosCollection } = req.app.locals;
  
  console.log("🟢 pedidosCollection disponível?", !!pedidosCollection);
  
  try {
    const { event, payment } = req.body || {};
    
    console.log("🟢 Event:", event);
    console.log("🟢 Payment:", payment);
    
    // Aceitar qualquer evento de pagamento
    if (event && event.includes('PAYMENT') && payment?.externalReference) {
      const pedidoId = payment.externalReference;
      console.log("🟢 Processando pedido:", pedidoId);
      
      const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
      console.log("🟢 Pedido existe?", pedidoDoc.exists);
      
      if (pedidoDoc.exists) {
        const pedido = pedidoDoc.data();
        console.log("🟢 Status atual:", pedido.status);
        
        if (pedido.status !== "a fazer" && pedido.status !== "pago") {
          console.log("🟢 Tentando atualizar status...");
          
          await pedidosCollection.doc(pedidoId).update({
            status: "a fazer",
            confirmedAt: new Date().toISOString(),
            webhookSimples: true
          });
          
          console.log("🟢 Status atualizado para 'a fazer'");
          
          // Tentar enviar WhatsApp (sem falhar se der erro)
          try {
            await enviarWhatsAppBasico(pedido);
          } catch (err) {
            console.log("⚠️ WhatsApp falhou:", err.message);
          }
        } else {
          console.log("🟢 Status já atualizado:", pedido.status);
        }
      } else {
        console.log("🔴 Pedido não encontrado:", pedidoId);
      }
    } else {
      console.log("🔴 Evento ou externalReference inválido");
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error("🔴 Erro no webhook simples:", error.message);
    res.status(200).json({ error: "processado" });
  }
}

// Função básica de WhatsApp sem fetch (apenas log por enquanto)
async function enviarWhatsAppBasico(pedido) {
  const numero = process.env.CALLMEBOT_NUMERO;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!numero || !apikey) {
    console.warn("⚠️ Configurações do WhatsApp ausentes");
    return;
  }

  console.log("📱 WhatsApp seria enviado para:", numero);
  console.log("👤 Cliente:", pedido.cliente);
  console.log("💰 Total:", pedido.total);
  console.log("🆔 ID:", pedido.id);

  // Por enquanto, apenas log - sem fazer requisição HTTP
  // Para evitar qualquer problema com dependências
}

// Função principal para roteamento
export async function pagamentoWebhook(req, res) {
  return pagamentoWebhookSimples(req, res);
}
