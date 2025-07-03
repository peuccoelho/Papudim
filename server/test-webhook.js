import fetch from "node-fetch";

const webhookUrl = "https://homepudimback.onrender.com/api/pagamento-webhook";
// const webhookUrl = "http://localhost:3000/api/pagamento-webhook";

const testPayload = {
  event: "PAYMENT_CONFIRMED",
  payment: {
    object: "payment",
    id: "pay_123456789",
    externalReference: "pedido-1751546002094", // Use um ID real de pedido
    value: 50.0,
    netValue: 48.51,
    originalValue: null,
    interestValue: null,
    description: "Pedido de pudins para Teste",
    billingType: "CREDIT_CARD",
    pixTransaction: null,
    status: "CONFIRMED",
    dueDate: "2025-07-03",
    originalDueDate: "2025-07-03",
    paymentDate: "2025-07-03",
    clientPaymentDate: "2025-07-03",
    installmentNumber: null,
    invoiceUrl: "https://sandbox.asaas.com/i/123456789",
    invoiceNumber: "123456789",
    externalReference: "pedido-1751546002094",
    customer: "cus_123456789"
  }
};

console.log("🧪 Testando webhook...");
console.log("📤 Enviando para:", webhookUrl);
console.log("📋 Payload:", JSON.stringify(testPayload, null, 2));

fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(testPayload)
})
.then(response => {
  console.log("📥 Status resposta:", response.status);
  return response.text();
})
.then(text => {
  console.log("📄 Resposta:", text);
})
.catch(error => {
  console.error("❌ Erro:", error);
});
