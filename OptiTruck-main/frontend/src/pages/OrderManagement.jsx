// src/pages/OrderManagement.jsx

import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, RefreshCcw, Edit3, X, Check,
  Calendar, Package, Users, TrendingUp
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="rounded-lg shadow-md p-6 border-l-4" style={{ background: '#fff', borderLeftColor: color, border: `1px solid #E8E0CC`, borderLeftWidth: '4px' }}>
    <div className="flex items-center">
      <Icon className="h-8 w-8" style={{ color }} />
      <div className="ml-5">
        <div className="text-sm" style={{ color: '#AA9766' }}>{title}</div>
        <div className="text-lg font-semibold" style={{ color: '#2c2b26' }}>{value}</div>
      </div>
    </div>
  </div>
);

const OrderManagement = ({ onLogout }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ client_id: '', produit: '', quantite: '', date_commande: new Date().toISOString().split('T')[0] });
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchOrders = async (date) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost/OptiTruck/backend/controllers/orderManagement/commandes.php?date=${date}`);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get('http://localhost/OptiTruck/backend/controllers/clientManagement/clients.php');
      setClients(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchOrders(dateFilter);
  }, [dateFilter]);

  const validateForm = () => {
    if (!form.client_id || !form.produit || !form.quantite || !form.date_commande) {
      setErrorMsg("Tous les champs sont obligatoires.");
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setAdding(true);
    try {
      if (editingId) {
        await axios.put('http://localhost/OptiTruck/backend/controllers/orderManagement/commandes.php', { id: editingId, ...form });
      } else {
       await axios.post('http://localhost/OptiTruck/backend/controllers/orderManagement/commandes.php', { ...form, livree: 0 });      }
      setForm({ client_id: '', produit: '', quantite: '', date_commande: dateFilter });
      setEditingId(null);
      setShowForm(false);
      fetchOrders(dateFilter);
    } catch (err) {
      setErrorMsg("Erreur lors de la sauvegarde.");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (order) => {
    setForm({
      client_id: order.client_id,
      produit: order.produit,
      quantite: order.quantite,
      date_commande: order.date_commande,
    });
    setEditingId(order.id);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setForm({ client_id: '', produit: '', quantite: '', date_commande: dateFilter });
    setEditingId(null);
    setShowForm(false);
    setErrorMsg('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      await axios.delete(`http://localhost/OptiTruck/backend/controllers/orderManagement/commandes.php?id=${id}`);
      fetchOrders(dateFilter);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDelivery = async (order) => {
    try {
      await axios.put('http://localhost/OptiTruck/backend/controllers/orderManagement/commandes.php', {
        ...order,
        livree: order.livree === 'Oui' ? 'Non' : 'Oui',
      });
      fetchOrders(dateFilter);
    } catch (err) {
      console.error(err);
    }
  };

  // Statistiques
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.livree === 'Oui').length;
  const totalQuantity = orders.reduce((sum, o) => sum + parseInt(o.quantite || 0), 0);
  const uniqueClients = new Set(orders.map(o => o.client_id)).size;

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen p-6 max-w-7xl mx-auto" style={{ background: '#F8F5EB' }}>
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 4, height: 32, background: GOLD_PRIMARY, borderRadius: 2 }} />
          <h1 className="text-3xl font-bold" style={{ color: '#2c2b26' }}>Gestion des Commandes</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Commandes" value={totalOrders} icon={Package} color={GOLD_PRIMARY} />
          <StatCard title="Livrées" value={deliveredOrders} icon={Check} color={GOLD_PRIMARY} />
          <StatCard title="Quantité totale" value={totalQuantity} icon={TrendingUp} color={GOLD_PRIMARY} />
          <StatCard title="Clients" value={uniqueClients} icon={Users} color={GOLD_PRIMARY} />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" style={{ color: '#AA9766' }} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border rounded px-3 py-1 focus:ring-2 focus:outline-none"
              style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
            />
            <button
              onClick={() => fetchOrders(dateFilter)}
              className="px-3 py-1 rounded flex items-center gap-2 transition-colors"
              style={{ background: GOLD_BG, color: '#AA9766' }}
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              Rafraîchir
            </button>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
            style={{ background: GOLD_PRIMARY, color: '#fff' }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-4 rounded shadow mb-6" style={{ borderLeft: `4px solid ${GOLD_PRIMARY}`, border: `1px solid #E8E0CC`, borderLeftWidth: '4px' }}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold" style={{ color: '#2c2b26' }}>{editingId ? 'Modifier' : 'Nouvelle'} commande</h2>
              <button onClick={cancelEdit}><X className="hover:opacity-70" style={{ color: '#AA9766' }} /></button>
            </div>
            {errorMsg && <p className="text-sm mb-2" style={{ color: GOLD_DARK }}>{errorMsg}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="border rounded px-3 py-2 focus:ring-2 focus:outline-none"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
              >
                <option value="">Sélectionner un client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.nom}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Produit"
                value={form.produit}
                onChange={(e) => setForm({ ...form, produit: e.target.value })}
                className="border rounded px-3 py-2 focus:ring-2 focus:outline-none"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
              />
              <input
                type="number"
                placeholder="Quantité"
                value={form.quantite}
                onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                className="border rounded px-3 py-2 focus:ring-2 focus:outline-none"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
              />
              <input
                type="date"
                value={form.date_commande}
                onChange={(e) => setForm({ ...form, date_commande: e.target.value })}
                className="border rounded px-3 py-2 focus:ring-2 focus:outline-none"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={adding}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-all ${
                  adding ? 'cursor-not-allowed opacity-50' : 'hover:shadow-md'
                }`}
                style={{ background: GOLD_PRIMARY, color: '#fff' }}
              >
                {adding ? <RefreshCcw className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Mettre à jour' : 'Ajouter'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded transition-colors hover:bg-gray-100"
                style={{ background: '#F8F5EB', border: `1px solid #E8E0CC`, color: '#AA9766' }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded shadow" style={{ background: '#fff', border: `1px solid #E8E0CC` }}>
          <table className="w-full">
            <thead style={{ background: GOLD_BG }}>
              <tr>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>ID</th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Client</th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Produit</th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Quantité</th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Date</th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Statut</th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: '#E8E0CC' }}>
                  <td className="p-3 text-sm" style={{ color: '#5e4b2a' }}>#{order.id}</td>
                  <td className="p-3 text-sm" style={{ color: '#2c2b26' }}>{clients.find(c => c.id == order.client_id)?.nom || order.client_id}</td>
                  <td className="p-3 text-sm" style={{ color: '#5e4b2a' }}>{order.produit}</td>
                  <td className="p-3 text-sm font-medium" style={{ color: GOLD_DARK }}>{order.quantite}</td>
                  <td className="p-3 text-sm" style={{ color: '#5e4b2a' }}>{new Date(order.date_commande).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleDelivery(order)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        order.livree === 'Oui' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}
                      style={order.livree === 'Oui' ? {} : { background: GOLD_BG, color: GOLD_DARK }}
                    >
                      {order.livree === 'Oui' ? 'Livrée' : 'En attente'}
                    </button>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button 
                      onClick={() => handleEdit(order)} 
                      className="transition-colors hover:opacity-70"
                      style={{ color: GOLD_PRIMARY }}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(order.id)} 
                      className="transition-colors hover:opacity-70"
                      style={{ color: GOLD_DARK }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan="7" className="text-center py-6" style={{ color: '#AA9766' }}>
                    <Package className="h-12 w-12 mx-auto mb-3" style={{ color: '#D4C8A8' }} />
                    Aucune commande trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer avec informations supplémentaires */}
        {orders.length > 0 && (
          <div className="mt-4 p-3 rounded text-sm" style={{ background: GOLD_BG, color: '#AA9766' }}>
            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-2">
              <span>📊 {totalOrders} commande{totalOrders > 1 ? 's' : ''} au total</span>
              <span>✅ {deliveredOrders} livrée{deliveredOrders > 1 ? 's' : ''}</span>
              <span>📦 {totalQuantity} unités commandées</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OrderManagement;