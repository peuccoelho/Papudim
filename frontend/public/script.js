
const API_URL = "https://homepudimback.onrender.com/api";

let cardapio = [];
const carrinho = [];
let ultimoTotal = 0;

// Desktop elements
const cardapioContainer = document.getElementById("cardapio");
const carrinhoContainer = document.getElementById("carrinho");
const nomeClienteInput = document.getElementById("nomeCliente");
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
const btnFinalizarMobile = document.getElementById("finalizarPedidoMobile");

let pedidoParaEnviar = null;

// ===== DESCRIÇÕES DOS PUDINS =====
const pudimDescricoes = {
  "Pudim Cocada Cremosa": "O pudim de coco, meu xodó, é uma gostosura dos deuses! Feito com leite condensado, ovos, leite de coco fresquinho, açúcar caramelizada e lascas fininhas de coco seco. Uma delícia que faz a gente sentir o gostinho do Nordeste em cada colherada.",
  "Pudim Raiz": "Simplesmente irresistível. Nosso pudim tradicional é a combinação perfeita de ovos, leite condensado, açúcar e leite. Com sua casquinha dourada e seu interior macio que derrete na boca.",
  "Pudim Panetone": "Uma fusão deliciosa do clássico pudim com o sabor natalino do panetone, repleto de frutas e aromas de festas!",
  "Pudim Chocobom": "O pudim de chocolate é uma sobremesa divina que combina a suavidade do pudim tradicional com a intensidade do chocolate. Sua textura cremosa derrete na boca, enquanto o sabor rico e encorpado envolve os sentidos.",
  "Pudim Doçura Perfeita": "Mergulhe no sabor autêntico e na textura aveludada deste pudim. Uma combinação perfeita de cremosidade e doce de leite, proporcionando uma experiência sensorial única.",
  "Pudim Zero Lactose": "Descubra a delícia irresistível do nosso pudim zero lactose, onde a tradição se encontra com a inovação. Mantém a mesma textura cremosa e sabor suave que os clientes amam.",
  "Pudim de Abacaxi": "Uma sobremesa leve e refrescante, com textura cremosa e o sabor tropical do abacaxi caramelizado.",
  "Pudim de Café": "Essa delícia aveludada combina a suavidade do pudim tradicional com a intensidade marcante do café. O amargor sutil se mistura com a doçura do leite condensado, criando uma harmonia perfeita.",
  "Pudim Nordestino de Maracujá": "Uma sobremesa cremosa e refrescante, feita com a polpa do maracujá, trazendo um sabor tropical levemente ácido. Textura suave e equilibrada entre doce e azedo.",
  "Pudim Arretado de Morango": "Um pudim cremoso de chocolate branco coberto com uma deliciosa calda de morango, combinando intensidade e frescor.",
  "Pudim Doce Cangaço": "Uma elegante interpretação do clássico pudim, unindo queijo e goiabada em uma combinação irresistível."
};

// Elementos do modal de preview
const previewModal = document.getElementById("previewModal");
const previewModalClose = document.getElementById("previewModalClose");
const previewModalImg = document.getElementById("previewModalImg");
const previewModalTitle = document.getElementById("previewModalTitle");
const previewModalDesc = document.getElementById("previewModalDesc");
const previewModalAdd = document.getElementById("previewModalAdd");
const previewModalCancel = document.getElementById("previewModalCancel");

let currentPreviewIndex = null;

// ===== FUNÇÕES DO MODAL DE PREVIEW =====
function abrirPreviewModal(index) {
  const item = cardapio[index];
  if (!item || !previewModal) return;
  
  currentPreviewIndex = index;
  
  previewModalImg.src = item.imagem || 'img/placeholder.jpg';
  previewModalImg.alt = item.nome;
  previewModalTitle.textContent = item.nome;
  
  // Busca descrição ou usa padrão
  const descricao = pudimDescricoes[item.nome] || "Um delicioso pudim artesanal, feito com ingredientes selecionados e muito carinho.";
  previewModalDesc.textContent = descricao;
  
  previewModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function fecharPreviewModal() {
  previewModal?.classList.remove("active");
  document.body.style.overflow = "";
  currentPreviewIndex = null;
}

// Event listeners do modal de preview
previewModalClose?.addEventListener("click", fecharPreviewModal);
previewModalCancel?.addEventListener("click", fecharPreviewModal);

previewModal?.addEventListener("click", (e) => {
  if (e.target === previewModal) {
    fecharPreviewModal();
  }
});

previewModalAdd?.addEventListener("click", () => {
  if (currentPreviewIndex !== null) {
    adicionarAoCarrinho(currentPreviewIndex);
    fecharPreviewModal();
  }
});

// Fechar com ESC 
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && previewModal?.classList.contains("active")) {
    fecharPreviewModal();
  }
});

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

toggleInfo?.addEventListener("click", () => {
  infoSection.classList.toggle("hidden");
});

function verificarHorarioFuncionamento() {
  const agora = new Date();
  const diaSemana = agora.getDay();
  const hora = agora.getHours();
  const aberto = diaSemana >= 1 && diaSemana <= 5 && hora >= 9 && hora < 17;

  if (statusDiv) {
    const statusLabel = statusDiv.querySelector('.status-label');
    
    statusDiv.classList.remove("aberto", "fechado");
    statusDiv.classList.add(aberto ? "aberto" : "fechado");
    
    if (statusLabel) {
      statusLabel.textContent = aberto ? "Aberto" : "Fechado";
    }
  }

  return aberto;
}

verificarHorarioFuncionamento();
setInterval(verificarHorarioFuncionamento, 60000);

// Função para carregar o cardápio da API
async function carregarCardapio() {
  if (!cardapioContainer) return;
  
  try {
    cardapioContainer.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-12">
        <div class="cardapio-loader">
          <svg class="animate-spin" viewBox="0 0 50 50" width="48" height="48">
            <circle cx="25" cy="25" r="20" fill="none" stroke="#a47551" stroke-width="4" stroke-linecap="round" stroke-dasharray="90, 150" stroke-dashoffset="0"></circle>
          </svg>
        </div>
        <p class="text-gray-500 mt-4">Carregando cardápio...</p>
      </div>
    `;
    
    const response = await fetch(`${API_URL}/cardapio`);
    if (!response.ok) throw new Error('Erro ao carregar cardápio');
    
    cardapio = await response.json();
    renderizarCardapio();
  } catch (error) {
    console.error('Erro ao carregar cardápio:', error);
    
    const isOffline = !navigator.onLine;
    const errorMessage = isOffline 
      ? 'Sem conexão com a internet.' 
      : 'Erro ao carregar cardápio.';
    
    cardapioContainer.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
        <div class="w-16 h-16 mb-4 text-red-400">
          <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p class="text-red-500 font-medium mb-2">${errorMessage}</p>
        <button 
          onclick="carregarCardapio()" 
          class="mt-2 px-4 py-2 bg-[#a47551] hover:bg-[#916546] text-white rounded-xl transition flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Tentar novamente
        </button>
      </div>
    `;
    
    // Toast de erro
    if (window.UX) {
      UX.error(errorMessage);
    }
  }
}

// Função para renderizar os cards do cardápio
function renderizarCardapio() {
  if (!cardapioContainer || cardapio.length === 0) return;
  
  cardapioContainer.innerHTML = '';
  
  cardapio.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "product-card opacity-0 animate-fade-in";
    
    const primeiroTamanho = item.tamanhos[0];
    const temMultiplosTamanhos = item.tamanhos.length > 1;
    
    let tamanhoSelectorHTML = '';
    if (temMultiplosTamanhos) {
      tamanhoSelectorHTML = `
        <select class="product-size-select" data-index="${index}">
          ${item.tamanhos.map((t, i) => `<option value="${i}">${t.peso}</option>`).join('')}
        </select>
      `;
    } else {
      tamanhoSelectorHTML = `<p class="product-card-meta">${primeiroTamanho.peso}</p>`;
    }
    
    card.innerHTML = `
      <div class="product-card-image">
        <img src="${item.imagem || 'img/placeholder.jpg'}" alt="${escapeHTML(item.nome)}" loading="lazy" />
      </div>
      <div class="product-card-body">
        <h3 class="product-card-title">${escapeHTML(item.nome)}</h3>
        ${tamanhoSelectorHTML}
        <p class="product-card-price" data-index="${index}">R$ ${primeiroTamanho.preco.toFixed(2).replace('.', ',')}</p>
        <div class="product-card-actions">
          <input 
            type="number" 
            min="1" 
            value="1" 
            class="product-qty-input" 
            data-index="${index}" 
            aria-label="Quantidade"
          />
          <button class="product-add-btn" data-index="${index}">
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

// Carrega o cardápio ao iniciar
carregarCardapio();

if (cardapioContainer) {
  // Event listener para mudança de tamanho - atualiza o preço
  cardapioContainer.addEventListener('change', function(e) {
    if (e.target.classList.contains('product-size-select')) {
      const index = parseInt(e.target.dataset.index);
      const item = cardapio[index];
      const tamanhoIndex = parseInt(e.target.value);
      const tamanho = item.tamanhos[tamanhoIndex];
      
      const precoElement = cardapioContainer.querySelector(`.product-card-price[data-index="${index}"]`);
      if (precoElement) {
        precoElement.textContent = 'R$ ' + tamanho.preco.toFixed(2).replace('.', ',');
      }
    }
  });

  // Event listener para cliques no cardápio
  cardapioContainer.addEventListener('click', function(e) {
    // Se clicou no botão de adicionar
    const btn = e.target.closest('.product-add-btn');
    if (btn) {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      adicionarAoCarrinho(index);
      return;
    }
    
    // Se clicou em elementos interativos (input, select), não abre o modal
    if (e.target.closest('.product-card-actions') || 
        e.target.closest('.product-size-select') ||
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'SELECT') {
      return;
    }
    
    // Se clicou no card, abre o modal de preview
    const card = e.target.closest('.product-card');
    if (card) {
      const addBtn = card.querySelector('.product-add-btn');
      if (addBtn) {
        const index = parseInt(addBtn.dataset.index);
        abrirPreviewModal(index);
      }
    }
  });
}

function adicionarAoCarrinho(index) {
  const item = cardapio[index];
  const card = cardapioContainer.querySelector(`.product-add-btn[data-index="${index}"]`).closest('.product-card');
  const quantidadeInput = card.querySelector('.product-qty-input');
  const selectTamanho = card.querySelector('.product-size-select');
  const quantidade = Math.max(1, parseInt(quantidadeInput?.value || "1"));
  
  const tamanhoIndex = selectTamanho ? parseInt(selectTamanho.value) : 0;
  const tamanhoSelecionado = item.tamanhos[tamanhoIndex];
  
  const nomeCompleto = `${item.nome} (${tamanhoSelecionado.peso})`;
  const chaveCarrinho = `${item.id}-${tamanhoSelecionado.peso}`;
  
  const existente = carrinho.find(p => p.chaveCarrinho === chaveCarrinho);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    carrinho.push({ 
      chaveCarrinho,
      produtoId: item.id,
      nome: nomeCompleto, 
      preco: tamanhoSelecionado.preco, 
      peso: tamanhoSelecionado.peso,
      imagem: item.imagem,
      quantidade 
    });
  }

  exibirToast(`${nomeCompleto} adicionado!`);
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
  const totalUnidades = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  if (!nome) {
    exibirToast("Preencha seu nome antes de finalizar o pedido.");
    return;
  }

  const total = Number(
    carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0).toFixed(2)
  );

  pedidoParaEnviar = {
    id: "pedido-" + Date.now(),
    cliente: nome,
    itens: carrinho.map(item => ({
      produtoId: item.produtoId,
      nome: item.nome,
      preco: item.preco,
      peso: item.peso,
      quantidade: item.quantidade,
      imagem: item.imagem || ''
    })),
    total
  };

  // Gerar HTML dos itens do pedido
  const resumoItens = document.getElementById("resumoItens");
  const resumoDados = document.getElementById("resumoDados");
  
  let itensHtml = '';
  carrinho.forEach(item => {
    const imgSrc = item.imagem || 'img/pudim-tradicional.jpg';
    itensHtml += `
      <div class="order-item">
        <img src="${escapeHTML(imgSrc)}" alt="${escapeHTML(item.nome)}" class="order-item-img">
        <div class="order-item-info">
          <p class="order-item-name">${escapeHTML(item.nome)}</p>
          <p class="order-item-details">${escapeHTML(item.peso)} • Qtd: ${item.quantidade}</p>
        </div>
        <p class="order-item-price">R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</p>
      </div>
    `;
  });
  resumoItens.innerHTML = itensHtml;

  // Gerar HTML do resumo de dados
  let dadosHtml = `
    <div class="summary-row">
      <span class="summary-label">Cliente</span>
      <span class="summary-value">${escapeHTML(nome)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Itens</span>
      <span class="summary-value">${totalUnidades} ${totalUnidades === 1 ? 'item' : 'itens'}</span>
    </div>
    <div class="summary-row total">
      <span class="summary-label">Total</span>
      <span class="summary-value">R$ ${total.toFixed(2).replace(".", ",")}</span>
    </div>
  `;
  resumoDados.innerHTML = dadosHtml;

  // Fechar carrinho mobile se estiver aberto
  fecharCarrinhoMobile();
  
  // Mostrar modal com animação
  modalResumo.classList.add("active");
});


btnCancelarResumo.addEventListener("click", () => {
  modalResumo.classList.remove("active");
});


btnConfirmarResumo.addEventListener("click", async () => {
  try {
    modalResumo.classList.remove("active");
    
    // Usar novo loader se disponível
    if (window.UX) {
      UX.showLoader("Enviando pedido...");
    } else {
      mostrarLoader();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${API_URL}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedidoParaEnviar),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
    
      if (data.sucesso) {
        // Gera mensagem personalizada para WhatsApp 
        const itensTexto = data.itens
          .map(i => `- ${i.nome} x${i.quantidade} - R$ ${(i.preco * i.quantidade).toFixed(2).replace(".", ",")}`)
          .join("\n");
        
        const mensagem = `🍮 *Novo Pedido - Papudim*

*Cliente:* ${data.cliente}

*Itens:*
${itensTexto}

*Total:* R$ ${Number(data.total).toFixed(2).replace(".", ",")}

Aguardo confirmação para finalizar o pedido! 😊`;

        // Número do WhatsApp do estabelecimento
        const numeroWhatsApp = "5571986961217";
        const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
        
        // Limpa o carrinho antes de redirecionar
        carrinho.length = 0;
        atualizarCarrinho();
        nomeClienteInput.value = "";
        if (nomeClienteMobile) nomeClienteMobile.value = "";
        
        if (window.UX) {
          UX.success("Pedido enviado! Redirecionando ao WhatsApp...");
        } else {
          exibirToast("Pedido enviado! Redirecionando ao WhatsApp...");
        }
        
        // Usa location.href para compatibilidade com Safari (window.open é bloqueado após async)
        setTimeout(() => {
          window.location.href = urlWhatsApp;
        }, 500);
      } else {
        if (window.UX) {
          UX.error("Erro ao processar pedido. Tente novamente.");
        } else {
          alert("Erro ao processar pedido.");
        }
      }
    } else {
      const erro = await res.json().catch(() => ({}));
      const mensagemErro = erro.erro || "Erro ao processar pedido.";
      
      if (window.UX) {
        UX.error(mensagemErro);
      } else {
        alert(mensagemErro);
      }
    }
  } catch (e) {
    console.error("Erro ao processar pedido:", e);
    
    let mensagemErro = "Erro ao processar pedido.";
    
    if (e.name === "AbortError") {
      mensagemErro = "Tempo de conexão esgotado. Verifique sua internet.";
    } else if (!navigator.onLine) {
      mensagemErro = "Sem conexão com a internet.";
    }
    
    if (window.UX) {
      UX.networkError(mensagemErro, () => {
        // Retry - reabrir modal de resumo
        modalResumo.classList.add("active");
      });
    } else {
      alert(mensagemErro);
    }
  } finally {
    if (window.UX) {
      UX.hideLoader();
    } else {
      esconderLoader();
    }
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

  const formularioValido = nome && carrinho.length > 0;
  
  // Desabilitar/habilitar ambos os botões
  if (btnFinalizar) btnFinalizar.disabled = !formularioValido;
  if (btnFinalizarMobile) btnFinalizarMobile.disabled = !formularioValido;
}

function atualizarBarraProgresso() {
  const nomePreenchido = (nomeClienteInput?.value || nomeClienteMobile?.value || "").trim() !== "";
  const progresso =
    (carrinho.length > 0 ? 50 : 0) +
    (nomePreenchido ? 50 : 0);
  if (barraProgresso) barraProgresso.style.width = `${progresso}%`;
}

// Botão finalizar mobile usa a mesma lógica do desktop
btnFinalizarMobile?.addEventListener("click", (e) => {
  // Sincronizar campos mobile → desktop antes de disparar
  if (nomeClienteMobile && nomeClienteInput) nomeClienteInput.value = nomeClienteMobile.value;
  
  // Disparar click no botão desktop (que tem toda a lógica)
  btnFinalizar?.click();
});

// Inicialização
validarFormulario();
atualizarBarraProgresso();
atualizarCarrinho();