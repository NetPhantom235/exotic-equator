// Script para actualizar el rol de usuario a ADMIN
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email del usuario que quieres actualizar a ADMIN
const userEmail = 'admin@example.com'; // Cambia esto por tu email de usuario

async function updateUserRole() {
  try {
    console.log(`Buscando usuario con email: ${userEmail}...`);
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.error(`No se encontró ningún usuario con el email: ${userEmail}`);
      return;
    }
    
    console.log(`Usuario encontrado: ID=${user.id}, Email=${user.email}, Rol actual=${user.role}`);
    
    if (user.role === 'ADMIN') {
      console.log('El usuario ya tiene el rol ADMIN');
    } else {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      
      console.log(`Usuario actualizado: ID=${updatedUser.id}, Email=${updatedUser.email}, Nuevo rol=${updatedUser.role}`);
    }
    
    // Mostrar todos los usuarios
    console.log('\nListado de todos los usuarios:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    allUsers.forEach(u => {
      console.log(`- ${u.email} (${u.role})`);
    });
    
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole(); 