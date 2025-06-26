// Script de teste para verificar pedidos no Firebase
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const pedidosCollection = db.collection("pedidos");

async function testeBuscarPedido() {
  const pedidoId = "pedido-1750895224360";
  
  console.log("🔍 Testando busca do pedido:", pedidoId);
  
  try {
    // Buscar o pedido específico
    const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
    
    if (pedidoDoc.exists) {
      const data = pedidoDoc.data();
      console.log("✅ Pedido encontrado:", {
        id: data.id,
        cliente: data.cliente,
        email: data.email,
        total: data.total,
        status: data.status,
        createdAt: data.createdAt || "N/A"
      });
    } else {
      console.log("❌ Pedido não encontrado");
    }
    
    // Listar todos os pedidos recentes
    console.log("\n📋 Últimos 10 pedidos:");
    const snapshot = await pedidosCollection
      .orderBy("__name__", "desc")
      .limit(10)
      .get();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.cliente} (${data.status}) - R$ ${data.total}`);
    });
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
  
  process.exit(0);
}

testeBuscarPedido();
