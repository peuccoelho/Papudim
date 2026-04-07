import jwt from "jsonwebtoken";

export function autenticar(req, res, next) {
  const SECRET_KEY = process.env.JWT_SECRET;
  const authHeader = req.headers.authorization;
  console.log("Authorization header recebido:", authHeader);

  if (!authHeader) {
    console.warn("Token ausente");
    return res.status(401).json({ erro: "Token ausente" });
  }

  const token = authHeader.split(" ")[1]; // log do token para debug
  console.log("Token recebido:", token);

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log("Token decodificado:", decoded);
    next();
  } catch (err) {
    console.error("Erro ao verificar token:", err);
    res.status(403).json({ erro: "Token inválido ou expirado" });
  }
}