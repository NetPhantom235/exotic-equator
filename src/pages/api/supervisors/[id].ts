import type { APIRoute } from 'astro';
import { supervisorService } from '../../../lib/supervisorService.js';
import { SupervisorSchema, ErrorSchema } from '../../../lib/validators.js';
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcryptjs';

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID del supervisor es requerido' }),
        { status: 400 }
      );
    }

    // Verificar si el supervisor existe
    const existingSupervisor = await prisma.supervisor.findUnique({
      where: { id }
    });

    if (!existingSupervisor) {
      return new Response(
        JSON.stringify({ error: 'Supervisor no encontrado' }),
        { status: 404 }
      );
    }

    // Verificar si el nuevo email ya está en uso por otro supervisor
    if (email !== existingSupervisor.email) {
      const emailExists = await prisma.supervisor.findUnique({
        where: { email }
      });

      if (emailExists) {
        return new Response(
          JSON.stringify({ error: 'El email ya está registrado' }),
          { status: 400 }
        );
      }
    }

    // Preparar los datos para actualizar
    const updateData: any = {
      name,
      email,
      phone
    };

    // Si se proporciona una nueva contraseña, encriptarla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Actualizar el supervisor
    const updatedSupervisor = await prisma.supervisor.update({
      where: { id },
      data: updateData
    });

    // Eliminar la contraseña de la respuesta
    const { password: _, ...supervisorData } = updatedSupervisor;

    return new Response(
      JSON.stringify({
        message: 'Supervisor actualizado exitosamente',
        supervisor: supervisorData
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error al actualizar supervisor:', error);
    return new Response(
      JSON.stringify({ error: 'Error al actualizar el supervisor' }),
      { status: 500 }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID del supervisor es requerido' }),
        { status: 400 }
      );
    }

    // Verificar si el supervisor tiene préstamos activos
    const supervisor = await prisma.supervisor.findUnique({
      where: { id },
      include: {
        loans: {
          where: {
            status: 'active'
          }
        }
      }
    });

    if (!supervisor) {
      return new Response(
        JSON.stringify({ error: 'Supervisor no encontrado' }),
        { status: 404 }
      );
    }

    if (supervisor.loans.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No se puede eliminar el supervisor porque tiene préstamos activos' 
        }),
        { status: 400 }
      );
    }

    // Eliminar el supervisor
    await prisma.supervisor.delete({
      where: { id }
    });

    return new Response(
      JSON.stringify({ message: 'Supervisor eliminado exitosamente' }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error al eliminar supervisor:', error);
    return new Response(
      JSON.stringify({ error: 'Error al eliminar el supervisor' }),
      { status: 500 }
    );
  }
};
