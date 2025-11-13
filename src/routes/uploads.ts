// Imports
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { AuthService } from '../service/authService';

// Extend Request type to include file
interface MulterRequest extends AuthRequest {
  file?: Express.Multer.File;
}

// Configuration
const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Upload avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const user = req.user!;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user avatar in database
    const updatedUser = await AuthService.updateUserAvatar(user.id, avatarUrl);

    res.json({
      message: 'Avatar atualizado com sucesso',
      user: updatedUser,
      avatarUrl: avatarUrl
    });
  } catch (error) {
    console.error('Erro no upload do avatar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get uploaded file
router.get('/avatars/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/avatars', filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  });
});

// Get activity files
router.get('/activities/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/activities', filename);

  // Check if file exists before sending
  if (!require('fs').existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  // Set headers and send file
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      console.error('Erro ao enviar arquivo:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
});

export default router;
