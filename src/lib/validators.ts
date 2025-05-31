import { z } from 'zod';
import { DEVICE_CATEGORIES, DEVICE_STATUS, VALIDATION } from './config.js';

export const SupervisorSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string().min(2),
  status: z.string().optional(),
  password: z.string().min(6),
  notes: z.string().optional(),
});

export const DeviceSchema = z.object({
  name: z.string()
    .min(VALIDATION.DEVICE.NAME_MIN_LENGTH, `Nombre debe tener al menos ${VALIDATION.DEVICE.NAME_MIN_LENGTH} caracteres`)
    .transform(val => val.trim()),
  
  category: z.enum(Object.values(DEVICE_CATEGORIES) as [string, ...string[]], {
    errorMap: () => ({ message: `Categoría inválida. Valores permitidos: ${Object.values(DEVICE_CATEGORIES).join(', ')}` })
  }),
  
  status: z.enum(Object.values(DEVICE_STATUS) as [string, ...string[]], {
    errorMap: () => ({ message: `Estado inválido. Valores permitidos: ${Object.values(DEVICE_STATUS).join(', ')}` })
  }).default(DEVICE_STATUS.AVAILABLE),
  
  location: z.string()
    .min(VALIDATION.DEVICE.LOCATION_MIN_LENGTH, `Ubicación debe tener al menos ${VALIDATION.DEVICE.LOCATION_MIN_LENGTH} caracteres`)
    .transform(val => val.trim()),
  
  notes: z.string().optional()
    .transform(val => val?.trim()),
  
  qrCode: z.string().optional()
    .transform(val => val?.trim()),
  
  supervisorId: z.string().optional()
    .transform(val => val?.trim())
});

export const LoanSchema = z.object({
  deviceIds: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un dispositivo").optional(),
  deviceId: z.string().uuid().optional(),
  supervisorId: z.string().uuid(),
  eventCode: z.string().min(2, "El código de evento es requerido"),
  newLocation: z.string().min(2, "La nueva ubicación es requerida"),
  notes: z.string().optional(),
  condition: z.string().optional(),
  startDate: z.date().optional(),
  expectedReturn: z.date().optional(),
});

export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(z.string()).optional(),
  timestamp: z.string().datetime()
});

export const ReturnLoanSchema = z.object({
  condition: z.string().min(2),
  notes: z.string().optional()
});