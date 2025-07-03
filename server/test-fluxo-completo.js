import fetch from "node-fetch";

// Teste do fluxo completo
const testarFluxoCompleto = async () => {
  console.log("🧪 Testando fluxo completo de pagamento...");
  
  // 1. Criar um pedido de teste
  const pedidoTeste = {
    id: "teste-" + Date.now(),
    cliente: "João Teste",
    email: "joao@teste.com",
    celular: "71999999999",
    pagamento: "PIX",
    itens: [
      { nome: "Pudim Tradicional", preco: 7.9, peso: "120g", quantidade: 2 }
    ],
    total: 15.80
  };

  console.log("📦 Criando pedido de teste:", pedidoTeste.id);
  
  try {
    // 2. Fazer a requisição para criar o pedido
    const resPedido = await fetch("https://homepudimback.onrender.com/api/pagar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedidoTeste)
    });

    if (!resPedido.ok) {
      console.error("❌ Erro ao criar pedido:", await resPedido.text());
      return;
    }

    const dadosPedido = await resPedido.json();
    console.log("✅ Pedido criado:", dadosPedido);

    // 3. Simular webhook de pagamento confirmado
    console.log("🔔 Simulando webhook de pagamento confirmado...");
    
    const webhookPayload = {
      event: "PAYMENT_CONFIRMED",
      payment: {
        object: "payment",
        id: "pay_teste_" + Date.now(),
        externalReference: pedidoTeste.id,
        value: pedidoTeste.total,
        netValue: pedidoTeste.total - 1.00, // taxa simulada
        description: `Pedido de pudins para ${pedidoTeste.cliente}`,
        billingType: "PIX",
        status: "CONFIRMED",
        dueDate: new Date().toISOString().split("T")[0],
        paymentDate: new Date().toISOString().split("T")[0],
        customer: "cus_teste_123"
      }
    };

    const resWebhook = await fetch("https://homepudimback.onrender.com/api/pagamento-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload)
    });

    console.log("📥 Webhook enviado, status:", resWebhook.status);

    // 4. Aguardar um pouco e verificar status
    await new Promise(resolve => setTimeout(resolve, 3000));

    const resStatus = await fetch(`https://homepudimback.onrender.com/api/status-pedido?id=${pedidoTeste.id}`);
    const dadosStatus = await resStatus.json();
    
    console.log("📊 Status final do pedido:", dadosStatus);
    
    if (dadosStatus.status === "a fazer") {
      console.log("✅ Teste concluído com sucesso! Pedido foi processado corretamente.");
    } else {
      console.log("⚠️ Algo não funcionou como esperado. Status:", dadosStatus.status);
    }

  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
};

// Executar teste
testarFluxoCompleto();
