import { Router, Request, Response } from 'express';
import { NotificationService } from '../service/notificationService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { catchAsync } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../utils/constants';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// POST /api/notifications/push - Enviar notificação push (sistema interno)
router.post('/push', requireRole([UserRole.ADMINISTRADOR, UserRole.ENCARREGADO, UserRole.INSTRUTOR]), catchAsync(async (req: Request, res: Response) => {
  const { userId, title, message, type } = req.body;

  // Validações
  if (!userId || !title || !message) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Campos obrigatórios: userId, title, message'
    });
  }

  if (typeof userId !== 'string' || typeof title !== 'string' || typeof message !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'userId, title e message devem ser strings'
    });
  }

  const result = await NotificationService.sendPushNotification(userId, title, message, type || 'general');

  res.json({
    message: 'Notificação enviada com sucesso',
    result
  });
}));

// POST /api/notifications/push/bulk - Enviar notificações para múltiplos usuários
router.post('/push/bulk', requireRole([UserRole.ADMINISTRADOR, UserRole.ENCARREGADO, UserRole.INSTRUTOR]), catchAsync(async (req: Request, res: Response) => {
  const { userIds, title, message, type } = req.body;

  // Validações
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'userIds deve ser um array não vazio'
    });
  }

  if (!title || !message) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Campos obrigatórios: title, message'
    });
  }

  const results = await NotificationService.sendPushNotifications(userIds, title, message, type || 'general');

  res.json({
    message: `Notificações enviadas para ${userIds.length} usuários`,
    results
  });
}));

export default router;
