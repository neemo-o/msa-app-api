import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export class Logger {
  private static logFile = path.join(__dirname, '../../logs/app.log');
  private static maxFileSize = 10 * 1024 * 1024; // 10MB
  private static maxFiles = 5;

  /**
   * Garante que o diretório de logs existe
   */
  private static ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Rotaciona o arquivo de log se necessário
   */
  private static rotateLogFile() {
    if (!fs.existsSync(this.logFile)) return;

    const stats = fs.statSync(this.logFile);
    if (stats.size < this.maxFileSize) return;

    // Rotaciona arquivos existentes
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldFile = `${this.logFile}.${i}`;
      const newFile = `${this.logFile}.${i + 1}`;

      if (fs.existsSync(oldFile)) {
        if (i === this.maxFiles - 1) {
          fs.unlinkSync(oldFile); // Remove o arquivo mais antigo
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Renomeia o arquivo atual
    fs.renameSync(this.logFile, `${this.logFile}.1`);
  }

  /**
   * Escreve uma entrada de log no arquivo
   */
  private static writeLog(entry: LogEntry) {
    try {
      this.ensureLogDirectory();
      this.rotateLogFile();

      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine, 'utf8');
    } catch (error) {
      // Fallback para console se não conseguir escrever no arquivo
      console.error('Erro ao escrever log:', error);
      console.error('Log entry:', JSON.stringify(entry));
    }
  }

  /**
   * Cria uma entrada de log base
   */
  private static createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...metadata
    };
  }

  /**
   * Log de erro
   */
  static error(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata);
    this.writeLog(entry);
  }

  /**
   * Log de aviso
   */
  static warn(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata);
    this.writeLog(entry);
  }

  /**
   * Log informativo
   */
  static info(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata);
    this.writeLog(entry);
  }

  /**
   * Log de debug
   */
  static debug(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata);
    this.writeLog(entry);
  }

  /**
   * Log de requisição HTTP
   */
  static httpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: string,
    ip?: string,
    params?: any,
    query?: any,
    body?: any,
    userId?: string,
    userAgent?: string,
    referer?: string
  ) {
    this.info(`HTTP ${method} ${url}`, 'HTTP_REQUEST', {
      method,
      url,
      statusCode,
      duration,
      ip,
      params,
      query,
      body,
      userId,
      userAgent,
      referer
    });
  }

  /**
   * Log de erro de requisição
   */
  static httpError(
    method: string,
    url: string,
    statusCode: number,
    error: Error,
    ip?: string,
    userId?: string
  ) {
    this.error(`HTTP ${method} ${url} - ${error.message}`, 'HTTP_ERROR', {
      method,
      url,
      statusCode,
      ip,
      userId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  /**
   * Log de autenticação
   */
  static auth(
    action: string,
    success: boolean,
    userId?: string,
    ip?: string,
    metadata?: Record<string, any>
  ) {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Autenticação: ${action} - ${success ? 'Sucesso' : 'Falha'}`;

    this.log(level, message, 'AUTH', {
      action,
      success,
      userId,
      ip,
      ...metadata
    });
  }

  /**
   * Log de banco de dados
   */
  static database(
    operation: string,
    table: string,
    success: boolean,
    duration?: number,
    error?: Error
  ) {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const message = `Database: ${operation} on ${table}`;

    this.log(level, message, 'DATABASE', {
      operation,
      table,
      success,
      duration,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  /**
   * Método genérico para logging
   */
  static log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ) {
    const entry = this.createLogEntry(level, message, context, metadata);
    this.writeLog(entry);
  }

  /**
   * Obtém estatísticas dos logs
   */
  static getStats() {
    try {
      if (!fs.existsSync(this.logFile)) {
        return { totalEntries: 0, fileSize: 0 };
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const stats = fs.statSync(this.logFile);

      return {
        totalEntries: lines.length,
        fileSize: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      return { error: 'Não foi possível ler estatísticas dos logs' };
    }
  }

  /**
   * Limpa todos os arquivos de log
   */
  static clearLogs() {
    try {
      const logDir = path.dirname(this.logFile);

      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        files.forEach(file => {
          if (file.startsWith('app.log')) {
            fs.unlinkSync(path.join(logDir, file));
          }
        });
      }

      this.info('Logs limpos manualmente', 'SYSTEM');
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
    }
  }
}

// Exporta instância singleton
export const logger = Logger;
