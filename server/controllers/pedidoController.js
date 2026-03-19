// Deletar cliente/pedido por ID
export async function deletarPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ erro: "ID do pedido é obrigatório" });
  }
  try {
    const pedidoDoc = await pedidosCollection.doc(id).get();
    if (!pedidoDoc.exists) {
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }
    await pedidosCollection.doc(id).delete();
    res.json({ sucesso: true, mensagem: "Pedido/cliente excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    res.status(500).json({ erro: "Erro ao excluir pedido" });
  }
}
import fetch from "node-fetch";
import axios from "axios";
import { sanitizeInput } from "../utils/sanitize.js";
// ASAAS DESATIVADO - consulte REATIVAR_ASAAS.md para reativar
// import { criarClienteAsaas, criarCobrancaAsaas } from "../services/asaasService.js";

const PRECOS_PRODUTOS = {
  "Pudim Tradicional": 7.9,
  "Pudim de Coco": 9.3,
  "Pudim de Maracujá": 9.9,
  "Pudim de Morango": 10.6,
  "Pudim de Paçoca": 8.9
};


export async function criarPedido(req, res) {
  console.log("Recebido pedido:", req.body); 
  const { pedidosCollection } = req.app.locals;
  // ASAAS DESATIVADO
  // const { pedidosCollection, ASAAS_API, ASAAS_ACCESS_TOKEN } = req.app.locals;
  const pedido = req.body;

  // validação 
  if (
    !pedido.cliente ||
    !pedido.email ||
    !pedido.celular ||
    !Array.isArray(pedido.itens) ||
    pedido.itens.length === 0
  ) {
    return res.status(400).json({ erro: "Dados do pedido inválidos." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pedido.email)) {
    return res.status(400).json({ erro: "E-mail inválido." });
  }
  if (!/^\d{10,11}$/.test(pedido.celular)) {
    return res.status(400).json({ erro: "Celular inválido. Use DDD + número, só números." });
  }

  pedido.cliente = sanitizeInput(pedido.cliente);
  pedido.email = sanitizeInput(pedido.email);
  pedido.celular = sanitizeInput(pedido.celular.replace(/\D/g, "")); 

  if (!/^\d{11}$/.test(pedido.celular)) {
    return res.status(400).json({ erro: "Celular inválido. Use DDD + número, só números (ex: 71999999999)." });
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
  
  const pedidoId = pedido.id || `pedido-${Date.now()}`;
  pedido.id = pedidoId;
  pedido.status = "aguardando_contato";
  pedido.itens = itensSanitizados;
  pedido.total = totalCalculado;
  pedido.criadoEm = new Date().toISOString();

  
  console.log("Salvando pedido no Firebase:", pedidoId);
  await pedidosCollection.doc(pedidoId).set(pedido);
  console.log("Pedido salvo no Firebase com sucesso");


  const { cliente, email, celular, total } = pedido;
  // ASAAS DESATIVADO - consulte REATIVAR_ASAAS.md para reativar
  // const { cliente, email, celular, total, pagamento, parcelas } = pedido;

  try {
    // ASAAS DESATIVADO - Agora retornamos dados para gerar link WhatsApp no frontend
    // // cliente Asaas
    // const clienteData = await criarClienteAsaas(
    //   ASAAS_API,
    //   ASAAS_ACCESS_TOKEN,
    //   cliente,
    //   email,
    //   celular
    // );

    // // cobrança Asaas
    // const cobranca = await criarCobrancaAsaas(
    //   ASAAS_API,
    //   ASAAS_ACCESS_TOKEN,
    //   clienteData.id,
    //   pagamento,
    //   total,
    //   pedidoId,
    //   clienteData.name,
    //   pedido.parcelas 
    // );

    // res.json({
    //   url: cobranca.invoiceUrl,
    //   pedidoId: pedidoId
    // });

    // Retorna dados do pedido para o frontend gerar link WhatsApp
    res.json({
      sucesso: true,
      pedidoId: pedidoId,
      cliente: cliente,
      email: email,
      celular: celular,
      total: total,
      itens: itensSanitizados
    });

  } catch (error) {
    console.error("Erro ao criar pedido:", error); 
    res.status(500).json({ erro: error.message });
  }
}

async function enviarWhatsAppPedido(pedido) {
  console.log("Iniciando envio WhatsApp para pedido:", pedido.id);
  
  const numero = process.env.CALLMEBOT_NUMERO;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!numero || !apikey) {
    console.error("Variáveis do CallMeBot ausentes:", { numero, apikey });
    return;
  }

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

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(numero)}&text=${encodeURIComponent(mensagem)}&apikey=${apikey}`;

  console.log("Enviando WhatsApp para:", numero);
  console.log("Mensagem:", mensagem);

  try {
    const res = await fetch(url);
    const texto = await res.text();
    console.log("CallMeBot resposta:", texto);

    if (!texto.includes("Message Sent")) {
      console.warn("CallMeBot falhou:", texto);
    } else {
      console.log("WhatsApp enviado com sucesso!");
    }
  } catch (e) {
    console.error("Erro ao enviar WhatsApp:", e.message);
  }
}

export async function pagamentoWebhook(req, res) {
  console.log("Webhook recebido:", JSON.stringify(req.body, null, 2));
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  
  // responder imediatamente ao webhook
  res.status(200).json({ received: true, timestamp: new Date().toISOString() });
  
  // processar o webhook de forma assíncrona
  setImmediate(() => {
    processarWebhook(req.body, req.app.locals.pedidosCollection);
  });
}

async function processarWebhook(body, pedidosCollection) {
  try {
    console.log("Evento recebido:", body.event);
    
    if (body.event === "PAYMENT_CONFIRMED" || 
        body.event === "PAYMENT_RECEIVED" || 
        body.event === "PAYMENT_APPROVED") {
      
      const pagamento = body.payment;
      const pedidoId = pagamento.externalReference;

      console.log("Processando pagamento confirmado para pedido:", pedidoId);

      const pedidoDoc = await pedidosCollection.doc(pedidoId).get();
      
      if (!pedidoDoc.exists) {
        console.error("Pedido não encontrado no Firebase:", pedidoId);
        return;
      }

      const pedido = pedidoDoc.data();
      console.log("Dados do pedido encontrado:", JSON.stringify(pedido, null, 2));

      if (pedido && pedido.cliente && pedido.total) {
        console.log("Atualizando status do pedido para 'a fazer'");
        // timestamp para controle
        await pedidosCollection.doc(pedidoId).update({ 
          status: "a fazer",
          pagamentoConfirmadoEm: new Date().toISOString(),
          statusAnterior: pedido.status || "pendente"
        }); 
        
        console.log("Enviando WhatsApp...");
        await enviarWhatsAppPedido(pedido);
        
        console.log("Pagamento confirmado - status atualizado e WhatsApp enviado");
      } else {
        console.warn("Pedido não encontrado ou incompleto no webhook:", pedidoId);
        console.warn("Dados do pedido:", { cliente: pedido?.cliente, total: pedido?.total });
      }
    } else {
      console.log("Evento webhook ignorado:", body.event);
    }
  } catch (err) {
    console.error("Erro no processamento do webhook:", err);
  }
}

export async function statusPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  const { id } = req.query;

  console.log("Consultando status do pedido:", id);

  try {
    const pedidoDoc = await pedidosCollection.doc(id).get();

    if (!pedidoDoc.exists) {
      console.log("Pedido não encontrado:", id);
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }

    const pedido = pedidoDoc.data();
    console.log("Status atual do pedido:", pedido.status, "| Pagamento:", pedido.pagamento);

    if (pedido.status === "a fazer" || pedido.status === "pago" || pedido.status === "em produção" || pedido.status === "pronto") {
      console.log("Status já confirmado:", pedido.status);
      return res.json({ status: pedido.status });
    }

    console.log("Retornando status do pedido:", pedido.status);
    return res.json({ status: pedido.status });
  } catch (error) {
    console.error("Erro ao consultar pedido:", error);
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
  const statusValidos = ["a fazer", "em produção", "pronto", "pendente", "pago", "aguardando_contato"];

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

