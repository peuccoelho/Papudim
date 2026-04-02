import fetch from "node-fetch";
import axios from "axios";
import { sanitizeInput, sanitizeId, sanitizeNumber, sanitizePedido, sanitizeItem } from "../utils/sanitize.js";
import { cardapio, buscarPreco } from "../data/cardapio.js";
// ASAAS DESATIVADO - consulte REATIVAR_ASAAS.md para reativar
// import { criarClienteAsaas, criarCobrancaAsaas } from "../services/asaasService.js";

// Deletar cliente/pedido por ID
export async function deletarPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  const { id } = req.params;

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


export async function criarPedido(req, res) {
  console.log("Recebido pedido:", req.body); 
  const { pedidosCollection } = req.app.locals;
  const pedido = req.body;

  // Sanitização completa dos dados do pedido
  const dadosSanitizados = sanitizePedido(pedido);
  if (!dadosSanitizados) {
    return res.status(400).json({ erro: "Dados do pedido inválidos." });
  }

  // Validação já feita pelo middleware, mas mantemos verificação extra
  if (!pedido.itens || !Array.isArray(pedido.itens) || pedido.itens.length === 0) {
    return res.status(400).json({ erro: "Dados do pedido inválidos." });
  }

  let totalCalculado = 0;
  const itensSanitizados = [];

  for (const item of pedido.itens) {
    // Sanitizar item
    const itemSanitizado = sanitizeItem(item);
    if (!itemSanitizado || !itemSanitizado.produtoId) {
      console.warn("Item inválido recebido:", item);
      return res.status(400).json({ erro: `Item inválido: ${item.nome || item.produtoId}` });
    }

    // Validação usando cardápio centralizado - NUNCA confiar no preço do frontend
    const precoOficial = buscarPreco(itemSanitizado.produtoId, itemSanitizado.peso);
    
    if (precoOficial === null || itemSanitizado.quantidade < 1) {
      console.warn("Item inválido recebido:", item);
      return res.status(400).json({ erro: `Item inválido: ${itemSanitizado.nome || itemSanitizado.produtoId}` });
    }
    
    totalCalculado += precoOficial * itemSanitizado.quantidade;
    itensSanitizados.push({
      ...itemSanitizado,
      preco: precoOficial
    });
  }

  totalCalculado = Number(totalCalculado.toFixed(2));

  const totalUnidades = itensSanitizados.reduce((sum, item) => sum + item.quantidade, 0);
  
  const pedidoId = pedido.id ? sanitizeId(pedido.id) : `pedido-${Date.now()}`;
  
  const pedidoFinal = {
    id: pedidoId,
    cliente: dadosSanitizados.cliente,
    endereco: dadosSanitizados.endereco,
    celular: dadosSanitizados.celular,
    observacoes: dadosSanitizados.observacoes,
    status: "aguardando_contato",
    itens: itensSanitizados,
    total: totalCalculado,
    criadoEm: new Date().toISOString()
  };

  console.log("Salvando pedido no Firebase:", pedidoId);
  await pedidosCollection.doc(pedidoId).set(pedidoFinal);
  console.log("Pedido salvo no Firebase com sucesso");

  try {
    res.json({
      sucesso: true,
      pedidoId: pedidoId,
      cliente: pedidoFinal.cliente,
      total: totalCalculado,
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
Endereço: ${pedido.endereco}
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
  const id = sanitizeId(req.query.id);

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
    // Parâmetros de paginação e filtro (já validados pelo middleware)
    const limite = sanitizeNumber(req.query.limite, { min: 1, max: 100, defaultValue: 20 });
    const pagina = sanitizeNumber(req.query.pagina, { min: 1, defaultValue: 1 });
    const statusFiltro = req.query.status || "todos";
    const ordenarPor = req.query.ordenarPor || "criadoEm";
    const ordem = req.query.ordem || "desc";

    // Construir query do Firestore
    let query = pedidosCollection;

    // Filtrar por status se especificado
    if (statusFiltro && statusFiltro !== "todos") {
      query = query.where("status", "==", statusFiltro);
    }

    // Ordenação
    const ordemFirestore = ordem === "asc" ? "asc" : "desc";
    query = query.orderBy(ordenarPor, ordemFirestore);

    // Paginação: buscar limite + 1 para saber se há próxima página
    const offset = (pagina - 1) * limite;
    
    // Para paginação eficiente no Firestore, usamos limit
    // Nota: offset não é ideal para grandes datasets, mas funciona para uso moderado
    query = query.limit(limite + 1);

    // Se não for primeira página, precisamos de cursor
    // Para simplificar, usamos offset (adequado para datasets pequenos/médios)
    if (offset > 0) {
      query = query.offset(offset);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;

    // Verificar se há mais páginas
    const temProximaPagina = docs.length > limite;
    const pedidos = docs.slice(0, limite).map(doc => doc.data());

    // Buscar total para metadados (query separada, pode ser cacheada)
    let totalPedidos = 0;
    if (statusFiltro && statusFiltro !== "todos") {
      const countSnapshot = await pedidosCollection.where("status", "==", statusFiltro).count().get();
      totalPedidos = countSnapshot.data().count;
    } else {
      const countSnapshot = await pedidosCollection.count().get();
      totalPedidos = countSnapshot.data().count;
    }

    const totalPaginas = Math.ceil(totalPedidos / limite);

    res.json({
      pedidos,
      paginacao: {
        paginaAtual: pagina,
        itensPorPagina: limite,
        totalItens: totalPedidos,
        totalPaginas,
        temProximaPagina,
        temPaginaAnterior: pagina > 1
      }
    });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    res.status(500).json({ erro: "Erro ao buscar pedidos" });
  }
}

export async function atualizarStatusPedido(req, res) {
  const { pedidosCollection } = req.app.locals;
  console.log("Body recebido para atualizar status:", req.body); 
  
  // IDs já validados pelo middleware
  const id = sanitizeId(req.body.id);
  const { status } = req.body;
  
  const statusValidos = ["a fazer", "em produção", "pronto", "pendente", "pago", "aguardando_contato"];

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: "Status inválido." }); 
  }

  try {
    const pedidoDoc = await pedidosCollection.doc(id).get();
    if (!pedidoDoc.exists) {
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }
    
    await pedidosCollection.doc(id).update({ 
      status,
      atualizadoEm: new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao atualizar status:", e);
    res.status(500).json({ erro: "Erro ao atualizar status" });
  }
}

