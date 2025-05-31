import type { APIRoute } from 'astro';
import { loanService } from '../../../lib/loanService';
import { deviceService } from '../../../lib/deviceService';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Validate request parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';
    
    if (!['7d', '30d', '90d', 'all'].includes(period)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid period parameter',
        validPeriods: ['7d', '30d', '90d', 'all'],
        code: 'INVALID_PERIOD'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Obtener todos los préstamos y dispositivos para calcular estadísticas
    const [loans, devices] = await Promise.all([
      loanService.getAllLoans(),
      deviceService.getAllDevices()
    ]);

    // Calcular estadísticas
    const activeLoans = loans.filter(loan => !loan.returnDate);
    const returnedLoans = loans.filter(loan => loan.returnDate);
    
    // Dispositivos por estado
    const devicesByStatus = {
      available: devices.filter(d => d.status === 'available').length,
      on_loan: devices.filter(d => d.status === 'on_loan').length,
      maintenance: devices.filter(d => d.status === 'maintenance').length,
      total: devices.length
    };
    
    // Préstamos por categoría de dispositivo
    const loansByCategory = {};
    activeLoans.forEach(loan => {
      const category = loan.device.category;
      loansByCategory[category] = (loansByCategory[category] || 0) + 1;
    });
    
    // Préstamos por mes (últimos 6 meses)
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    const loansByMonth = {};
    loans.forEach(loan => {
      const loanDate = new Date(loan.loanDate);
      if (loanDate >= sixMonthsAgo) {
        const monthYear = `${loanDate.getMonth() + 1}/${loanDate.getFullYear()}`;
        loansByMonth[monthYear] = (loansByMonth[monthYear] || 0) + 1;
      }
    });
    
    // Tiempo promedio de préstamo (en días)
    let totalLoanDays = 0;
    let completedLoansCount = 0;
    
    returnedLoans.forEach(loan => {
      const loanDate = new Date(loan.loanDate);
      const returnDate = new Date(loan.returnDate);
      const loanDays = Math.round((returnDate.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24));
      totalLoanDays += loanDays;
      completedLoansCount++;
    });
    
    const averageLoanDays = completedLoansCount > 0 ? Math.round(totalLoanDays / completedLoansCount) : 0;
    
    // Construir respuesta con todas las estadísticas
    const stats = {
      success: true,
      data: {
        meta: {
          period: period,
          generatedAt: new Date().toISOString(),
          deviceCount: devices.length,
          loanCount: loans.length
        },
        devices: devicesByStatus,
        loans: {
          active: activeLoans.length,
          returned: returnedLoans.length,
          total: loans.length,
          byCategory: loansByCategory,
          trends: loansByMonth,
          averageDuration: averageLoanDays
        }
      }
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: stats
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60' // Cachear por 1 minuto
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de préstamos:', error);
    
    console.error('Loan statistics error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate statistics',
      code: 'STATS_GENERATION_ERROR',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};