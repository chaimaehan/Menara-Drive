import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Search, Plus, XCircle, CheckCircle, AlertTriangle, MapPin, Package, ToggleLeft, ToggleRight, Warehouse } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '../components/Navbar';

const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_BG = '#F8F5EB';

const StockManagement = ({ user, onLogout }) => {
  const [stocks, setStocks] = useState([]);
  const [form, setForm] = useState({ nom: '', adresse: '', latitude: '', longitude: '', statut: 'actif' });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchStocks(); }, []);

  const fetchStocks = async () => {
    try {
      const res = await axios.get('http://localhost/OptiTruck/backend/controllers/stockManagement/stocks.php');
      setStocks(res.data);
    } catch {
      showMsg('error', 'Erreur lors du chargement des stocks.');
    }
  };

  const showMsg = (type, content) => {
    setMessage({ type, content });
    setTimeout(() => setMessage({ type: '', content: '' }), 3000);
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nom || !form.adresse || !form.latitude || !form.longitude) {
      showMsg('error', 'Tous les champs sont obligatoires.');
      return;
    }
    const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) };
    try {
      if (editingId) {
        await axios.put(`http://localhost/OptiTruck/backend/controllers/stockManagement/stocks.php?id=${editingId}`, payload);
        showMsg('success', 'Stock mis à jour avec succès !');
      } else {
        await axios.post('http://localhost/OptiTruck/backend/controllers/stockManagement/stocks.php', payload);
        showMsg('success', 'Stock ajouté avec succès !');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ nom: '', adresse: '', latitude: '', longitude: '', statut: 'actif' });
      fetchStocks();
    } catch {
      showMsg('error', "Erreur lors de l'enregistrement.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost/OptiTruck/backend/controllers/stockManagement/stocks.php?id=${id}`);
      fetchStocks();
      showMsg('success', 'Stock supprimé avec succès !');
      setConfirmDelete(null);
    } catch {
      showMsg('error', 'Erreur lors de la suppression.');
    }
  };

  const handleEdit = (stock) => {
    setForm({
      nom: stock.nom ?? '',
      adresse: stock.adresse ?? '',
      latitude: stock.latitude != null ? String(stock.latitude) : '',
      longitude: stock.longitude != null ? String(stock.longitude) : '',
      statut: stock.statut ?? 'actif'
    });
    setEditingId(stock.id);
    setShowModal(true);
  };

  const filteredStocks = useMemo(() => {
    const term = search.toLowerCase();
    return stocks.filter(s => (s.nom ?? '').toLowerCase().includes(term) || (s.adresse ?? '').toLowerCase().includes(term));
  }, [stocks, search]);

  const stats = useMemo(() => ({
    total: stocks.length,
    actif: stocks.filter(s => s.statut === 'actif').length,
    inactif: stocks.filter(s => s.statut !== 'actif').length,
  }), [stocks]);

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <main className="max-w-7xl mx-auto p-6 space-y-8" style={{ background: GOLD_BG, minHeight: '100vh' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div style={{ width: 4, height: 40, background: GOLD_PRIMARY, borderRadius: 2 }} />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: GOLD_DARK }}>Gestion des Stocks</h1>
              <p className="text-sm" style={{ color: GOLD_PRIMARY }}>Gérez vos entrepôts et points de stockage</p>
            </div>
          </div>
          <button
            onClick={() => { setForm({ nom: '', adresse: '', latitude: '', longitude: '', statut: 'actif' }); setEditingId(null); setShowModal(true); }}
            className="flex items-center gap-2 text-white px-5 py-3 rounded-xl font-semibold shadow-md transition-all hover:shadow-lg"
            style={{ background: GOLD_PRIMARY }}
          >
            <Plus size={20} /> Ajouter un stock
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Stocks', value: stats.total, icon: Warehouse, color: GOLD_PRIMARY, bg: '#FFF8EE' },
            { label: 'Actifs', value: stats.actif, icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Inactifs', value: stats.inactif, icon: XCircle, color: '#dc2626', bg: '#fff5f5' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-5 shadow-sm border flex items-center gap-4"
              style={{ background: stat.bg, borderColor: '#E8E0CC' }}
            >
              <div className="p-3 rounded-xl" style={{ background: stat.color + '20' }}>
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center bg-white border rounded-xl px-4 py-3 shadow-sm max-w-md" style={{ borderColor: '#E8E0CC' }}>
          <Search size={20} className="text-gray-400 mr-3" />
          <input
            type="search"
            placeholder="Rechercher par nom ou adresse..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border-none focus:ring-0 focus:outline-none text-sm"
          />
        </div>

        {/* Stock Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredStocks.map((stock, i) => (
              <motion.div key={stock.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
                style={{ borderColor: '#E8E0CC' }}
              >
                {/* Card Header */}
                <div className="p-5 border-b" style={{ borderColor: '#E8E0CC', background: stock.statut === 'actif' ? '#F8FFF8' : '#FFF8F8' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl" style={{ background: GOLD_PRIMARY + '20' }}>
                        <Package size={20} style={{ color: GOLD_PRIMARY }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: '#2c2b26' }}>{stock.nom}</h3>
                        <span className="text-xs font-mono text-gray-400">ID: {stock.id}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      stock.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {stock.statut === 'actif' ? '✓ Actif' : '✗ Inactif'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} style={{ color: GOLD_PRIMARY }} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{stock.adresse}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg p-2 text-center" style={{ background: GOLD_BG }}>
                      <p className="text-xs text-gray-400">Latitude</p>
                      <p className="text-sm font-mono font-medium" style={{ color: GOLD_DARK }}>
                        {stock.latitude != null ? Number(stock.latitude).toFixed(4) : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: GOLD_BG }}>
                      <p className="text-xs text-gray-400">Longitude</p>
                      <p className="text-sm font-mono font-medium" style={{ color: GOLD_DARK }}>
                        {stock.longitude != null ? Number(stock.longitude).toFixed(4) : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 pb-5 flex gap-2">
                  <button onClick={() => handleEdit(stock)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-sm"
                    style={{ background: GOLD_PRIMARY + '15', color: GOLD_DARK }}
                  >
                    <Pencil size={14} /> Modifier
                  </button>
                  <button onClick={() => setConfirmDelete(stock.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-sm"
                    style={{ background: '#fee2e2', color: '#dc2626' }}
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredStocks.length === 0 && (
            <div className="col-span-3 text-center py-16">
              <Warehouse size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-400 font-medium">Aucun stock trouvé</p>
            </div>
          )}
        </div>

        {/* Toast Message */}
        <AnimatePresence>
          {message.content && (
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl z-50"
              style={{ background: message.type === 'success' ? '#f0fdf4' : '#fff5f5', border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}` }}
            >
              {message.type === 'success' ? <CheckCircle className="text-green-600" size={20} /> : <AlertTriangle className="text-red-600" size={20} />}
              <p className="font-medium text-sm" style={{ color: message.type === 'success' ? '#16a34a' : '#dc2626' }}>{message.content}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b" style={{ borderColor: '#E8E0CC', background: GOLD_BG }}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold" style={{ color: GOLD_DARK }}>
                    {editingId ? '✏️ Modifier un stock' : '➕ Ajouter un stock'}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500">
                    <XCircle size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: GOLD_DARK }}>Nom du stock *</label>
                    <input name="nom" value={form.nom} onChange={handleChange} placeholder="Ex: Stock Principal"
                      className="w-full border rounded-xl p-3 focus:outline-none text-sm"
                      style={{ borderColor: '#E8E0CC' }} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: GOLD_DARK }}>Adresse *</label>
                    <input name="adresse" value={form.adresse} onChange={handleChange} placeholder="Ex: Zone Industrielle, Marrakech"
                      className="w-full border rounded-xl p-3 focus:outline-none text-sm"
                      style={{ borderColor: '#E8E0CC' }} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: GOLD_DARK }}>Latitude *</label>
                      <input name="latitude" value={form.latitude} onChange={handleChange} type="number" step="any" placeholder="31.6295"
                        className="w-full border rounded-xl p-3 focus:outline-none text-sm"
                        style={{ borderColor: '#E8E0CC' }} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: GOLD_DARK }}>Longitude *</label>
                      <input name="longitude" value={form.longitude} onChange={handleChange} type="number" step="any" placeholder="-7.9811"
                        className="w-full border rounded-xl p-3 focus:outline-none text-sm"
                        style={{ borderColor: '#E8E0CC' }} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: GOLD_DARK }}>Statut</label>
                    <select name="statut" value={form.statut} onChange={handleChange}
                      className="w-full border rounded-xl p-3 focus:outline-none text-sm"
                      style={{ borderColor: '#E8E0CC', color: '#2c2b26' }}
                    >
                      <option value="actif">✓ Actif</option>
                      <option value="inactif">✗ Inactif</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleSubmit}
                    className="flex-1 py-3 rounded-xl text-white font-semibold shadow-md transition-all hover:shadow-lg"
                    style={{ background: GOLD_PRIMARY }}
                  >
                    {editingId ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl font-semibold"
                    style={{ background: '#E8E0CC', color: '#5e4b2a' }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#2c2b26' }}>Confirmer la suppression</h3>
              <p className="text-gray-500 text-sm mb-6">Voulez-vous vraiment supprimer ce stock ? Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2 rounded-xl text-white font-semibold bg-red-600 hover:bg-red-700">
                  Supprimer
                </button>
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 rounded-xl font-semibold"
                  style={{ background: '#E8E0CC', color: '#5e4b2a' }}>
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StockManagement;