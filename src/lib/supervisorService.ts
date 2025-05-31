import { PrismaClient } from '@prisma/client';
import type { Supervisor } from '@prisma/client';
import { withMetrics } from './decorators/metrics.js';
import { SUPERVISOR_ROLES, ERROR_MESSAGES } from './config.js';

const prisma = new PrismaClient();

class SupervisorService {
  getAllSupervisors = withMetrics(async () => {
    try {
      return await prisma.supervisor.findMany({
        include: {
          devices: true,
          loans: {
            include: {
              device: true
            },
            orderBy: {
              loanDate: 'desc'
            },
            take: 5 // Optimización: solo traer los 5 préstamos más recientes por supervisor
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener todos los supervisores:', error);
      throw new Error('Error al consultar los supervisores');
    }
  });

  getSupervisorById = withMetrics(async (id: string) => {
    if (!id) {
      throw new Error('El ID del supervisor es requerido');
    }
    
    try {
      const supervisor = await prisma.supervisor.findUnique({
        where: { id },
        include: {
          devices: true,
          loans: {
            include: {
              device: true
            },
            orderBy: {
              loanDate: 'desc'
            },
            take: 10 // Optimización: solo traer los 10 préstamos más recientes
          }
        }
      });
      
      if (!supervisor) {
        return null;
      }
      
      return supervisor;
    } catch (error) {
      console.error(`Error al obtener supervisor con ID ${id}:`, error);
      throw new Error('Error al consultar el supervisor');
    }
  });

  createSupervisor = withMetrics(async (data: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    password: string;
    notes?: string;
  }) => {
    // Validación de datos
    if (!data.name || !data.email || !data.role || !data.password) {
      throw new Error('Los campos nombre, email, rol y contraseña son obligatorios');
    }
    
    // Validar que el rol sea válido
    if (!Object.values(SUPERVISOR_ROLES).includes(data.role as any)) {
      throw new Error(`Rol no válido. Los roles permitidos son: ${Object.values(SUPERVISOR_ROLES).join(', ')}`);
    }
    
    // Verificar que no exista otro supervisor con el mismo email
    const existingSupervisor = await prisma.supervisor.findUnique({
      where: { email: data.email }
    });
    
    if (existingSupervisor) {
      throw new Error(ERROR_MESSAGES.SUPERVISOR.DUPLICATE_EMAIL);
    }
    
    try {
      return await prisma.supervisor.create({
        data,
        include: {
          devices: true,
          loans: true
        }
      });
    } catch (error) {
      console.error('Error al crear supervisor:', error);
      throw new Error('Error al crear el supervisor en la base de datos');
    }
  });

  updateSupervisor = withMetrics(async (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    password?: string;
    notes?: string;
    status?: string;
  }) => {
    // Verificar que el supervisor existe
    const supervisor = await prisma.supervisor.findUnique({
      where: { id }
    });
    
    if (!supervisor) {
      throw new Error(ERROR_MESSAGES.SUPERVISOR.NOT_FOUND);
    }
    
    // Validar el rol si se está actualizando
    if (data.role && !Object.values(SUPERVISOR_ROLES).includes(data.role as any)) {
      throw new Error(`Rol no válido. Los roles permitidos son: ${Object.values(SUPERVISOR_ROLES).join(', ')}`);
    }
    
    // Verificar que no exista otro supervisor con el mismo email
    if (data.email && data.email !== supervisor.email) {
      const existingSupervisor = await prisma.supervisor.findUnique({
        where: { email: data.email }
      });
      
      if (existingSupervisor) {
        throw new Error(ERROR_MESSAGES.SUPERVISOR.DUPLICATE_EMAIL);
      }
    }
    
    try {
      return await prisma.supervisor.update({
        where: { id },
        data,
        include: {
          devices: true,
          loans: true
        }
      });
    } catch (error) {
      console.error('Error al actualizar supervisor:', error);
      throw new Error('Error al actualizar el supervisor en la base de datos');
    }
  });

  deleteSupervisor = withMetrics(async (id: string) => {
    // Verificar que el supervisor existe
    const supervisor = await prisma.supervisor.findUnique({
      where: { id }
    });
    
    if (!supervisor) {
      throw new Error(ERROR_MESSAGES.SUPERVISOR.NOT_FOUND);
    }
    
    // Verificar si tiene dispositivos asignados
    const devicesCount = await prisma.device.count({
      where: { supervisorId: id }
    });
    
    if (devicesCount > 0) {
      throw new Error('No se puede eliminar un supervisor con dispositivos asignados');
    }
    
    // Verificar si tiene préstamos activos
    const activeLoans = await prisma.loan.findFirst({
      where: {
        supervisorId: id,
        status: 'active'
      }
    });
    
    if (activeLoans) {
      throw new Error('No se puede eliminar un supervisor con préstamos activos');
    }
    
    try {
      return await prisma.supervisor.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error al eliminar supervisor:', error);
      throw new Error('Error al eliminar el supervisor de la base de datos');
    }
  });
}

export const supervisorService = new SupervisorService();
