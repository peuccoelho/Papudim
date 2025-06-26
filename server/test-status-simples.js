import fetch from 'node-fetch';

async function testarStatus() {
  const pedidoId = 'pedido-1750899356367';
  const url = `https://homepudimback.onrender.com/api/status-pedido?id=${pedidoId}`;
  
  console.log("🔍 Testando status...");
  
  try {
    const response = await fetch(url);
    
    if (response.status === 429) {
      console.log("⚠️ Rate limiting ainda ativo - aguardando...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      return testarStatus(); // Tentar novamente
    }
    
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Dados:", data);
    
    if (data.status === 'a fazer') {
      console.log("✅ WEBHOOK FUNCIONOU! Status foi atualizado!");
    } else {
      console.log("❌ Status ainda é:", data.status);
    }
    
  } catch (error) {
    console.error("Erro:", error.message);
  }
}

testarStatus();
