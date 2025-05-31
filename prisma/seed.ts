import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {  // Limpiar la base de datos
  await prisma.loan.deleteMany();
  await prisma.device.deleteMany();
  await prisma.supervisor.deleteMany();  await prisma.queryMetric.deleteMany();
  await prisma.cacheMetric.deleteMany();
  await prisma.systemMetric.deleteMany();

  // Crear supervisores
  const supervisor1 = await prisma.supervisor.create({
    data: {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '123-456-7890',
      role: 'admin',
      password: 'hashed_password_1', // En producción usar bcrypt o similar
      notes: 'Supervisor principal'
    }
  });

  const supervisor2 = await prisma.supervisor.create({
    data: {
      name: 'María González',
      email: 'maria@example.com',
      phone: '098-765-4321',
      role: 'supervisor',
      password: 'hashed_password_2',
      notes: 'Supervisora de área técnica'
    }
  });

  // Crear dispositivos
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        name: 'Laptop HP EliteBook',
        category: 'laptop',
        status: 'available',
        location: 'Sala 101',
        qrCode: 'QR_001',
        supervisorId: supervisor1.id
      }
    }),
    prisma.device.create({
      data: {
        name: 'Proyector Epson',
        category: 'projector',
        status: 'on_loan',
        location: 'Sala 102',
        qrCode: 'QR_002',
        supervisorId: supervisor2.id
      }
    }),
    prisma.device.create({
      data: {
        name: 'iPad Pro',
        category: 'tablet',
        status: 'available',
        location: 'Sala 103',
        qrCode: 'QR_003',
        supervisorId: supervisor1.id
      }
    })
  ]);

  // Crear préstamos
  await Promise.all([
    prisma.loan.create({
      data: {
        deviceId: devices[1].id,
        supervisorId: supervisor2.id,
        status: 'active',
        notes: 'Préstamo para presentación',
        condition: 'good'
      }
    })
  ]);

  // Crear algunas métricas de ejemplo
  const now = new Date();
  for (let i = 0; i < 100; i++) {    await prisma.queryMetric.create({
      data: {
        queryTime: Math.random() * 100,
        queryType: ['SELECT', 'INSERT', 'UPDATE'][Math.floor(Math.random() * 3)],
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        success: Math.random() > 0.1,
        isSlow: Math.random() > 0.9
      }
    });

    await prisma.cacheMetric.create({
      data: {
        hitCount: Math.floor(Math.random() * 10),
        missCount: Math.floor(Math.random() * 3),
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log('Base de datos poblada con datos de prueba');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
