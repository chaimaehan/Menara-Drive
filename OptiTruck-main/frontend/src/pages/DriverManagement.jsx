import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, MoreVertical, Edit3, Trash2, UserCheck, UserX, Search, Filter, Phone, FileText, IdCard, Mail, Smartphone, CreditCard
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = 'http://localhost/OptiTruck/backend/controllers/driverManagement/chauffeurs.php';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const DriverManagement = ({ onLogout }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [formData, setFormData] = useState({
    matricule: '', nom: '', email: '', telephone: '', permis: '', statut: 'actif'
  });

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setDrivers(res.data);
    } catch (err) {
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const filteredDrivers = drivers.filter((driver) => {
    const matchSearch =
      (driver.matricule || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus === 'all' || driver.statut === filterStatus;

    return matchSearch && matchStatus;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du matricule
    if (!formData.matricule.trim()) {
      toast.error("Le matricule est obligatoire");
      return;
    }
    
    try {
      if (editingDriver) {
        await axios.put(`${API_URL}?id=${editingDriver.id}`, formData);
        toast.success("Chauffeur modifié");
      } else {
        await axios.post(API_URL, formData);
        toast.success("Chauffeur ajouté");
      }
      fetchDrivers();
      resetForm();
    } catch (err) {
      toast.error("Erreur lors de la soumission.");
    }
  };

  const resetForm = () => {
    setFormData({ matricule: '', nom: '', email: '', telephone: '', permis: '', statut: 'actif' });
    setEditingDriver(null);
    setShowAddModal(false);
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      matricule: driver.matricule || '',
      nom: driver.nom || '',
      email: driver.email || '',
      telephone: driver.telephone || '',
      permis: driver.permis || '',
      statut: driver.statut || 'actif',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Confirmer la suppression ?')) {
      try {
        await axios.delete(`${API_URL}?id=${id}`);
        toast.success("Chauffeur supprimé");
        fetchDrivers();
      } catch {
        toast.error("Erreur lors de la suppression.");
      }
    }
  };

  const toggleContextMenu = (id) => {
    setContextMenu(contextMenu === id ? null : id);
  };

  return (
    <>
      <Toaster 
        toastOptions={{
          style: {
            background: GOLD_BG,
            color: GOLD_DARK,
            border: `1px solid ${GOLD_PRIMARY}`,
          },
          success: {
            iconTheme: {
              primary: GOLD_PRIMARY,
              secondary: '#fff',
            },
          },
        }}
      />
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen" style={{ background: '#F8F5EB' }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: 4, height: 28, background: GOLD_PRIMARY, borderRadius: 2 }} />
                <h1 className="text-3xl font-bold" style={{ color: '#2c2b26' }}>Gestion des chauffeurs</h1>
              </div>
              <p className="mt-2" style={{ color: '#AA9766' }}>Suivi et gestion des chauffeurs en activité</p>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg"
              style={{ background: GOLD_PRIMARY, color: '#fff' }}
            >
              <Plus size={18} />
              Ajouter chauffeur
            </button>
          </div>

          {/* Controls */}
          <div className="rounded-xl p-4 mb-6" style={{ background: '#fff', border: `1px solid #E8E0CC`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5" size={18} style={{ color: '#AA9766' }} />
                <input
                  type="text"
                  placeholder="Rechercher par matricule, nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border rounded-lg w-full focus:ring-2 focus:outline-none"
                  style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                />
              </div>
              
              <div className="flex gap-3">
                <div className="relative flex-1 min-w-[160px]">
                  <Filter className="absolute left-3 top-3.5" size={18} style={{ color: '#AA9766' }} />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border rounded-lg w-full focus:ring-2 focus:outline-none appearance-none"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB', color: '#2c2b26' }}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des chauffeurs */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto" style={{ borderColor: GOLD_PRIMARY }}></div>
              <p className="mt-4" style={{ color: '#AA9766' }}>Chargement des chauffeurs...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed py-16 text-center" style={{ background: '#fff', borderColor: '#E8E0CC' }}>
              <Users className="mx-auto" size={48} style={{ color: '#D4C8A8' }} />
              <h3 className="text-xl font-medium mt-4" style={{ color: '#2c2b26' }}>Aucun chauffeur trouvé</h3>
              <p className="mt-2" style={{ color: '#AA9766' }}>Aucun résultat ne correspond à vos critères</p>
              <button
                onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                className="mt-4 font-medium"
                style={{ color: GOLD_PRIMARY }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDrivers.map((driver) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative border rounded-xl p-5 transition-all hover:shadow-md"
                  style={{ background: '#fff', borderColor: '#E8E0CC' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="p-3 rounded-xl" style={{ background: GOLD_BG }}>
                        <Users size={24} style={{ color: GOLD_PRIMARY }} />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg" style={{ color: '#2c2b26' }}>{driver.nom}</h2>
                        {/* Affichage du matricule en évidence */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <IdCard size={14} style={{ color: GOLD_PRIMARY }} />
                          <p className="text-sm font-mono font-medium" style={{ color: GOLD_DARK }}>
                            {driver.matricule || 'Matricule non défini'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => toggleContextMenu(driver.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                      >
                        <MoreVertical size={20} style={{ color: '#AA9766' }} />
                      </button>
                      <AnimatePresence>
                        {contextMenu === driver.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-10 right-0 bg-white border rounded-lg shadow-lg z-10 w-44 overflow-hidden"
                            style={{ borderColor: '#E8E0CC' }}
                          >
                            <button
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                              onClick={() => {
                                handleEdit(driver);
                                setContextMenu(null);
                              }}
                            >
                              <Edit3 size={16} style={{ color: GOLD_PRIMARY }} />
                              <span style={{ color: '#2c2b26' }}>Modifier</span>
                            </button>
                            <button
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                              onClick={() => {
                                handleDelete(driver.id);
                                setContextMenu(null);
                              }}
                            >
                              <Trash2 size={16} style={{ color: GOLD_PRIMARY }} />
                              <span style={{ color: GOLD_DARK }}>Supprimer</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    <div className="flex items-center gap-2" style={{ color: '#5e4b2a' }}>
                      <Mail size={16} style={{ color: '#AA9766' }} />
                      <span className="text-sm">{driver.email || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: '#5e4b2a' }}>
                      <Smartphone size={16} style={{ color: '#AA9766' }} />
                      <span className="text-sm">{driver.telephone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: '#5e4b2a' }}>
                      <CreditCard size={16} style={{ color: '#AA9766' }} />
                      <span className="text-sm">Permis: {driver.permis || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      driver.statut === 'actif'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {driver.statut === 'actif' ? 
                        <UserCheck size={14} className="mr-1.5" /> : 
                        <UserX size={14} className="mr-1.5" />
                      }
                      {driver.statut === 'actif' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Modal */}
          <AnimatePresence>
            {showAddModal && (
              <motion.div
                className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md"
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 10 }}
                  style={{ borderTop: `3px solid ${GOLD_PRIMARY}` }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold" style={{ color: '#2c2b26' }}>
                      {editingDriver ? 'Modifier Chauffeur' : 'Nouveau Chauffeur'}
                    </h2>
                    <button 
                      onClick={resetForm}
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: '#AA9766' }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Champ Matricule */}
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>
                        Matricule *
                      </label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-3" size={18} style={{ color: '#AA9766' }} />
                        <input 
                          type="text" 
                          required 
                          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                          style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                          value={formData.matricule} 
                          onChange={(e) => setFormData({ ...formData, matricule: e.target.value.toUpperCase() })} 
                          placeholder="Ex: CH-001"
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#AA9766' }}>Identifiant unique du chauffeur</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Nom complet *</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                        style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                        value={formData.nom} 
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Email *</label>
                      <input 
                        type="email" 
                        required 
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                        style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Téléphone *</label>
                      <input 
                        type="tel" 
                        required 
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                        style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                        value={formData.telephone} 
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Numéro de permis</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                        style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                        value={formData.permis} 
                        onChange={(e) => setFormData({ ...formData, permis: e.target.value })} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Statut</label>
                      <select 
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                        style={{ borderColor: '#E8E0CC', background: '#F8F5EB', color: '#2c2b26' }}
                        value={formData.statut} 
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                      >
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-3 pt-2 justify-end">
                      <button 
                        type="button" 
                        onClick={resetForm}
                        className="px-5 py-2.5 font-medium rounded-lg border transition-colors hover:bg-gray-50"
                        style={{ borderColor: '#E8E0CC', color: '#AA9766' }}
                      >
                        Annuler
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2.5 text-white font-medium rounded-lg shadow-sm transition-all hover:shadow-md"
                        style={{ background: GOLD_PRIMARY }}
                      >
                        {editingDriver ? 'Enregistrer' : 'Ajouter'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default DriverManagement;