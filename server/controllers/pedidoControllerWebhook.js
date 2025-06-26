// Controller APENAS para webhook - sem dependências externas
// Criado para resolver o problema de ERR_MODULE_NOT_FOUND
// Usa fetch nativo do Node.js 18+

// WEBHOOK SIMPLIFICADO PARA RESOLVER O PROBLEMA DE STATUS
export async function pagamentoWebhookSimples(req, res) {
  console.log("🟢 ===== WEBHOOK SIMPLES CHAMADO =====");
  console.log("🟢 Body:", JSON.stringify(req.body, null, 2));
  console.log("🟢 IP:", req.ip);
  console.log("🟢 Timestamp:", new Date().toISOString());
  
  const { pedidosCollection } = req.app.locals;
  
  try {
    const { event, payment } = req.body || {};
    
    // Aceitar qualquer evento de pagamento
    if (event && event.includes('PAYMENT') && payment?.externalReference) {
      const pedidoId = payment.externalReference;
      console.log("🟢 Processando pedido:", pedidoId);
      
      const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
      
      if (pedidoDoc.exists) {
        const pedido = pedidoDoc.data();
        
        if (pedido.status !== "a fazer" && pedido.status !== "pago") {
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
        }
      }
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error("🔴 Erro no webhook simples:", error.message);
    res.status(200).json({ error: "processado" });
  }
}

// Função básica de WhatsApp sem dependências externas
async function enviarWhatsAppBasico(pedido) {
  const numero = process.env.CALLMEBOT_NUMERO;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!numero || !apikey) {
    console.warn("⚠️ Configurações do WhatsApp ausentes");
    return;
  }

  const itensTexto = pedido.itens
    .map(item => `${item.quantidade}x ${item.nome} - R$ ${item.subtotal.toFixed(2)}`)
    .join('%0A');

  const mensagem = `🍮 *NOVO PEDIDO CONFIRMADO* 🍮%0A%0A` +
    `👤 *Cliente:* ${pedido.cliente}%0A` +
    `📱 *Celular:* ${pedido.celular}%0A` +
    `📧 *Email:* ${pedido.email}%0A%0A` +
    `🛒 *Itens:*%0A${itensTexto}%0A%0A` +
    `💰 *Total:* R$ ${pedido.total.toFixed(2)}%0A%0A` +
    `🆔 *ID do Pedido:* ${pedido.id}`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${numero}&text=${mensagem}&apikey=${apikey}`;

  try {
    // Usar fetch nativo do Node.js 18+
    const response = await fetch(url);
    const result = await response.text();
    
    if (response.ok) {
      console.log("✅ WhatsApp enviado:", result);
    } else {
      console.error("❌ Erro ao enviar WhatsApp:", response.status, result);
    }
  } catch (error) {
    console.error("❌ Erro na requisição WhatsApp:", error.message);
  }
}

// Função principal para roteamento
export async function pagamentoWebhook(req, res) {
  return pagamentoWebhookSimples(req, res);
}
