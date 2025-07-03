import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Configurar Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const pedidosCollection = db.collection("pedidos");

// Criar um pedido de teste no Firebase
const testPedido = {
  id: "pedido-test-1751546002094",
  cliente: "João Teste",
  email: "joao@teste.com",
  celular: "71999999999",
  total: 25.50,
  status: "pendente",
  pagamento: "CREDIT_CARD",
  itens: [
    { nome: "Pudim Tradicional", quantidade: 2, preco: 7.9 },
    { nome: "Pudim de Café", quantidade: 1, preco: 8.6 }
  ],
  createdAt: new Date().toISOString()
};

console.log("💾 Salvando pedido de teste no Firebase...");
await pedidosCollection.doc(testPedido.id).set(testPedido);
console.log("✅ Pedido de teste salvo");

// Testar webhook
const webhookUrl = "https://homepudimback.onrender.com/api/pagamento-webhook";

const testPayload = {
  event: "PAYMENT_CONFIRMED",
  payment: {
    object: "payment",
    id: "pay_123456789",
    externalReference: testPedido.id,
    value: testPedido.total,
    netValue: testPedido.total - 1.49,
    description: `Pedido de pudins para ${testPedido.cliente}`,
    billingType: "CREDIT_CARD",
    status: "CONFIRMED",
    dueDate: "2025-07-03",
    paymentDate: "2025-07-03",
    customer: "cus_123456789"
  }
};

console.log("🧪 Testando webhook com pedido real...");
console.log("📤 Enviando para:", webhookUrl);
console.log("📋 Payload:", JSON.stringify(testPayload, null, 2));

try {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testPayload)
  });

  console.log("📥 Status resposta:", response.status);
  const text = await response.text();
  console.log("📄 Resposta:", text);

  // Verificar se o status foi atualizado
  setTimeout(async () => {
    const pedidoDoc = await pedidosCollection.doc(testPedido.id).get();
    const pedidoAtualizado = pedidoDoc.data();
    console.log("🔍 Status do pedido após webhook:", pedidoAtualizado.status);
    process.exit(0);
  }, 2000);

} catch (error) {
  console.error("❌ Erro:", error);
  process.exit(1);
}
