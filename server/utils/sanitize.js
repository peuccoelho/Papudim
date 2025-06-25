export function sanitizeInput(str) {
  if (typeof str !== "string") return "";
  // Remove caracteres perigosos para XSS e SQL injection
  return str.replace(/[<>"'`\\;(){}[\]|&$]/g, "").trim();
}

export function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePhone(phone) {
  const phoneRegex = /^[1-9]\d{10}$/; // DDD + 9 dígitos
  return phoneRegex.test(phone);
}

export function validateTxHash(hash) {
  if (typeof hash !== "string") return false;
  // Hash Klever tem 64 caracteres hexadecimais
  const hashRegex = /^[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
}

// Validações específicas para Klever
export function validateKleverAddress(address) {
  if (typeof address !== "string") return false;
  // Endereço Klever tem formato específico
  const kleverAddressRegex = /^klv[a-fA-F0-9]{62}$/;
  return kleverAddressRegex.test(address);
}

export function validateKleverAmount(amount) {
  if (typeof amount !== "number" && typeof amount !== "string") return false;
  const numAmount = Number(amount);
  return !isNaN(numAmount) && numAmount > 0 && numAmount <= 1e12; // Limite máximo razoável
}

export function sanitizeTransactionData(txData) {
  if (!txData || typeof txData !== "object") return null;
  
  const sanitized = {};
  
  // Apenas campos permitidos são copiados
  const allowedFields = [
    'status', 'resultCode', 'hash', 'blockNum', 
    'timestamp', 'sender', 'receiver', 'amount'
  ];
  
  allowedFields.forEach(field => {
    if (txData[field] !== undefined) {
      sanitized[field] = sanitizeInput(String(txData[field]));
    }
  });
  
  return sanitized;
}

export function validatePedidoData(pedido) {
  const errors = [];
  
  if (!pedido.cliente || pedido.cliente.length < 2 || pedido.cliente.length > 100) {
    errors.push("Nome do cliente inválido");
  }
  
  if (!validateEmail(pedido.email)) {
    errors.push("E-mail inválido");
  }
  
  if (!validatePhone(pedido.celular)) {
    errors.push("Celular inválido");
  }
  
  if (!Array.isArray(pedido.itens) || pedido.itens.length === 0) {
    errors.push("Itens do pedido inválidos");
  }
  
  if (pedido.total && (typeof pedido.total !== "number" || pedido.total <= 0 || pedido.total > 10000)) {
    errors.push("Valor total inválido");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}