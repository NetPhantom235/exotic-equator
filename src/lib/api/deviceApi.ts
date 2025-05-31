// In ../deviceTypes.ts
export type Device = {
  id: string;
  // ... other properties
};

export const deviceApi = {
  getAllDevices: async () => {
    const response = await fetch('/api/devices');
    if (!response.ok) {
      throw new Error('Error al obtener los dispositivos');
    }
    return response.json();
  },

  getDeviceById: async (id: string) => {
    const response = await fetch(`/api/devices/${id}`);
    if (!response.ok) {
      throw new Error('Error al obtener el dispositivo');
    }
    return response.json();
  },

  createDevice: async (device: {
    name: string;
    category: string;
    status: string;
    location: string;
    notes?: string;
    qrCode?: string;
    supervisorId?: string;
  }) => {
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(device),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al crear el dispositivo');
    }
    return response.json();
  },

  updateDevice: async (id: string, device: {
    name?: string;
    category?: string;
    status?: string;
    location?: string;
    notes?: string;
    qrCode?: string;
    supervisorId?: string;
  }) => {
    const response = await fetch(`/api/devices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(device),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el dispositivo');
    }
    return response.json();
  },

  deleteDevice: async (id: string) => {
    const response = await fetch(`/api/devices/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error al eliminar el dispositivo');
    }
  },
};
