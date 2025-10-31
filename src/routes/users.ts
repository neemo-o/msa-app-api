// Imports
import { Router, Request, Response } from "express";
import { authMiddleware as auth } from "../middleware/auth";
import { AuthRequest } from "../types";
import { PrismaClient, UserRole } from "@prisma/client";
import { AuthService } from "../service/authService";

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


// Atualizar usuário
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, password, role, churchId, phase } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password) updateData.password = await AuthService.hashPassword(password);
        if (role) updateData.role = role;
        if (churchId !== undefined) updateData.churchId = churchId;
        if (phase !== undefined) updateData.phase = phase;

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                churchId: true,
                phase: true,
            },
        });

        res.json({ user });
    } catch (error) {
        console.log("Erro ao atualizar usuário:", error);
        res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
});

// Deletar usuário
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });

        res.json({ message: "Usuário desativado com sucesso" });
    } catch (error) {
        console.log("Erro ao deletar usuário:", error);
        res.status(500).json({ error: "Erro ao deletar usuário" });
    }
});

// Criar usuário
router.post('/', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, password, role, churchId, phase } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
        }

        // Verificar se email já existe
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({ error: "Email já cadastrado" });
        }

        // Validações baseadas no role
        if (role !== 'ADMINISTRADOR' && !churchId) {
            return res.status(400).json({ error: "Igreja é obrigatória para este tipo de usuário" });
        }

        if (role === 'APRENDIZ' && !phase) {
            return res.status(400).json({ error: "Fase é obrigatória para aprendizes" });
        }

        const hashedPassword = await AuthService.hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                churchId: churchId || null,
                phase: phase || null,
                isApproved: role === 'ADMINISTRADOR' ? true : false,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                churchId: true,
                phase: true,
            },
        });

        res.status(201).json({ user });
    } catch (error) {
        console.log("Erro ao criar usuário:", error);
        res.status(500).json({ error: "Erro ao criar usuário" });
    }
});

// Obter usuário por ID
router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id, isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                churchId: true,
                phase: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.json({ user });
    } catch (error) {
        console.log("Erro ao buscar usuário:", error);
        res.status(500).json({ error: "Erro ao buscar usuário" });
    }
});

export default router;
