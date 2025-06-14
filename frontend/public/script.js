import { web, TransactionType } from 'https://sdk.kleverscan.org/kleverchain-sdk-web-esm-1-0-x.js';

const cardapio = [
  { nome: "Pudim de Café", preco: 8.6, peso: "120g" },
  { nome: "Pudim de Doce de Leite", preco: 8.9, peso: "120g" },
  { nome: "Pudim Tradicional", preco: 7.9, peso: "120g" },
  { nome: "Chocolate Branco c/ Calda de Caramelo", preco: 9.5, peso: "120g" },
  { nome: "Chocolate Branco c/ Calda de Morango", preco: 10.6, peso: "120g" },
  { nome: "Pudim de Coco", preco: 9.3, peso: "120g" },
  { nome: "Pudim de Leite Ninho", preco: 9.1, peso: "120g" },
  { nome: "Chocolate ao Leite c/ Calda de Maracujá", preco: 9.9, peso: "120g" },
  { nome: "Chocolate ao Leite c/ Calda de Caramelo", preco: 9.9, peso: "120g" },
  { nome: "Pudim de Abacaxi", preco: 8.9, peso: "120g" }
];

const carrinho = [];

const cardapioContainer = document.getElementById("cardapio");
const carrinhoContainer = document.getElementById("carrinho");
const nomeClienteInput = document.getElementById("nomeCliente");
const emailClienteInput = document.getElementById("emailCliente");
const celularClienteInput = document.getElementById("celularCliente");
const formaPagamentoInput = document.getElementById("formaPagamento");
const avisoKlever = document.getElementById("avisoKlever");
const btnFinalizar = document.getElementById("finalizarPedido");
const toggleInfo = document.getElementById("toggleInfo");
const infoSection = document.getElementById("infoSection");
const statusDiv = document.getElementById("status");
const barraProgresso = document.getElementById("barraProgresso");
const selectParcelas = document.getElementById("parcelas");
const modalResumo = document.getElementById("modalResumo");
const resumoConteudo = document.getElementById("resumoConteudo");
const btnCancelarResumo = document.getElementById("btnCancelarResumo");
const btnConfirmarResumo = document.getElementById("btnConfirmarResumo");

let pedidoParaEnviar = null;

toggleInfo?.addEventListener("click", () => {
  infoSection.classList.toggle("hidden");
});

function verificarHorarioFuncionamento() {
  const agora = new Date();
  const diaSemana = agora.getDay();
  const hora = agora.getHours();
  const aberto = diaSemana >= 1 && diaSemana <= 5 && hora >= 9 && hora < 17;

  if (statusDiv) {
    statusDiv.textContent = aberto ? "Aberto agora" : "Fechado no momento";
    statusDiv.classList.remove("bg-gray-400", "bg-green-600", "bg-red-600");
    statusDiv.classList.add(aberto ? "bg-green-600" : "bg-red-600");
  }

  return aberto;
}

// Atualiza o status imediatamente ao carregar
verificarHorarioFuncionamento();
// Atualiza o status a cada minuto
setInterval(verificarHorarioFuncionamento, 60000);

if (cardapioContainer) {
  cardapio.forEach((item, index) => {
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-2xl p-5 shadow-md hover:shadow-xl cursor-pointer transition-all transform hover:scale-105 border border-[#c9b8a2] duration-300 opacity-0 animate-fade-in";
    card.innerHTML = `
      <h3 class="text-lg font-semibold mb-1">${item.nome}</h3>
      <p class="text-sm text-gray-600 mb-2">Peso: ${item.peso}</p>
      <p class="mb-4 font-medium">R$ ${item.preco.toFixed(2).replace(".", ",")}</p>
      <div class="flex gap-2">
        <input type="number" min="1" value="1" class="quantidadeInput w-16 text-center border rounded" id="quantidade-${index}" />
        <button class="bg-[#a47551] hover:bg-[#916546] text-white px-4 py-2 rounded-xl transition" onclick="adicionarAoCarrinho(${index})">
          Adicionar
        </button>
      </div>
    `;
    cardapioContainer.appendChild(card);
  });
}

function adicionarAoCarrinho(index) {
  const item = cardapio[index];
  const quantidadeInput = document.getElementById(`quantidade-${index}`);
  const quantidade = Math.max(1, parseInt(quantidadeInput?.value || "1"));

  const existente = carrinho.find(p => p.nome === item.nome);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    carrinho.push({ ...item, quantidade });
  }

  exibirToast(`${item.nome} adicionado!`);
  atualizarCarrinho();
}

window.adicionarAoCarrinho = adicionarAoCarrinho;

function removerDoCarrinho(i) {
  carrinho.splice(i, 1);
  atualizarCarrinho();
}

window.removerDoCarrinho = removerDoCarrinho;

function atualizarQuantidade(index, novaQuantidade) {
  const quantidade = parseInt(novaQuantidade);
  carrinho[index].quantidade = !isNaN(quantidade) && quantidade > 0 ? quantidade : 1;
  atualizarCarrinho();
}

window.atualizarQuantidade = atualizarQuantidade;

function atualizarCarrinho() {
  carrinhoContainer.innerHTML = "";

  if (carrinho.length === 0) {
    // contra XSS no innerHTML
    carrinhoContainer.innerHTML =
      '<li class="text-gray-500 italic">Nenhum item no carrinho</li>';
    const aviso = document.getElementById("avisoMinimo");
    if (aviso) aviso.classList.add("hidden");
    validarFormulario();
    return;
  }

  carrinho.forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "flex justify-between items-center gap-4";
    // contra XSS nos nomes dos itens
    li.innerHTML = `
      <span class="flex-1">${escapeHTML(item.nome)} (${escapeHTML(item.peso)})</span>
      <input type="number" min="1" value="${item.quantidade}" onchange="atualizarQuantidade(${i}, this.value)" class="w-16 text-center border rounded" />
      <span class="text-sm text-gray-600">R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</span>
      <button class="text-red-600 hover:underline text-sm" onclick="removerDoCarrinho(${i})">Remover</button>
    `;
    carrinhoContainer.appendChild(li);
  });

  const total = carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  const totalLi = document.createElement("li");
  totalLi.className = "font-bold border-t border-gray-300 pt-2 mt-2 flex justify-between";
  totalLi.innerHTML = `<span>Total</span><span>R$ ${total.toFixed(2).replace(".", ",")}</span>`;
  carrinhoContainer.appendChild(totalLi);

  validarFormulario();

  const aviso = document.getElementById("avisoMinimo");
  if (aviso) {
    const totalUnidades = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
    aviso.classList.toggle("hidden", totalUnidades >= 20);
  }

  const nomePreenchido = nomeClienteInput.value.trim() !== "";
  const pagamentoEscolhido = formaPagamentoInput.value !== "";
  const progresso =
    (carrinho.length > 0 ? 33 : 0) +
    (nomePreenchido ? 33 : 0) +
    (pagamentoEscolhido ? 34 : 0);
  if (barraProgresso) barraProgresso.style.width = `${progresso}%`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

btnFinalizar.addEventListener("click", async (e) => {
  e.preventDefault();

  const nome = nomeClienteInput.value.trim();
  const email = emailClienteInput.value.trim();
  const celular = celularClienteInput.value.trim();
  const pagamento = formaPagamentoInput.value;
  const parcelas = parseInt(document.getElementById("parcelas")?.value || "1");
  const totalUnidades = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  if (!nome || !email || !celular || !pagamento) {
    exibirToast("Preencha todos os campos antes de finalizar o pedido.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    exibirToast("Digite um e-mail válido.");
    return;
  }
  if (!/^\d{10,15}$/.test(celular.replace(/\D/g, ""))) {
    exibirToast("Digite um número de celular válido (apenas números, com DDD).");
    return;
  }
  if (totalUnidades < 20) {
    exibirToast("A quantidade mínima para pedidos é de 20 unidades.");
    return;
  }

  const total = Number(
    carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0).toFixed(2)
  );

  let valorKLVResumo = null;
  if (pagamento === "CRIPTO") {
    try {
      const cotacao = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=klever&vs_currencies=brl')
        .then(r => r.json());
      valorKLVResumo = (total / cotacao.klever.brl).toFixed(2);
    } catch (e) {
      valorKLVResumo = null;
    }
  }

  // Gera um id único para o pedido ANTES de enviar para o backend
  if (!pedidoParaEnviar || !pedidoParaEnviar.id) {
    pedidoParaEnviar = {
      ...pedidoParaEnviar,
      id: "pedido-" + Date.now()
      // ...outros campos obrigatórios...
    };
  }
  const pedidoId = pedidoParaEnviar.id;

  // Monta o resumo
  let html = `<ul class="mb-2">`;
  carrinho.forEach(item => {
    html += `<li>${escapeHTML(item.nome)} (${escapeHTML(item.peso)}) x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</li>`;
  });
  html += `</ul>`;
  html += `<div class="mb-1"><b>Nome:</b> ${escapeHTML(nome)}</div>`;
  html += `<div class="mb-1"><b>E-mail:</b> ${escapeHTML(email)}</div>`;
  html += `<div class="mb-1"><b>Celular:</b> ${escapeHTML(celular)}</div>`;
  html += `<div class="mb-1"><b>Pagamento:</b> `;

  if (pagamento === "PIX") {
    html += "PIX";
  } else if (pagamento === "CREDIT_CARD") {
    html += "Cartão de Crédito";
    if (parcelas > 1) {
      html += ` (${parcelas}x)`;
    }
  } else if (pagamento === "CRIPTO") {
    html += "Criptomoeda (Klever)";
  } else {
    html += escapeHTML(pagamento);
  }
  html += `</div>`;

  if (pagamento === "CRIPTO" && valorKLVResumo) {
    html += `<div class="mb-1"><b>Total em KLV:</b> ${valorKLVResumo} KLV</div>`;
  }

  html += `<div class="mt-2 text-lg font-bold">Total: R$ ${total.toFixed(2).replace(".", ",")}</div>`;

  resumoConteudo.innerHTML = html;
  modalResumo.classList.remove("hidden");
});

// Fecha o modal
btnCancelarResumo.addEventListener("click", () => {
  modalResumo.classList.add("hidden");
});

// Confirma e envia o pedido
btnConfirmarResumo.addEventListener("click", async () => {
  if (pedidoParaEnviar.pagamento === "CRIPTO") {
    try {
      modalResumo.classList.add("hidden");
      mostrarLoader();

      // Configura o provedor Klever (mainnet)
      web.setProvider({
        api: 'https://api.mainnet.klever.finance',
        node: 'https://node.mainnet.klever.finance'
      });
      await web.initialize();

      // Cotação do KLV
      const cotacao = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=klever&vs_currencies=brl')
        .then(r => r.json());

      const valorKLV = pedidoParaEnviar.total / cotacao.klever.brl;
      const valorInteiro = Math.floor(valorKLV * 1e6);

      const payload = {
        amount: valorInteiro,
        receiver: "klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z", // endereço da loja
        kda: "KLV"
      };

      // Monta, assina e transmite
      const unsignedTx = await web.buildTransaction([
        { payload, type: TransactionType.Transfer }
      ]);
      const signedTx = await web.signTransaction(unsignedTx);
      const resultado = await web.broadcastTransactions([signedTx]);
      const hash = resultado[0]?.hash;

      if (!hash) {
        alert("Erro ao transmitir a transação.");
        esconderLoader();
        return;
      }

      // Envia o pedido + hash para o backend
      if (!pedidoParaEnviar.id) {
        pedidoParaEnviar.id = "pedido-" + Date.now();
      }
      const pedidoId = pedidoParaEnviar.id;
      localStorage.setItem("hashTransacao_" + pedidoId, hash);

      const res = await fetch("https://homepudimback.onrender.com/api/pagamento-cripto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pedidoParaEnviar, txHash: hash })
      });

      if (res.ok) {
        alert("Transação enviada! Aguardando confirmação na blockchain.");
        window.location.href = "aguardando.html?id=" + pedidoParaEnviar.id;
      } else {
        alert("Erro ao registrar pedido no servidor.");
      }

    } catch (e) {
      console.error("❌ Erro no envio do pedido:", e);
      alert("Erro ao processar pagamento com cripto.");
    } finally {
      esconderLoader();
    }
  }
});

function validarFormulario() {
  const nome = nomeClienteInput.value.trim();
  const email = emailClienteInput.value.trim();
  const celular = celularClienteInput.value.trim();
  const pagamento = formaPagamentoInput.value;
  const totalUnidades = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  btnFinalizar.disabled = !(nome && email && celular && pagamento && totalUnidades >= 20);

  const progresso =
    (carrinho.length > 0 ? 33 : 0) +
    (nome ? 33 : 0) +
    (pagamento ? 34 : 0);
  if (barraProgresso) barraProgresso.style.width = `${progresso}%`;
}

nomeClienteInput.addEventListener("input", validarFormulario);
emailClienteInput.addEventListener("input", validarFormulario);
celularClienteInput.addEventListener("input", validarFormulario);
formaPagamentoInput.addEventListener("change", () => {
  validarFormulario();
  if (formaPagamentoInput.value === "CREDIT_CARD") {
    selectParcelas.style.display = "";
  } else {
    selectParcelas.style.display = "none";
    selectParcelas.value = "1";
  }
  if (avisoKlever) {
    avisoKlever.classList.toggle(
      "hidden",
      formaPagamentoInput.value !== "CRIPTO"
    );
  }
});
document.addEventListener("DOMContentLoaded", () => {
  // Garante que o selectParcelas está oculto ao carregar
  selectParcelas.style.display = "none";

  // Evento para mostrar/ocultar parcelas
  formaPagamentoInput.addEventListener("change", () => {
    if (formaPagamentoInput.value === "CREDIT_CARD") {
      selectParcelas.style.display = "";
    } else {
      selectParcelas.style.display = "none";
      selectParcelas.value = "1";
    }
    validarFormulario();
  });
});
selectParcelas.style.display = "none"; // mantém oculto ao carregar

function atualizarParcelas() {
  if (formaPagamentoInput.value === "CREDIT_CARD") {
    selectParcelas.style.display = "";
  } else {
    selectParcelas.style.display = "none";
    selectParcelas.value = "1";
  }
}
atualizarParcelas(); // chama ao carregar

function exibirToast(mensagem) {
  const toast = document.createElement("div");
  toast.textContent = mensagem;
  toast.className =
    "fixed bottom-5 right-5 bg-[#a47551] text-white px-4 py-2 rounded-xl shadow-lg z-50 toast-anim";
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("toast-hide"), 2100);
  setTimeout(() => toast.remove(), 2500);
}

function scrollParaCarrinho() {
  const carrinho = document.getElementById("carrinho");
  if (carrinho) {
    carrinho.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const botoesAdicionar = document.querySelectorAll("button[onclick^='adicionarAoCarrinho']");
  botoesAdicionar.forEach(botao => {
    const original = botao.getAttribute("onclick");
    botao.setAttribute("onclick", `${original};scrollParaCarrinho();`);
  });
});

verificarHorarioFuncionamento();
atualizarCarrinho();

function mostrarLoader() {
  if (barraProgresso) barraProgresso.style.width = "100%";
}
function esconderLoader() {
  if (barraProgresso) barraProgresso.style.width = "0";
}

async function alterarStatusPedido(id, status) {
  const token = localStorage.getItem("adminToken");
  const res = await fetch("https://homepudimback.onrender.com/api/atualizar-status", {
    method: "PUT", 
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ id, status })
  });
  if (res.ok) {
    exibirToast("Status atualizado!");
    carregarPedidos();
  } else {
    exibirToast("Erro ao atualizar status.");
  }
}

window.alterarStatusPedido = alterarStatusPedido;

async function esperarKleverProvider(timeout = 7000) {
  const start = Date.now();
  while (!window.kleverWeb && Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 200));
  }
  return !!window.kleverWeb;
}

async function pagarComKleverSDK(pedido) {
  try {
    if (!window.kleverWeb) {
      alert("Klever Wallet não detectada.");
      return;
    }

    await window.kleverWeb.initialize();

    const cotacao = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=klever&vs_currencies=brl')
      .then(r => r.json());

    const valorKLV = pedido.total / cotacao.klever.brl;
    const valorInteiro = Math.floor(valorKLV * 1e6); // precisão 6 casas decimais

    const payload = {
      to: "klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z", // seu endereço real
      amount: valorInteiro,
      token: "KLV"
    };

    console.log("🔧 Payload final:", payload, "typeof amount:", typeof payload.amount);

    const unsignedTx = await window.kleverWeb.buildTransaction([
      { payload, 
        type: TransactionType.Transfer, 
      } 
    ]);
    console.log("📦 Transação construída:", unsignedTx);

    const signedTx = await window.kleverWeb.signTransaction(unsignedTx);
    console.log("✍ Transação assinada:", signedTx);

    const resultado = await window.kleverWeb.broadcastTransactions([signedTx]);
    console.log("📡 Resultado:", resultado);

    const hash = resultado[0]?.hash;

    if (!hash) {
      alert("Erro ao transmitir a transação.");
      return;
    }

    const res = await fetch("/api/pagamento-cripto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pedido, txHash: hash })
    });

    if (res.ok) {
      alert("Transação enviada! Aguardando confirmação na blockchain.");
    } else {
      alert("Erro ao registrar pedido no servidor.");
    }

  } catch (erro) {
    console.error("❌ Erro na integração com Klever:", erro);
    alert("Erro ao processar pagamento com Klever.");
  }
}

btnConfirmarResumo.addEventListener("click", async () => {
  if (pedidoParaEnviar.pagamento === "CRIPTO") {
    try {
      modalResumo.classList.add("hidden");
      mostrarLoader();

      // Configura o provedor Klever (mainnet)
      web.setProvider({
        api: 'https://api.mainnet.klever.finance',
        node: 'https://node.mainnet.klever.finance'
      });
      await web.initialize();

      // Cotação do KLV
      const cotacao = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=klever&vs_currencies=brl')
        .then(r => r.json());

      const valorKLV = pedidoParaEnviar.total / cotacao.klever.brl;
      const valorInteiro = Math.floor(valorKLV * 1e6);

      const payload = {
        amount: valorInteiro,
        receiver: "klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z", // endereço da loja
        kda: "KLV"
      };

      // Monta, assina e transmite
      const unsignedTx = await web.buildTransaction([
        { payload, type: TransactionType.Transfer }
      ]);
      const signedTx = await web.signTransaction(unsignedTx);
      const resultado = await web.broadcastTransactions([signedTx]);
      const hash = resultado[0]?.hash;

      if (!hash) {
        alert("Erro ao transmitir a transação.");
        esconderLoader();
        return;
      }

      // Envia o pedido + hash para o backend
      if (!pedidoParaEnviar.id) {
        pedidoParaEnviar.id = "pedido-" + Date.now();
      }
      const pedidoId = pedidoParaEnviar.id;
      localStorage.setItem("hashTransacao_" + pedidoId, hash);

      const res = await fetch("https://homepudimback.onrender.com/api/pagamento-cripto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pedidoParaEnviar, txHash: hash })
      });

      if (res.ok) {
        alert("Transação enviada! Aguardando confirmação na blockchain.");
        window.location.href = "aguardando.html?id=" + pedidoParaEnviar.id;
      } else {
        alert("Erro ao registrar pedido no servidor.");
      }

    } catch (e) {
      console.error("❌ Erro no envio do pedido:", e);
      alert("Erro ao processar pagamento com cripto.");
    } finally {
      esconderLoader();
    }
  }
});

if (!pedidoParaEnviar.id) {
  pedidoParaEnviar.id = "pedido-" + Date.now();
}
const pedidoId = pedidoParaEnviar.id; 
localStorage.setItem("hashTransacao_" + pedidoId, hash);
window.location.href = "aguardando.html?id=" + pedidoId;

window.scrollParaCarrinho = scrollParaCarrinho;

