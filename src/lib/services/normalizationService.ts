import { DEVICE_STATUS, DEVICE_CATEGORIES } from '../config';

/**
 * Servicio para normalización de datos
 * Asegura consistencia en el formato de los datos a través de la aplicación
 */
export class NormalizationService {
  /**
   * Normaliza una cadena de texto a un formato estándar
   * @param value - Valor a normalizar
   * @param format - Formato deseado ('capitalize' | 'upper' | 'lower')
   */
  static normalizeString(value: string, format: 'capitalize' | 'upper' | 'lower' = 'capitalize'): string {
    if (!value) return value;
    
    switch (format) {
      case 'capitalize':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      case 'upper':
        return value.toUpperCase();
      case 'lower':
        return value.toLowerCase();
      default:
        return value;
    }
  }

  /**
   * Normaliza los datos de un dispositivo
   * @param deviceData - Datos del dispositivo a normalizar
   */
  static normalizeDeviceData(deviceData: Record<string, any>): Record<string, any> {
    return {
      ...deviceData,
      name: this.normalizeString(deviceData.name, 'upper'),
      category: this.normalizeString(deviceData.category),
      location: this.normalizeString(deviceData.location, 'upper'),
      status: deviceData.status?.toLowerCase(),
      notes: deviceData.notes?.trim(),
    };
  }

  /**
   * Valida si una categoría es válida
   * @param category - Categoría a validar
   */
  static isValidCategory(category: string): boolean {
    return Object.values(DEVICE_CATEGORIES).includes(this.normalizeString(category));
  }

  /**
   * Valida si un estado es válido
   * @param status - Estado a validar
   */
  static isValidStatus(status: string): boolean {
    return Object.values(DEVICE_STATUS).includes(status.toLowerCase());
  }
} 