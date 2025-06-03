import { ErrorType } from './errorHandler.js';

export interface HttpErrorResponse {
  message: string;
  statusCode: number;
  type: ErrorType;
  details?: Record<string, unknown>;
}

export function normalizeHttpError(error: unknown): HttpErrorResponse {
  if (error instanceof Response) {
    return {
      message: error.statusText || 'Error en la petición HTTP',
      statusCode: error.status,
      type: getErrorTypeFromStatus(error.status)
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      type: ErrorType.INTERNAL
    };
  }
  
  return {
    message: 'Error desconocido',
    statusCode: 500,
    type: ErrorType.INTERNAL
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getErrorTypeFromStatus(status: number): ErrorType {
  switch (status) {
    case 400:
      return ErrorType.VALIDATION;
    case 401:
      return ErrorType.UNAUTHORIZED;
    case 403:
      return ErrorType.FORBIDDEN;
    case 404:
      return ErrorType.NOT_FOUND;
    case 409:
      return ErrorType.CONFLICT;
    default:
      return status >= 500 ? ErrorType.INTERNAL : ErrorType.VALIDATION;
  }
}
