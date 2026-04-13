import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Middleware para proteger páginas admin
 * Verifica o token JWT antes de servir a página
 */
export function protegerPaginaAdmin(req, res, next) {
  const SECRET_KEY = process.env.JWT_SECRET;
  const cookieName = process.env.JWT_COOKIE_NAME || "adminToken";

  let token = null;

  // Buscar token no cookie 
  if (req.cookies && req.cookies[cookieName]) {
    token = req.cookies[cookieName];
  }

  if (!token) {
    // Redirecionar para login se não autenticado
    return res.redirect("/admin-login.html");
  }

  try {
    jwt.verify(token, SECRET_KEY);
    // Token válido, prosseguir
    next();
  } catch (err) {
    // Token inválido ou expirado
    console.warn("[ADMIN PAGE] Token inválido:", err.message);
    // Limpar cookie inválido
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
    return res.redirect("/admin-login.html");
  }
}

/**
 * Rota para verificar autenticação (usada pelo frontend)
 */
export function verificarAutenticacao(req, res) {
  const SECRET_KEY = process.env.JWT_SECRET;
  const cookieName = process.env.JWT_COOKIE_NAME || "adminToken";

  let token = null;

  if (req.cookies && req.cookies[cookieName]) {
    token = req.cookies[cookieName];
  }

  if (!token) {
    return res.status(401).json({ autenticado: false, erro: "Token ausente" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return res.json({ 
      autenticado: true, 
      expiraEm: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null 
    });
  } catch (err) {
    return res.status(401).json({ autenticado: false, erro: "Token inválido ou expirado" });
  }
}
