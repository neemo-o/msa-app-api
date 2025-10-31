// Imports
import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';

// Routes
import userRoutes from "./routes/users";

// Configuration
dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;



// API
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use("/api/users", userRoutes);

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