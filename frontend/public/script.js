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

  // MONTA O OBJETO DO PEDIDO CORRETAMENTE!
  pedidoParaEnviar = {
    id: "pedido-" + Date.now(),
    cliente: nome,
    email,
    celular: celular.replace(/\D/g, ""),
    pagamento,
    itens: carrinho.map(item => ({
      nome: item.nome,
      preco: item.preco,
      peso: item.peso,
      quantidade: item.quantidade
    })),
    total,
    parcelas: pagamento === "CREDIT_CARD" ? parcelas : undefined
  };

  // Monta o resumo (mantém igual)
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

      let redeUsada = "mainnet";
      try {
        // Provider correto para MAINNET
        web.setProvider({
          api: 'https://api.mainnet.klever.org',
          node: 'https://node.mainnet.klever.org'
        });
        console.log("✅ Provider Klever configurado para: api.mainnet.klever.org");
        await web.initialize();
        // Testa se o node responde
        const resp = await fetch('https://node.mainnet.klever.org/address/klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z/nonce');
        if (!resp.ok) throw new Error("Node mainnet indisponível");
        redeUsada = "mainnet";
      } catch (e) {
        // Fallback para TESTNET
        web.setProvider({
          api: 'https://api.testnet.klever.org',
          node: 'https://node.testnet.klever.org'
        });
        console.log("⚠️ Provider Klever configurado para: api.testnet.klever.org");
        await web.initialize();
        try {
          const resp = await fetch('https://node.testnet.klever.org/address/klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z/nonce');
          if (!resp.ok) throw new Error("Node testnet indisponível");
          redeUsada = "testnet";
        } catch (e2) {
          alert("Não foi possível conectar à rede Klever. Tente novamente mais tarde.");
          esconderLoader();
          return;
        }
      }

      if (redeUsada === "testnet") {
        alert("A rede principal da Klever está fora do ar. Seu pagamento será simulado na testnet (NÃO ENVIE valores reais).");
      }

      // Cotação do KLV (usa sempre mainnet para referência)
      const cotacao = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=klever&vs_currencies=brl')
        .then(r => r.json());

      const valorKLV = pedidoParaEnviar.total / cotacao.klever.brl;
      const valorInteiro = Math.floor(valorKLV * 1e6); // <-- sempre número

      console.log("🔢 typeof amount:", typeof valorInteiro); // deve ser 'number'

      const payload = {
        amount: valorInteiro, // <-- sem aspas!
        receiver: "klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z",
        kda: "KLV"
      };

      // Monta, assina e transmite
      const unsignedTx = await web.buildTransaction([
        { payload, type: TransactionType.Transfer }
      ]);
      console.log("🧾 Transação construída:", unsignedTx);
      if (!unsignedTx) {
        alert("Não foi possível construir a transação. Verifique o valor e a conexão.");
        esconderLoader();
        return;
      }

      const signedTx = await web.signTransaction(unsignedTx);
      const resultado = await web.broadcastTransactions([signedTx]);
      // Correção definitiva:
      const hash = resultado?.data?.txsHashes?.[0];

      console.log("📡 Resposta do Klever SDK:", resultado);
      console.log("📦 txHash detectado:", hash);

      if (!hash) {
        alert("Erro ao transmitir a transação.");
        esconderLoader();
        return;
      }

      // (Opcional) Abrir no KleverScan:
      // window.open(`https://kleverscan.org/tx/${hash}`, "_blank");

      if (!pedidoParaEnviar.id) {
        pedidoParaEnviar.id = "pedido-" + Date.now();
      }
      const pedidoId = pedidoParaEnviar.id;
      localStorage.setItem("hashTransacao_" + pedidoId, hash);

      const res = await fetch("https://homepudimback.onrender.com/api/pagamento-cripto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: pedidoParaEnviar, txHash: hash })
      });

      if (res.ok) {
        alert("Transação enviada! Aguardando confirmação na blockchain.");
        window.location.href = "aguardando.html?id=" + pedidoParaEnviar.id;
      } else {
        alert("Erro ao registrar pedido no servidor.");
      }

    } catch (e) {
      console.error("Erro no envio do pedido:", e);
      alert("Erro ao processar pagamento com cripto.");
    } finally {
      esconderLoader();
    }
  } else if (
    pedidoParaEnviar.pagamento === "PIX" ||
    pedidoParaEnviar.pagamento === "CREDIT_CARD"
  ) {
    try {
      modalResumo.classList.add("hidden");
      mostrarLoader();

      // Envia o pedido para o backend
      const res = await fetch("https://homepudimback.onrender.com/api/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoParaEnviar),
      });

      if (res.ok) {
        const data = await res.json();
        // Redireciona para o link de pagamento do Asaas
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Erro ao gerar link de pagamento.");
        }
      } else {
        const erro = await res.json();
        alert(erro.erro || "Erro ao processar pedido.");
      }
    } catch (e) {
      alert("Erro ao processar pedido.");
    } finally {
      esconderLoader();
    }
  }
});

async function inicializarKleverProviderComFallback() {
  // 1. Tenta mainnet via proxy oficial
  try {
    web.setProvider({
      api: 'https://proxy.mainnet.klever.org'
    });
    await web.initialize();
    // Testa se o proxy responde (pega o nonce do endereço da loja)
    const resp = await fetch('https://proxy.mainnet.klever.org/address/klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z/nonce');
    if (!resp.ok) throw new Error("Proxy mainnet indisponível");
    return { rede: "mainnet" };
  } catch (e) {
    // 2. Fallback para testnet (proxy)
    web.setProvider({
      api: 'https://proxy.testnet.klever.org'
    });
    await web.initialize();
    try {
      const resp = await fetch('https://proxy.testnet.klever.org/address/klv1mhwnrlrpzpv0vegq6tu5khjn7m27azrvt44l328765yh6aq4xheq5vgn4z/nonce');
      if (!resp.ok) throw new Error("Proxy testnet indisponível");
      return { rede: "testnet" };
    } catch (e2) {
      throw new Error("Nenhum endpoint Klever disponível no momento.");
    }
  }
}

// Loader simples para feedback visual
function mostrarLoader() {
  let loader = document.getElementById("papudimLoader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "papudimLoader";
    loader.style.position = "fixed";
    loader.style.top = "0";
    loader.style.left = "0";
    loader.style.width = "100vw";
    loader.style.height = "100vh";
    loader.style.background = "rgba(255,255,255,0.7)";
    loader.style.display = "flex";
    loader.style.alignItems = "center";
    loader.style.justifyContent = "center";
    loader.style.zIndex = "99999";
    loader.innerHTML = `
      <div style="text-align:center">
        <div class="animate-spin" style="border:4px solid #e2cdb0;border-top:4px solid #a47551;border-radius:50%;width:48px;height:48px;margin:auto"></div>
        <div style="margin-top:16px;color:#a47551;font-weight:bold">Processando...</div>
      </div>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = "flex";
}

function esconderLoader() {
  const loader = document.getElementById("papudimLoader");
  if (loader) loader.style.display = "none";
}

function exibirToast(msg) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.position = "fixed";
    container.style.top = "1rem";
    container.style.right = "1rem";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className =
    "bg-[#a47551] text-white px-4 py-2 rounded-xl shadow mb-2 animate-fade-in";
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 1800);
}

function validarFormulario() {
  // Habilita ou desabilita o botão de finalizar conforme os campos obrigatórios
  const nome = nomeClienteInput.value.trim();
  const email = emailClienteInput.value.trim();
  const celular = celularClienteInput.value.trim();
  const pagamento = formaPagamentoInput.value;
  const totalUnidades = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  btnFinalizar.disabled =
    !nome ||
    !email ||
    !celular ||
    !pagamento ||
    carrinho.length === 0;
}

// Atualiza validação e barra de progresso ao digitar nos campos
[nomeClienteInput, emailClienteInput, celularClienteInput, formaPagamentoInput].forEach(input => {
  if (input) {
    input.addEventListener("input", () => {
      validarFormulario();
      atualizarBarraProgresso();
    });
    // Para select (formaPagamento), também escuta 'change'
    if (input.tagName === "SELECT") {
      input.addEventListener("change", () => {
        validarFormulario();
        atualizarBarraProgresso();
        
        // Mostrar/esconder aviso do Klever baseado na forma de pagamento
        if (input.id === "formaPagamento") {
          const avisoKlever = document.getElementById("avisoKlever");
          const selectParcelas = document.getElementById("parcelas");
          
          if (input.value === "CRIPTO") {
            avisoKlever?.classList.remove("hidden");
            selectParcelas.style.display = "none";
          } else {
            avisoKlever?.classList.add("hidden");
            // Mostrar parcelas apenas para cartão de crédito
            if (input.value === "CREDIT_CARD") {
              selectParcelas.style.display = "block";
            } else {
              selectParcelas.style.display = "none";
            }
          }
        }
      });
    }
  }
});

// Atualiza barra de progresso separadamente
function atualizarBarraProgresso() {
  const nomePreenchido = nomeClienteInput.value.trim() !== "";
  const pagamentoEscolhido = formaPagamentoInput.value !== "";
  const progresso =
    (carrinho.length > 0 ? 33 : 0) +
    (nomePreenchido ? 33 : 0) +
    (pagamentoEscolhido ? 34 : 0);
  if (barraProgresso) barraProgresso.style.width = `${progresso}%`;
}

// Chama ao carregar a página
validarFormulario();
atualizarBarraProgresso();

