// Script para verificar y actualizar el rol de usuario
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { PrismaClient } = require('../lib/prisma/index.js');
const prisma = new PrismaClient();

async function checkAndUpdateUserRole() {
  try {
    console.log('Buscando usuario con email soporte@puntoticket.cl...');
    
    // Buscar al usuario por email
    const user = await prisma.user.findUnique({
      where: { email: 'soporte@puntoticket.cl' }
    });
    
    if (!user) {
      console.log('Usuario no encontrado');
      return;
    }
    
    console.log('Usuario encontrado:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Rol actual: ${user.role}`);
    
    // Actualizar el rol a ADMIN si no lo es
    if (user.role !== 'ADMIN') {
      console.log('Actualizando rol a ADMIN...');
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      
      console.log(`Rol actualizado: ${updatedUser.role}`);
    } else {
      console.log('El usuario ya tiene el rol ADMIN');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función
checkAndUpdateUserRole(); 