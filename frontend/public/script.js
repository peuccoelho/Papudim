
const cardapio = [
  { nome: "Pudim Tradicional", preco: 7.9, peso: "120g", imagem: "img/pudim-tradicional.jpg" },
  { nome: "Pudim de Coco", preco: 9.3, peso: "120g", imagem: "img/pudim-coco.jpg" },
  { nome: "Pudim de Maracujá", preco: 9.9, peso: "120g", imagem: "img/pudim-maracuja.jpg" },
  { nome: "Pudim de Morango", preco: 10.6, peso: "120g", imagem: "img/pudim-morango.jpg" },
  { nome: "Pudim de Paçoca", preco: 8.9, peso: "120g", imagem: "img/pudim-pacoca.jpg" }
];

const carrinho = [];
let ultimoTotal = 0;

// Desktop elements
const cardapioContainer = document.getElementById("cardapio");
const carrinhoContainer = document.getElementById("carrinho");
const nomeClienteInput = document.getElementById("nomeCliente");
const emailClienteInput = document.getElementById("emailCliente");
const celularClienteInput = document.getElementById("celularCliente");
const btnFinalizar = document.getElementById("finalizarPedido");
const toggleInfo = document.getElementById("toggleInfo");
const infoSection = document.getElementById("infoSection");
const statusDiv = document.getElementById("status");
const barraProgresso = document.getElementById("barraProgresso");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const modalResumo = document.getElementById("modalResumo");
const resumoConteudo = document.getElementById("resumoConteudo");
const btnCancelarResumo = document.getElementById("btnCancelarResumo");
const btnConfirmarResumo = document.getElementById("btnConfirmarResumo");

// Mobile sidebar elements
const cartFab = document.getElementById("cartFab");
const cartFabBadge = document.getElementById("cartFabBadge");
const cartOverlay = document.getElementById("cartOverlay");
const cartSidebar = document.getElementById("cartSidebar");
const cartSidebarClose = document.getElementById("cartSidebarClose");
const carrinhoMobileContainer = document.getElementById("carrinhoMobile");
const cartSidebarCount = document.getElementById("cartSidebarCount");
const cartTotalMobile = document.getElementById("cartTotalMobile");
const nomeClienteMobile = document.getElementById("nomeClienteMobile");
const emailClienteMobile = document.getElementById("emailClienteMobile");
const celularClienteMobile = document.getElementById("celularClienteMobile");
const btnFinalizarMobile = document.getElementById("finalizarPedidoMobile");

let pedidoParaEnviar = null;

// ===== MOBILE SIDEBAR CONTROLS =====
function abrirCarrinhoMobile() {
  cartSidebar?.classList.add("active");
  cartOverlay?.classList.add("active");
  document.body.style.overflow = "hidden";
}

function fecharCarrinhoMobile() {
  cartSidebar?.classList.remove("active");
  cartOverlay?.classList.remove("active");
  document.body.style.overflow = "";
}

cartFab?.addEventListener("click", abrirCarrinhoMobile);
cartSidebarClose?.addEventListener("click", fecharCarrinhoMobile);
cartOverlay?.addEventListener("click", fecharCarrinhoMobile);

// Sincronizar campos entre desktop e mobile
function sincronizarCampos(origem, destino) {
  if (origem && destino) {
    destino.value = origem.value;
  }
}

// Listeners para sincronização bidirecional
[nomeClienteInput, nomeClienteMobile].forEach(input => {
  input?.addEventListener("input", () => {
    if (input === nomeClienteInput) sincronizarCampos(nomeClienteInput, nomeClienteMobile);
    else sincronizarCampos(nomeClienteMobile, nomeClienteInput);
    validarFormulario();
    atualizarBarraProgresso();
  });
});

[emailClienteInput, emailClienteMobile].forEach(input => {
  input?.addEventListener("input", () => {
    if (input === emailClienteInput) sincronizarCampos(emailClienteInput, emailClienteMobile);
    else sincronizarCampos(emailClienteMobile, emailClienteInput);
    validarFormulario();
    atualizarBarraProgresso();
  });
});

[celularClienteInput, celularClienteMobile].forEach(input => {
  input?.addEventListener("input", () => {
    if (input === celularClienteInput) sincronizarCampos(celularClienteInput, celularClienteMobile);
    else sincronizarCampos(celularClienteMobile, celularClienteInput);
    validarFormulario();
    atualizarBarraProgresso();
  });
});

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

verificarHorarioFuncionamento();
setInterval(verificarHorarioFuncionamento, 60000);

if (cardapioContainer) {
  cardapio.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "product-card opacity-0 animate-fade-in";
    card.innerHTML = `
      <div class="product-card-image">
        <img src="${item.imagem || 'img/placeholder.jpg'}" alt="${escapeHTML(item.nome)}" loading="lazy" />
      </div>
      <div class="product-card-body">
        <h3 class="product-card-title">${escapeHTML(item.nome)}</h3>
        <p class="product-card-meta">${escapeHTML(item.peso)}</p>
        <p class="product-card-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
        <div class="product-card-actions">
          <input 
            type="number" 
            min="1" 
            value="1" 
            class="product-qty-input" 
            id="quantidade-${index}" 
            aria-label="Quantidade"
          />
          <button class="product-add-btn" onclick="adicionarAoCarrinho(${index})">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Adicionar
          </button>
        </div>
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
  const itemElement = carrinhoContainer.children[i];
  if (itemElement) {
    itemElement.classList.remove('cart-item-enter');
    itemElement.classList.add('cart-item-exit');
    setTimeout(() => {
      carrinho.splice(i, 1);
      atualizarCarrinho();
    }, 200);
  } else {
    carrinho.splice(i, 1);
    atualizarCarrinho();
  }
}

window.removerDoCarrinho = removerDoCarrinho;

function alterarQuantidade(index, delta) {
  const novaQuantidade = carrinho[index].quantidade + delta;
  if (novaQuantidade > 0) {
    carrinho[index].quantidade = novaQuantidade;
    atualizarCarrinho();
  } else if (novaQuantidade === 0) {
    removerDoCarrinho(index);
  }
}

window.alterarQuantidade = alterarQuantidade;

function atualizarQuantidade(index, novaQuantidade) {
  const quantidade = parseInt(novaQuantidade);
  carrinho[index].quantidade = !isNaN(quantidade) && quantidade > 0 ? quantidade : 1;
  atualizarCarrinho();
}

window.atualizarQuantidade = atualizarQuantidade;

// Animação de número fluindo (Number Flow)
function animarNumero(elemento, valorFinal, prefixo = '', sufixo = '') {
  const valorAtual = parseFloat(elemento.textContent.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  const diferenca = valorFinal - valorAtual;
  const duracao = 400;
  const inicio = performance.now();
  
  elemento.classList.add('updating');
  
  function animar(tempoAtual) {
    const progresso = Math.min((tempoAtual - inicio) / duracao, 1);
    const easeOut = 1 - Math.pow(1 - progresso, 3);
    const valorAnimado = valorAtual + (diferenca * easeOut);
    elemento.textContent = prefixo + valorAnimado.toFixed(2).replace('.', ',') + sufixo;
    
    if (progresso < 1) {
      requestAnimationFrame(animar);
    } else {
      elemento.classList.remove('updating');
    }
  }
  
  requestAnimationFrame(animar);
}

// Atualizar contador do carrinho com animação
function atualizarContador() {
  const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  
  // Desktop counter
  if (cartCountEl) {
    const valorAnterior = parseInt(cartCountEl.textContent) || 0;
    cartCountEl.textContent = totalItens;
    
    if (totalItens !== valorAnterior) {
      cartCountEl.classList.remove('cart-count-pulse');
      void cartCountEl.offsetWidth;
      cartCountEl.classList.add('cart-count-pulse');
    }
    cartCountEl.style.opacity = totalItens > 0 ? '1' : '0.5';
  }
  
  // Mobile FAB badge
  if (cartFabBadge) {
    cartFabBadge.textContent = totalItens;
    cartFabBadge.setAttribute('data-count', totalItens);
  }
  
  // Mobile sidebar counter
  if (cartSidebarCount) {
    cartSidebarCount.textContent = totalItens;
  }
}

// Gerar HTML dos itens do carrinho (reutilizável)
function gerarItemCarrinhoHTML(item, index) {
  return `
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-[#3e2c23] truncate">${escapeHTML(item.nome)}</span>
          <button 
            onclick="removerDoCarrinho(${index})" 
            class="cart-remove-btn p-1 rounded-md text-gray-400 hover:bg-red-50"
            title="Remover item"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">${escapeHTML(item.peso)}</p>
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center gap-1">
            <button 
              onclick="alterarQuantidade(${index}, -1)" 
              class="cart-btn p-1.5 rounded-lg bg-[#e2cdb0]/50 text-[#a47551]"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
              </svg>
            </button>
            <span class="text-sm font-medium text-[#3e2c23] w-8 text-center">${item.quantidade}</span>
            <button 
              onclick="alterarQuantidade(${index}, 1)" 
              class="cart-btn p-1.5 rounded-lg bg-[#e2cdb0]/50 text-[#a47551]"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
          <span class="text-sm font-semibold text-[#a47551]">
            R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>
    </div>
  `;
}

// Gerar HTML do carrinho vazio
function gerarCarrinhoVazioHTML() {
  return `
    <li class="text-center py-8 text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
      <p class="text-sm">Seu carrinho está vazio</p>
    </li>
  `;
}

function atualizarCarrinho() {
  // Atualizar Desktop
  if (carrinhoContainer) {
    carrinhoContainer.innerHTML = "";
    
    if (carrinho.length === 0) {
      carrinhoContainer.innerHTML = gerarCarrinhoVazioHTML();
    } else {
      carrinho.forEach((item, i) => {
        const li = document.createElement("li");
        li.className = "cart-item-enter p-3 bg-[#fdf6e3]/70 rounded-xl border border-[#e2cdb0]/30 transition-all";
        li.innerHTML = gerarItemCarrinhoHTML(item, i);
        carrinhoContainer.appendChild(li);
      });
    }
  }
  
  // Atualizar Mobile
  if (carrinhoMobileContainer) {
    carrinhoMobileContainer.innerHTML = "";
    
    if (carrinho.length === 0) {
      carrinhoMobileContainer.innerHTML = gerarCarrinhoVazioHTML();
    } else {
      carrinho.forEach((item, i) => {
        const li = document.createElement("li");
        li.className = "cart-item-enter p-3 bg-[#fdf6e3]/70 rounded-xl border border-[#e2cdb0]/30 transition-all";
        li.innerHTML = gerarItemCarrinhoHTML(item, i);
        carrinhoMobileContainer.appendChild(li);
      });
    }
  }

  const total = carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  
  // Animar o total (Desktop e Mobile)
  if (total !== ultimoTotal) {
    if (cartTotalEl) animarNumero(cartTotalEl, total, 'R$ ');
    if (cartTotalMobile) animarNumero(cartTotalMobile, total, 'R$ ');
    ultimoTotal = total;
  }

  atualizarContador();
  validarFormulario();
  atualizarBarraProgresso();
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
  // ASAAS DESATIVADO - não precisa mais de forma de pagamento
  // const pagamento = formaPagamentoInput.value;
  // const parcelas = parseInt(document.getElementById("parcelas")?.value || "1");
  const totalUnidades = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  if (!nome || !email || !celular) {
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


  
  pedidoParaEnviar = {
    id: "pedido-" + Date.now(),
    cliente: nome,
    email,
    celular: celular.replace(/\D/g, ""),
    itens: carrinho.map(item => ({
      nome: item.nome,
      preco: item.preco,
      peso: item.peso,
      quantidade: item.quantidade
    })),
    total
    // ASAAS DESATIVADO
    // pagamento,
    // parcelas: pagamento === "CREDIT_CARD" ? parcelas : undefined
  };

  
  let html = `<ul class="mb-2">`;
  carrinho.forEach(item => {
    html += `<li>${escapeHTML(item.nome)} (${escapeHTML(item.peso)}) x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</li>`;
  });
  html += `</ul>`;
  html += `<div class="mb-1"><b>Nome:</b> ${escapeHTML(nome)}</div>`;
  html += `<div class="mb-1"><b>E-mail:</b> ${escapeHTML(email)}</div>`;
  html += `<div class="mb-1"><b>Celular:</b> ${escapeHTML(celular)}</div>`;
  // ASAAS DESATIVADO - removido informação de pagamento
  // html += `<div class="mb-1"><b>Pagamento:</b> `;
  // if (pagamento === "PIX") {
  //   html += "PIX";
  // } else if (pagamento === "CREDIT_CARD") {
  //   html += "Cartão de Crédito";
  //   if (parcelas > 1) {
  //     html += ` (${parcelas}x)`;
  //   }
  // } else {
  //   html += escapeHTML(pagamento);
  // }
  // html += `</div>`;


  html += `<div class="mt-2 text-lg font-bold">Total: R$ ${total.toFixed(2).replace(".", ",")}</div>`;
  html += `<div class="mt-2 text-sm text-gray-600">Ao confirmar, você será redirecionado ao WhatsApp para finalizar o pedido.</div>`;

  resumoConteudo.innerHTML = html;
  modalResumo.classList.remove("hidden");
});


btnCancelarResumo.addEventListener("click", () => {
  modalResumo.classList.add("hidden");
});


btnConfirmarResumo.addEventListener("click", async () => {
  try {
    modalResumo.classList.add("hidden");
    mostrarLoader();

    const res = await fetch("https://homepudimback.onrender.com/api/pagar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedidoParaEnviar),
    });

    if (res.ok) {
      const data = await res.json();
    
      if (data.sucesso) {
        // Gera mensagem personalizada para WhatsApp
        const itensTexto = data.itens
          .map(i => `- ${i.nome} x${i.quantidade} - R$ ${(i.preco * i.quantidade).toFixed(2).replace(".", ",")}`)
          .join("\n");
        
        const mensagem = `🍮 *Novo Pedido - Papudim*

*Cliente:* ${data.cliente}
*E-mail:* ${data.email}
*Celular:* ${data.celular}

*Itens:*
${itensTexto}

*Total:* R$ ${Number(data.total).toFixed(2).replace(".", ",")}

Aguardo confirmação para finalizar o pedido! 😊`;

        // Número do WhatsApp do estabelecimento
        const numeroWhatsApp = "5571986961217";
        const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
        
        // Abre WhatsApp
        window.open(urlWhatsApp, "_blank");
        
        // Limpa o carrinho
        carrinho.length = 0;
        atualizarCarrinho();
        nomeClienteInput.value = "";
        emailClienteInput.value = "";
        celularClienteInput.value = "";
        
        exibirToast("Pedido enviado! Complete pelo WhatsApp.");
      } else {
        alert("Erro ao processar pedido.");
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
});


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
  // Pegar valores de qualquer um dos formulários (são sincronizados)
  const nome = (nomeClienteInput?.value || nomeClienteMobile?.value || "").trim();
  const email = (emailClienteInput?.value || emailClienteMobile?.value || "").trim();
  const celular = (celularClienteInput?.value || celularClienteMobile?.value || "").trim();

  const formularioValido = nome && email && celular && carrinho.length > 0;
  
  // Desabilitar/habilitar ambos os botões
  if (btnFinalizar) btnFinalizar.disabled = !formularioValido;
  if (btnFinalizarMobile) btnFinalizarMobile.disabled = !formularioValido;
}

function atualizarBarraProgresso() {
  const nomePreenchido = (nomeClienteInput?.value || nomeClienteMobile?.value || "").trim() !== "";
  const emailPreenchido = (emailClienteInput?.value || emailClienteMobile?.value || "").trim() !== "";
  const celularPreenchido = (celularClienteInput?.value || celularClienteMobile?.value || "").trim() !== "";
  const progresso =
    (carrinho.length > 0 ? 25 : 0) +
    (nomePreenchido ? 25 : 0) +
    (emailPreenchido ? 25 : 0) +
    (celularPreenchido ? 25 : 0);
  if (barraProgresso) barraProgresso.style.width = `${progresso}%`;
}

// Botão finalizar mobile usa a mesma lógica do desktop
btnFinalizarMobile?.addEventListener("click", (e) => {
  // Sincronizar campos mobile → desktop antes de disparar
  if (nomeClienteMobile && nomeClienteInput) nomeClienteInput.value = nomeClienteMobile.value;
  if (emailClienteMobile && emailClienteInput) emailClienteInput.value = emailClienteMobile.value;
  if (celularClienteMobile && celularClienteInput) celularClienteInput.value = celularClienteMobile.value;
  
  // Disparar click no botão desktop (que tem toda a lógica)
  btnFinalizar?.click();
});

// Inicialização
validarFormulario();
atualizarBarraProgresso();
atualizarCarrinho();