import fetch from "node-fetch";
import { validatePedidoData, sanitizeInput } from "../utils/sanitize.js";
import { criarClienteAsaas, criarCobrancaAsaas } from "../services/asaasService.js";
import { gerarPayloadKlever } from "../services/kleverService.js";
import pkg from 'kleverchain-sdk';
import admin from 'firebase-admin';

const { Transaction } = pkg;

const PRECOS_PRODUTOS = {
  "Pudim de Café": 8.6,
  "Pudim de Doce de Leite": 8.9,
  "Pudim Tradicional": 7.9,
  "Chocolate Branco c/ Calda de Caramelo": 9.5,
  "Chocolate Branco c/ Calda de Morango": 10.6,
  "Pudim de Coco": 9.3,
  "Pudim de Leite Ninho": 9.1,
  "Chocolate ao Leite c/ Calda de Maracujá": 9.9,
  "Chocolate ao Leite c/ Calda de Caramelo": 9.9,
  "Pudim de Abacaxi": 8.9
};

// WEBHOOK SIMPLIFICADO PARA RESOLVER O PROBLEMA
export async function pagamentoWebhookSimples(req, res) {
  console.log("🟢 ===== WEBHOOK SIMPLES CHAMADO =====");
  console.log("🟢 Body:", JSON.stringify(req.body, null, 2));
  console.log("🟢 IP:", req.ip);
  console.log("🟢 Timestamp:", new Date().toISOString());
  
  const { pedidosCollection } = req.app.locals;
  
  try {
    const { event, payment } = req.body || {};
    
    // Aceitar qualquer evento de pagamento
    if (event && event.includes('PAYMENT') && payment?.externalReference) {
      const pedidoId = payment.externalReference;
      console.log("🟢 Processando pedido:", pedidoId);
      
      const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
      
      if (pedidoDoc.exists) {
        const pedido = pedidoDoc.data();
        
        if (pedido.status !== "a fazer" && pedido.status !== "pago") {
          await pedidosCollection.doc(pedidoId).update({
            status: "a fazer",
            confirmedAt: new Date().toISOString(),
            webhookSimples: true
          });
          
          console.log("🟢 Status atualizado para 'a fazer'");
          
          // Tentar enviar WhatsApp (sem falhar se der erro)
          try {
            await enviarWhatsAppPedido(pedido);
          } catch (err) {
            console.log("⚠️ WhatsApp falhou:", err.message);
          }
        }
      }
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error("🔴 Erro no webhook simples:", error.message);
    res.status(200).json({ error: "processado" });
  }
}

// Cache simples para cotação (1 minuto)
let cacheCotacaoKLV = { valor: null, timestamp: 0 };

async function obterCotacaoKLV() {
  const agora = Date.now();
  if (cacheCotacaoKLV.valor && agora - cacheCotacaoKLV.timestamp < 60000) {
    return cacheCotacaoKLV.valor;
  }
  
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=klever&vs_currencies=brl");
    const data = await response.json();
    const valor = data.klever?.brl || 0.02;
    
    cacheCotacaoKLV = { valor, timestamp: agora };
    return valor;
  } catch (error) {
    console.error("Erro ao obter cotação KLV:", error.message);
    return 0.02; // Valor padrão
  }
}

export async function criarPedido(req, res) {
  const { pedidosCollection, ASAAS_API } = req.app.locals;
  const pedido = req.body;

  // Validação básica de estrutura
  if (!pedido || typeof pedido !== 'object') {
    return res.status(400).json({ erro: "Dados do pedido inválidos" });
  }

  // Validação completa usando função específica
  const validacao = validatePedidoData(pedido);
  if (!validacao.isValid) {
    return res.status(400).json({ 
      erro: "Dados inválidos", 
      detalhes: validacao.errors 
    });
  }

  // Sanitização de dados
  pedido.cliente = sanitizeInput(pedido.cliente);
  pedido.email = sanitizeInput(pedido.email);
  pedido.celular = sanitizeInput(pedido.celular.replace(/\D/g, "")); 

  // Validação específica do celular brasileiro
  if (!/^[1-9]\d{10}$/.test(pedido.celular)) {
    return res.status(400).json({ erro: "Celular deve ter 11 dígitos (DDD + 9 dígitos)" });
  }

  let totalCalculado = 0;
  const itensSanitizados = [];

  for (const item of pedido.itens) {
    const nome = sanitizeInput(item.nome);
    const precoValido = PRECOS_PRODUTOS[nome];
    
    if (!precoValido) {
      return res.status(400).json({ erro: `Produto inválido: ${nome}` });
    }
    
    const quantidade = Math.max(1, Math.min(100, parseInt(item.quantidade) || 1));
    const subtotal = precoValido * quantidade;
    
    totalCalculado += subtotal;
    itensSanitizados.push({ nome, preco: precoValido, quantidade, subtotal });
  }

  totalCalculado = Number(totalCalculado.toFixed(2));

  const totalUnidades = itensSanitizados.reduce((sum, item) => sum + item.quantidade, 0);
  
  const pedidoId = pedido.id || `pedido-${Date.now()}`;
  pedido.id = pedidoId;
  pedido.status = "pendente";
  pedido.itens = itensSanitizados;
  pedido.total = totalCalculado;
  pedido.timestamp = new Date().toISOString();

  console.log("🆔 Pedido criado com ID:", pedidoId);
  console.log("💾 Dados do pedido a serem salvos:", {
    id: pedido.id,
    cliente: pedido.cliente,
    email: pedido.email,
    total: pedido.total,
    status: pedido.status,
    itensCount: pedido.itens.length
  });

  try {
    const { pagamento } = pedido;

    // Criar cliente no Asaas
    const clienteData = await criarClienteAsaas(
      ASAAS_API,
      process.env.access_token,
      pedido.cliente,
      pedido.email,
      pedido.celular
    );

    console.log("👤 Cliente criado no Asaas:", clienteData.id);

    // Salvar pedido no Firebase ANTES de criar a cobrança
    try {
      await pedidosCollection.doc(pedidoId).set(pedido);
      console.log("✅ Pedido salvo no Firebase:", pedidoId);
    } catch (firebaseError) {
      console.error("❌ Erro ao salvar no Firebase:", firebaseError.message);
      throw new Error("Erro ao salvar pedido");
    }

    // Criar cobrança Asaas
    const cobranca = await criarCobrancaAsaas(
      ASAAS_API,
      process.env.access_token,
      clienteData.id,
      pagamento,
      totalCalculado,
      pedidoId,
      clienteData.name,
      pedido.parcelas 
    );

    console.log("💳 Cobrança criada:", {
      id: cobranca.id,
      invoiceUrl: cobranca.invoiceUrl,
      externalReference: pedidoId
    });

    res.json({
      url: cobranca.invoiceUrl,
      pedidoId: pedidoId
    });

  } catch (error) {
    console.error("❌ Erro ao criar pedido:", error.message, error.stack); 
    res.status(500).json({ erro: error.message });
  }
}

async function enviarWhatsAppPedido(pedido) {
  const numero = process.env.CALLMEBOT_NUMERO;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!numero || !apikey) {
    console.warn("⚠️ Configurações do WhatsApp ausentes");
    return;
  }

  const itensTexto = pedido.itens
    .map(item => `${item.quantidade}x ${item.nome} - R$ ${item.subtotal.toFixed(2)}`)
    .join('%0A');

  const mensagem = `🍮 *NOVO PEDIDO CONFIRMADO* 🍮%0A%0A` +
    `👤 *Cliente:* ${pedido.cliente}%0A` +
    `📱 *Celular:* ${pedido.celular}%0A` +
    `📧 *Email:* ${pedido.email}%0A%0A` +
    `🛒 *Itens:*%0A${itensTexto}%0A%0A` +
    `💰 *Total:* R$ ${pedido.total.toFixed(2)}%0A%0A` +
    `🆔 *ID do Pedido:* ${pedido.id}`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${numero}&text=${mensagem}&apikey=${apikey}`;

  try {
    const response = await fetch(url);
    const result = await response.text();
    
    if (response.ok) {
      console.log("✅ WhatsApp enviado:", result);
    } else {
      console.error("❌ Erro ao enviar WhatsApp:", response.status, result);
    }
  } catch (error) {
    console.error("❌ Erro na requisição WhatsApp:", error.message);
  }
}

export async function pagamentoWebhook(req, res) {
  // Chamar a versão simplificada
  return pagamentoWebhookSimples(req, res);
}

export async function statusPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  const { id } = req.query;

  console.log("🔍 Consultando status do pedido:", id);

  try {
    const pedidoDoc = await pedidosCollection.doc(id).get();
    
    if (!pedidoDoc.exists) {
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }

    const pedido = pedidoDoc.data();
    console.log("📄 Status atual do pedido:", {
      id: pedido.id,
      cliente: pedido.cliente,
      total: pedido.total,
      pagamento: pedido.pagamento,
      status: pedido.status
    });

    res.json({ 
      status: pedido.status,
      id: pedido.id,
      total: pedido.total,
      cliente: pedido.cliente
    });
  } catch (error) {
    console.error("❌ Erro ao consultar pedido:", error.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}

export async function adminPedidos(req, res) {
  const { pedidosCollection } = req.app.locals;

  try {
    const snapshot = await pedidosCollection
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    const pedidos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      pedidos.push({
        id: data.id,
        cliente: data.cliente,
        email: data.email,
        total: data.total,
        status: data.status,
        timestamp: data.timestamp,
        itens: data.itens
      });
    });

    res.json({ pedidos });
  } catch (error) {
    console.error("❌ Erro ao buscar pedidos:", error.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}

export async function atualizarStatusPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ erro: "ID e status são obrigatórios" });
  }

  const statusValidos = ["pendente", "a fazer", "preparando", "pronto", "entregue", "cancelado"];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: "Status inválido" });
  }

  try {
    await pedidosCollection.doc(id).update({
      status: sanitizeInput(status),
      updatedAt: new Date().toISOString()
    });

    console.log("✅ Status atualizado:", id, "->", status);
    res.json({ sucesso: true });
  } catch (error) {
    console.error("❌ Erro ao atualizar status:", error.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}

export async function criarPedidoCripto(req, res) {
  const { pedidosCollection } = req.app.locals;
  const { total, hash, pedidoId } = req.body;

  if (!total || !hash || !pedidoId) {
    return res.status(400).json({ erro: "Dados incompletos" });
  }

  try {
    const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
    
    if (!pedidoDoc.exists) {
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }

    const pedidoOriginal = pedidoDoc.data();
    
    await pedidosCollection.doc(pedidoId).update({
      status: "aguardando_confirmacao_cripto",
      transactionHash: hash,
      updatedAt: new Date().toISOString()
    });

    // Iniciar monitoramento
    monitorarTransacaoKlever(pedidoId, hash, pedidosCollection, pedidoOriginal);

    res.json({ 
      sucesso: true, 
      mensagem: "Transação em monitoramento",
      hash: hash
    });

  } catch (error) {
    console.error("❌ Erro ao processar cripto:", error.message);
    res.status(500).json({ erro: "Erro interno" });
  }
}

async function monitorarTransacaoKlever(pedidoId, hash, pedidosCollection, pedidoOriginal) {
  console.log("🔍 Iniciando monitoramento da transação:", hash);
  
  const timeoutMinutos = 30;
  const intervalos = 10;
  let tentativas = 0;
  const maxTentativas = (timeoutMinutos * 60) / intervalos;

  const verificar = async () => {
    tentativas++;
    
    try {
      const response = await fetch(`https://api.kleverscan.org/transaction/${hash}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Status da transação:", data.status);

        if (data.status === "success" && data.resultCode === "Ok") {
          console.log("✅ Transação confirmada!");
          
          await pedidosCollection.doc(pedidoId).update({
            status: "a fazer",
            transactionConfirmed: true,
            confirmedAt: new Date().toISOString()
          });

          await enviarWhatsAppPedido(pedidoOriginal);
          console.log("✅ Pedido cripto confirmado!");
          return;
        }
      }

      if (tentativas < maxTentativas) {
        setTimeout(verificar, intervalos * 1000);
      } else {
        console.log("⏰ Timeout no monitoramento da transação");
        await pedidosCollection.doc(pedidoId).update({
          status: "timeout_cripto",
          timeoutAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error("❌ Erro ao verificar transação:", error.message);
      
      if (tentativas < maxTentativas) {
        setTimeout(verificar, intervalos * 1000);
      }
    }
  };

  verificar();
}

// Função para testar o webhook manualmente
export async function testeWebhook(req, res) {
  console.log("🧪 ========== TESTE WEBHOOK ==========");
  
  const { pedidoId } = req.body;
  
  if (!pedidoId) {
    return res.status(400).json({ erro: "pedidoId é obrigatório" });
  }

  // Simular um webhook do Asaas
  const webhookSimulado = {
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: "pay_test_123",
      externalReference: pedidoId,
      status: "RECEIVED",
      value: 100.00
    }
  };

  console.log("🧪 Simulando webhook:", webhookSimulado);
  
  // Simular a requisição do webhook
  const reqSimulado = {
    ...req,
    body: webhookSimulado,
    method: "POST",
    url: "/api/teste-webhook",
    path: "/api/teste-webhook",
    ip: "127.0.0.1",
    get: (header) => {
      const headers = {
        'User-Agent': 'Asaas-Webhook-Test/1.0',
        'Content-Type': 'application/json'
      };
      return headers[header] || '';
    },
    headers: {
      'user-agent': 'Asaas-Webhook-Test/1.0',
      'content-type': 'application/json'
    }
  };

  // Chamar a função do webhook
  try {
    await pagamentoWebhookSimples(reqSimulado, res);
  } catch (error) {
    console.error("🧪 Erro no teste do webhook:", error);
    res.status(500).json({ erro: "Erro no teste do webhook" });
  }
}
