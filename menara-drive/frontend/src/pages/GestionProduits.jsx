import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, Loader2, Package, AlertTriangle, Calendar, MapPin, Hash, TrendingUp, Search, Filter, X, Eye, BarChart3, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const API_URL = 'http://localhost/OptiTruck/backend/controllers/gestionProduits/produits.php';
const STOCK_API = 'http://localhost/OptiTruck/backend/controllers/stockManagement/stocks.php';

const GestionProduits = ({ user, onLogout }) => {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  // Chargement des stocks
  useEffect(() => {
    axios.get(STOCK_API)
      .then(res => setStocks(res.data))
      .catch(() => alert("Erreur chargement des stocks"));
  }, []);

  // Chargement des produits
  useEffect(() => {
    if (!selectedStock) {
      setProducts([]);
      setFilteredProducts([]);
      return;
    }
    setLoading(true);
    axios.get(API_URL)
      .then(res => {
        const filtered = res.data.filter(p => String(p.stock_id) === String(selectedStock));
        setProducts(filtered);
        setFilteredProducts(filtered);
      })
      .catch(() => alert("Erreur chargement des produits"))
      .finally(() => setLoading(false));
  }, [selectedStock]);

  // Filtrage et recherche
  useEffect(() => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.produit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.emplacement_stock?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(p => p.statut === statusFilter);
    }
    
    if (showLowStock) {
      filtered = filtered.filter(p => p.quantite_disponible <= p.quantite_minimale);
    }
    
    setFilteredProducts(filtered);
  }, [products, searchTerm, statusFilter, showLowStock]);

  const handleDelete = (id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    axios.delete(`${API_URL}?id=${id}`)
      .then(() => {
        setProducts(prev => prev.filter(p => p.id !== id));
      })
      .catch(() => alert("Erreur suppression"));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const isEdit = !!form.id;
    const method = isEdit ? 'put' : 'post';
    const url = isEdit ? `${API_URL}?id=${form.id}` : API_URL;

    const headers = isEdit
      ? { 'Content-Type': 'application/x-www-form-urlencoded' }
      : { 'Content-Type': 'application/json' };

    const data = isEdit
      ? new URLSearchParams(form).toString()
      : JSON.stringify(form);

    axios({ method, url, data, headers })
      .then(() => {
        setForm(null);
        axios.get(API_URL).then(res => {
          const filtered = res.data.filter(p => String(p.stock_id) === String(selectedStock));
          setProducts(filtered);
        });
      })
      .catch(() => alert("Erreur enregistrement"));
  };

  const getStatusColor = (statut) => {
    return statut === 'disponible' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
  };

  const getQuantityStatus = (product) => {
    if (product.quantite_disponible <= product.quantite_minimale) {
      return { color: 'text-red-700 bg-red-100', icon: AlertTriangle, label: 'Stock faible' };
    } else if (product.quantite_maximale && product.quantite_disponible >= product.quantite_maximale * 0.8) {
      return { color: 'text-green-700 bg-green-100', icon: TrendingUp, label: 'Stock optimal' };
    }
    return { color: 'text-blue-700 bg-blue-100', icon: Package, label: 'Stock normal' };
  };

  const statsData = {
    total: filteredProducts.length,
    lowStock: filteredProducts.filter(p => p.quantite_disponible <= p.quantite_minimale).length,
    disponible: filteredProducts.filter(p => p.statut === 'disponible').length,
    indisponible: filteredProducts.filter(p => p.statut === 'indisponible').length
  };

  // Composant Card pour la vue en cartes
  const ProductCard = ({ product }) => {
    const quantityStatus = getQuantityStatus(product);
    const StatusIcon = quantityStatus.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md"
        style={{ borderColor: '#E8E0CC' }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${quantityStatus.color}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{product.produit}</h3>
                <p className="text-sm text-gray-500">{quantityStatus.label}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(product.statut)}`}>
              {product.statut}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Quantité disponible</p>
              <p className="text-2xl font-bold text-gray-900">{product.quantite_disponible}</p>
              <p className="text-xs text-gray-500">{product.unite_mesure}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Min/Max</p>
              <p className="text-sm font-medium text-gray-900">
                {product.quantite_minimale} / {product.quantite_maximale || '--'}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {product.emplacement_stock && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" style={{ color: GOLD_PRIMARY }} />
                {product.emplacement_stock}
              </div>
            )}
            {product.date_expiration && (
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" style={{ color: GOLD_PRIMARY }} />
                Exp: {product.date_expiration}
              </div>
            )}
            <div className="text-xs text-gray-500">
              Dernière MAJ: {product.date_derniere_maj}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t" style={{ borderColor: '#E8E0CC' }}>
            <button
              onClick={() => setForm({ ...product, stock_id: selectedStock })}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: GOLD_PRIMARY }}
              title="Modifier"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(product.id)}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: GOLD_DARK }}
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen" style={{ background: GOLD_BG }}>
        {/* Header */}
        <div className="bg-white border-b shadow-sm" style={{ borderColor: '#E8E0CC' }}>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl shadow-lg" style={{ background: GOLD_PRIMARY }}>
                  <Package className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: GOLD_DARK }}>Gestion des Produits</h1>
                  <p className="text-gray-600 mt-1">Gérez votre inventaire et optimisez vos stocks</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-[#F8F5EB]' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={viewMode === 'table' ? { color: GOLD_PRIMARY } : {}}
                  title="Vue tableau"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-[#F8F5EB]' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={viewMode === 'cards' ? { color: GOLD_PRIMARY } : {}}
                  title="Vue cartes"
                >
                  <Package className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Sélection du stock */}
          <div className="bg-white rounded-xl shadow-sm border mb-6 p-6" style={{ borderColor: '#E8E0CC' }}>
            <label className="block text-sm font-medium mb-3" style={{ color: GOLD_DARK }}>
              <Package className="w-4 h-4 inline mr-2" />
              Sélectionner un entrepôt
            </label>
            <select
              className="w-full md:w-1/3 px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200 bg-white"
              style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
            >
              <option value="">-- Choisir un entrepôt --</option>
              {stocks.map(stock => (
                <option key={stock.id} value={stock.id}>{stock.nom}</option>
              ))}
            </select>
          </div>

          {selectedStock && (
            <>
              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-6 rounded-xl shadow-sm border"
                  style={{ borderColor: '#E8E0CC' }}
                >
                  <div className="flex items-center">
                    <div className="p-3 rounded-xl" style={{ background: GOLD_BG }}>
                      <Package className="w-6 h-6" style={{ color: GOLD_PRIMARY }} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Produits</p>
                      <p className="text-3xl font-bold" style={{ color: GOLD_DARK }}>{statsData.total}</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-6 rounded-xl shadow-sm border"
                  style={{ borderColor: '#E8E0CC' }}
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-red-100 rounded-xl">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Stock Faible</p>
                      <p className="text-3xl font-bold text-red-600">{statsData.lowStock}</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-6 rounded-xl shadow-sm border"
                  style={{ borderColor: '#E8E0CC' }}
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Disponibles</p>
                      <p className="text-3xl font-bold text-green-600">{statsData.disponible}</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-6 rounded-xl shadow-sm border"
                  style={{ borderColor: '#E8E0CC' }}
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-gray-100 rounded-xl">
                      <X className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Indisponibles</p>
                      <p className="text-3xl font-bold text-gray-600">{statsData.indisponible}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Barre d'outils */}
              <div className="bg-white rounded-xl shadow-sm border mb-6 p-6" style={{ borderColor: '#E8E0CC' }}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        className="pl-10 pr-4 py-3 w-64 border rounded-lg focus:ring-2 transition-all duration-200"
                        style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <select
                      className="px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200 bg-white"
                      style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">Tous les statuts</option>
                      <option value="disponible">Disponible</option>
                      <option value="indisponible">Indisponible</option>
                    </select>
                    
                    <label className="flex items-center space-x-3 cursor-pointer px-4 py-3 rounded-lg transition-colors" style={{ background: GOLD_BG }}>
                      <input
                        type="checkbox"
                        checked={showLowStock}
                        onChange={(e) => setShowLowStock(e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 text-red-500" />
                        Stock faible uniquement
                      </span>
                    </label>
                  </div>

                  {!form && (
                    <button
                      className="flex items-center space-x-2 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                      style={{ background: GOLD_PRIMARY }}
                      onClick={() => setForm({
                        stock_id: selectedStock,
                        produit: '',
                        quantite_disponible: '',
                        quantite_minimale: '',
                        quantite_maximale: '',
                        unite_mesure: '',
                        emplacement_stock: '',
                        date_expiration: '',
                        statut: 'disponible'
                      })}
                    >
                      <Plus className="w-5 h-5" />
                      <span>Ajouter un produit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Formulaire */}
              {form && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-lg border mb-6 overflow-hidden"
                  style={{ borderColor: '#E8E0CC' }}
                >
                  <div className="px-6 py-4 border-b" style={{ background: GOLD_BG, borderColor: '#E8E0CC' }}>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Package className="w-6 h-6 mr-3" style={{ color: GOLD_PRIMARY }} />
                      {form.id ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                          <Package className="w-4 h-4 inline mr-1" style={{ color: GOLD_PRIMARY }} />
                          Nom du produit *
                        </label>
                        <input 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          placeholder="Ex: Ordinateur portable"
                          value={form.produit || ''} 
                          onChange={e => setForm({ ...form, produit: e.target.value })} 
                          required 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                          <Hash className="w-4 h-4 inline mr-1" style={{ color: GOLD_PRIMARY }} />
                          Quantité disponible *
                        </label>
                        <input 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          type="number" 
                          placeholder="0"
                          value={form.quantite_disponible || ''} 
                          onChange={e => setForm({ ...form, quantite_disponible: e.target.value })} 
                          required 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                          <AlertTriangle className="w-4 h-4 inline mr-1 text-red-500" />
                          Quantité minimale
                        </label>
                        <input 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          type="number" 
                          placeholder="0"
                          value={form.quantite_minimale || ''} 
                          onChange={e => setForm({ ...form, quantite_minimale: e.target.value })} 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                          <TrendingUp className="w-4 h-4 inline mr-1 text-purple-500" />
                          Quantité maximale
                        </label>
                        <input 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          type="number" 
                          placeholder="0"
                          value={form.quantite_maximale || ''} 
                          onChange={e => setForm({ ...form, quantite_maximale: e.target.value })} 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Unité de mesure</label>
                        <input 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          placeholder="Ex: pièces, kg, litres"
                          value={form.unite_mesure || ''} 
                          onChange={e => setForm({ ...form, unite_mesure: e.target.value })} 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                          <MapPin className="w-4 h-4 inline mr-1" style={{ color: GOLD_PRIMARY }} />
                          Emplacement
                        </label>
                        <input 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          placeholder="Ex: A-01-15"
                          value={form.emplacement_stock || ''} 
                          onChange={e => setForm({ ...form, emplacement_stock: e.target.value })} 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                          <Calendar className="w-4 h-4 inline mr-1" style={{ color: GOLD_PRIMARY }} />
                          Date d'expiration
                        </label>
                        <input 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          type="date"
                          value={form.date_expiration || ''} 
                          onChange={e => setForm({ ...form, date_expiration: e.target.value })} 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Statut</label>
                        <select 
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200 bg-white"
                          style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                          value={form.statut || ''} 
                          onChange={e => setForm({ ...form, statut: e.target.value })}
                        >
                          <option value="disponible">Disponible</option>
                          <option value="indisponible">Indisponible</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-8 pt-6 border-t" style={{ borderColor: '#E8E0CC' }}>
                      <button 
                        type="button"
                        onClick={handleSubmit}
                        className="text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                        style={{ background: GOLD_PRIMARY }}
                      >
                        {form.id ? 'Mettre à jour' : 'Ajouter le produit'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setForm(null)} 
                        className="px-6 py-3 rounded-lg border transition-all duration-200 hover:bg-gray-50"
                        style={{ borderColor: '#E8E0CC', color: GOLD_DARK }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Contenu principal */}
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="text-center">
                    <Loader2 className="animate-spin w-12 h-12 mx-auto mb-4" style={{ color: GOLD_PRIMARY }} />
                    <p className="text-gray-600 text-lg">Chargement des produits...</p>
                  </div>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                      <Package className="w-20 h-20 mx-auto mb-6" style={{ color: '#D4C8A8' }} />
                      <h3 className="text-xl font-medium text-gray-500 mb-2">Aucun produit trouvé</h3>
                      <p className="text-gray-400">Ajoutez des produits ou modifiez vos filtres</p>
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#E8E0CC' }}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y" style={{ borderColor: '#E8E0CC' }}>
                      <thead style={{ background: GOLD_BG }}>
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Produit</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Quantité</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Min</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Max</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Unité</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Emplacement</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Expiration</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Maj</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Statut</th>
                          <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: GOLD_PRIMARY }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y" style={{ borderColor: '#E8E0CC' }}>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan="10" className="text-center py-16">
                              <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#D4C8A8' }} />
                              <h3 className="text-lg font-medium text-gray-500 mb-2">Aucun produit trouvé</h3>
                              <p className="text-gray-400">Ajoutez des produits ou modifiez vos filtres</p>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map(p => {
                            const quantityStatus = getQuantityStatus(p);
                            const StatusIcon = quantityStatus.icon;
                            
                            return (
                              <motion.tr 
                                key={p.id} 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center">
                                    <div className={`p-2 rounded-lg mr-3 ${quantityStatus.color}`}>
                                      <StatusIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{p.produit}</div>
                                      <div className="text-xs text-gray-500">{quantityStatus.label}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${quantityStatus.color}`}>
                                    {p.quantite_disponible}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900">{p.quantite_minimale || '--'}</td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900">{p.quantite_maximale || '--'}</td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900">{p.unite_mesure || '--'}</td>
                                <td className="px-6 py-4 text-center">
                                  {p.emplacement_stock ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {p.emplacement_stock}
                                    </span>
                                  ) : '--'}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900">
                                  {p.date_expiration || '--'}
                                </td>
                                <td className="px-6 py-4 text-center text-xs text-gray-500">{p.date_derniere_maj}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(p.statut)}`}>
                                    {p.statut}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex justify-center space-x-2">
                                    <button
                                      onClick={() => setForm({ ...p, stock_id: selectedStock })}
                                      className="p-2 rounded-lg transition-colors hover:opacity-70"
                                      style={{ color: GOLD_PRIMARY }}
                                      title="Modifier"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(p.id)}
                                      className="p-2 rounded-lg transition-colors hover:opacity-70"
                                      style={{ color: GOLD_DARK }}
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer */}
              {filteredProducts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 bg-white rounded-xl shadow-sm border p-4"
                  style={{ borderColor: '#E8E0CC' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-6">
                      <span className="flex items-center">
                        <div className="w-3 h-3 bg-red-100 rounded-full mr-2"></div>
                        Stock faible ({statsData.lowStock})
                      </span>
                      <span className="flex items-center">
                        <div className="w-3 h-3 bg-blue-100 rounded-full mr-2"></div>
                        Stock normal
                      </span>
                      <span className="flex items-center">
                        <div className="w-3 h-3 bg-green-100 rounded-full mr-2"></div>
                        Stock optimal
                      </span>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <span className="font-medium">
                        {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} affiché{filteredProducts.length > 1 ? 's' : ''}
                      </span>
                      {products.length !== filteredProducts.length && (
                        <span className="text-gray-500 ml-2">
                          sur {products.length} total
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default GestionProduits;