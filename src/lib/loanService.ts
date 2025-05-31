import { PrismaClient } from '@prisma/client'; // Posible error: revisa si @prisma/client está correctamente generado y exporta PrismaClient
import type { Loan, Device } from '@prisma/client'; // Posible error: revisa si Loan y Device existen en el schema de Prisma
import type { LoanWithRelations } from './deviceTypes.js';
import { withMetrics } from './decorators/metrics.js';
import { DEVICE_STATUS, LOAN_STATUS, ERROR_MESSAGES } from './config.js';

const prisma = new PrismaClient();

class LoanService {
  getAllLoans = withMetrics(async (): Promise<LoanWithRelations[]> => {
    try {
      return await prisma.loan.findMany({
        include: {
          device: true,
          supervisor: true
        },
        orderBy: {
          loanDate: 'desc'
        }
      });
    } catch (error) {
      console.error('Error al obtener todos los préstamos:', error);
      throw new Error('Error al consultar los préstamos');
    }
  });

  getActiveLoansByDevice = withMetrics(async (deviceId: string): Promise<LoanWithRelations | null> => {
    if (!deviceId) {
      throw new Error('El ID del dispositivo es obligatorio');
    }

    try {
      return await prisma.loan.findFirst({
        where: {
          deviceId,
          status: LOAN_STATUS.ACTIVE
        },
        include: {
          device: true,
          supervisor: true
        }
      });
    } catch (error) {
      console.error(`Error al obtener préstamos activos para el dispositivo ${deviceId}:`, error);
      throw new Error('Error al consultar los préstamos activos');
    }
  });

  getLoansByDateRange = withMetrics(async (startDate: Date, endDate: Date): Promise<LoanWithRelations[]> => {
    if (!startDate || !endDate) {
      throw new Error('Las fechas de inicio y fin son obligatorias');
    }

    if (startDate > endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    try {
      return await prisma.loan.findMany({
        where: {
          loanDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          device: true,
          supervisor: true
        },
        orderBy: {
          loanDate: 'desc'
        }
      });
    } catch (error) {
      console.error(`Error al obtener préstamos por rango de fechas:`, error);
      throw new Error('Error al consultar los préstamos por rango de fechas');
    }
  });

  createLoan = withMetrics(async (data: {
    deviceId: string;
    supervisorId: string;
    eventCode?: string;
    newLocation?: string;
    notes?: string;
    condition?: string;
    startDate?: Date;
    expectedReturn?: Date;
  }): Promise<LoanWithRelations> => {
    if (!data.deviceId || !data.supervisorId) {
      throw new Error('Los IDs del dispositivo y supervisor son obligatorios');
    }
    try {
      const device = await prisma.device.findUnique({ where: { id: data.deviceId } });
      if (!device) throw new Error(ERROR_MESSAGES.DEVICE.NOT_FOUND);
      if (device.status !== DEVICE_STATUS.AVAILABLE) throw new Error(ERROR_MESSAGES.LOAN.DEVICE_NOT_AVAILABLE);
      const supervisor = await prisma.supervisor.findUnique({ where: { id: data.supervisorId } });
      if (!supervisor) throw new Error(ERROR_MESSAGES.SUPERVISOR.NOT_FOUND);
      return await prisma.$transaction(async (tx: any) => {
        await tx.device.update({ where: { id: data.deviceId }, data: { status: DEVICE_STATUS.ON_LOAN } });
        return await tx.loan.create({
          data: {
            deviceId: data.deviceId,
            supervisorId: data.supervisorId,
            eventCode: data.eventCode,
            newLocation: data.newLocation,
            notes: data.notes,
            condition: data.condition,
            loanDate: data.startDate,
            // expectedReturn: data.expectedReturn, // Si tu modelo lo soporta
            status: LOAN_STATUS.ACTIVE
          },
          include: { device: true, supervisor: true }
        });
      });
    } catch (error) {
      if (error instanceof Error) throw error;
      console.error('Error al crear préstamo:', error);
      throw new Error('Error al crear el préstamo en la base de datos');
    }
  });

  returnLoan = withMetrics(async (loanId: string, condition: string, notes?: string): Promise<LoanWithRelations> => {
    if (!loanId) {
      throw new Error('El ID del préstamo es obligatorio');
    }

    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { device: true }
      });      if (!loan) {
        throw new Error(ERROR_MESSAGES.LOAN.NOT_FOUND);
      }

      if (loan.status !== LOAN_STATUS.ACTIVE) {
        throw new Error(ERROR_MESSAGES.LOAN.ALREADY_RETURNED);
      }

      return await prisma.$transaction(async (tx: any) => {
        // Primero actualizar el préstamo para evitar condiciones de carrera
        const updatedLoan = await tx.loan.update({
          where: { id: loanId },
          data: {
            returnDate: new Date(),
            status: LOAN_STATUS.RETURNED,
            condition,
            notes: notes || loan.notes
          }
        });

        // Luego actualizar el estado del dispositivo
        await tx.device.update({
          where: { id: loan.deviceId },
          data: { status: DEVICE_STATUS.AVAILABLE }
        });

        // Actualizamos el préstamo
        return await tx.loan.update({
          where: { id: loanId },
          data: {
            returnDate: new Date(),
            status: LOAN_STATUS.RETURNED,
            condition,
            notes: notes || loan.notes // Mantener notas existentes si no se proporcionan nuevas
          },
          include: {
            device: true,
            supervisor: true
          }
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        // Si ya es un error personalizado, lo propagamos
        throw error;
      }
      console.error('Error al devolver préstamo:', error);
      throw new Error('Error al actualizar el préstamo en la base de datos');
    }
  });

  getLoanHistory = withMetrics(async (deviceId: string): Promise<Loan[]> => {
    if (!deviceId) {
      throw new Error('El ID del dispositivo es obligatorio');
    }

    try {
      return await prisma.loan.findMany({
        where: {
          deviceId
        },
        include: {
          supervisor: true,
          device: true
        },
        orderBy: {
          loanDate: 'desc'
        }
      });
    } catch (error) {
      console.error(`Error al obtener historial de préstamos para el dispositivo ${deviceId}:`, error);
      throw new Error('Error al consultar el historial de préstamos');
    }
  });
}

export interface LoanCreateData {
  deviceId?: string;
  supervisorId: string;
  qrCode?: string;
  notes?: string;
  condition?: string;
  eventCode?: string;
  newLocation?: string;
}

export const loanService = new LoanService();
