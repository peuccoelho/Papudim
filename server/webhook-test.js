import fetch from 'node-fetch';

// Script para testar o webhook manualmente
async function testarWebhook() {
  const webhookUrl = 'https://homepudimback.onrender.com/api/pagamento-webhook';
    // Payload de teste simular do Asaas
  const payload = {
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: "pay_nrrsl72q22nciahr",
      externalReference: "pedido-1750896795742", // Pedido real dos logs
      status: "RECEIVED",
      value: 7.9,
      dateCreated: new Date().toISOString(),
      customer: {
        id: "cus_000006801873",
        name: "Pedro Coelho"
      }
    }
  };

  try {
    console.log("🧪 Testando webhook com payload:", JSON.stringify(payload, null, 2));
    
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
      console.log("✅ Webhook teste executado com sucesso!");
    } else {
      console.log("❌ Webhook teste falhou");
    }
    
  } catch (error) {
    console.error("❌ Erro ao testar webhook:", error.message);
  }
}

// Executar teste
testarWebhook();
