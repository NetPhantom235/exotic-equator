/**
 * Utilidad para el manejo estandarizado de errores en la aplicación
 * Siguiendo las mejores prácticas de ingeniería de software
 */

// Tipos de errores que pueden ocurrir en la aplicación
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED_ERROR',
  FORBIDDEN = 'FORBIDDEN_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR'
}

// Interfaz para los errores de la aplicación
export interface AppError extends Error {
  type: ErrorType;
  statusCode: number;
  details?: Record<string, any>;
  isOperational: boolean;
}

// Clase base para los errores de la aplicación
export class BaseError extends Error implements AppError {
  type: ErrorType;
  statusCode: number;
  details?: Record<string, any>;
  isOperational: boolean;

  constructor(message: string, type: ErrorType, statusCode: number, isOperational = true, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Capturar la pila de llamadas para mejor depuración
    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores específicos
export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.VALIDATION, 400, true, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.NOT_FOUND, 404, true, details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.UNAUTHORIZED, 401, true, details);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.FORBIDDEN, 403, true, details);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.CONFLICT, 409, true, details);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.DATABASE, 500, true, details);
  }
}

export class InternalError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.INTERNAL, 500, false, details);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.EXTERNAL_SERVICE, 503, true, details);
  }
}

// Función para manejar errores operacionales vs programáticos
export function handleError(error: Error | AppError): void {
  // Si es un error operacional, lo registramos pero permitimos que la aplicación continúe
  if ((error as AppError).isOperational) {
    console.error(`Error operacional: ${error.message}`);
    if ((error as AppError).details) {
      console.error('Detalles:', (error as AppError).details);
    }
  } else {
    // Si es un error de programación, registramos y podríamos tomar acciones más drásticas
    console.error(`Error crítico no operacional: ${error.message}`);
    console.error(error.stack);
    // En producción, aquí podríamos notificar a los desarrolladores, reiniciar el proceso, etc.
  }
}

// Función para convertir errores genéricos a errores de la aplicación
export function normalizeError(error: unknown): AppError {
  if (error instanceof BaseError) {
    return error;
  }

  // Si es un error de Prisma, lo convertimos a un error de base de datos
  if (error instanceof Error && error.name.includes('Prisma')) {
    return new DatabaseError(
      'Error en la base de datos',
      { originalError: error.message }
    );
  }

  // Para cualquier otro tipo de error
  const message = error instanceof Error ? error.message : String(error);
  return new InternalError(message);
}

// Middleware para manejar errores en API endpoints
export function errorMiddleware(error: unknown, req: any, res: any, next: any): void {
  const normalizedError = normalizeError(error);
  
  // Registrar el error
  handleError(normalizedError);
  
  // Enviar respuesta al cliente
  res.status(normalizedError.statusCode).json({
    status: 'error',
    message: normalizedError.message,
    ...(process.env.NODE_ENV === 'development' && { stack: normalizedError.stack }),
    ...(normalizedError.details && { details: normalizedError.details })
  });
}