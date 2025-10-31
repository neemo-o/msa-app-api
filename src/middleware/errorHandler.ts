import { Request, Response, NextFunction } from 'express';

export interface AppError {
  message: string;
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number | string;
  name?: string;
  stack?: string;
}

// Error class for operational errors
export class OperationalError extends Error implements AppError {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Recurso não encontrado';
    error = new OperationalError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Valor duplicado encontrado';
    error = new OperationalError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = 'Dados de entrada inválidos';
    error = new OperationalError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = new OperationalError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = new OperationalError(message, 401);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    let message = 'Erro no upload de arquivo';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Arquivo muito grande';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Muitos arquivos enviados';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Tipo de arquivo não permitido';
    }
    error = new OperationalError(message, 400);
  }

  // Send error response
  if (error.isOperational) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Programming or other unknown error: don't leak error details
  return res.status(500).json({
    status: 'error',
    message: 'Algo deu errado',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Catch async errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled promise rejections
export const handleUnhandledRejections = () => {
  process.on('unhandledRejection', (err: Error) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    // Close server & exit process
    process.exit(1);
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
  });
};
