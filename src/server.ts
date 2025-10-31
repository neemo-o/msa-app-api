// Imports
import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from "./middleware/auth";

// Routes
import userRoutes from "./routes/users";
import churchRoutes from "./routes/churchs";
import authRoutes from "./routes/auth";

// Configuration
dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT;

const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições de ferramentas locais (sem origem)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS: Origin not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static('public'));

// API
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/churchs", churchRoutes);
app.use("/api/auth", authRoutes);

// Applcation
async function startServer() {
  try {
    await prisma.$connect();
    console.log("Conectado ao banco de dados");

    app.listen(PORT, () => {
      console.log(`Servidor conectado e rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGTERM", async () => {
  console.log("Recebido SIGTERM, encerrando...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Recebido SIGINT, encerrando...");
  await prisma.$disconnect();
  process.exit(0);
});
