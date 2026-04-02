import validator from "validator";

/**
 * Sanitização completa de string com validação de tipo e tamanho
 * @param {*} input - Entrada a ser sanitizada
 * @param {Object} options - Opções de sanitização
 * @param {number} options.maxLength - Tamanho máximo permitido (padrão: 500)
 * @param {boolean} options.allowHtml - Se deve permitir HTML (padrão: false)
 * @returns {string} String sanitizada
 */
export function sanitizeInput(input, options = {}) {
  const { maxLength = 500, allowHtml = false } = options;

  // Validação de tipo
  if (input === null || input === undefined) return "";
  if (typeof input !== "string") {
    if (typeof input === "number" && Number.isFinite(input)) {
      return String(input);
    }
    return "";
  }

  let sanitized = input;

  // Trim e limite de tamanho
  sanitized = sanitized.trim().slice(0, maxLength);

  // Escape de HTML se não permitido
  if (!allowHtml) {
    sanitized = validator.escape(sanitized);
  }

  // Remove caracteres de controle (exceto newline e tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Normaliza espaços múltiplos
  sanitized = sanitized.replace(/\s+/g, " ");

  return sanitized;
}

/**
 * Sanitiza um ID (permite apenas alfanuméricos, hífens e underscores)
 * @param {*} input - ID a ser sanitizado
 * @param {number} maxLength - Tamanho máximo (padrão: 100)
 * @returns {string} ID sanitizado
 */
export function sanitizeId(input, maxLength = 100) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength).replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Sanitiza número com validação de range
 * @param {*} input - Número a ser sanitizado
 * @param {Object} options - Opções
 * @param {number} options.min - Valor mínimo
 * @param {number} options.max - Valor máximo
 * @param {number} options.defaultValue - Valor padrão se inválido
 * @returns {number} Número sanitizado
 */
export function sanitizeNumber(input, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = 0 } = options;

  const num = Number(input);

  if (!Number.isFinite(num)) return defaultValue;
  if (num < min) return min;
  if (num > max) return max;

  return num;
}

/**
 * Sanitiza objeto de pedido completo
 * @param {Object} pedido - Dados do pedido
 * @returns {Object} Pedido sanitizado
 */
export function sanitizePedido(pedido) {
  if (!pedido || typeof pedido !== "object") {
    return null;
  }

  return {
    cliente: sanitizeInput(pedido.cliente, { maxLength: 100 }),
    endereco: sanitizeInput(pedido.endereco, { maxLength: 300 }),
    celular: sanitizeInput(pedido.celular, { maxLength: 20 }),
    observacoes: sanitizeInput(pedido.observacoes, { maxLength: 500 }),
  };
}

/**
 * Sanitiza item do pedido
 * @param {Object} item - Item do pedido
 * @returns {Object} Item sanitizado
 */
export function sanitizeItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    produtoId: sanitizeId(item.produtoId, 50),
    nome: sanitizeInput(item.nome, { maxLength: 100 }),
    peso: sanitizeInput(item.peso || "", { maxLength: 20 }),
    quantidade: sanitizeNumber(item.quantidade, { min: 1, max: 100, defaultValue: 1 }),
  };
}