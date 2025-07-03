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

// rotas
import pedidoRoutes from "./routes/pedidoRoutes.js";
import { loginLimiter, pedidoLimiter, globalLimiter, adminLimiter } from "./middlewares/rateLimit.js";

dotenv.config();
console.log("Token carregado:", process.env.ASAAS_ACCESS_TOKEN?.slice(0, 10) + "...");

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
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET;
const DB_FILE = path.join(__dirname, "pedidos.json");

const ASAAS_ACCESS_TOKEN = process.env.ASAAS_ACCESS_TOKEN;
const ASAAS_API = "https://api-sandbox.asaas.com/";

app.use(cors({
  origin: ["https://papudim.netlify.app", "http://localhost:5173"],
  credentials: true,
}));


app.use(express.json({ limit: "200kb" }));
app.use(helmet());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, "[]");
}

const tentativasLogin = {};
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTAS = 10;

// login admin com rate limit
app.post("/api/login", loginLimiter, (req, res) => {
  const ip = req.ip;
  tentativasLogin[ip] = tentativasLogin[ip] || { count: 0, bloqueadoAte: null };

  if (tentativasLogin[ip].bloqueadoAte && Date.now() < tentativasLogin[ip].bloqueadoAte) {
    return res.status(429).json({ erro: "Muitas tentativas. Tente novamente mais tarde." });
  }

  const { senha } = req.body;
  if (senha === process.env.ADMIN_PASSWORD) {
    tentativasLogin[ip] = { count: 0, bloqueadoAte: null };
    const token = jwt.sign({ admin: true }, SECRET_KEY, { expiresIn: "12h" });
    return res.json({ token });
  }

  tentativasLogin[ip].count++;
  if (tentativasLogin[ip].count >= MAX_TENTATIVAS) {
    tentativasLogin[ip].bloqueadoAte = Date.now() + BLOQUEIO_MINUTAS * 60 * 1000;
  }
  return res.status(401).json({ erro: "Senha incorreta" });
});

app.locals.pedidosCollection = pedidosCollection;
app.locals.ASAAS_API = ASAAS_API;
app.locals.ASAAS_ACCESS_TOKEN = ASAAS_ACCESS_TOKEN;

app.use("/api", pedidoRoutes);

app.listen(PORT, () => {
  console.log(`Papudim backend rodando em http://localhost:${PORT}`);
});
