import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma.js';
import { ERROR_MESSAGES } from '../../../lib/config.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Obtener y validar los datos de entrada
    let data;
    try {
      data = await request.json();
      console.log('Datos recibidos en el servidor:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error al parsear JSON:', e);
      return new Response(JSON.stringify({
        error: 'Formato de datos inválido',
        code: 'INVALID_JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar que todos los campos requeridos estén presentes
    const { deviceIds, supervisorId, eventCode = 'default-event', newLocation = 'default-location', notes = null } = data;
    
    console.log('deviceIds:', deviceIds);
    console.log('supervisorId:', supervisorId);
    
    // Validaciones básicas
    if (!deviceIds) {
      console.error('Error: deviceIds es undefined o null');
      return new Response(JSON.stringify({
        error: 'El campo deviceIds es requerido',
        code: 'MISSING_DEVICE_IDS'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!Array.isArray(deviceIds)) {
      console.error('Error: deviceIds no es un array:', typeof deviceIds);
      return new Response(JSON.stringify({
        error: 'deviceIds debe ser un array',
        code: 'INVALID_DEVICE_IDS_FORMAT'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (deviceIds.length === 0) {
      console.error('Error: deviceIds está vacío');
      return new Response(JSON.stringify({
        error: 'Debe seleccionar al menos un dispositivo',
        code: 'DEVICES_REQUIRED'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!supervisorId) {
      console.error('Error: supervisorId es undefined o null');
      return new Response(JSON.stringify({
        error: 'Debe seleccionar un supervisor',
        code: 'SUPERVISOR_REQUIRED'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Verificar que el supervisor exista
      console.log('Verificando si existe el supervisor:', supervisorId);
      const supervisor = await prisma.supervisor.findUnique({
        where: { id: supervisorId }
      });

      if (!supervisor) {
        console.error('Error: Supervisor no encontrado:', supervisorId);
        return new Response(JSON.stringify({
          error: 'El supervisor seleccionado no existe',
          code: 'SUPERVISOR_NOT_FOUND'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.log('Supervisor encontrado:', supervisor.name);
      
      // Verificar que todos los dispositivos existan
      console.log('Verificando dispositivos:', deviceIds);
      const devices = await prisma.device.findMany({
        where: {
          id: { in: deviceIds }
        }
      });
      
      console.log(`Encontrados ${devices.length} de ${deviceIds.length} dispositivos`);
      
      if (devices.length !== deviceIds.length) {
        const foundIds = devices.map(d => d.id);
        const missingIds = deviceIds.filter(id => !foundIds.includes(id));
        console.error('Dispositivos no encontrados:', missingIds);
        
        return new Response(JSON.stringify({
          error: `Uno o más dispositivos no existen: ${missingIds.join(', ')}`,
          code: 'DEVICES_NOT_FOUND'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Paso 1: Verificar que los dispositivos estén disponibles
      console.log('Verificando disponibilidad de dispositivos...');
      const loansCheck = await prisma.loan.findMany({
        where: {
          deviceId: { in: deviceIds },
          status: 'active'
        }
      });
      
      if (loansCheck.length > 0) {
        const unavailableDeviceIds = loansCheck.map(loan => loan.deviceId);
        const unavailableDevices = devices.filter(device => 
          unavailableDeviceIds.includes(device.id)
        );
        
        console.error('Dispositivos con préstamos activos:', unavailableDevices.map(d => d.name));
        
        return new Response(JSON.stringify({
          error: `Los siguientes dispositivos ya están prestados: ${unavailableDevices.map(d => d.name).join(', ')}`,
          code: 'DEVICES_UNAVAILABLE'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Paso 2: Crear préstamos
      console.log('Creando préstamos para los dispositivos:', deviceIds);
      const createPromises = [];
      const now = new Date();

      // Preparar los datos para los préstamos
      for (const deviceId of deviceIds) {
        console.log('Procesando dispositivo:', deviceId);
        const createPromise = prisma.loan.create({
          data: {
            deviceId,
            supervisorId,
            eventCode,
            newLocation,
            loanDate: now,
            status: 'active',
            notes
          }
        });
        createPromises.push(createPromise);

        // Actualizar el estado del dispositivo
        await prisma.device.update({
          where: { id: deviceId },
          data: { 
            status: 'on_loan',
            location: newLocation
          }
        });
        console.log('Dispositivo marcado como prestado:', deviceId);
      }

      // Paso 3: Ejecutar todas las promesas
      console.log('Ejecutando creación de préstamos...');
      const createdLoans = await Promise.all(createPromises);
      console.log(`Préstamos creados: ${createdLoans.length}`);

      return new Response(JSON.stringify({
        message: 'Préstamos creados exitosamente',
        count: createdLoans.length,
        loans: createdLoans
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      console.error('Error en operaciones de base de datos:', error);
      
      // Verificar si es un error de violación de restricción única
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Mensaje de error completo:', errorMessage);
      
      if (errorMessage.includes('Unique constraint failed')) {
        return new Response(JSON.stringify({
          error: 'Uno o más dispositivos ya tienen préstamos registrados en esta fecha',
          code: 'UNIQUE_CONSTRAINT_FAILED',
          details: errorMessage
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Manejo genérico de otros errores de base de datos
      return new Response(JSON.stringify({
        error: 'Error al procesar los préstamos en la base de datos',
        code: 'DATABASE_ERROR',
        details: errorMessage
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error general al crear préstamo:', error);
    const errorDetail = error instanceof Error ? 
      { message: error.message, stack: error.stack } : 
      String(error);
    
    console.error('Detalles del error:', JSON.stringify(errorDetail));
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : ERROR_MESSAGES.TRANSACTION.FAILED,
      code: 'SERVER_ERROR',
      details: error instanceof Error ? error.stack : null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 