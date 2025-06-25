import jwt from "jsonwebtoken";

export function autenticar(req, res, next) {
  const SECRET_KEY = process.env.JWT_SECRET;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn("Token ausente ou formato inválido");
    return res.status(401).json({ erro: "Token ausente ou inválido" });
  }

  const token = authHeader.split(" ")[1];

  if (!token || token.length < 10) {
    console.warn("Token inválido recebido");
    return res.status(401).json({ erro: "Token inválido" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Verificar se o token não é muito antigo (opcional)
    const tokenAge = Date.now() - (decoded.timestamp || 0);
    const maxAge = 12 * 60 * 60 * 1000; // 12 horas
    
    if (tokenAge > maxAge) {
      console.warn("Token expirado por idade");
      return res.status(403).json({ erro: "Token expirado" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Erro ao verificar token:", err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ erro: "Token expirado" });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ erro: "Token inválido" });
    } else {
      return res.status(403).json({ erro: "Falha na autenticação" });
    }
  }
}