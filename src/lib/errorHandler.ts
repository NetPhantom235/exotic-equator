export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

interface ErrorResponse {
  message: string;
  statusCode: number;
  context?: Record<string, unknown>;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorMap: Map<string, number> = new Map([
    ['NotFound', 404],
    ['Unauthorized', 401],
    ['Forbidden', 403],
    ['ValidationError', 400],
    ['DatabaseError', 500]
  ]);

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public log(error: Error): void {
    console.error('[Error]:', {
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      context: error instanceof AppError ? error.context : undefined
    });
  }

  public async handle(error: Error): Promise<ErrorResponse> {
    this.log(error);

    if (error instanceof AppError) {
      return {
        message: error.message,
        statusCode: error.statusCode,
        context: error.context
      };
    }

    // Mapear errores comunes a códigos de estado HTTP
    const statusCode = this.errorMap.get(error.name) || 500;

    return {
      message: this.getSafeErrorMessage(error),
      statusCode
    };
  }

  private getSafeErrorMessage(error: Error): string {
    // En producción, no exponer detalles internos
    if (import.meta.env.PROD) {
      return 'Ha ocurrido un error en el servidor';
    }
    return error.message;
  }

  public isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }
}

export const errorHandler = ErrorHandler.getInstance(); 