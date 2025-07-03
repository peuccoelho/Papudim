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
  const body = {
    customer: clienteId,
    billingType: pagamento.toUpperCase(),
    dueDate: new Date().toISOString().split("T")[0],
    description: `Pedido de pudins para ${clienteNome}`,
    externalReference: pedidoId,
    callback: {
      successUrl: "https://papudim.netlify.app/aguardando.html?id=" + pedidoId,
    }
  };

  if (pagamento.toUpperCase() === "CREDIT_CARD" && parcelas > 1) {
    const valorParcela = Number((total / parcelas).toFixed(2));
    body.installmentCount = parcelas;
    body.installmentValue = valorParcela;
  } else {
    body.value = Number(total);
  }

  const response = await fetch(`${ASAAS_API}v3/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_ACCESS_TOKEN,
    },
    body: JSON.stringify(body)
  });

  const texto = await response.text();
  if (!response.ok) {
    throw new Error(`Erro ao criar cobrança: ${response.status} - ${texto}`);
  }
  return JSON.parse(texto);
}