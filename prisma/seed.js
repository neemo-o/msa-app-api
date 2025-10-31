// Use a sintaxe de Módulos ES (import) já que seu servidor também usa.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'

// Instancia o Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log(`Iniciando o seed...`);

  // 1. Criptografar uma senha padrão
  // Troque "123456" por uma senha segura de sua preferência
  const defaultPassword = '123456';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 2. Criar um usuário Administrador
  // Usamos 'upsert' para evitar criar duplicatas se o seed for rodado novamente
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' }, // Chave única para encontrar o usuário
    update: {}, // O que fazer se ele for encontrado (nada, neste caso)
    create: {
      email: 'admin@example.com',
      name: 'Admin Master',
      password: hashedPassword,
      role: 'ADMINISTRADOR', // Usando o Enum do seu schema
      isActive: true,
      isApproved: true,
      phase: 'N/A', // Ou qualquer valor que faça sentido
    },
  });

  // 3. Criar um usuário Aprendiz de exemplo
  const aprendiz = await prisma.user.upsert({
    where: { email: 'aprendiz@example.com' },
    update: {},
    create: {
      email: 'aprendiz@example.com',
      name: 'João Aprendiz',
      password: hashedPassword,
      role: 'APRENDIZ', // O padrão, mas é bom ser explícito
      isActive: true,
      isApproved: false, // Exemplo de um aprendiz que precisa de aprovação
      churchId: 'igreja_exemplo_01', // ID de exemplo
      phase: '1',
    },
  });

  console.log(`Usuário Admin criado: ${admin.email}`);
  console.log(`Usuário Aprendiz criado: ${aprendiz.email}`);
  console.log(`Seed finalizado.`);
}

// Executa a função main e lida com erros
main()
  .then(async () => {
    // Fecha a conexão com o banco de dados
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Erro durante o seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });