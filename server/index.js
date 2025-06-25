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
import rateLimit from "express-rate-limit";

// rotas
import pedidoRoutes from "./routes/pedidoRoutes.js";
import { loginLimiter, pedidoLimiter, globalLimiter, adminLimiter } from "./middlewares/rateLimit.js";
import { SECURITY_CONFIG, validateSecurityConfig } from "./config/security.js";

dotenv.config();

// Validar configurações de segurança no startup
try {
  validateSecurityConfig();
} catch (error) {
  console.error('❌ Erro de configuração:', error.message);
  process.exit(1);
}

// Validar variáveis de ambiente críticas
const requiredEnvVars = [
  'JWT_SECRET', 
  'access_token', 
  'FIREBASE_CONFIG_JSON',
  'CALLMEBOT_NUMERO',
  'CALLMEBOT_APIKEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Variável de ambiente obrigatória ausente: ${envVar}`);
    process.exit(1);
  }
});

// Não logar tokens completos em produção
if (process.env.NODE_ENV !== 'production') {
  console.log("Token carregado:", process.env.access_token?.slice(0, 10) + "...");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const pedidosCollection = db.collection("pedidos");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;

const access_token = process.env.access_token;
const ASAAS_API = process.env.NODE_ENV === 'production' 
  ? "https://api.asaas.com/" 
  : "https://api-sandbox.asaas.com/";

// CORS mais restritivo
const allowedOrigins = [
  "https://papudim.netlify.app",
  "https://papudim.com"
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push("http://localhost:5173");
  allowedOrigins.push("http://localhost:3000");
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
}));


app.use(express.json({ limit: "200kb" }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));
app.use(globalLimiter);
app.use((req, res, next) => {
  // Log mais seguro sem dados sensíveis
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.slice(0, 100) // Limitar tamanho
  };
  console.log(JSON.stringify(logData));
  next();
});

// Rate limiter específico para login
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const tentativasLogin = new Map();
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTAS = 15;

// login admin com melhor segurança
app.post("/api/login", loginRateLimit, (req, res) => {
  const ip = req.ip;
  const { senha } = req.body;

  if (!senha || typeof senha !== 'string') {
    return res.status(400).json({ erro: "Senha é obrigatória" });
  }

  const agora = Date.now();
  const tentativa = tentativasLogin.get(ip) || { count: 0, bloqueadoAte: null };

  if (tentativa.bloqueadoAte && agora < tentativa.bloqueadoAte) {
    const minutosRestantes = Math.ceil((tentativa.bloqueadoAte - agora) / (60 * 1000));
    return res.status(429).json({ 
      erro: `IP bloqueado. Tente novamente em ${minutosRestantes} minutos.` 
    });
  }

  // Verificar senha - use hash em produção
  const senhaCorreta = process.env.ADMIN_PASSWORD;
  if (senha === senhaCorreta) {
    tentativasLogin.delete(ip);
    const token = jwt.sign(
      { admin: true, ip, timestamp: agora }, 
      SECRET_KEY, 
      { expiresIn: "8h" }
    );
    return res.json({ token });
  }

  // Senha incorreta
  tentativa.count++;
  if (tentativa.count >= MAX_TENTATIVAS) {
    tentativa.bloqueadoAte = agora + BLOQUEIO_MINUTAS * 60 * 1000;
  }
  tentativasLogin.set(ip, tentativa);

  return res.status(401).json({ erro: "Credenciais inválidas" });
});

app.locals.pedidosCollection = pedidosCollection;
app.locals.ASAAS_API = ASAAS_API;

app.use("/api", pedidoRoutes);

app.listen(PORT, () => {
  console.log(`Papudim backend rodando em http://localhost:${PORT}`);
});
