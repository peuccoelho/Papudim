import fetch from "node-fetch";

export async function criarClienteAsaas(ASAAS_API, ASAAS_ACCESS_TOKEN, cliente, email, celular) {
  const response = await fetch(`${ASAAS_API}v3/customers`, {
    method: "POST",
    headers: {
      'Content-Type': "application/json",
      access_token: ASAAS_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      name: cliente,
      email: email,
      cpfCnpj: "12345678909", 
      mobilePhone: celular
    })
  });

  const texto = await response.text();
  if (!response.ok) {
    throw new Error(`Erro ao criar cliente: ${response.status} - ${texto}`);
  }
  return JSON.parse(texto);
}

export async function criarCobrancaAsaas(
  ASAAS_API,
  ASAAS_ACCESS_TOKEN,
  clienteId,
  pagamento,
  total,
  pedidoId,
  clienteNome,
  parcelas = 1 
) {
  const webhookUrl = process.env.WEBHOOK_URL || "https://homepudimback.onrender.com/api/pagamento-webhook";
  
  const body = {
    customer: clienteId,
    billingType: pagamento.toUpperCase(),
    dueDate: new Date().toISOString().split("T")[0],
    description: `Pedido de pudins para ${clienteNome}`,
    externalReference: pedidoId,
    callback: {
      successUrl: "https://papudim.netlify.app/pagamento-callback.html?id=" + pedidoId,
      autoRedirect: true
    },
    // webhook para notificações
    notificationDisabled: false,
    webhookUrl: webhookUrl
  };

  console.log("Configurando webhook para cobrança:", webhookUrl);

  if (pagamento.toUpperCase() === "CREDIT_CARD" && parcelas > 1) {
    const valorParcela = Number((total / parcelas).toFixed(2));
    body.installmentCount = parcelas;
    body.installmentValue = valorParcela;
  } else {
    body.value = Number(total);
  }

  console.log("Criando cobrança:", JSON.stringify(body, null, 2));

  const response = await fetch(`${ASAAS_API}v3/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_ACCESS_TOKEN,
    },
    body: JSON.stringify(body)
  });

  const texto = await response.text();
  console.log("Resposta da criação de cobrança:", texto);
  
  if (!response.ok) {
    throw new Error(`Erro ao criar cobrança: ${response.status} - ${texto}`);
  }
  return JSON.parse(texto);
}

// configurar webhook global do Asaas
export async function configurarWebhookAsaas(ASAAS_API, ASAAS_ACCESS_TOKEN) {
  const webhookUrl = process.env.WEBHOOK_URL || "https://homepudimback.onrender.com/api/pagamento-webhook";
  
  const body = {
    name: "Papudim Webhook",
    url: webhookUrl,
    events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_APPROVED"],
    enabled: true
  };

  console.log("Configurando webhook global:", JSON.stringify(body, null, 2));

  try {
    const response = await fetch(`${ASAAS_API}v3/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_ACCESS_TOKEN,
      },
      body: JSON.stringify(body)
    });

    const texto = await response.text();
    console.log("Resposta da configuração de webhook:", texto);
    
    if (!response.ok && response.status !== 409) { 
      console.error("Erro ao configurar webhook:", response.status, texto);
    } else {
      console.log("Webhook configurado com sucesso");
    }
  } catch (error) {
    console.error("Erro ao configurar webhook:", error);
  }
}