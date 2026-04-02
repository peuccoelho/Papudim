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
import cookieParser from "cookie-parser";

// função para manter o servidor acordado
function manterServidorAcordado() {
  const url = process.env.PING_URL || "https://homepudimback.onrender.com/";
  setInterval(() => { // ping mara manter o servidor acordado - pode ser desativado se necessario via variavel de ambiente
    fetch(url)
      .then(res => console.log(`[PING] Servidor pingado: ${url} - Status: ${res.status}`))
      .catch(err => console.error(`[PING] Erro ao pingar servidor:`, err));
  }, 5 * 60 * 1000); 
}

if (process.env.KEEP_AWAKE !== "false") {  // permite desativar o ping se necessario
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

admin.initializeApp({ // inicialização do firebase admin com configuração do serviço - certifique-se de que a variavel de ambiente esteja corretamente configurada com o JSON do serviço
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const pedidosCollection = db.collection("pedidos");

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

app.use(cors({ // configuração de CORS para permitir apenas os dominios autorizados - ajuste conforme necessario para produção
  origin: ["https://papudim.netlify.app", "https://papudim.tech", "https://www.papudim.tech", "http://localhost:5173"],
  credentials: true,
}));


app.use(express.json({ limit: "200kb" }));
app.use(helmet());
app.use(cookieParser());
app.use((req, res, next) => { // middleware de logging simples para monitorar requisições
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, "[]");
}

// Login admin com rate limit (5 tentativas por 15 min via express-rate-limit)
app.post("/api/login", loginLimiter, (req, res) => {
  try {
    const { senha } = req.body;
    if (!senha) {// validação basica para garantir que a senha foi fornecida
      return res.status(400).json({ erro: "Senha é obrigatória" });
    }

    if (senha === process.env.ADMIN_PASSWORD) {
      // Gerar JWT
      const expiresIn = Number(process.env.JWT_EXPIRES_SECONDS) || 43200; // 12h padrão
      const token = jwt.sign({ admin: true }, SECRET_KEY, { expiresIn });

      // Setar cookie HttpOnly
      const cookieName = process.env.JWT_COOKIE_NAME || "adminToken";
      res.cookie(cookieName, token, { // opções de segurança para cookie de autenticação
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: expiresIn * 1000,
      });

      return res.json({ ok: true });
    }

    return res.status(401).json({ erro: "Senha incorreta" });
  } catch (err) { // captura de erros inesperados para evitar crash do servidor
    console.error("[LOGIN] Erro:", err);
    return res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Endpoint de logout (limpar cookie)
app.post("/api/logout", (req, res) => {
  const cookieName = process.env.JWT_COOKIE_NAME || "adminToken";
  res.clearCookie(cookieName, { //opções de segurança para cookie de logout
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
app.get("/", (req, res) => {// respota simples para verificar se o servidor está rodando
  res.json({ status: "ok", message: "Papudim API rodando!", timestamp: new Date().toISOString() });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// endpoint para testar webhook manualmente
app.post("/api/test-webhook", (req, res) => { // endpoint de teste para verificar recebimento de webhooks
  console.log("este webhook recebido:", JSON.stringify(req.body, null, 2));
  res.json({ success: true, body: req.body });
});

app.listen(PORT, () => {
  console.log(`Papudim backend rodando em http://localhost:${PORT}`);
});
