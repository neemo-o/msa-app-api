// Imports
import { Router, Request, Response } from "express";
import { authMiddleware as auth } from "../middleware/auth";
import { AuthRequest } from "../types";
import { PrismaClient, UserRole } from "@prisma/client";
import { AuthService } from "../service/authService";
import { validate, createUserValidation, updateUserValidation } from '../validations';
import { catchAsync } from '../middleware/errorHandler';
import {
  USER_ROLES,
  USER_PHASES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  PAGINATION_DEFAULTS
} from '../utils/constants';

// Configuration
const prisma = new PrismaClient();
const router = Router();


router.get('/:id', auth, catchAsync(async (req: AuthRequest, res: Response) => {
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    res.json({ user });
}));

router.get('/', auth, catchAsync(async (req: Request, res: Response) => {
    const { churchId, role, take, active, approved } = req.query;
    const where: any = {};

    // If active parameter is provided, filter by it; otherwise default to active users
    if (active !== undefined) {
        where.isActive = active === 'true';
    } else {
        where.isActive = true; // Default to active users for backward compatibility
    }

    // Filter by approved status if specified
    if (approved !== undefined) {
        where.isApproved = approved === 'true';
    }

    if (churchId) where.churchId = churchId;
    if (role) where.role = role;

    const limit = take ? Math.min(parseInt(take as string), PAGINATION_DEFAULTS.MAX_LIMIT) : PAGINATION_DEFAULTS.DEFAULT_LIMIT;

    const users = await prisma.user.findMany({
        where,
        take: limit,
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
}));

// Rota de teste removida - não necessária em produção




router.put("/:id", auth, validate(updateUserValidation), catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role, churchId, phase, status } = req.body;

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (password !== undefined && password.trim() !== "")
    updateData.password = await AuthService.hashPassword(password);

  if (role) {
    if (!Object.values(USER_ROLES).includes(role))
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.INVALID_ROLE });

    updateData.role = UserRole[role as keyof typeof UserRole];
  }

  if (churchId !== undefined) {
    updateData.churchId = churchId; // aceita null para remover vínculo
  }

  if (phase !== undefined) {
    if (!Object.values(USER_PHASES).includes(phase))
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.INVALID_PHASE });
    updateData.phase = phase;
  }

  if (status !== undefined) {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'];
    if (!validStatuses.includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Status inválido' });
    }
    updateData.status = status;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phase: true,
      churchId: true,
      status: true,
    },
  });

  res.json({ user, message: SUCCESS_MESSAGES.USER_UPDATED });
}));




router.delete('/:id', auth, catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    await prisma.user.delete({
        where: { id },
    });

    res.json({ message: SUCCESS_MESSAGES.USER_DELETED });
}));

router.patch('/:id/toggle-status', auth, catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const currentUser = await prisma.user.findUnique({
        where: { id },
        select: { isActive: true },
    });

    if (!currentUser) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
    }

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
        message: SUCCESS_MESSAGES.USER_STATUS_TOGGLED(newStatus)
    });
}));

router.post('/', auth, validate(createUserValidation), catchAsync(async (req: AuthRequest, res: Response) => {
    const { name, email, password, role, churchId, phase } = req.body;

    // Verificar se a igreja existe (exceto para administradores)
    if (role !== USER_ROLES.ADMINISTRADOR) {
        if (!churchId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.REQUIRED_FIELD('Igreja') });
        }

        const church = await prisma.church.findUnique({
            where: { id: churchId },
        });

        if (!church || !church.isActive) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.INVALID_CHURCH });
        }

        // Verificar se já existe um Encarregado nesta igreja
        if (role === USER_ROLES.ENCARREGADO) {
            const existingEnc = await prisma.user.findFirst({
                where: {
                    role: USER_ROLES.ENCARREGADO,
                    churchId: churchId,
                    isActive: true,
                },
            });

            if (existingEnc) {
                return res.status(HTTP_STATUS.CONFLICT).json({ error: ERROR_MESSAGES.ENCARREGADO_EXISTS });
            }
        }
    }

    // Verificar se usuário já existe
    const existingUser = await AuthService.findUserByEmail(email);

    if (existingUser) {
        return res.status(HTTP_STATUS.CONFLICT).json({ error: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS });
    }

    // Usar AuthService.createUser para manter consistência
    const user = await AuthService.createUser({
        name,
        email,
        password,
        role: role === USER_ROLES.ADMINISTRADOR ? UserRole.ADMINISTRADOR :
              role === USER_ROLES.INSTRUTOR ? UserRole.INSTRUTOR :
              role === USER_ROLES.ENCARREGADO ? UserRole.ENCARREGADO :
              UserRole.APRENDIZ,
        churchId: role !== USER_ROLES.ADMINISTRADOR ? churchId : undefined,
        isApproved: role === USER_ROLES.ADMINISTRADOR,
        phase: role === USER_ROLES.APRENDIZ ? (phase || USER_PHASES.PHASE_1) : undefined,
    });

    res.status(HTTP_STATUS.CREATED).json({ user, message: SUCCESS_MESSAGES.USER_CREATED });
}));

export default router;
