import { body, query, param, validationResult } from "express-validator";

// Middleware para processar erros de validação
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      erro: "Dados inválidos",
      detalhes: errors.array().map(e => ({
        campo: e.path,
        mensagem: e.msg
      }))
    });
  }
  next();
}

// Validação para criação de pedido
export const validateCriarPedido = [
  body("cliente")
    .trim()
    .notEmpty().withMessage("Nome do cliente é obrigatório")
    .isLength({ min: 2, max: 100 }).withMessage("Nome deve ter entre 2 e 100 caracteres")
    .matches(/^[\p{L}\p{N}\s.,'-]+$/u).withMessage("Nome contém caracteres inválidos"),

  body("itens")
    .isArray({ min: 1, max: 50 }).withMessage("Pedido deve conter entre 1 e 50 itens"),

  body("itens.*.produtoId")
    .trim()
    .notEmpty().withMessage("ID do produto é obrigatório")
    .isLength({ max: 50 }).withMessage("ID do produto muito longo")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("ID do produto inválido"),

  body("itens.*.nome")
    .trim()
    .notEmpty().withMessage("Nome do item é obrigatório")
    .isLength({ max: 100 }).withMessage("Nome do item muito longo"),

  body("itens.*.quantidade")
    .isInt({ min: 1, max: 100 }).withMessage("Quantidade deve ser entre 1 e 100"),

  body("itens.*.peso")
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage("Peso muito longo"),

  body("endereco")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Endereço muito longo"),

  body("celular")
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage("Celular muito longo"),

  body("observacoes")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Observações muito longas"),

  handleValidationErrors
];

// Validação para status do pedido (query param)
export const validateStatusPedido = [
  query("id")
    .trim()
    .notEmpty().withMessage("ID do pedido é obrigatório")
    .isLength({ max: 100 }).withMessage("ID do pedido muito longo")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("ID do pedido inválido"),

  handleValidationErrors
];

// Validação para atualizar status
export const validateAtualizarStatus = [
  body("id")
    .trim()
    .notEmpty().withMessage("ID do pedido é obrigatório")
    .isLength({ max: 100 }).withMessage("ID do pedido muito longo")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("ID do pedido inválido"),

  body("status")
    .trim()
    .notEmpty().withMessage("Status é obrigatório")
    .isIn(["a fazer", "em produção", "pronto", "pendente", "pago", "aguardando_contato"])
    .withMessage("Status inválido"),

  handleValidationErrors
];

// Validação para deletar pedido
export const validateDeletarPedido = [
  param("id")
    .trim()
    .notEmpty().withMessage("ID do pedido é obrigatório")
    .isLength({ max: 100 }).withMessage("ID do pedido muito longo")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("ID do pedido inválido"),

  handleValidationErrors
];

// Validação para admin-pedidos com paginação
export const validateAdminPedidos = [
  query("limite")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limite deve ser entre 1 e 100")
    .toInt(),

  query("pagina")
    .optional()
    .isInt({ min: 1 }).withMessage("Página deve ser maior que 0")
    .toInt(),

  query("status")
    .optional()
    .trim()
    .isIn(["a fazer", "em produção", "pronto", "pendente", "pago", "aguardando_contato", "todos"])
    .withMessage("Status inválido"),

  query("ordenarPor")
    .optional()
    .trim()
    .isIn(["criadoEm", "total", "cliente", "status"])
    .withMessage("Campo de ordenação inválido"),

  query("ordem")
    .optional()
    .trim()
    .isIn(["asc", "desc"])
    .withMessage("Ordem deve ser 'asc' ou 'desc'"),

  handleValidationErrors
];

// Validação para debug-pedido
export const validateDebugPedido = [
  query("id")
    .trim()
    .notEmpty().withMessage("ID do pedido é obrigatório")
    .isLength({ max: 100 }).withMessage("ID do pedido muito longo")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("ID do pedido inválido"),

  handleValidationErrors
];
