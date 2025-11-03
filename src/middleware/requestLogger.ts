import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Mascara informações sensíveis no corpo da requisição
 */
function maskSensitive(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'apikey', 'bearer'];
  const masked = { ...data };

  for (const key in masked) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitive(masked[key]);
    }
  }

  return masked;
}

/**
 * Middleware para logging detalhado de requisições HTTP
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Captura o IP do requester
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
             req.headers['x-real-ip']?.toString() ||
             req.ip ||
             req.connection.remoteAddress ||
             'unknown';

  // Log após a resposta ser finalizada
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Prepara os dados da requisição
    const logData = {
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip,
      params: req.params || {},
      query: req.query || {},
      body: maskSensitive(req.body),
      userId: (req as any).user?.id,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer
    };

    // Log da requisição HTTP
    logger.httpRequest(
      logData.method,
      logData.route,
      logData.status,
      logData.duration,
      logData.ip,
      logData.params,
      logData.query,
      logData.body,
      logData.userId,
      logData.userAgent,
      logData.referer
    );
  });

  next();
};
