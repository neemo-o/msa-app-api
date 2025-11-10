import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { ActivityService } from '../service/activityService';
import { UserRole } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import { catchAsync } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../utils/constants';

const router = Router();

// Configurar multer para uploads de atividades
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/activities');
    // Ensure directory exists
    const fs = require('fs');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext);
    // Sanitize filename
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${file.fieldname}-${uniqueSuffix}-${sanitizedName}${ext}`);
  }
});

// File filter para atividades (PDFs, imagens, vídeos)
const activityFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    // PDFs
    'application/pdf',
    // Imagens
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'image/gif', 'image/bmp', 'image/tiff',
    // Vídeos - expandido para mais formatos
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm',
    'video/mpeg', 'video/mpg', 'video/3gp', 'video/m4v', 'video/quicktime'
  ];

  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Formato não suportado: ${file.mimetype}. Use PDF, imagens (JPG, PNG, etc.) ou vídeos (MP4, AVI, MOV, etc.)`));
  }
};

// Configuração específica por tipo de arquivo
const getFileSizeLimit = (mimetype: string): number => {
  if (mimetype.startsWith('video/')) {
    return 100 * 1024 * 1024; // 100MB para vídeos
  } else if (mimetype.startsWith('image/')) {
    return 10 * 1024 * 1024; // 10MB para imagens
  } else {
    return 50 * 1024 * 1024; // 50MB para outros (PDF, etc.)
  }
};

const uploadActivityFiles = multer({
  storage: storage,
  fileFilter: activityFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB máximo geral
    files: 10, // máximo 10 arquivos
  }
}).array('files', 10);

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// POST /api/activities - Criar atividade (ENcarregado)
router.post('/', requireRole([UserRole.ENCARREGADO]), catchAsync(async (req: AuthRequest, res: Response) => {
  const { title, description, type, phases, questions, dueDate } = req.body;

  // Validações básicas
  if (!title || !type || !phases || !Array.isArray(phases)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Campos obrigatórios: title, type, phases (array)'
    });
  }

  // Validar fases (1-16)
  const invalidPhases = phases.filter((phase: any) => !Number.isInteger(phase) || phase < 1 || phase > 16);
  if (invalidPhases.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Fases devem ser números inteiros entre 1 e 16'
    });
  }

  // Validar questions se for QUIZ
  if (type === 'QUIZ' && (!questions || !Array.isArray(questions))) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Para atividades do tipo QUIZ, é necessário fornecer questions'
    });
  }

  const activity = await ActivityService.createActivity({
    title,
    description,
    type,
    phases,
    questions: type === 'QUIZ' ? questions : undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined
  }, req.user!.id);

  res.status(HTTP_STATUS.CREATED).json({
    message: 'Atividade criada com sucesso',
    activity
  });
}));

// GET /api/activities - Listar atividades
router.get('/', catchAsync(async (req: AuthRequest, res: Response) => {
  const activities = await ActivityService.getActivities(req.user!);

  res.json({ activities });
}));

// GET /api/activities/:id - Detalhes da atividade
router.get('/:id', catchAsync(async (req: AuthRequest, res: Response) => {
  const activity = await ActivityService.getActivityById(req.params.id, req.user!);

  res.json({ activity });
}));

// PUT /api/activities/:id - Atualizar atividade (ENcarregado autor)
router.put('/:id', requireRole([UserRole.ENCARREGADO]), catchAsync(async (req: AuthRequest, res: Response) => {
  const { title, description, questions, dueDate } = req.body;

  // Validações básicas
  if (!title) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Campo obrigatório: title'
    });
  }

  const activity = await ActivityService.updateActivity(req.params.id, {
    title,
    description,
    questions,
    dueDate: dueDate ? new Date(dueDate) : undefined
  }, req.user!.id);

  res.json({
    message: 'Atividade atualizada com sucesso',
    activity
  });
}));

// POST /api/activities/:id/submissions - Enviar submissão (Aprendiz)
router.post('/:id/submissions', requireRole([UserRole.APRENDIZ]), uploadActivityFiles, catchAsync(async (req: AuthRequest, res: Response) => {
  const { answerText, answers } = req.body;
  const activityId = req.params.id;

  // Verificar se o aluno pode acessar esta atividade
  const canAccess = await ActivityService.canAccessActivity(activityId, req.user!);
  if (!canAccess) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Você não tem permissão para acessar esta atividade'
    });
  }

  // Processar arquivos enviados
  const files: string[] = [];
  if (req.files && Array.isArray(req.files)) {
    (req.files as Express.Multer.File[]).forEach(file => {
      files.push(`/uploads/activities/${file.filename}`);
    });
  }

  // Validar dados da submissão
  const activity = await ActivityService.getActivityById(activityId, req.user!);

  // Processar answers para quiz
  let parsedAnswers;
  if (activity.type === 'QUIZ') {
    if (!answers) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Para atividades do tipo QUIZ, é necessário fornecer answers'
      });
    }

    try {
      // Se answers já é um array, usar diretamente. Se é string, fazer parse.
      parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;

      if (!Array.isArray(parsedAnswers)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Answers deve ser um array válido'
        });
      }
    } catch (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Formato de answers inválido'
      });
    }
  }

  if (activity.type === 'TEXTO') {
    if (!answerText && files.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Para atividades do tipo TEXTO, é necessário fornecer answerText ou arquivos'
      });
    }
  } else if (activity.type === 'PDF') {
    if (files.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Para atividades do tipo PDF, é necessário enviar pelo menos um arquivo'
      });
    }
  }

  const submission = await ActivityService.createSubmission({
    activityId,
    type: activity.type,
    answerText,
    files,
    answers: activity.type === 'QUIZ' ? parsedAnswers : undefined
  }, req.user!.id);

  res.status(HTTP_STATUS.CREATED).json({
    message: 'Submissão enviada com sucesso',
    submission
  });
}));

// POST /api/submissions/:id/grade - Corrigir submissão (Instrutor/ENcarregado)
router.post('/submissions/:id/grade', requireRole([UserRole.INSTRUTOR, UserRole.ENCARREGADO]), catchAsync(async (req: AuthRequest, res: Response) => {
  const { score, feedback } = req.body;

  // Validações
  if (typeof score !== 'number' || score < 0 || score > 10) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Score deve ser um número entre 0 e 10'
    });
  }

  const submission = await ActivityService.gradeSubmission(req.params.id, {
    score,
    feedback
  }, req.user!.id);

  res.json({
    message: 'Submissão corrigida com sucesso',
    submission
  });
}));

// GET /api/submissions/:activityId - Listar submissões de uma atividade
router.get('/submissions/:activityId', requireRole([UserRole.INSTRUTOR, UserRole.ENCARREGADO]), catchAsync(async (req: AuthRequest, res: Response) => {
  const submissions = await ActivityService.getSubmissionsByActivity(req.params.activityId, req.user!);

  res.json({ submissions });
}));

export default router;
