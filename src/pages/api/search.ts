import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma.js';

export const GET: APIRoute = async ({ url }) => {
  try {
    const query = url.searchParams.get('q')?.toLowerCase() || '';

    if (!query) {
      return new Response(
        JSON.stringify({ items: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Búsqueda en supervisores
    const supervisors = await prisma.supervisor.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    // Búsqueda en dispositivos
    const devices = await prisma.device.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { serialNumber: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    // Búsqueda en préstamos
    const loans = await prisma.loan.findMany({
      where: {
        OR: [
          { device: { name: { contains: query, mode: 'insensitive' } } },
          { supervisor: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        device: true,
        supervisor: true
      },
      take: 5
    });

    // Formatear resultados
    const items = [
      ...supervisors.map(supervisor => ({
        type: 'supervisor',
        url: `/supervisors/${supervisor.id}`,
        title: supervisor.name,
        description: `Supervisor - ${supervisor.email}`
      })),
      ...devices.map(device => ({
        type: 'device',
        url: `/devices/${device.id}`,
        title: device.name,
        description: `Dispositivo - ${device.serialNumber}`
      })),
      ...loans.map(loan => ({
        type: 'loan',
        url: `/loans/${loan.id}`,
        title: `${loan.device.name} - ${loan.supervisor.name}`,
        description: `Préstamo - ${new Date(loan.loanDate).toLocaleDateString()}`
      }))
    ];

    return new Response(
      JSON.stringify({ items }),
      { status: 200, headers: { 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    return new Response(
      JSON.stringify({ error: 'Error en la búsqueda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
}; 