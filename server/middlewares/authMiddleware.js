import jwt from "jsonwebtoken";

export function autenticar(req, res, next) {
  const SECRET_KEY = process.env.JWT_SECRET;
  const cookieName = process.env.JWT_COOKIE_NAME || "adminToken";

  let token = null;

  // Prioridade: cookie HttpOnly > header Authorization
  if (req.cookies && req.cookies[cookieName]) {
    token = req.cookies[cookieName];
  } else if (req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    console.warn("[AUTH] Token ausente");
    return res.status(401).json({ erro: "Token ausente" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.admin = decoded;
    next();
  } catch (err) {
    console.error("[AUTH] Erro ao verificar token:", err.message);
    return res.status(403).json({ erro: "Token inválido ou expirado" });
  }
}