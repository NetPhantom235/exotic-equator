import type { Device, Supervisor, Loan } from '@prisma/client';

export interface DeviceWithRelations extends Device {
  supervisor?: Supervisor | null;
  loans?: Loan[];
}

export interface LoanWithRelations extends Loan {
  device: Device;
  supervisor: Supervisor;
}
