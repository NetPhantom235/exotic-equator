import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/prisma.js';

export const POST: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({
        error: 'ID de préstamo no proporcionado'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Buscar el préstamo
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        device: true
      }
    });

    if (!loan) {
      return new Response(JSON.stringify({
        error: 'Préstamo no encontrado'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (loan.status !== 'active') {
      return new Response(JSON.stringify({
        error: 'El préstamo ya ha sido devuelto'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Actualizar el préstamo y el dispositivo
    const [updatedLoan] = await prisma.$transaction([
      prisma.loan.update({
        where: { id },
        data: {
          status: 'returned',
          returnDate: new Date()
        }
      }),
      prisma.device.update({
        where: { id: loan.deviceId },
        data: {
          status: 'available'
        }
      })
    ]);

    return new Response(JSON.stringify({
      loan: updatedLoan,
      message: 'Devolución registrada exitosamente'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error al procesar la devolución:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
