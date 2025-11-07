import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log(`Iniciando o seed de dados...`);

  const defaultPassword = "123456";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  console.log(`\nCriando Igreja Padrão...`);

  const igrejaA = await prisma.church.create({
    data: {
      name: "Igreja A",
      description: "Igreja padrão do sistema",
      address: "Rua Principal, 100 - Centro",
      email: "igrejaa@exemplo.com",
    },
  });

  console.log(`✅ Igreja criada: ${igrejaA.name}`);

  console.log(`\nCriando Usuários Padrão...`);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMINISTRADOR",
      isApproved: true,
      status: "APPROVED",
      churchId: null,
    },
  });

  const aprendiz = await prisma.user.upsert({
    where: { email: "aprendiz@example.com" },
    update: {},
    create: {
      email: "aprendiz@example.com",
      name: "Aprendiz",
      password: hashedPassword,
      role: "APRENDIZ",
      isApproved: true,
      status: "APPROVED",
      phase: "1",
      churchId: igrejaA.id,
    },
  });

  const instrutor = await prisma.user.upsert({
    where: { email: "instrutor@example.com" },
    update: {},
    create: {
      email: "instrutor@example.com",
      name: "Instrutor",
      password: hashedPassword,
      role: "INSTRUTOR",
      isApproved: true,
      status: "APPROVED",
      phase: "2",
      churchId: igrejaA.id,
    },
  });

  const encarregado = await prisma.user.upsert({
    where: { email: "encarregado@example.com" },
    update: {},
    create: {
      email: "encarregado@example.com",
      name: "Encarregado",
      password: hashedPassword,
      role: "ENCARREGADO",
      isApproved: true,
      status: "APPROVED",
      phase: "3",
      churchId: igrejaA.id,
    },
  });

  console.log(`✅ Usuários criados:`);
  console.log(`   - ${admin.email} (${admin.role}) - Sem igreja`);
  console.log(`   - ${aprendiz.email} (${aprendiz.role}) - Igreja A`);
  console.log(`   - ${instrutor.email} (${instrutor.role}) - Igreja A`);
  console.log(`   - ${encarregado.email} (${encarregado.role}) - Igreja A`);

  console.log(`\nCriando Solicitações de Entrada de Teste...`);

  // Criar uma solicitação de entrada pendente
  const entryRequest = await prisma.entryRequest.create({
    data: {
      userId: aprendiz.id,
      churchId: igrejaA.id,
      professorId: encarregado.id,
      status: "EM_ANALISE",
    },
  });

  console.log(`✅ Solicitação de entrada criada para: ${aprendiz.name} (${aprendiz.email})`);

  console.log(`\n🎉 Seed finalizado com sucesso!`);
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
