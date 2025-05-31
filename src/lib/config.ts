/**
 * Archivo de configuración centralizada para la aplicación
 * Siguiendo las mejores prácticas de ingeniería de software
 */

// Configuración de la base de datos
export const DATABASE = {
  CONNECTION_TIMEOUT: 30000, // 30 segundos
  QUERY_TIMEOUT: 10000, // 10 segundos
  MAX_CONNECTIONS: 10,
};

// Configuración de métricas
export const METRICS = {
  SLOW_QUERY_THRESHOLD: 1000, // ms
  CACHE_ENABLED: true,
  LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
};

// Categorías de dispositivos
export const DEVICE_CATEGORIES = {
  LAPTOP: 'Laptop',
  PROYECTOR: 'Proyector',
  TABLET: 'Tablet',
  MONITOR: 'Monitor',
  IMPRESORA: 'Impresora',
  ZEBRA: 'Zebra',
  OTRO: 'Otro'
} as const;

// Estados de dispositivos
export const DEVICE_STATUS = {
  AVAILABLE: 'available',
  ON_LOAN: 'on_loan',
  MAINTENANCE: 'maintenance',
} as const;

// Estados de préstamos
export const LOAN_STATUS = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
  LOST: 'lost',
} as const;

// Roles de supervisores
export const SUPERVISOR_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  READONLY: 'readonly',
} as const;

// Mensajes de error
export const ERROR_MESSAGES = {
  DEVICE: {
    NOT_FOUND: 'Dispositivo no encontrado',
    DUPLICATE_QR: 'Ya existe un dispositivo con este código QR',
    ACTIVE_LOANS: 'No se puede eliminar un dispositivo con préstamos activos',
    INVALID_CATEGORY: 'Categoría de dispositivo no válida',
    INVALID_STATUS: 'Estado de dispositivo no válido',
    VALIDATION_ERROR: 'Error de validación en los datos del dispositivo',
  },
  LOAN: {
    DEVICE_NOT_AVAILABLE: 'El dispositivo no está disponible para préstamo',
    NOT_FOUND: 'Préstamo no encontrado',
    ALREADY_RETURNED: 'El préstamo ya ha sido devuelto',
  },
  SUPERVISOR: {
    NOT_FOUND: 'Supervisor no encontrado',
    DUPLICATE_EMAIL: 'Ya existe un supervisor con este correo electrónico',
  },
  TRANSACTION: {
    FAILED: 'Error en la transacción de base de datos'
  }
} as const;

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Configuración de validación
export const VALIDATION = {
  DEVICE: {
    NAME_MIN_LENGTH: 3,
    LOCATION_MIN_LENGTH: 3,
  }
} as const;