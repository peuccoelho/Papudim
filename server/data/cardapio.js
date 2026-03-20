// Fonte única de verdade para o cardápio - usado para servir ao frontend e validar pedidos
export const cardapio = [
  {
    id: "docura-perfeita",
    nome: "Pudim Doçura Perfeita",
    imagem: "img/pudim-docura-perfeita.jpg",
    tamanhos: [
      { peso: "150ml", preco: 13.90 }
    ]
  },
  {
    id: "zero-lactose",
    nome: "Pudim Zero Lactose",
    imagem: "img/pudim-zero-lactose.jpg",
    tamanhos: [
      { peso: "150ml", preco: 14.50 },
      { peso: "1100ml", preco: 97.80 }
    ]
  },
  {
    id: "abacaxi",
    nome: "Pudim de Abacaxi",
    imagem: "img/pudim-abacaxi.jpg",
    tamanhos: [
      { peso: "150ml", preco: 15.00 },
      { peso: "550ml", preco: 59.90 },
      { peso: "1100ml", preco: 89.50 }
    ]
  },
  {
    id: "arretado-morango",
    nome: "Pudim Arretado de Morango",
    imagem: "img/pudim-arretado-morango.jpg",
    tamanhos: [
      { peso: "150ml", preco: 15.00 },
      { peso: "1100ml", preco: 115.50 }
    ]
  },
  {
    id: "doce-cangaco",
    nome: "Pudim Doce Cangaço",
    imagem: "img/pudim-doce-cangaco.jpg",
    tamanhos: [
      { peso: "150ml", preco: 12.00 },
      { peso: "1100ml", preco: 85.90 }
    ]
  },
  {
    id: "cafe",
    nome: "Pudim de Café",
    imagem: "img/pudim-cafe.jpg",
    tamanhos: [
      { peso: "150ml", preco: 12.90 },
      { peso: "1100ml", preco: 95.50 }
    ]
  },
  {
    id: "raiz-tradicional",
    nome: "Pudim Raiz Tradicional",
    imagem: "img/pudim-raiz.jpg",
    tamanhos: [
      { peso: "150ml", preco: 12.00 },
      { peso: "550ml", preco: 58.90 },
      { peso: "1100ml", preco: 89.90 }
    ]
  },
  {
    id: "cocada-cremosa",
    nome: "Pudim Cocada Cremosa",
    imagem: "img/pudim-cocada-cremosa.jpg",
    tamanhos: [
      { peso: "150ml", preco: 15.00 },
      { peso: "1100ml", preco: 129.00 }
    ]
  },
  {
    id: "chocobom",
    nome: "Pudim Chocobom",
    imagem: "img/pudim-chocobom.jpg",
    tamanhos: [
      { peso: "150ml", preco: 14.50 }
    ]
  },
  {
    id: "nordestino-maracuja",
    nome: "Pudim Nordestino de Maracujá",
    imagem: "img/pudim-nordestino-maracuja.jpg",
    tamanhos: [
      { peso: "150ml", preco: 15.00 }
    ]
  },
  {
    id: "panetone",
    nome: "Pudim Panetone",
    imagem: "img/pudim-panetone.jpg",
    tamanhos: [
      { peso: "550ml", preco: 63.50 },
      { peso: "1100ml", preco: 125.90 }
    ]
  }
];

// Função para buscar preço real de um item (usada na validação de pedidos)
export function buscarPreco(produtoId, peso) {
  const produto = cardapio.find(p => p.id === produtoId);
  if (!produto) return null;
  
  const tamanho = produto.tamanhos.find(t => t.peso === peso);
  return tamanho ? tamanho.preco : null;
}

// Função para validar e recalcular total de um pedido
export function validarPedido(itens) {
  let totalCalculado = 0;
  const itensValidados = [];

  for (const item of itens) {
    const precoReal = buscarPreco(item.produtoId, item.peso);
    
    if (precoReal === null) {
      return { valido: false, erro: `Produto inválido: ${item.produtoId} - ${item.peso}` };
    }

    const subtotal = precoReal * item.quantidade;
    totalCalculado += subtotal;
    
    itensValidados.push({
      ...item,
      precoUnitario: precoReal,
      subtotal
    });
  }

  return {
    valido: true,
    itens: itensValidados,
    total: Math.round(totalCalculado * 100) / 100
  };
}
