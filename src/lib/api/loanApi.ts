export interface Loan {
  id: string;
  deviceId: string;
  userId: string;
  loanDate: Date;
  returnDate?: Date;
  condition?: string;
}

export const loanApi = {
  getAllLoans: async () => {
    const response = await fetch('/api/loans');
    if (!response.ok) {
      throw new Error('Error al obtener los préstamos');
    }
    return response.json();
  },

  getLoanById: async (id: string) => {
    const response = await fetch(`/api/loans/${id}`);
    if (!response.ok) {
      throw new Error('Error al obtener el préstamo');
    }
    return response.json();
  },

  createLoan: async (loan: Omit<Loan, 'id'>) => {
    const response = await fetch('/api/loans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loan),
    });
    if (!response.ok) {
      throw new Error('Error al crear el préstamo');
    }
    return response.json();
  },

  returnLoan: async (id: string, condition: string) => {
    const response = await fetch(`/api/loans/${id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ condition }),
    });
    if (!response.ok) {
      throw new Error('Error al procesar la devolución');
    }
    return response.json();
  },

  getLoanHistory: async (deviceId: string) => {
    const response = await fetch(`/api/loans/history/${deviceId}`);
    if (!response.ok) {
      throw new Error('Error al obtener el historial de préstamos');
    }
    return response.json();
  },
};
