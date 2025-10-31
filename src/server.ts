// Imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from "./middleware/auth";
import { errorHandler, handleUnhandledRejections } from "./middleware/errorHandler";
import rateLimit from 'express-rate-limit';

// Routes
import userRoutes from "./routes/users";
import churchRoutes from "./routes/churchs";
import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/uploads";
import docsRoutes from "./routes/docs";

// Configuration
dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT;

const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS: Origin not allowed"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/debug-cors", (req, res) => {
  res.json({
    origin: req.headers.origin,
    host: req.headers.host,
    ip: req.ip,
    allowedOrigins: allowedOrigins,
    corsWorking: allowedOrigins.includes(req.headers.origin || ""),
  });
});


app.use("/health", async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      database: {
        status: "connected",
        type: "postgresql"
      },
      version: process.env.npm_package_version || "1.0.0"
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Database connection failed"
    });
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Muitas requisições deste IP, tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Servir arquivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// API
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/churchs", churchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/docs", docsRoutes);

// Global error handler (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
handleUnhandledRejections();

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
