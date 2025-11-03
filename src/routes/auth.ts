// Imports
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../service/authService';
import { UserRole } from '../types';
import { PrismaClient } from '@prisma/client';
import { validate, loginValidation, registerValidation } from '../validations';
import { catchAsync } from '../middleware/errorHandler';
import { USER_ROLES, REQUEST_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, HTTP_STATUS } from '../utils/constants';

// Configuration
const prisma = new PrismaClient();
const router = Router();

router.post('/login', validate(loginValidation), catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await AuthService.findUserByEmail(email);

  if (!user || !user.isActive) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
  }

  const isPasswordValid = await AuthService.verifyPassword(password, user.password);

  if (!isPasswordValid) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
  }

  if (!user.isApproved) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.USER_NOT_APPROVED });
  }

  const token = AuthService.generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      church: user.church,
      phase: user.phase,
      isApproved: user.isApproved,
    },
  });
}));

router.post('/register', validate(registerValidation), catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, role, churchId } = req.body;

  // Verificar se a igreja existe
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

  // Verificar se usuário já existe
  const existingUser = await AuthService.findUserByEmail(email);

  if (existingUser) {
    return res.status(HTTP_STATUS.CONFLICT).json({ error: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS });
  }

  const user = await AuthService.createUser({
    name,
    email,
    password,
    role: role || USER_ROLES.APRENDIZ,
    churchId: undefined,
    isApproved: false,
    phase: "1",
  });

  // Encontrar professor da igreja
  const professor = await prisma.user.findFirst({
    where: { role: USER_ROLES.ENCARREGADO, churchId: churchId },
  });

  // Criar solicitação de entrada
  await prisma.entryRequest.create({
    data: {
      userId: user.id,
      churchId,
      professorId: professor?.id,
      status: REQUEST_STATUS.EM_ANALISE,
    },
  });

  res.status(HTTP_STATUS.CREATED).json({
    message: SUCCESS_MESSAGES.REGISTER_SUCCESS,
    user,
  });
}));

router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.TOKEN_NOT_PROVIDED });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
    }

    const decoded = AuthService.verifyToken(token);

    const user = await AuthService.findUserById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.TOKEN_EXPIRED });
    }
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
  }
});

export default router;
