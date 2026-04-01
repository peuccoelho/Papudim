import rateLimit from "express-rate-limit";

// 100 requisições por 15 minutos por IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { erro: "Muitas requisições deste IP. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 tentativas por 15 minutos por IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: { erro: "Muitas tentativas de login. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 10 pedidos por hora por IP
export const pedidoLimiter = rateLimit({
  // reduzir para evitar spam: 1 pedido a cada 5 minutos por IP
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 1, // permitir 1 pedido por janela
  message: { erro: "Muitas requisições de pedidos deste IP. Aguarde 5 minutos antes de tentar novamente." },
  handler: (req, res /*, next*/) => {
    console.warn(`Rate limit: pedido bloqueado para IP ${req.ip}`);
    res.status(429).json({ erro: "Muitas requisições de pedidos deste IP. Aguarde 5 minutos antes de tentar novamente." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 200 requisições por hora por IP
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200, 
  message: { erro: "Muitas requisições do admin. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});