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

  console.log(`\n📝 Senha padrão para todos os usuários: ${defaultPassword}`);

  console.log(`\n🎉 Seed finalizado com sucesso!`);
  console.log(`   🏛️  1 Igreja criada`);
  console.log(`   👥 ${admins.length + instrutores.length + encarregados.length + aprendizes.length} usuários criados`);
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
