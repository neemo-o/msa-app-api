import { PrismaClient, ActivityType, UserRole, SubmissionStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { NotificationService } from './notificationService';

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
    // Buscar o churchId do autor
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { churchId: true }
    });

    if (!author?.churchId) {
      throw new Error('Usuário não está vinculado a uma igreja');
    }

    const activity = await prisma.activity.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        authorId,
        churchId: author.churchId,
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
        },
        church: {
          select: { id: true, name: true }
        }
      }
    });

    return activity;
  }

  // Atualizar atividade (apenas ENCARREGADO autor)
  static async updateActivity(id: string, data: {
    title?: string;
    description?: string;
    questions?: { text: string; options: string[]; correct: string }[];
    dueDate?: Date;
  }, authorId: string) {
    // Verificar se a atividade existe e se o usuário é o autor
    const existingActivity = await prisma.activity.findUnique({
      where: { id },
      include: {
        submissions: {
          select: { studentId: true, student: { select: { id: true } } }
        }
      }
    });

    if (!existingActivity) {
      throw new Error('Atividade não encontrada');
    }

    if (existingActivity.authorId !== authorId) {
      throw new Error('Apenas o autor pode editar esta atividade');
    }

    // Atualizar atividade
    const activity = await prisma.activity.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        isEdited: true,
        questions: data.questions ? {
          deleteMany: {}, // Remove todas as perguntas existentes
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

    // Marcar todas as submissões como RETURNED
    await prisma.submission.updateMany({
      where: { activityId: id },
      data: { status: SubmissionStatus.RETURNED }
    });

    // Enviar notificações push para todos os alunos que têm submissões
    const studentIds = existingActivity.submissions.map(sub => sub.studentId);
    if (studentIds.length > 0) {
      await NotificationService.sendPushNotifications(
        studentIds,
        'Atividade Atualizada',
        `A atividade "${activity.title}" foi atualizada. Refazer é necessário.`,
        'activity_update'
      );
    }

    return activity;
  }

  // Listar atividades com filtros por role
  static async getActivities(user: AuthRequest['user']) {
    if (!user) throw new Error('Usuário não autenticado');

    const where: any = {};

    if (user.role === UserRole.APRENDIZ) {
      // Filtrar por fase do aluno e mesma igreja
      const userPhase = parseInt(user.phase || '1');
      where.phases = {
        some: {
          phaseNumber: userPhase
        }
      };
      where.churchId = user.churchId; // Filtrar por igreja do aluno
    } else if (user.role === UserRole.ENCARREGADO) {
      // ENCARREGADO vê apenas suas atividades
      where.authorId = user.id;
    } else if (user.role === UserRole.INSTRUTOR) {
      // INSTRUTOR vê apenas atividades da mesma igreja que têm pelo menos 1 submissão
      where.churchId = user.churchId; // Filtrar por igreja do instrutor
      where.submissions = {
        some: {} // Pelo menos uma submissão existe
      };
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        phases: true,
        questions: true,
        author: {
          select: { id: true, name: true, email: true, churchId: true }
        },
        submissions: user.role === UserRole.APRENDIZ ? {
          where: { studentId: user.id },
          include: {
            gradedBy: {
              select: { id: true, name: true, email: true }
            }
          }
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
          where: { studentId: user.id },
          include: {
            gradedBy: {
              select: { id: true, name: true, email: true }
            }
          }
        } : {
          include: {
            student: {
              select: { id: true, name: true, email: true, phase: true }
            },
            gradedBy: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!activity) {
      throw new Error('Atividade não encontrada');
    }

    // Verificar permissões por igreja
    if (user.churchId && activity.churchId !== user.churchId) {
      throw new Error('Você não tem permissão para acessar esta atividade');
    }

    // Verificar permissões adicionais
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
      // Se a submissão já foi corrigida, não permitir re-envio
      if (existingSubmission.status === SubmissionStatus.GRADED) {
        throw new Error('Esta atividade já foi corrigida e não pode ser reenviada');
      }
      // Se está retornada (RETURNED), permitir re-envio
      if (existingSubmission.status === SubmissionStatus.RETURNED) {
        // Remover a submissão anterior para permitir re-envio
        await prisma.submission.delete({
          where: { id: existingSubmission.id }
        });
      } else {
        throw new Error('Você já enviou uma resposta para esta atividade');
      }
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
        score: quizScore,
        status: data.type === 'QUIZ' && quizScore !== undefined ? SubmissionStatus.GRADED : SubmissionStatus.PENDING,
        gradedById: data.type === 'QUIZ' && quizScore !== undefined ? null : undefined // null para correção automática
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        activity: {
          select: { id: true, title: true, type: true }
        },
        gradedBy: true
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
        status: SubmissionStatus.GRADED,
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

    // Enviar notificação push para o aluno
    await NotificationService.sendPushNotification(
      submission.student.id,
      'Submissão Corrigida',
      `Sua atividade "${submission.activity.title}" foi corrigida. Nota: ${data.score}/10.`,
      'submission_graded'
    );

    return submission;
  }

  // Listar submissões de uma atividade
  static async getSubmissionsByActivity(activityId: string, user: AuthRequest['user']) {
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se usuário tem permissão
    if (user.role === UserRole.APRENDIZ) {
      throw new Error('Acesso negado');
    }

    // Verificar se a atividade pertence à mesma igreja do usuário
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { churchId: true }
    });

    if (!activity) {
      throw new Error('Atividade não encontrada');
    }

    if (user.churchId && activity.churchId !== user.churchId) {
      throw new Error('Você não tem permissão para acessar esta atividade');
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

  // Deletar atividade (apenas ENCARREGADO autor)
  static async deleteActivity(id: string, authorId: string) {
    // Verificar se a atividade existe e se o usuário é o autor
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        submissions: {
          select: { id: true }
        }
      }
    });

    if (!activity) {
      throw new Error('Atividade não encontrada');
    }

    if (activity.authorId !== authorId) {
      throw new Error('Apenas o autor pode excluir esta atividade');
    }

    // Verificar se há submissões
    if (activity.submissions.length > 0) {
      throw new Error('Não é possível excluir uma atividade que possui submissões');
    }

    // Deletar atividade (as fases e questões serão deletadas automaticamente devido ao cascade)
    await prisma.activity.delete({
      where: { id }
    });

    return { message: 'Atividade excluída com sucesso' };
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

    // Verificar se atividade pertence à mesma igreja
    if (user.churchId && activity.churchId !== user.churchId) {
      return false;
    }

    const userPhase = parseInt(user.phase || '1');
    return activity.phases.some(phase => phase.phaseNumber === userPhase);
  }
}
