// Imports
import { Router, Request, Response } from "express";
import { authMiddleware as auth } from "../middleware/auth";
import { AuthRequest } from "../types";
import { PrismaClient, UserRole } from "@prisma/client";
import { AuthService } from "../service/authService";

// Configuration
const prisma = new PrismaClient();
const router = Router();


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
                church: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
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

// Routes
router.get('/', auth, async (req: Request, res: Response) => {
    try {
        const { churchId, role, take, active } = req.query;
        const where: any = {};

        // If active parameter is provided, filter by it; otherwise default to active users
        if (active !== undefined) {
            where.isActive = active === 'true';
        } else {
            where.isActive = true; // Default to active users for backward compatibility
        }

         if (churchId) where.churchId = churchId;
         if (role) where.role = role;

         const users = await prisma.user.findMany({
           where,
           take: take ? parseInt(take as string) : undefined,
           orderBy: { createdAt: 'desc' },
           select: {
             id: true,
             name: true,
             email: true,
             role: true,
             avatar: true,
             isActive: true,
             churchId: true,
             phase: true,
             church: {
               select: {
                 id: true,
                 name: true,
               }
             }
           },
         });

         res.json({ users });
    } catch (error) {
        console.log("Erro ao buscar usuários:", error);
        res.status(500).json({ error: "Erro ao buscar usuários" });
    }
});

// Rota de teste
router.get("/test", async (req: AuthRequest, res: Response) => {
  console.log("Rota de teste chamada");
  console.log("User:", req.user);
  res.json({ message: "Rota de teste funcionando", user: req.user });
});




// Atualizar usuário
router.put("/:id", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, churchId, phase } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (password !== undefined && password.trim() !== "")
      updateData.password = await AuthService.hashPassword(password);

    if (role) {
      const validRoles = [
        "ADMINISTRADOR",
        "INSTRUTOR",
        "ENCARREGADO",
        "APRENDIZ",
      ];
      if (!validRoles.includes(role))
        return res.status(400).json({ error: "Função inválida" });

      updateData.role = UserRole[role as keyof typeof UserRole];
    }

    if (churchId !== undefined) {
      updateData.churchId = churchId; // aceita null para remover vínculo
    }

    if (phase !== undefined) updateData.phase = phase || "1";

    console.log("Atualizando usuário:", { id, updateData });

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phase: true,
        churchId: true, // em vez de tentar usar select dentro de church
      },
    });

    res.json({ user });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});




// Deletar usuário
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.user.delete({
            where: { id },
        });

        res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
        console.log("Erro ao deletar usuário:", error);
        res.status(500).json({ error: "Erro ao deletar usuário" });
    }
});

// Alternar status ativo/inativo do usuário
router.patch('/:id/toggle-status', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Primeiro, buscar o usuário atual para saber o status
        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: { isActive: true },
        });

        if (!currentUser) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Alternar o status
        const newStatus = !currentUser.isActive;

        const user = await prisma.user.update({
            where: { id },
            data: { isActive: newStatus },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                churchId: true,
                phase: true,
            },
        });

        res.json({
            user,
            message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`
        });
    } catch (error) {
        console.log("Erro ao alternar status do usuário:", error);
        res.status(500).json({ error: "Erro ao alternar status do usuário" });
    }
});

// Criar usuário
router.post('/', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, password, role, churchId, phase } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
        }

        // Verificar se a igreja existe (exceto para administradores)
        if (role !== 'ADMINISTRADOR') {
            if (!churchId) {
                return res.status(400).json({ error: 'Igreja é obrigatória' });
            }

            const church = await prisma.church.findUnique({
                where: { id: churchId },
            });

            if (!church || !church.isActive) {
                return res.status(400).json({ error: 'Igreja inválida' });
            }

            // Verificar se já existe um Encarregado nesta igreja
            if (role === 'ENCARREGADO') {
                const existingEnc = await prisma.user.findFirst({
                    where: {
                        role: UserRole.ENCARREGADO,
                        churchId: churchId,
                        isActive: true,
                    },
                });

                if (existingEnc) {
                    return res.status(409).json({ error: 'Já existe um Encarregado nesta igreja' });
                }
            }
        }

        // Verificar se usuário já existe
        const existingUser = await AuthService.findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({ error: 'Email já cadastrado' });
        }

        // Usar AuthService.createUser para manter consistência
        const user = await AuthService.createUser({
            name,
            email,
            password,
            role: role === 'ADMINISTRADOR' ? UserRole.ADMINISTRADOR :
                  role === 'INSTRUTOR' ? UserRole.INSTRUTOR :
                  role === 'ENCARREGADO' ? UserRole.ENCARREGADO :
                  UserRole.APRENDIZ,
            churchId: role !== 'ADMINISTRADOR' ? churchId : undefined,
            isApproved: role === 'ADMINISTRADOR',
            phase: role === 'APRENDIZ' ? (phase || "1") : undefined,
        });

        res.status(201).json({ user });
    } catch (error) {
        console.log("Erro ao criar usuário:", error);
        res.status(500).json({ error: "Erro ao criar usuário" });
    }
});

export default router;
