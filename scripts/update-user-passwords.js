const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateUserPasswords() {
  try {
    // Obtener todos los usuarios
    const users = await prisma.user.findMany();
    
    console.log(`Encontrados ${users.length} usuarios para actualizar...`);
    
    // Actualizar cada usuario con una contraseña temporal
    for (const user of users) {
      const tempPassword = 'temporal123'; // Contraseña temporal
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, salt);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          passwordHash: passwordHash
        }
      });
      
      console.log(`Usuario ${user.email} actualizado con contraseña temporal`);
    }
    
    console.log('\nActualización completada. Todos los usuarios tienen ahora la contraseña: temporal123');
    console.log('Por favor, asegúrese de que los usuarios cambien su contraseña en el próximo inicio de sesión.');
    
  } catch (error) {
    console.error('Error al actualizar las contraseñas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserPasswords();
