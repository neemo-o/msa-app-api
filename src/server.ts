// Imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from "./middleware/auth";
import { errorHandler, handleUnhandledRejections } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import rateLimit from 'express-rate-limit';

// Routes
import userRoutes from "./routes/users";
import churchRoutes from "./routes/churchs";
import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/uploads";
import docsRoutes from "./routes/docs";
import logsRoutes from "./routes/logs";
import entryRequestRoutes from "./routes/entry-requests";

// Configuration
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const app = express();
const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});
const PORT = process.env.PORT;

const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'unsafe-inline'"],
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
    // Check basic database connection
    await prisma.$queryRaw`SELECT 1`;

    // Test model queries with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    );

    await Promise.race([
      Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.church.count({ where: { isActive: true } }),
        prisma.entryRequest.count({ where: { status: "EM_ANALISE" } })
      ]),
      timeoutPromise
    ]);

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
    logger.error("Health check failed", "HEALTH_CHECK", {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Database connection or query failed"
    });
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Aumentado para 1000 requests por 15 minutos
  message: {
    error: 'Muitas requisições deste IP, tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.set("trust proxy", 1);
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
app.use("/api/logs", logsRoutes);
app.use("/api/entry-requests", authMiddleware, entryRequestRoutes);

// Rota de teste sem middleware
app.get("/api/test", (req, res) => {
  res.json({ message: "Servidor funcionando", timestamp: new Date().toISOString() });
});

// Global error handler (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
handleUnhandledRejections();

// Application
async function connectWithRetry(maxRetries = 5, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      logger.info("Conectado ao banco de dados", "DATABASE");
      return;
    } catch (error) {
      logger.warn(`Tentativa ${attempt}/${maxRetries} de conexão ao banco falhou`, "DATABASE", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (attempt === maxRetries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function startServer() {
  try {
    await connectWithRetry();
    logger.info("Conectado ao banco de dados", "DATABASE");

    // @ts-ignore
    app.listen(PORT, '127.0.0.1', () => {
      logger.info(`Servidor conectado e rodando na porta ${PORT}`, "SERVER", {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logger.error("Erro ao conectar ao banco de dados após todas as tentativas", "DATABASE", {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

startServer();

process.on("SIGTERM", async () => {
  logger.info("Recebido SIGTERM, encerrando servidor", "SHUTDOWN");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Recebido SIGINT, encerrando servidor", "SHUTDOWN");
  await prisma.$disconnect();
  process.exit(0);
});
