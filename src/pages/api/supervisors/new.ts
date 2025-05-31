import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    // Validaciones básicas
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nombre, email y contraseña son requeridos' }),
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingSupervisor = await prisma.supervisor.findUnique({
      where: { email }
    });

    if (existingSupervisor) {
      return new Response(
        JSON.stringify({ error: 'El email ya está registrado' }),
        { status: 400 }
      );
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el supervisor
    const supervisor = await prisma.supervisor.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: 'USER',
        status: 'active'
      }
    });

    // Eliminar la contraseña de la respuesta
    const { password: _, ...supervisorData } = supervisor;

    return new Response(
      JSON.stringify({ 
        message: 'Supervisor creado exitosamente',
        supervisor: supervisorData 
      }),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error al crear supervisor:', error);
    return new Response(
      JSON.stringify({ error: 'Error al crear el supervisor' }),
      { status: 500 }
    );
  }
}; 