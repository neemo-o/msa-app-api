import { Router, Request, Response } from "express";
import { authMiddleware, requireRole } from "../middleware/auth";
import { UserRole } from "@prisma/client";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requireRole([UserRole.ADMINISTRADOR]),
  async (req: Request, res: Response) => {
    try {
      const logFile = path.join(__dirname, "../../logs/app.log");

      if (!fs.existsSync(logFile)) {
        return res.json({ logs: [] });
      }

      const content = fs.readFileSync(logFile, "utf8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      const logs = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((log) => log !== null)
        .reverse()
        .slice(0, 1000);

      res.json({ logs });
    } catch (error) {
      console.error("Erro ao ler logs:", error);
      res.status(500).json({ error: "Erro ao ler logs" });
    }
  }
);

router.get(
  "/stats",
  authMiddleware,
  requireRole([UserRole.ADMINISTRADOR]),
  async (req: Request, res: Response) => {
    try {
      const stats = logger.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      res.status(500).json({ error: "Erro ao obter estatísticas" });
    }
  }
);

router.post(
  "/clear",
  authMiddleware,
  requireRole([UserRole.ADMINISTRADOR]),
  async (req: Request, res: Response) => {
    try {
      logger.clearLogs();
      res.json({ message: "Logs limpos com sucesso" });
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
      res.status(500).json({ error: "Erro ao limpar logs" });
    }
  }
);

export default router;
