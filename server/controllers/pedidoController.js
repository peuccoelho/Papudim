import pkg from "@klever/sdk";
const Transaction = pkg.Transaction;
import fetch from "node-fetch";
import axios from "axios";
import { 
  sanitizeInput, 
  validateEmail, 
  validatePhone, 
  validateTxHash, 
  validatePedidoData,
  sanitizeTransactionData 
} from "../utils/sanitize.js";
import { criarClienteAsaas, criarCobrancaAsaas } from "../services/asaasService.js";
import { gerarPayloadKlever } from "../services/kleverService.js";
import { Account, TransactionType } from "@klever/sdk-node";

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

// Cache simples para cotação (1 minuto)
let cacheCotacaoKLV = { valor: null, timestamp: 0 };

async function obterCotacaoKLV() {
  const agora = Date.now();
  if (cacheCotacaoKLV.valor && agora - cacheCotacaoKLV.timestamp < 60000) {
    return cacheCotacaoKLV.valor;
  }
  try {
    const response = await axios.get(
      "https://deep-index.moralis.io/api/v2/erc20/price",
      {
        params: {
          chain: "eth",
          address: "0x6381e717cD4f9EFc4D7FB1a935cD755b6F3fFfAa", // KLV na Ethereum
        },
        headers: {
          "X-API-Key": process.env.MORALIS_API_KEY,
        },
      }
    );
    const precoUSD = response.data.usdPrice;
    const precoBRL = precoUSD * 5.2; // ou use uma API para cotação USD/BRL
    cacheCotacaoKLV = { valor: precoBRL, timestamp: agora };
    return precoBRL;
  } catch (error) {
    console.error("❌ Erro ao consultar cotação na Moralis:", error.message);
    return 0.01; // fallback
  }
}

export async function criarPedido(req, res) {
  const { pedidosCollection, ASAAS_API } = req.app.locals;
  const pedido = req.body;

  // Validação básica de estrutura
  if (!pedido || typeof pedido !== 'object') {
    return res.status(400).json({ erro: "Dados do pedido inválidos." });
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
    return res.status(400).json({ 
      erro: "Celular inválido. Use formato: DDD + 9 dígitos (ex: 71999999999)." 
    });
  }

  let totalCalculado = 0;
  const itensSanitizados = [];

  for (const item of pedido.itens) {
    const precoOficial = PRECOS_PRODUTOS[item.nome];
    if (
      !precoOficial ||
      typeof item.quantidade !== "number" ||
      item.quantidade < 1
    ) {
      return res.status(400).json({ erro: "Itens do pedido inválidos." });
    }
    totalCalculado += precoOficial * item.quantidade;
    itensSanitizados.push({
      nome: sanitizeInput(item.nome),
      preco: precoOficial,
      peso: sanitizeInput(item.peso || ""),
      quantidade: item.quantidade
    });
  }

  totalCalculado = Number(totalCalculado.toFixed(2));

  const totalUnidades = itensSanitizados.reduce((sum, item) => sum + item.quantidade, 0);
  // if (totalUnidades < 20) {
  //   return res.status(400).json({ erro: "A quantidade mínima para pedidos é de 20 unidades." });
  // }
  const pedidoId = pedido.id || `pedido-${Date.now()}`;
  pedido.id = pedidoId;
  pedido.status = "pendente";
  pedido.itens = itensSanitizados;
  pedido.total = totalCalculado;

  console.log("🆔 Pedido criado com ID:", pedidoId);
  console.log("💾 Dados do pedido a serem salvos:", {
    id: pedido.id,
    cliente: pedido.cliente,
    email: pedido.email,
    total: pedido.total,
    status: pedido.status,
    itensCount: pedido.itens.length
  });

  if (pedido.pagamento === "CRIPTO" && req.body.txHash) {
    pedido.txHash = req.body.txHash;
    await pedidosCollection.doc(pedidoId).set(pedido);

    // monitoramento do hash
    monitorarTransacaoKlever(pedidoId, txHash, pedidosCollection, pedidoSalvo);

    return res.json({
      mensagem: "Pedido registrado. Aguardando confirmação na blockchain.",
      pedidoId
    });
  }

  const { cliente, email, celular, total, pagamento, parcelas } = pedido;
  try {
    // cliente Asaas
    const clienteData = await criarClienteAsaas(
      ASAAS_API,
      process.env.access_token,
      cliente,
      email,
      celular
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

    // cobrança Asaas
    const cobranca = await criarCobrancaAsaas(
      ASAAS_API,
      process.env.access_token,
      clienteData.id,
      pagamento,
      total,
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
    console.error("❌ Variáveis do CallMeBot ausentes:", { numero: !!numero, apikey: !!apikey });
    return;
  }

  try {
    const itensTexto = pedido.itens
      .map(i => `${i.nome} x${i.quantidade}`)
      .join(" | ");
    const total = Number(pedido.total).toFixed(2);

    const mensagem = `✅ Pagamento confirmado!
Cliente: ${pedido.cliente}
E-mail: ${pedido.email}
Celular: ${pedido.celular}
Total: R$ ${total}
Itens: ${itensTexto}`;

    console.log("📱 Enviando WhatsApp para:", numero);

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(numero)}&text=${encodeURIComponent(mensagem)}&apikey=${apikey}`;

    const res = await fetch(url);
    const texto = await res.text();
    console.log("✅ CallMeBot resposta:", texto);

    if (!texto.includes("Message Sent")) {
      console.warn("⚠️ CallMeBot falhou:", texto);    }
  } catch (e) {
    console.error("❌ Erro ao enviar WhatsApp:", e.message);
    throw e; // Re-throw para ser capturado no webhook
  }
}

export async function pagamentoWebhook(req, res) {
  // Log imediato para capturar QUALQUER chamada no webhook
  console.log("🚨 ========== WEBHOOK CHAMADO ==========");
  console.log("🚨 Method:", req.method);
  console.log("🚨 URL:", req.url);
  console.log("🚨 Path:", req.path);
  console.log("🚨 User-Agent:", req.get('User-Agent'));
  console.log("🚨 Content-Type:", req.get('Content-Type'));
  console.log("🚨 IP:", req.ip);
  console.log("🚨 Headers:", JSON.stringify(req.headers, null, 2));
  console.log("🚨 Raw Body:", JSON.stringify(req.body, null, 2));
  console.log("🚨 Timestamp:", new Date().toISOString());
  console.log("🚨 ==========================================");

  const { pedidosCollection } = req.app.locals;
  const body = req.body;

  try {
    // Log detalhado do webhook recebido
    console.log("🔔 Webhook recebido:", {
      event: body?.event,
      paymentId: body?.payment?.id,
      externalReference: body?.payment?.externalReference,
      status: body?.payment?.status,
      ip: req.ip
    });    // Validação básica do webhook
    if (!body || typeof body !== 'object') {
      console.warn("❌ Webhook inválido recebido:", body);
      return res.status(400).json({ erro: "Dados do webhook inválidos" });
    }

    // Aceitar diferentes eventos de pagamento do Asaas
    const eventosAceitos = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_APPROVED"];
    console.log("🔍 Verificando evento:", body.event, "aceitos:", eventosAceitos);

    if (eventosAceitos.includes(body.event)) {
      const pagamento = body.payment;
      
      if (!pagamento || !pagamento.externalReference) {
        console.warn("❌ Webhook sem referência externa:", JSON.stringify(body, null, 2));
        return res.status(400).json({ erro: "Referência externa ausente" });
      }

      const pedidoId = sanitizeInput(pagamento.externalReference);
      console.log("🔍 Buscando pedido:", pedidoId);

      // Tentar buscar o pedido
      const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
      
      if (!pedidoDoc.exists) {
        console.warn("❌ Documento não existe no Firebase:", pedidoId);
        
        // Tentar listar alguns documentos para debug
        const snapshot = await pedidosCollection.limit(5).get();
        console.log("📋 Últimos pedidos no Firebase:", 
          snapshot.docs.map(doc => ({ id: doc.id, status: doc.data().status }))
        );
        
        return res.status(404).json({ erro: "Pedido não encontrado" });
      }

      const pedido = pedidoDoc.data();
      console.log("📄 Pedido encontrado:", {
        id: pedido.id,
        cliente: pedido.cliente,
        total: pedido.total,
        status: pedido.status,
        hasCliente: !!pedido.cliente,
        hasTotal: !!pedido.total
      });

      if (pedido && pedido.cliente && pedido.total) {
        // Verificar se já foi processado
        if (pedido.status === "a fazer" || pedido.status === "pago") {
          console.log("✅ Pedido já processado:", pedidoId);
          return res.sendStatus(200);
        }

        // Atualizar status
        await pedidosCollection.doc(pedidoId).update({ 
          status: "a fazer",
          confirmedAt: new Date().toISOString(),
          paymentId: sanitizeInput(pagamento.id || ""),
          webhookProcessedAt: new Date().toISOString()
        }); 
        
        console.log("✅ Status atualizado para 'a fazer'");
        
        // Enviar WhatsApp
        try {
          await enviarWhatsAppPedido(pedido);
          console.log("✅ WhatsApp enviado com sucesso");
        } catch (whatsappError) {
          console.error("❌ Erro ao enviar WhatsApp:", whatsappError.message);
          // Não falhar o webhook por causa do WhatsApp
        }
        
        console.log("✅ Pagamento confirmado - processo concluído");
      } else {
        console.warn("❌ Pedido incompleto:", {
          pedidoId,
          temCliente: !!pedido?.cliente,
          temTotal: !!pedido?.total,
          pedidoCompleto: pedido
        });
        return res.status(404).json({ erro: "Pedido incompleto" });
      }
    } else {
      console.log("ℹ️ Evento ignorado:", body.event);
    }
  } catch (err) {
    console.error("❌ Erro no webhook:", {
      message: err.message,
      stack: err.stack,
      body: body
    });
    return res.status(500).json({ erro: "Erro interno" });
  }

  res.sendStatus(200);
}

export async function statusPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  const { id } = req.query;

  console.log("🔍 Consultando status do pedido:", id);

  try {
    const pedidoDoc = await pedidosCollection.doc(id).get();

    if (!pedidoDoc.exists) {
      console.warn("❌ Pedido não encontrado para status:", id);
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }

    const pedido = pedidoDoc.data();
    console.log("📄 Status atual do pedido:", {
      id: id,
      status: pedido.status,
      pagamento: pedido.pagamento,
      total: pedido.total
    });

    // Se não for cripto, retorna status salvo normalmente
    if (pedido.pagamento !== "CRIPTO" || !pedido.txHash) {
      return res.json({ status: pedido.status });
    }

    // Se já está marcado como "a fazer" ou "pago", retorna imediatamente
    if (pedido.status === "a fazer" || pedido.status === "pago") {
      return res.json({ status: pedido.status });
    }

    // Busca o hash correto salvo no pedido!
    const hash = pedido.txHash;
    if (!hash) {
      return res.status(400).json({ erro: "Hash da transação não encontrado para o pedido" });
    }

    // Consulta o status da transação na KleverChain usando o hash correto
    const resp = await fetch(`https://api.mainnet.klever.org/v1.0/transaction/${hash}`, {
      headers: {
        'User-Agent': 'PapudimApp/1.0',
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const tx = await resp.json();
    console.log("🔗 Resposta Klever para", id, ":", JSON.stringify(tx, null, 2));

    // Sanitizar dados da transação
    const txSanitizada = sanitizeTransactionData(tx.data?.transaction || tx);

    const statusKlever = txSanitizada?.status?.toLowerCase?.();
    const resultCode = txSanitizada?.resultCode;

    if (
      (statusKlever === "success" || statusKlever === "successful" || statusKlever === "confirmed") &&
      (resultCode === "Ok" || resultCode === "ok")
    ) {
      await pedidosCollection.doc(id).update({ 
        status: "pago",
        confirmedAt: new Date().toISOString()
      });
      console.log("✅ Status atualizado para 'pago':", id);
      return res.json({ status: "pago" });
    }

    // Ainda não confirmado
    return res.json({ status: "pendente" });
  } catch (error) {
    console.error("❌ Erro ao consultar pedido:", error.message);
    res.status(500).json({ erro: "Erro ao consultar status" });
  }
}

export async function adminPedidos(req, res) {
  const { pedidosCollection } = req.app.locals;
  try {
    const snapshot = await pedidosCollection.get();
    const pedidos = snapshot.docs.map(doc => doc.data());
    res.json(pedidos);
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    res.status(500).json({ erro: "Erro ao buscar pedidos" });
  }
}

export async function atualizarStatusPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  console.log("Body recebido para atualizar status:", req.body); 
  const { id, status } = req.body;
  const statusValidos = ["a fazer", "em produção", "pronto", "pendente", "pago"];

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: "Status inválido." });
  }

  try {
    await pedidosCollection.doc(id).update({ status });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Erro ao atualizar status" });
  }
}

export async function criarPedidoCripto(req, res) {
  const { pedidosCollection } = req.app.locals;
  try {
    const { pedido, txHash } = req.body;

    // Validação básica
    if (!pedido || !txHash) {
      return res.status(400).json({ erro: "Pedido ou txHash ausentes." });
    }

    // Validação do hash da transação
    if (!validateTxHash(txHash)) {
      return res.status(400).json({ 
        erro: "Hash da transação inválido. Deve conter 64 caracteres hexadecimais." 
      });
    }

    // Validação completa do pedido
    const validacao = validatePedidoData(pedido);
    if (!validacao.isValid) {
      return res.status(400).json({ 
        erro: "Dados do pedido inválidos", 
        detalhes: validacao.errors 
      });
    }

    // Verificar se o hash já foi usado
    const hashExistente = await pedidosCollection
      .where('txHash', '==', txHash)
      .limit(1)
      .get();
    
    if (!hashExistente.empty) {
      return res.status(409).json({ 
        erro: "Esta transação já foi processada." 
      });
    }

    const cotacaoBRL = await obterCotacaoKLV();
    if (!cotacaoBRL || cotacaoBRL <= 0) {
      return res.status(503).json({
        erro: "Cotação do KLV indisponível no momento. Tente novamente em instantes."
      });
    }

    const valorKLV = pedido.total / cotacaoBRL;
    const valorInteiro = Math.floor(valorKLV * 1e6);

    const pedidoId = pedido.id || `pedido-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pedidoSalvo = {
      ...pedido,
      id: pedidoId,
      txHash,
      valorKLV: valorInteiro,
      status: "pendente",
      createdAt: new Date().toISOString(),
      ipAddress: req.ip || req.connection.remoteAddress
    };

    await pedidosCollection.doc(pedidoId).set(pedidoSalvo);

    // Iniciar monitoramento sem aguardar
    monitorarTransacaoKlever(pedidoId, txHash, pedidosCollection, pedidoSalvo);

    res.json({ pedidoId, hash: txHash });
  } catch (erro) {
    console.error("❌ Erro no back-end ao processar pedido:", erro.message);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
}

async function monitorarTransacaoKlever(pedidoId, hash, pedidosCollection, pedidoOriginal) {
  let tentativas = 0;
  const max = 30;

  const intervalo = setInterval(async () => {
    try {
      const res = await fetch(`https://api.mainnet.klever.org/v1.0/transaction/${hash}`, {
        headers: {
          'User-Agent': 'PapudimApp/1.0',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const tx = await res.json();
      
      // Sanitizar dados da transação
      const txSanitizada = sanitizeTransactionData(tx.data?.transaction || tx);

      const statusKlever = txSanitizada?.status?.toLowerCase?.();
      const resultCode = txSanitizada?.resultCode;

      // Validar se a transação é legítima
      if (txSanitizada?.hash && txSanitizada.hash !== hash) {
        console.warn("⚠️ Hash da transação não confere:", hash, "vs", txSanitizada.hash);
        clearInterval(intervalo);
        return;
      }

      if (
        (statusKlever === "success" || statusKlever === "successful" || statusKlever === "confirmed") &&
        (resultCode === "Ok" || resultCode === "ok")
      ) {
        // Verificar novamente se o pedido não foi processado (race condition)
        const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
        const pedidoAtual = pedidoDoc.data();

        if (pedidoAtual?.status === "a fazer" || pedidoAtual?.status === "pago") {
          console.log("✅ Pedido já foi processado anteriormente:", pedidoId);
          clearInterval(intervalo);
          return;
        }

        await pedidosCollection.doc(pedidoId).update({ 
          status: "a fazer",
          confirmedAt: new Date().toISOString(),
          transactionData: txSanitizada
        });

        // Busca o pedido atualizado do Firestore para garantir todos os campos
        const pedidoDocAtualizado = await pedidosCollection.doc(pedidoId).get();
        const pedidoFinal = pedidoDocAtualizado.exists ? pedidoDocAtualizado.data() : pedidoOriginal;
        pedidoFinal.status = "a fazer";

        try {
          await enviarWhatsAppPedido(pedidoFinal);
          console.log("✅ WhatsApp enviado para pedido:", pedidoId);
        } catch (e) {
          console.error("❌ Erro ao enviar WhatsApp:", e.message);
        }

        clearInterval(intervalo);
      }
    } catch (e) {
      console.warn("Erro monitorando hash:", hash, e.message);
    }

    if (++tentativas >= max) {
      clearInterval(intervalo);
      console.warn("Timeout ao monitorar hash:", hash);
      
      // Marcar como timeout no banco
      try {
        await pedidosCollection.doc(pedidoId).update({ 
          status: "timeout",
          timeoutAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Erro ao marcar timeout:", e.message);
      }
    }
  }, 10000);
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
    await pagamentoWebhook(reqSimulado, res);
  } catch (error) {
    console.error("🧪 Erro no teste do webhook:", error);
    res.status(500).json({ erro: "Erro no teste do webhook" });
  }
}