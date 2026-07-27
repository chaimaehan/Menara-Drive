// src/services/driverPerformanceService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost/OptiTruck/backend/controllers';

class DriverPerformanceService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Récupérer tous les chauffeurs avec leurs performances
  async getDriversPerformance() {
    try {
      const response = await axios.get(`${API_BASE_URL}/driverManagement/chauffeurs.php`, {
        headers: this.getHeaders()
      });
      
      const drivers = response.data;
      
      // Simuler des données de performance (à adapter selon votre backend)
      const driversWithPerformance = drivers.map(driver => ({
        ...driver,
        performance: {
          deliveriesCount: Math.floor(Math.random() * 100) + 20,
          onTimeRate: Math.floor(Math.random() * 30) + 70,
          satisfaction: (Math.random() * 2 + 3).toFixed(1),
          distanceTotal: Math.floor(Math.random() * 2000) + 500,
          fuelEfficiency: (Math.random() * 5 + 6).toFixed(1),
          incidents: Math.floor(Math.random() * 5),
          bonus: Math.floor(Math.random() * 1500) + 200
        }
      }));
      
      // Trier par performance
      const sorted = driversWithPerformance.sort((a, b) => {
        const scoreA = (a.performance.onTimeRate * 0.4) + (parseFloat(a.performance.satisfaction) * 0.3) + (a.performance.deliveriesCount * 0.3);
        const scoreB = (b.performance.onTimeRate * 0.4) + (parseFloat(b.performance.satisfaction) * 0.3) + (b.performance.deliveriesCount * 0.3);
        return scoreB - scoreA;
      });
      
      return sorted;
    } catch (error) {
      console.error('Erreur récupération chauffeurs:', error);
      return [];
    }
  }

  // Récupérer les statistiques globales
  async getGlobalStats(drivers) {
    if (!drivers.length) return null;
    
    const totalDeliveries = drivers.reduce((sum, d) => sum + (d.performance?.deliveriesCount || 0), 0);
    const avgSatisfaction = drivers.reduce((sum, d) => sum + parseFloat(d.performance?.satisfaction || 0), 0) / drivers.length;
    const avgOnTime = drivers.reduce((sum, d) => sum + (d.performance?.onTimeRate || 0), 0) / drivers.length;
    const totalDistance = drivers.reduce((sum, d) => sum + (d.performance?.distanceTotal || 0), 0);
    const totalBonus = drivers.reduce((sum, d) => sum + (d.performance?.bonus || 0), 0);
    
    return {
      totalDrivers: drivers.length,
      totalDeliveries,
      avgSatisfaction: avgSatisfaction.toFixed(1),
      avgOnTime: Math.round(avgOnTime),
      totalDistance: Math.round(totalDistance),
      totalBonus
    };
  }

  // Récupérer le top chauffeurs par catégorie
  async getTopDriversByCategory(drivers) {
    if (!drivers.length) return null;
    
    // Meilleur taux de ponctualité
    const bestOnTime = [...drivers].sort((a, b) => b.performance.onTimeRate - a.performance.onTimeRate)[0];
    
    // Meilleure satisfaction
    const bestSatisfaction = [...drivers].sort((a, b) => parseFloat(b.performance.satisfaction) - parseFloat(a.performance.satisfaction))[0];
    
    // Plus de livraisons
    const mostDeliveries = [...drivers].sort((a, b) => b.performance.deliveriesCount - a.performance.deliveriesCount)[0];
    
    // Meilleure efficacité carburant
    const bestFuelEfficiency = [...drivers].sort((a, b) => parseFloat(a.performance.fuelEfficiency) - parseFloat(b.performance.fuelEfficiency))[0];
    
    return {
      bestOnTime,
      bestSatisfaction,
      mostDeliveries,
      bestFuelEfficiency
    };
  }
}

export default new DriverPerformanceService();