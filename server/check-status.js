import fetch from 'node-fetch';

const pedidoId = 'pedido-1750896795742';
const url = `https://homepudimback.onrender.com/api/status-pedido?id=${pedidoId}`;

console.log(`🔍 Verificando status do pedido: ${pedidoId}`);
console.log(`🌐 URL: ${url}`);

try {
  const response = await fetch(url);
  const data = await response.json();
  
  console.log("📊 Status response:", response.status);
  console.log("📄 Dados do pedido:", JSON.stringify(data, null, 2));
  
  if (data.status === 'a fazer' || data.status === 'pago') {
    console.log("✅ SUCESSO! O pedido foi atualizado pelo webhook!");
  } else {
    console.log("❌ O pedido ainda não foi atualizado pelo webhook");
  }
  
} catch (error) {
  console.error("❌ Erro ao verificar status:", error.message);
}
