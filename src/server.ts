// Imports
import express from 'express';
import dotenv from "dotenv";

// Configuration
dotenv.config();

// Applcation
const app = express();
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Servidor conectado e rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    process.exit(1);
  }
}

startServer();