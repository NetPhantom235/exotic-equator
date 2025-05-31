import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('Usuario de prueba creado:', user);
  } catch (error) {
    console.error('Error al crear usuario de prueba:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 