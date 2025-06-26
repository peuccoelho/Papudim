import fetch from 'node-fetch';

// Script para testar o webhook manualmente
async function testarWebhook() {
  const webhookUrl = 'https://homepudimback.onrender.com/api/pagamento-webhook';
  
  // Payload de teste simular do Asaas
  const payload = {
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: "pay_test_123456",
      externalReference: "ped_test_123", // Substitua por um ID de pedido real
      status: "RECEIVED",
      value: 100.00,
      dateCreated: new Date().toISOString(),
      customer: {
        id: "cus_test_123",
        name: "Cliente Teste"
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
