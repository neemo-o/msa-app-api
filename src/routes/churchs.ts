import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = Router();

// Listar todas as igrejas (apenas ativas)
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
