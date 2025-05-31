// Script para verificar y actualizar el rol de un usuario a ADMIN
import { PrismaClient } from '../src/lib/prisma-adapter.js';

const prisma = new PrismaClient();

// Email del usuario al que deseas darle permisos de administrador
const targetEmail = 'soporte@puntoticket.cl'; // Cambia esto por el email del usuario

async function main() {
  try {
    console.log(`Buscando usuario con email: ${targetEmail}`);
    
    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email: targetEmail }
    });
    
    if (!user) {
      console.error(`Usuario con email ${targetEmail} no encontrado.`);
      return;
    }
    
    console.log(`Usuario encontrado: ${user.id}`);
    console.log(`Rol actual: ${user.role}`);
    
    // Actualizar el rol a ADMIN si no lo es ya
    if (user.role !== 'ADMIN') {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      
      console.log(`Rol actualizado a ADMIN para el usuario ${updatedUser.email}`);
    } else {
      console.log(`El usuario ya tiene el rol ADMIN.`);
    }
    
    // Listar todos los usuarios y sus roles
    console.log('\nLista de todos los usuarios:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    users.forEach(u => {
      console.log(`- ${u.email}: ${u.role} (ID: ${u.id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 