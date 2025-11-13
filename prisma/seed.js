import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log(`Iniciando o seed de dados...`);

  const defaultPassword = "123456";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  console.log(`\nCriando Igreja...`);

  const igrejaPrincipal = await prisma.church.create({
    data: {
      name: "Igreja Central",
      description: "Igreja principal do sistema",
      address: "Rua Central, 123 - Centro",
      phone: "(11) 99999-9999",
      email: "contato@igrejacentral.com",
    },
  });

  console.log(`✅ Igreja criada: ${igrejaPrincipal.name}`);

  console.log(`\nCriando Usuários...`);

  // 4 Administradores
  const admins = [];
  for (let i = 1; i <= 4; i++) {
    const admin = await prisma.user.upsert({
      where: { email: `admin${i}@example.com` },
      update: {},
      create: {
        email: `admin${i}@example.com`,
        name: `Administrador ${i}`,
        password: hashedPassword,
        role: "ADMINISTRADOR",
        isApproved: true,
        status: "APPROVED",
        churchId: null,
      },
    });
    admins.push(admin);
  }

  // 4 Instrutores
  const instrutores = [];
  for (let i = 1; i <= 4; i++) {
    const instrutor = await prisma.user.upsert({
      where: { email: `instrutor${i}@example.com` },
      update: {},
      create: {
        email: `instrutor${i}@example.com`,
        name: `Instrutor ${i}`,
        password: hashedPassword,
        role: "INSTRUTOR",
        isApproved: true,
        status: "APPROVED",
        phase: `${i}`,
        churchId: igrejaPrincipal.id,
      },
    });
    instrutores.push(instrutor);
  }

  // 4 Encarregados
  const encarregados = [];
  for (let i = 1; i <= 4; i++) {
    const encarregado = await prisma.user.upsert({
      where: { email: `encarregado${i}@example.com` },
      update: {},
      create: {
        email: `encarregado${i}@example.com`,
        name: `Encarregado ${i}`,
        password: hashedPassword,
        role: "ENCARREGADO",
        isApproved: true,
        status: "APPROVED",
        phase: `${i + 4}`,
        churchId: igrejaPrincipal.id,
      },
    });
    encarregados.push(encarregado);
  }

  // 4 Aprendizes
  const aprendizes = [];
  for (let i = 1; i <= 4; i++) {
    const aprendiz = await prisma.user.upsert({
      where: { email: `aprendiz${i}@example.com` },
      update: {},
      create: {
        email: `aprendiz${i}@example.com`,
        name: `Aprendiz ${i}`,
        password: hashedPassword,
        role: "APRENDIZ",
        isApproved: true,
        status: "APPROVED",
        phase: `${i}`,
        churchId: igrejaPrincipal.id,
      },
    });
    aprendizes.push(aprendiz);
  }

  console.log(`✅ Usuários criados:`);
  console.log(`   📊 Administradores: ${admins.length}`);
  admins.forEach(admin => console.log(`      - ${admin.email} (${admin.role})`));

  console.log(`   👨‍🏫 Instrutores: ${instrutores.length}`);
  instrutores.forEach(instrutor => console.log(`      - ${instrutor.email} (${instrutor.role}) - Fase ${instrutor.phase}`));

  console.log(`   👨‍💼 Encarregados: ${encarregados.length}`);
  encarregados.forEach(encarregado => console.log(`      - ${encarregado.email} (${encarregado.role}) - Fase ${encarregado.phase}`));

  console.log(`   👨‍🎓 Aprendizes: ${aprendizes.length}`);
  aprendizes.forEach(aprendiz => console.log(`      - ${aprendiz.email} (${aprendiz.role}) - Fase ${aprendiz.phase}`));

  console.log(`\nCriando Atividades de Exemplo...`);

  // Criar atividades para cada encarregado
  const atividades = [];
  for (let i = 0; i < encarregados.length; i++) {
    const encarregado = encarregados[i];
    const fase = parseInt(encarregado.phase);

    // Criar uma atividade QUIZ
    const atividadeQuiz = await prisma.activity.create({
      data: {
        title: `Atividade Quiz - Fase ${fase}`,
        description: `Atividade de quiz para alunos da fase ${fase}`,
        type: "QUIZ",
        authorId: encarregado.id,
        churchId: igrejaPrincipal.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias no futuro
        phases: {
          create: [{ phaseNumber: fase }]
        },
        questions: {
          create: [
            {
              text: `Pergunta 1 da Fase ${fase}`,
              options: ["A) Resposta A", "B) Resposta B", "C) Resposta C", "D) Resposta D"],
              correct: "A) Resposta A"
            },
            {
              text: `Pergunta 2 da Fase ${fase}`,
              options: ["A) Opção A", "B) Opção B", "C) Opção C", "D) Opção D"],
              correct: "B) Opção B"
            }
          ]
        }
      }
    });

    // Criar uma atividade TEXTO
    const atividadeTexto = await prisma.activity.create({
      data: {
        title: `Atividade Texto - Fase ${fase}`,
        description: `Atividade de texto para alunos da fase ${fase}`,
        type: "TEXTO",
        authorId: encarregado.id,
        churchId: igrejaPrincipal.id,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 dias no futuro
        phases: {
          create: [{ phaseNumber: fase }]
        }
      }
    });

    atividades.push(atividadeQuiz, atividadeTexto);
  }

  console.log(`✅ Atividades criadas: ${atividades.length}`);
  atividades.forEach(atividade => console.log(`   - ${atividade.title} (${atividade.type})`));

  console.log(`\nCriando Submissões de Exemplo...`);

  // Criar algumas submissões para testar
  const submissoes = [];
  for (let i = 0; i < Math.min(aprendizes.length, atividades.length); i++) {
    const aprendiz = aprendizes[i];
    const atividade = atividades[i];

    if (atividade.type === "QUIZ") {
      // Criar submissão de quiz
      const submissao = await prisma.submission.create({
        data: {
          activityId: atividade.id,
          studentId: aprendiz.id,
          type: "QUIZ",
          answerText: `Respostas do quiz para ${atividade.title}`,
          score: Math.floor(Math.random() * 11) // Nota aleatória 0-10
        }
      });
      submissoes.push(submissao);
    } else {
      // Criar submissão de texto
      const submissao = await prisma.submission.create({
        data: {
          activityId: atividade.id,
          studentId: aprendiz.id,
          type: "TEXTO",
          answerText: `Esta é minha resposta para a atividade ${atividade.title}. Aprendi muito com este conteúdo.`,
          score: Math.floor(Math.random() * 11) // Nota aleatória 0-10
        }
      });
      submissoes.push(submissao);
    }
  }

  console.log(`✅ Submissões criadas: ${submissoes.length}`);

  console.log(`\n📝 Senha padrão para todos os usuários: ${defaultPassword}`);

  console.log(`\n🎉 Seed finalizado com sucesso!`);
  console.log(`   🏛️  1 Igreja criada`);
  console.log(`   👥 ${admins.length + instrutores.length + encarregados.length + aprendizes.length} usuários criados`);
  console.log(`   📚 ${atividades.length} atividades criadas`);
  console.log(`   📝 ${submissoes.length} submissões criadas`);
  console.log(`   ✅ Todos os usuários estão aprovados e ativos`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erro durante o seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
