// src/services/aiDataService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost/OptiTruck/backend/controllers';

class AIDataService {

  getToken() {
    return localStorage.getItem('token');
  }

  getHeaders() {
    const token = this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getLivraisons() {
    try {
      const token = this.getToken();
      if (!token) return { total: 0, today: 0, completed: 0, pending: 0 };

      const response = await axios.get(
        `${API_BASE_URL}/adminLivraisons/livraisons.php`,
        {
          params:  { all: 1 }, // ✅ toutes les livraisons pour les stats globales
          headers: this.getHeaders(),
          validateStatus: (status) => status < 500,
        }
      );

      const deliveries = response.data;

      if (!Array.isArray(deliveries)) {
        console.error('getLivraisons: tableau attendu, reçu :', deliveries);
        return { total: 0, today: 0, completed: 0, pending: 0 };
      }

      const today = new Date().toISOString().split('T')[0];

      return {
        total:     deliveries.length,
        today:     deliveries.filter(d =>
                     d.completed_at?.startsWith(today) ||
                     d.date_livraison?.startsWith(today)
                   ).length,
        completed: deliveries.filter(d => d.livree == 1).length,
        pending:   deliveries.filter(d => d.livree == 0).length,
      };
    } catch (error) {
      console.error('Erreur récupération livraisons:', error);
      return { total: 0, today: 0, completed: 0, pending: 0 };
    }
  }

  async getProduits() {
    try {
      const token = this.getToken();
      if (!token) return { total: 0, lowStockCount: 0, lowStockProducts: [] };

      const response = await axios.get(
        `${API_BASE_URL}/gestionProduits/produits.php`,
        {
          headers: this.getHeaders(),
          validateStatus: (status) => status < 500,
        }
      );

      const products = response.data;

      if (!Array.isArray(products)) {
        console.error('getProduits: tableau attendu, reçu :', products);
        return { total: 0, lowStockCount: 0, lowStockProducts: [] };
      }

      const lowStockProducts = products.filter(
        p => p.quantite_disponible <= p.quantite_minimale
      );

      return {
        total:            products.length,
        lowStockCount:    lowStockProducts.length,
        lowStockProducts: lowStockProducts.slice(0, 5),
      };
    } catch (error) {
      console.error('Erreur récupération produits:', error);
      return { total: 0, lowStockCount: 0, lowStockProducts: [] };
    }
  }

  async getChauffeurs() {
    try {
      const token = this.getToken();
      if (!token) return { total: 0, active: 0, inactive: 0 };

      const response = await axios.get(
        `${API_BASE_URL}/driverManagement/chauffeurs.php`,
        {
          headers: this.getHeaders(),
          validateStatus: (status) => status < 500,
        }
      );

      const drivers = response.data;

      if (!Array.isArray(drivers)) {
        console.error('getChauffeurs: tableau attendu, reçu :', drivers);
        return { total: 0, active: 0, inactive: 0 };
      }

      const activeDrivers = drivers.filter(d => d.statut === 'actif');

      return {
        total:    drivers.length,
        active:   activeDrivers.length,
        inactive: drivers.length - activeDrivers.length,
      };
    } catch (error) {
      console.error('Erreur récupération chauffeurs:', error);
      return { total: 0, active: 0, inactive: 0 };
    }
  }

  async getCamions() {
    try {
      const token = this.getToken();
      if (!token) return { total: 0, disponible: 0, enRoute: 0, maintenance: 0 };

      const response = await axios.get(
        `${API_BASE_URL}/truckManagement/trucks.php`,
        {
          headers: this.getHeaders(),
          validateStatus: (status) => status < 500,
        }
      );

      const trucks = response.data;

      if (!Array.isArray(trucks)) {
        console.error('getCamions: tableau attendu, reçu :', trucks);
        return { total: 0, disponible: 0, enRoute: 0, maintenance: 0 };
      }

      return {
        total:       trucks.length,
        disponible:  trucks.filter(t => t.statut === 'disponible').length,
        enRoute:     trucks.filter(t => t.statut === 'en_route').length,
        maintenance: trucks.filter(t => t.statut === 'maintenance').length,
      };
    } catch (error) {
      console.error('Erreur récupération camions:', error);
      return { total: 0, disponible: 0, enRoute: 0, maintenance: 0 };
    }
  }

  async getCommandes() {
    try {
      const token = this.getToken();
      if (!token) return { total: 0, today: 0 };

      const response = await axios.get(
        `${API_BASE_URL}/orderManagement/commandes.php`,
        {
          headers: this.getHeaders(),
          validateStatus: (status) => status < 500,
        }
      );

      const orders = response.data;

      if (!Array.isArray(orders)) {
        console.error('getCommandes: tableau attendu, reçu :', orders);
        return { total: 0, today: 0 };
      }

      const today = new Date().toISOString().split('T')[0];

      return {
        total: orders.length,
        today: orders.filter(o => o.date_commande === today).length,
      };
    } catch (error) {
      console.error('Erreur récupération commandes:', error);
      return { total: 0, today: 0 };
    }
  }

  async getAllData() {
    const [livraisons, produits, chauffeurs, camions, commandes] = await Promise.all([
      this.getLivraisons(),
      this.getProduits(),
      this.getChauffeurs(),
      this.getCamions(),
      this.getCommandes(),
    ]);

    return {
      livraisons,
      produits,
      chauffeurs,
      camions,
      commandes,
      lastUpdate: new Date().toISOString(),
    };
  }
}

export default new AIDataService();