// Imports
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, requireRole } from "../middleware/auth";
import { UserRole } from "@prisma/client";

// Configuration
const prisma = new PrismaClient();
const router = Router();

// Listar igrejas
router.get("/", async (req: Request, res: Response) => {
  try {
    const churches = await prisma.church.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({ churches });
  } catch (error) {
    console.error("Erro ao listar igrejas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Criar igreja (apenas administradores)
router.post("/", authMiddleware, requireRole([UserRole.ADMINISTRADOR]), async (req: Request, res: Response) => {
  try {
    const { name, description, address, phone, email } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Nome da igreja é obrigatório" });
    }

    const church = await prisma.church.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    res.status(201).json({ church });
  } catch (error) {
    console.error("Erro ao criar igreja:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Obter igreja por ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const church = await prisma.church.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        email: true,
      },
    });

    if (!church) {
      return res.status(404).json({ error: "Igreja não encontrada" });
    }

    res.json({ church });
  } catch (error) {
    console.error("Erro ao obter igreja:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});


export default router;
