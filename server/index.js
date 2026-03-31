import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import admin from "firebase-admin";
import helmet from "helmet";
import Redis from "ioredis";
import cookieParser from "cookie-parser";

// função para manter o servidor acordado
function manterServidorAcordado() {
  const url = process.env.PING_URL || "https://homepudimback.onrender.com/";
  setInterval(() => {
    fetch(url)
      .then(res => console.log(`[PING] Servidor pingado: ${url} - Status: ${res.status}`))
      .catch(err => console.error(`[PING] Erro ao pingar servidor:`, err));
  }, 5 * 60 * 1000); 
}

if (process.env.KEEP_AWAKE !== "false") {
  manterServidorAcordado();
}

// rotas
import pedidoRoutes from "./routes/pedidoRoutes.js";
import { loginLimiter, pedidoLimiter, globalLimiter, adminLimiter } from "./middlewares/rateLimit.js";
// ASAAS DESATIVADO - consulte REATIVAR_ASAAS.md para reativar
// import { configurarWebhookAsaas } from "./services/asaasService.js";

dotenv.config();
// ASAAS DESATIVADO
// console.log("Token carregado:", process.env.ASAAS_ACCESS_TOKEN?.slice(0, 10) + "...");

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const pedidosCollection = db.collection("pedidos");

// Conexão Redis para controle de tentativas de login
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
redis.on("error", (err) => console.error("[REDIS] Erro de conexão:", err));
redis.on("connect", () => console.log("[REDIS] Conectado com sucesso"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET;
const DB_FILE = path.join(__dirname, "pedidos.json");

// ASAAS DESATIVADO - consulte REATIVAR_ASAAS.md para reativar
// const ASAAS_ACCESS_TOKEN = process.env.ASAAS_ACCESS_TOKEN;
// const ASAAS_API = "https://api-sandbox.asaas.com/";
// configurarWebhookAsaas(ASAAS_API, ASAAS_ACCESS_TOKEN);

app.use(cors({
  origin: ["https://papudim.netlify.app", "https://papudim.tech", "https://www.papudim.tech", "http://localhost:5173"],
  credentials: true,
}));


app.use(express.json({ limit: "200kb" }));
app.use(helmet());
app.use(cookieParser());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, "[]");
}

// Constantes para controle de tentativas via Redis
const MAX_TENTATIVAS = 5;
const BLOQUEIO_SEGUNDOS = 10 * 60; // 10 minutos
const JANELA_TENTATIVAS_SEGUNDOS = 15 * 60; // 15 minutos

// Login admin com rate limit e Redis
app.post("/api/login", loginLimiter, async (req, res) => {
  const ip = req.ip;
  const redisAttemptsKey = `login:attempts:${ip}`;
  const redisBlockKey = `login:block:${ip}`;

  try {
    // Verificar se IP está bloqueado
    const isBlocked = await redis.get(redisBlockKey);
    if (isBlocked) {
      return res.status(429).json({ erro: "Bloqueado temporariamente. Tente novamente mais tarde." });
    }

    const { senha } = req.body;
    if (!senha) {
      return res.status(400).json({ erro: "Senha é obrigatória" });
    }

    if (senha === process.env.ADMIN_PASSWORD) {
      // Login bem-sucedido: resetar tentativas
      await redis.del(redisAttemptsKey);

      // Gerar JWT
      const expiresIn = Number(process.env.JWT_EXPIRES_SECONDS) || 43200; // 12h padrão
      const token = jwt.sign({ admin: true }, SECRET_KEY, { expiresIn });

      // Setar cookie HttpOnly
      const cookieName = process.env.JWT_COOKIE_NAME || "adminToken";
      res.cookie(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: expiresIn * 1000,
      });

      return res.json({ ok: true });
    }

    // Senha incorreta: incrementar contador de tentativas
    const attempts = await redis.incr(redisAttemptsKey);
    if (attempts === 1) {
      // Definir TTL apenas na primeira tentativa
      await redis.expire(redisAttemptsKey, JANELA_TENTATIVAS_SEGUNDOS);
    }

    if (attempts >= MAX_TENTATIVAS) {
      // Bloquear IP
      await redis.set(redisBlockKey, "1", "EX", BLOQUEIO_SEGUNDOS);
      await redis.del(redisAttemptsKey);
      return res.status(429).json({ erro: "Muitas tentativas. Bloqueado temporariamente." });
    }

    return res.status(401).json({ erro: "Senha incorreta" });
  } catch (err) {
    console.error("[LOGIN] Erro:", err);
    return res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Endpoint de logout (limpar cookie)
app.post("/api/logout", (req, res) => {
  const cookieName = process.env.JWT_COOKIE_NAME || "adminToken";
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  return res.json({ ok: true });
});

app.locals.pedidosCollection = pedidosCollection;
// ASAAS DESATIVADO
// app.locals.ASAAS_API = ASAAS_API;
// app.locals.ASAAS_ACCESS_TOKEN = ASAAS_ACCESS_TOKEN;

app.use("/api", pedidoRoutes);

// Rota de health check para manter servidor acordado
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Papudim API rodando!", timestamp: new Date().toISOString() });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// endpoint para testar webhook manualmente
app.post("/api/test-webhook", (req, res) => {
  console.log("este webhook recebido:", JSON.stringify(req.body, null, 2));
  res.json({ success: true, body: req.body });
});

app.listen(PORT, () => {
  console.log(`Papudim backend rodando em http://localhost:${PORT}`);
});
