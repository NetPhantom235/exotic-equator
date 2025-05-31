import { PrismaClient, type Prisma } from '@prisma/client';
import type { LoanWithRelations } from './deviceTypes.js';
import type { LoanCreateData } from './loanService.js';
import type { DeviceWithRelations } from './deviceTypes.js';
import { withMetrics } from './decorators/metrics.js';
import { DEVICE_STATUS, ERROR_MESSAGES } from './config.js';

const generateEventCode = () => {
  const date = new Date();
  return `EV-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};

const prismaClient = new PrismaClient();

class DeviceService {
  private cache = new Map<string, {data: any, timestamp: number}>();
  private readonly CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutos

  private getCachedDevice(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRATION) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  private setCacheDevice(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getAllDevices = withMetrics(async (page: number = 1, pageSize: number = 20): Promise<{ devices: DeviceWithRelations[], totalPages: number }> => {
    const [total, devices] = await prismaClient.$transaction([
      prismaClient.device.count(),
      prismaClient.device.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          supervisor: true,
          loans: {
            include: {
              supervisor: true
            },
            orderBy: {
              loanDate: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    return {
      devices,
      totalPages: Math.ceil(total / pageSize)
    };
  });

  getDeviceById = withMetrics(async (id: string): Promise<DeviceWithRelations | null> => {
    if (!id) {
      throw new Error('El ID del dispositivo es requerido');
    }
      
    try {
      return await prismaClient.device.findUnique({
        where: { id },
        include: {
          supervisor: true,
          loans: {
            include: {
              supervisor: true
            },
            orderBy: {
              loanDate: 'desc'
            },
            take: 10
          }
        }
      });
    } catch (error) {
      console.error(`Error al obtener dispositivo con ID ${id}:`, error);
      throw new Error('Error al consultar el dispositivo');
    }
  });

  getDeviceByQrCode = withMetrics(async (qrCode: string, tx?: Prisma.TransactionClient): Promise<DeviceWithRelations | null> => {
    try {
      const prisma = tx || prismaClient;
      
      // Check cache first
      const cached = this.getCachedDevice(qrCode);
      if(cached) return cached;

      const device = await prisma.device.findUnique({
        where: { qrCode },
        include: {
          supervisor: true,
          loans: {
            include: { supervisor: true },
            orderBy: { loanDate: 'desc' }
          }
        }
      });

      if(!device) throw new Error(ERROR_MESSAGES.DEVICE.NOT_FOUND);
      if(device.status !== DEVICE_STATUS.AVAILABLE) {
        throw new Error(ERROR_MESSAGES.LOAN.DEVICE_NOT_AVAILABLE);
      }

      // Cache valid device
      this.setCacheDevice(qrCode, device);
      return device;
    } catch (error) {
      console.error('QR Code lookup error:', error);
      throw new Error('Error processing QR code');
    }
  });

  createLoanTransaction = async (loanData: LoanCreateData): Promise<LoanWithRelations> => {
    if (!loanData.qrCode || !loanData.supervisorId) {
      throw new Error('QR code and supervisor ID are required fields');
    }

return await prismaClient.$transaction(async (tx): Promise<LoanWithRelations> => {
      try {
        const device = await this.getDeviceByQrCode(loanData.qrCode!, tx);
        
        const newLoan = await tx.loan.create({
          data: {
            deviceId: device!.id,
            supervisorId: loanData.supervisorId,
            eventCode: loanData.eventCode ?? generateEventCode(),
            newLocation: loanData.newLocation || (device?.location ?? ''),
            notes: loanData.notes
          }
        });

        await tx.device.update({
          where: { id: device?.id ?? '' },
          data: { 
            status: DEVICE_STATUS.ON_LOAN,
            location: device?.location || ''
          }
        });

const loan = await tx.loan.findUniqueOrThrow({
  where: { id: newLoan.id },
  include: {
    device: true,
    supervisor: true
  }
});

return loan;
      } catch (error) {
        console.error('Transaction failed:', error);
        throw new Error(ERROR_MESSAGES.TRANSACTION.FAILED);
      }
    });
  }

  getAvailableDevices = withMetrics(async (): Promise<DeviceWithRelations[]> => {
    try {
      return await prismaClient.device.findMany({
        where: {
          status: DEVICE_STATUS.AVAILABLE
        },
        include: {
          supervisor: true,
          loans: {
            include: {
              supervisor: true
            },
            orderBy: {
              loanDate: 'desc'
            },
            take: 5
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener dispositivos disponibles:', error);
      throw new Error('Error al consultar los dispositivos disponibles');
    }
  });

  createDevice = withMetrics(async (data: {
    name: string;
    category: string;
    location: string;
    notes?: string;
    qrCode?: string;
    supervisorId?: string;
  }): Promise<DeviceWithRelations> => {
    if (!data.name || !data.category || !data.location) {
      throw new Error('Los campos nombre, categoría y ubicación son obligatorios');
    }
    
    if (data.qrCode) {
      const existing = await prismaClient.device.findUnique({
        where: { qrCode: data.qrCode }
      });
      if (existing) {
        throw new Error(ERROR_MESSAGES.DEVICE.DUPLICATE_QR);
      }
    }

    try {
      const device = await prismaClient.device.create({
        data: {
          ...data,
          status: DEVICE_STATUS.AVAILABLE,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          supervisor: true,
          loans: {
            include: {
              supervisor: true
            },
            orderBy: {
              loanDate: 'desc'
            }
          }
        }
      });

      // Limpiar caché si existe
      if (data.qrCode && this.cache.has(data.qrCode)) {
        this.cache.delete(data.qrCode);
      }

      return device;
    } catch (error) {
      console.error('Error al crear dispositivo:', error);
      throw new Error('Error al crear el dispositivo');
    }
  });

  updateDevice = withMetrics(async (id: string, data: {
    name?: string;
    category?: string;
    location?: string;
    notes?: string;
    qrCode?: string;
    status?: string;
    supervisorId?: string;
  }): Promise<DeviceWithRelations> => {
    const device = await prismaClient.device.findUnique({
      where: { id }
    });
    
    if (!device) {
      throw new Error(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }
    
    if (data.status && !Object.values(DEVICE_STATUS).includes(data.status as any)) {
      throw new Error(`Estado no válido. Los estados permitidos son: ${Object.values(DEVICE_STATUS).join(', ')}`);
    }
    
    if (data.qrCode) {
      const existing = await prismaClient.device.findFirst({
        where: {
          qrCode: data.qrCode,
          NOT: {
            id: id
          }
        }
      });
      if (existing) {
        throw new Error(ERROR_MESSAGES.DEVICE.DUPLICATE_QR);
      }
    }

    try {
      return await prismaClient.device.update({
        where: { id },
        data,
        include: {
          supervisor: true,
          loans: {
            include: {
              supervisor: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error al actualizar dispositivo:', error);
      throw new Error('Error al actualizar el dispositivo en la base de datos');
    }
  });

  deleteDevice = withMetrics(async (id: string): Promise<void> => {
    const device = await prismaClient.device.findUnique({
      where: { id }
    });
    
    if (!device) {
      throw new Error(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }
    
    const activeLoans = await prismaClient.loan.findFirst({
      where: {
        deviceId: id,
        status: 'active'
      }
    });

    if (activeLoans) {
      throw new Error(ERROR_MESSAGES.DEVICE.ACTIVE_LOANS);
    }

    try {
      await prismaClient.device.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error al eliminar dispositivo:', error);
      throw new Error('Error al eliminar el dispositivo de la base de datos');
    }
  });

  searchDevices = withMetrics(async (query: string): Promise<DeviceWithRelations[]> => {
    return await prismaClient.device.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { category: { contains: query } },
          { location: { contains: query } },
          { qrCode: { contains: query } }
        ]
      },
      include: {
        supervisor: true,
        loans: {
          include: {
            supervisor: true
          }
        }
      }
    });
  });

  searchDeviceByQrOrName = withMetrics(async (searchTerm: string): Promise<DeviceWithRelations | null> => {
    if (!searchTerm) {
      throw new Error('Término de búsqueda requerido');
    }

    try {
      // Primero buscar por QR
      let device = await prismaClient.device.findFirst({
        where: {
          qrCode: searchTerm
        },
        include: {
          supervisor: true,
          loans: {
            include: {
              supervisor: true
            },
            orderBy: {
              loanDate: 'desc'
            }
          }
        }
      });

      // Si no se encuentra por QR, buscar por nombre
      if (!device) {
        const devices = await prismaClient.device.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm } },
              { id: searchTerm }
            ]
          },
          include: {
            supervisor: true,
            loans: {
              include: {
                supervisor: true
              },
              orderBy: {
                loanDate: 'desc'
              }
            }
          },
          take: 1 // Solo tomar el primer resultado que coincida
        });

        device = devices[0] || null;
      }

      return device;
    } catch (error) {
      console.error(`Error buscando dispositivo con término "${searchTerm}":`, error);
      throw new Error('Error al buscar el dispositivo');
    }
  });

  getDevicesByCategory = withMetrics(async (category: string): Promise<DeviceWithRelations[]> => {
    return await prismaClient.device.findMany({
      where: { category },
      include: {
        supervisor: true,
        loans: {
          include: {
            supervisor: true
          }
        }
      }
    });
  });

  getDevicesByLocation = withMetrics(async (location: string): Promise<DeviceWithRelations[]> => {
    return await prismaClient.device.findMany({
      where: { location },
      include: {
        supervisor: true,
        loans: {
          include: {
            supervisor: true
          }
        }
      }
    });
  });
}

export const deviceService = new DeviceService();