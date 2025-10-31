// Imports
import { Router, Request, Response } from "express";
import { authMiddleware as auth } from "../middleware/auth";
import { AuthRequest } from "../types";
import { PrismaClient, UserRole } from "@prisma/client";

// Configuration
const prisma = new PrismaClient();
const router = Router();


// Routes
router.get('/', auth, async (req: Request, res: Response) => {
    try {
        const { churchId, role, take } = req.query;
        const where: any = { isActive: true };

         if (churchId) where.churchId = churchId;
         if (role) where.role = role;

         const users = await prisma.user.findMany({
           where,
           take: take ? parseInt(take as string) : undefined,
           select: {
             id: true,
             name: true,
             email: true,
             role: true,
             avatar: true,
             churchId: true,
             phase: true,
           },
         });

         res.json({ users });
    } catch (error) {
        console.log("Erro ao buscar usuários:", error);
        res.status(500).json({ error: "Erro ao buscar usuários" });
    }
});

router.get("/entry-requests", auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== UserRole.ENCARREGADO) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const requests = await prisma.entryRequest.findMany({
      where: {
        churchId: user.churchId as string,
        status: "EM_ANALISE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json({ requests });
  } catch (error) {
    console.error("Erro ao buscar solicitações de entrada:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Approve entry request
router.post(
  "/entry-requests/:id/approve",
  auth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      if (user.role !== UserRole.ENCARREGADO) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const request = await prisma.entryRequest.findUnique({
        where: { id },
        include: { church: true },
      });

      if (!request || request.churchId !== (user.churchId as string)) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }

      // Aprovar solicitação
      await prisma.entryRequest.update({
        where: { id },
        data: { status: "APROVADO" },
      });

      // Atualizar user
      await prisma.user.update({
        where: { id: request.userId },
        data: {
          isApproved: true,
          churchId: request.churchId,
        },
      });

      res.json({ message: "Solicitação aprovada" });
    } catch (error) {
      console.error("Erro ao aprovar solicitação:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);


export default router;