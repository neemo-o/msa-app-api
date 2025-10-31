// Imports
import { Router, Request, Response } from 'express';
import { AuthService } from '../service/authService';
import { UserRole } from '../types';
import { PrismaClient } from '@prisma/client';

// Configuration
const prisma = new PrismaClient();
const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await AuthService.findUserByEmail(email);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Email ou senha estão incorretas' });
    }

    const isPasswordValid = await AuthService.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email ou senha estão incorretas" });
    }

    if (!user.isApproved) {
      return res.status(401).json({ error: 'Sua solicitação ainda não foi aprovada. Aguarde a aprovação do professor.' });
    }

    const token = AuthService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login realizado com sucesso',
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
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registro
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, churchId } = req.body;

    if (!name || !email || !password || !churchId) {
      return res.status(400).json({ error: 'Nome, email, senha e igreja são obrigatórios' });
    }

    // Verificar se a igreja existe
    const church = await prisma.church.findUnique({
      where: { id: churchId },
    });

    if (!church || !church.isActive) {
      return res.status(400).json({ error: 'Igreja inválida' });
    }

    // Verificar se usuário já existe
    const existingUser = await AuthService.findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const user = await AuthService.createUser({
      name,
      email,
      password,
      role: role || UserRole.APRENDIZ,
      churchId: undefined,
      isApproved: false,
      phase: "1",
    });

    // Encontrar professor da igreja
    const professor = await prisma.user.findFirst({
      where: { role: UserRole.ENCARREGADO, churchId: churchId },
    });

    // Criar solicitação de entrada
    // @ts-ignore
    await prisma.entryRequest.create({
      data: {
        userId: user.id,
        churchId,
        professorId: professor?.id,
      },
    });

    res.status(201).json({
      message: 'Sua solicitação foi enviada com sucesso! Aguarde a aprovação.',
      user,
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token malformado' });
    }

    const decoded = AuthService.verifyToken(token);

    const user = await AuthService.findUserById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário inválido' });
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
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
