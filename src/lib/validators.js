import { z } from 'zod';

export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(z.string()).optional(),
  timestamp: z.string().datetime()
});

export const DeviceSchema = z.object({
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  category: z.enum(['Laptop', 'Proyector', 'Tablet', 'Monitor', 'Impresora', 'Zebra', 'Otro']),
  status: z.enum(['available', 'on_loan', 'maintenance']).default('available'),
  location: z.string().min(3, 'Ubicación requerida'),
  notes: z.string().optional(),
  qrCode: z.string().optional(),
  supervisorId: z.string().optional()
});

export const LoanSchema = z.object({
  deviceId: z.string().min(1, 'Dispositivo requerido'),
  supervisorId: z.string().min(1, 'Supervisor requerido'),
  startDate: z.string().datetime(),
  expectedReturnDate: z.string().datetime(),
  purpose: z.string().min(10, 'Propósito debe tener al menos 10 caracteres')
});

export const ReturnLoanSchema = z.object({
  condition: z.enum(['good', 'damaged', 'requires_maintenance']).default('good'),
  notes: z.string().optional()
});

export const SupervisorSchema = z.object({
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  department: z.string().min(3, 'Departamento requerido')
});