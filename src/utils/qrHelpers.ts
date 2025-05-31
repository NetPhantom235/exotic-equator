import type { DeviceWithRelations } from '../lib/deviceTypes.js';

export interface QRScanResult {
  success: boolean;
  device?: DeviceWithRelations;
  error?: string;
  details?: string;
}

export async function findDeviceByQR(searchTerm: string): Promise<QRScanResult> {
  try {
    const response = await fetch(`/api/devices/search?qr=${encodeURIComponent(searchTerm)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Dispositivo no encontrado',
          details: 'Verifica que el código QR corresponde a un dispositivo registrado'
        };
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.device) {
      return {
        success: false,
        error: 'Dispositivo no encontrado',
        details: 'No se encontró información del dispositivo'
      };
    }

    return {
      success: true,
      device: data.device
    };
  } catch (error) {
    console.error('Error buscando dispositivo:', error);
    return {
      success: false,
      error: 'Error al buscar el dispositivo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export function checkCameraSupport(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    window.isSecureContext
  );
}

export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return 'granted';
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') return 'denied';
    }
    return 'prompt';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Error desconocido';
}
