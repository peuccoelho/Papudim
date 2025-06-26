import fetch from 'node-fetch';

// Script para testar o webhook com o pedido específico que está com problema
async function testarWebhookEspecifico() {
  const webhookUrl = 'https://homepudimback.onrender.com/api/pagamento-webhook';
  
  // Payload do pedido que está com problema
  const payload = {
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: "pay_di1lw809lxmtjqd4",
      externalReference: "pedido-1750899356367", // Pedido específico
      status: "RECEIVED",
      value: 7.9,
      dateCreated: new Date().toISOString(),
      customer: {
        id: "cus_000006801944",
        name: "Pedro"
      }
    }
  };

  try {
    console.log("🧪 Testando webhook específico:", JSON.stringify(payload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Asaas-Webhook-Test/1.0'
      },
      body: JSON.stringify(payload)
    });

    console.log("📝 Status:", response.status);
    console.log("📝 Headers:", Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log("📝 Resposta:", responseText);
    
    if (response.ok) {
      console.log("✅ Webhook executado com sucesso!");
      
      // Aguardar 3 segundos e verificar status
      console.log("⏳ Aguardando 3 segundos para verificar status...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar status
      const statusUrl = `https://homepudimback.onrender.com/api/status-pedido?id=pedido-1750899356367`;
      console.log("🔍 Verificando status...");
      
      const statusResponse = await fetch(statusUrl);
      const statusData = await statusResponse.json();
      
      console.log("📊 Status response:", statusResponse.status);
      console.log("📄 Dados do pedido:", JSON.stringify(statusData, null, 2));
      
      if (statusData.status === 'a fazer' || statusData.status === 'pago') {
        console.log("🎉 SUCESSO! O pedido foi atualizado!");
      } else {
        console.log("❌ O pedido ainda não foi atualizado");
      }
      
    } else {
      console.log("❌ Webhook falhou");
    }
    
  } catch (error) {
    console.error("❌ Erro ao testar webhook:", error.message);
  }
}

// Executar teste
testarWebhookEspecifico();
