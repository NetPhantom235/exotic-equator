import type { APIRoute } from 'astro';
import { loanService } from '../../lib/loanService.js';
import { LoanSchema, ErrorSchema } from '../../lib/validators.js';
import type { ZodError } from 'zod';

export const GET: APIRoute = async ({ request }) => {
  try {
    const loans = await loanService.getAllLoans();
    return new Response(JSON.stringify({
      success: true,
      count: loans.length,
      data: loans
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (error) {
    console.error('GET /api/loans error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Database error',
      code: 'LOAN_FETCH_ERROR',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const validation = LoanSchema.safeParse(data);
    if (!validation.success) {
      return new Response(JSON.stringify(ErrorSchema.parse({
        code: 'VALIDATION_ERROR',
        message: 'Datos de préstamo inválidos',
        details: validation.error.errors.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ),
        timestamp: new Date().toISOString()
      })), {
        status: 400,
        headers: {'Content-Type': 'application/json'}
      });
    }
    // Soporte para múltiples dispositivos
    const { deviceIds, ...rest } = validation.data;
    let loans = [];
    if (deviceIds && Array.isArray(deviceIds)) {
      for (const deviceId of deviceIds) {
        const existingLoan = await loanService.getActiveLoansByDevice(deviceId);
        if (existingLoan) {
          return new Response(JSON.stringify({
            success: false,
            error: `El dispositivo ${deviceId} ya está prestado`,
            code: 'DEVICE_ALREADY_LOANED',
            existingLoanId: existingLoan.id
          }), {
            status: 409,
            headers: {'Content-Type': 'application/json'}
          });
        }
        const loan = await loanService.createLoan({ ...rest, deviceId });
        loans.push(loan);
      }
    } else if (validation.data.deviceId) {
      // Legacy: solo un dispositivo
      const deviceId = validation.data.deviceId as string;
      const existingLoan = await loanService.getActiveLoansByDevice(deviceId);
      if (existingLoan) {
        return new Response(JSON.stringify({
          success: false,
          error: 'El dispositivo ya está prestado',
          code: 'DEVICE_ALREADY_LOANED',
          existingLoanId: existingLoan.id
        }), {
          status: 409,
          headers: {'Content-Type': 'application/json'}
        });
      }
      const { deviceId: _, ...restData } = validation.data;
      const loan = await loanService.createLoan({ ...restData, deviceId });
      loans.push(loan);
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'No se proporcionaron dispositivos',
        code: 'NO_DEVICES',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: {'Content-Type': 'application/json'}
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Préstamo(s) creado(s) exitosamente',
      data: loans
    }), {
      status: 201,
      headers: loans.length === 1
        ? { 'Content-Type': 'application/json', 'Location': `/api/loans/${loans[0].id}` }
        : { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('POST /api/loans error:', error);
    if (error instanceof Error) {
      const errorResponse = {
        code: 'code' in error ? (error as any).code : 'LOAN_CREATION_ERROR',
        message: error.message || 'Error al crear el préstamo',
        details: 'details' in error ? (error as any).details : undefined,
        timestamp: new Date().toISOString()
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {'Content-Type': 'application/json'}
      });
    }
    return new Response(JSON.stringify({
      code: 'UNKNOWN_ERROR',
      message: 'Error desconocido al crear el préstamo',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {'Content-Type': 'application/json'}
    });
  }
};
