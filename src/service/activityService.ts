import { PrismaClient, ActivityType, UserRole } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export class ActivityService {
  // Criar atividade (apenas ENCARREGADO)
  static async createActivity(data: {
    title: string;
    description?: string;
    type: ActivityType;
    phases: number[];
    questions?: { text: string; options: string[]; correct: string }[];
    dueDate?: Date;
  }, authorId: string) {
    const activity = await prisma.activity.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        authorId,
        dueDate: data.dueDate,
        phases: {
          create: data.phases.map(phase => ({ phaseNumber: phase }))
        },
        questions: data.questions ? {
          create: data.questions.map(q => ({
            text: q.text,
            options: q.options,
            correct: q.correct
          }))
        } : undefined
      },
      include: {
        phases: true,
        questions: true,
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return activity;
  }

  // Listar atividades com filtros por role
  static async getActivities(user: AuthRequest['user']) {
    if (!user) throw new Error('Usuário não autenticado');

    const where: any = {};

    if (user.role === UserRole.APRENDIZ) {
      // Filtrar por fase do aluno
      const userPhase = parseInt(user.phase || '1');
      where.phases = {
        some: {
          phaseNumber: userPhase
        }
      };
    } else if (user.role === UserRole.ENCARREGADO) {
      // ENCARREGADO vê apenas suas atividades
      where.authorId = user.id;
    }
    // INSTRUTOR vê todas as atividades (para correção)

    const activities = await prisma.activity.findMany({
      where,
      include: {
        phases: true,
        questions: true,
        author: {
          select: { id: true, name: true, email: true }
        },
        submissions: user.role === UserRole.APRENDIZ ? {
          where: { studentId: user.id }
        } : true
      },
      orderBy: { createdAt: 'desc' }
    });

    return activities;
  }

  // Obter atividade por ID
  static async getActivityById(id: string, user: AuthRequest['user']) {
    if (!user) throw new Error('Usuário não autenticado');

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        phases: true,
        questions: true,
        author: {
          select: { id: true, name: true, email: true }
        },
        submissions: user.role === UserRole.APRENDIZ ? {
          where: { studentId: user.id }
        } : true
      }
    });

    if (!activity) {
      throw new Error('Atividade não encontrada');
    }

    // Verificar permissões
    if (user.role === UserRole.APRENDIZ) {
      const userPhase = parseInt(user.phase || '1');
      const hasAccess = activity.phases.some(phase => phase.phaseNumber === userPhase);
      if (!hasAccess) {
        throw new Error('Você não tem permissão para acessar esta atividade');
      }
    }

    return activity;
  }

  // Criar submissão
  static async createSubmission(data: {
    activityId: string;
    type: string;
    answerText?: string;
    files?: string[];
    answers?: { questionId: string; answer: string }[];
  }, studentId: string) {
    // Verificar se já existe submissão
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        activityId: data.activityId,
        studentId
      }
    });

    if (existingSubmission) {
      throw new Error('Você já enviou uma resposta para esta atividade');
    }

    // Para quizzes, processar respostas
    let answerText = data.answerText;
    let quizScore: number | undefined = undefined;

    if (data.type === 'QUIZ' && data.answers) {
      const activity = await prisma.activity.findUnique({
        where: { id: data.activityId },
        include: { questions: true }
      });

      if (!activity) {
        throw new Error('Atividade não encontrada');
      }

      // Calcular pontuação
      let correctAnswers = 0;
      const totalQuestions = activity.questions.length;
      const answersText = data.answers.map(ans => {
        const question = activity.questions.find(q => q.id === ans.questionId);
        const isCorrect = question?.correct === ans.answer;
        if (isCorrect) correctAnswers++;
        return `${question?.text}: ${ans.answer} ${isCorrect ? '(Correto)' : '(Errado)'}`;
      }).join('\n');

      answerText = answersText;
      quizScore = (correctAnswers / totalQuestions) * 10; // Nota de 0-10
    }

    const submission = await prisma.submission.create({
      data: {
        activityId: data.activityId,
        studentId,
        type: data.type,
        answerText,
        files: data.files || [],
        score: quizScore
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        activity: {
          select: { id: true, title: true, type: true }
        }
      }
    });

    return submission;
  }

  // Corrigir submissão
  static async gradeSubmission(id: string, data: { score: number; feedback?: string }, graderId: string) {
    const submission = await prisma.submission.update({
      where: { id },
      data: {
        score: data.score,
        feedback: data.feedback,
        gradedById: graderId,
        updatedAt: new Date()
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        activity: {
          select: { id: true, title: true, type: true }
        },
        gradedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return submission;
  }

  // Listar submissões de uma atividade
  static async getSubmissionsByActivity(activityId: string, user: AuthRequest['user']) {
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se usuário tem permissão
    if (user.role === UserRole.APRENDIZ) {
      throw new Error('Acesso negado');
    }

    const submissions = await prisma.submission.findMany({
      where: { activityId },
      include: {
        student: {
          select: { id: true, name: true, email: true, phase: true }
        },
        gradedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return submissions;
  }

  // Verificar se usuário pode acessar atividade
  static async canAccessActivity(activityId: string, user: AuthRequest['user']): Promise<boolean> {
    if (!user) return false;
    if (user.role !== UserRole.APRENDIZ) return true;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { phases: true }
    });

    if (!activity) return false;

    const userPhase = parseInt(user.phase || '1');
    return activity.phases.some(phase => phase.phaseNumber === userPhase);
  }
}
