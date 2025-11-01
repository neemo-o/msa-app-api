import { Router, Request, Response } from "express";
import { PrismaClient, UserRole } from "@prisma/client";
import { AuthRequest } from "../types";

const prisma = new PrismaClient();
const router = Router();

// Middleware para verificar permissões
const requireEntryRequestAccess = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = req.user!;

    // Permitir acesso para administradores e encarregados
    if (user.role !== UserRole.ENCARREGADO && user.role !== UserRole.ADMINISTRADOR) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    next();
  } catch (error) {
    console.error("Erro no middleware de permissões:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// GET /api/entry-requests - Listar solicitações
router.get("/", requireEntryRequestAccess, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let whereCondition: any = {
      status: "EM_ANALISE",
    };

    // Se for encarregado, filtrar apenas pela igreja dele
    if (user.role === UserRole.ENCARREGADO) {
      whereCondition.churchId = user.churchId;
    }
    // Se for administrador, mostrar todas as solicitações

    const requests = await prisma.entryRequest.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        church: {
          select: {
            id: true,
            name: true,
          },
        },
        professor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ requests });
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/entry-requests/:id/approve - Aprovar solicitação
router.post("/:id/approve", requireEntryRequestAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const request = await prisma.entryRequest.findUnique({
      where: { id },
      include: { church: true, user: true },
    });

    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada" });
    }

    // Verificar permissões
    if (user.role === UserRole.ENCARREGADO && request.churchId !== user.churchId) {
      return res.status(403).json({ error: "Acesso negado a esta solicitação" });
    }

    // Aprovar solicitação
    await prisma.entryRequest.update({
      where: { id },
      data: { status: "APROVADO" },
    });

    // Atualizar usuário
    await prisma.user.update({
      where: { id: request.userId },
      data: {
        isApproved: true,
        churchId: request.churchId,
      },
    });

    res.json({
      message: "Solicitação aprovada com sucesso",
      request: {
        id: request.id,
        user: request.user.name,
        church: request.church?.name
      }
    });
  } catch (error) {
    console.error("Erro ao aprovar solicitação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/entry-requests - Criar nova solicitação (para usuários se registrarem)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, churchId, professorId } = req.body;

    if (!userId || !churchId) {
      return res.status(400).json({ error: "userId e churchId são obrigatórios" });
    }

    // Verificar se já existe uma solicitação pendente para este usuário
    const existingRequest = await prisma.entryRequest.findFirst({
      where: {
        userId,
        status: "EM_ANALISE"
      }
    });

    if (existingRequest) {
      return res.status(409).json({ error: "Já existe uma solicitação pendente para este usuário" });
    }

    const request = await prisma.entryRequest.create({
      data: {
        userId,
        churchId,
        professorId,
        status: "EM_ANALISE",
      },
      include: {
        user: { select: { name: true, email: true } },
        church: { select: { name: true } }
      }
    });

    res.status(201).json({
      message: "Solicitação criada com sucesso",
      request
    });
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
