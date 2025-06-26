import rateLimit from "express-rate-limit";

// 50 requisições por 15 minutos por IP (mais restritivo)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50,
  message: { erro: "Muitas requisições deste IP. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limit para IPs de confiança em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      const trustedIPs = ['::1', '127.0.0.1', '::ffff:127.0.0.1'];
      return trustedIPs.includes(req.ip);
    }
    return false;
  }
});

// 3 tentativas por 15 minutos para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3,
  message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 pedidos por hora por IP (mais restritivo)
export const pedidoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5,
  message: { erro: "Limite de pedidos atingido. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 100 requisições por hora para admin
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, 
  message: { erro: "Muitas requisições do admin. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter específico para webhooks - muito permissivo
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 webhooks por minuto (bem permissivo)
  message: { erro: "Muitos webhooks. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limit se skipRateLimit foi definido no middleware
    return req.skipRateLimit === true;
  }
});

// Rate limiter específico para consultas de status - mais permissivo
export const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 consultas por 15 minutos
  message: { erro: "Muitas consultas de status. Tente novamente em alguns minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});