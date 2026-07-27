import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Truck, Loader2, ChevronLeft, ChevronRight, Search, Filter, Box, Droplet, Package, Hammer, Construction, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import toast, { Toaster } from 'react-hot-toast';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const TruckManagement = ({ onLogout }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const [trucks, setTrucks] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const trucksPerPage = 5;

  const [formData, setFormData] = useState({
    code: '',
    type: '',
    capacite: '',
    chauffeur_id: ''
  });

  // Types de camions selon votre liste
  const truckTypes = [
    { 
      value: 'benne_basculante', 
      label: 'Benne basculante (Tombereau, Dump truck)', 
      shortLabel: 'Benne basculante',
      description: 'Transport de terre, gravats, matériaux en vrac',
      icon: Construction,
      color: '#8B4513'
    },
    { 
      value: 'camion_toupie', 
      label: 'Camion toupie (Bétonnière portée)', 
      shortLabel: 'Camion toupie',
      description: 'Transport et malaxage de béton frais',
      icon: RotateCw,
      color: '#708090'
    },
    { 
      value: 'camion_plateau', 
      label: 'Camion plateau', 
      shortLabel: 'Camion plateau',
      description: 'Transport de charges lourdes (pelles, engins, marchandises)',
      icon: Package,
      color: '#50c878'
    },
    { 
      value: 'camion_citerne', 
      label: 'Camion citerne', 
      shortLabel: 'Camion citerne',
      description: 'Transport de liquides (eau, carburant, produits chimiques)',
      icon: Droplet,
      color: '#4a90e2'
    },
    { 
      value: 'camion_malaxeur', 
      label: 'Camion malaxeur (Transport de mortier sec)', 
      shortLabel: 'Camion malaxeur',
      description: 'Transport et malaxage de mortier sec',
      icon: Hammer,
      color: '#dc143c'
    }
  ];

  // Charger les camions
  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost/OptiTruck/backend/controllers/truckManagement/trucks.php', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Camions chargés:', res.data);
      setTrucks(res.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des camions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les chauffeurs
  const fetchChauffeurs = async () => {
    try {
      const res = await axios.get('http://localhost/OptiTruck/backend/controllers/driverManagement/chauffeurs.php', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChauffeurs(res.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des chauffeurs");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTrucks();
    fetchChauffeurs();
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.type || !formData.capacite || !formData.chauffeur_id) {
      toast.error("Tous les champs sont obligatoires !");
      return;
    }

    try {
      if (editingTruck) {
        await axios.put(`http://localhost/OptiTruck/backend/controllers/truckManagement/trucks.php?id=${editingTruck.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Camion modifié avec succès !");
      } else {
        await axios.post('http://localhost/OptiTruck/backend/controllers/truckManagement/trucks.php', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Camion ajouté avec succès !");
      }
      fetchTrucks();
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de l'opération");
      console.error(error);
    }
  };

  const handleDeleteTruck = async id => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce camion ?")) return;
    try {
      await axios.delete(`http://localhost/OptiTruck/backend/controllers/truckManagement/trucks.php?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Camion supprimé avec succès !");
      fetchTrucks();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({ code: '', type: '', capacite: '', chauffeur_id: '' });
    setEditingTruck(null);
    setShowForm(false);
  };

  // NOUVELLE FONCTION handleEdit MODIFIÉE
  const handleEdit = async (truck) => {
    console.log('=== MODIFICATION CAMION ===');
    console.log('Camion complet:', truck);
    console.log('Type du camion:', truck.type);
    
    // Recharger les données complètes depuis l'API
    try {
      const res = await axios.get(`http://localhost/OptiTruck/backend/controllers/truckManagement/trucks.php?id=${truck.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fullTruckData = res.data;
      console.log('Données complètes depuis API:', fullTruckData);
      
      setEditingTruck(fullTruckData);
      setFormData({
        code: fullTruckData.code || '',
        type: fullTruckData.type || '',
        capacite: fullTruckData.capacite || '',
        chauffeur_id: fullTruckData.chauffeur_id || ''
      });
    } catch (error) {
      console.error('Erreur chargement détails camion:', error);
      // Fallback avec les données existantes
      setEditingTruck(truck);
      setFormData({
        code: truck.code || '',
        type: truck.type || '',
        capacite: truck.capacite || '',
        chauffeur_id: truck.chauffeur_id || ''
      });
    }
    
    setShowForm(true);
  };

  // Obtenir les infos du type de camion
  const getTruckTypeInfo = (type) => {
    const found = truckTypes.find(t => t.value === type);
    return found || truckTypes[0];
  };

  // Filtrage des camions
  const filteredTrucks = trucks.filter(truck => {
    const typeInfo = getTruckTypeInfo(truck.type);
    const matchesSearch = 
      truck.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.chauffeur_nom && truck.chauffeur_nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeInfo && typeInfo.shortLabel.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDriver = filterDriver === 'all' || 
      (filterDriver === 'assigned' && truck.chauffeur_id) || 
      (filterDriver === 'unassigned' && !truck.chauffeur_id);
    
    const matchesType = filterType === 'all' || truck.type === filterType;
    
    return matchesSearch && matchesDriver && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTrucks.length / trucksPerPage);
  const paginatedTrucks = filteredTrucks.slice(
    (currentPage - 1) * trucksPerPage,
    currentPage * trucksPerPage
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <>
      <Toaster 
        position="top-center"
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
        <div className="p-4 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="p-2 rounded-lg" style={{ background: GOLD_BG }}>
                <Truck size={28} style={{ color: GOLD_PRIMARY }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 4, height: 28, background: GOLD_PRIMARY, borderRadius: 2 }} />
                  <h1 className="text-2xl font-bold" style={{ color: '#2c2b26' }}>Gestion des camions</h1>
                </div>
                <p className="mt-1" style={{ color: '#AA9766' }}>Gérez votre flotte de camions</p>
              </div>
            </div>
            <button 
              onClick={() => { resetForm(); setShowForm(true); }} 
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow transition-all hover:shadow-md"
              style={{ background: GOLD_PRIMARY, color: '#fff' }}
            >
              <Plus size={18} /> Ajouter un camion
            </button>
          </div>

          {/* Contrôles de recherche et filtres */}
          <div className="rounded-xl shadow-sm p-4 mb-6" style={{ background: '#fff', border: `1px solid #E8E0CC` }}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5" size={18} style={{ color: '#AA9766' }} />
                <input
                  type="text"
                  placeholder="Rechercher par code, chauffeur ou type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border rounded-lg w-full focus:ring-2 focus:outline-none"
                  style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                />
              </div>
              
              <div className="flex gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-3.5" size={18} style={{ color: '#AA9766' }} />
                  <select
                    value={filterDriver}
                    onChange={(e) => setFilterDriver(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border rounded-lg w-full focus:ring-2 focus:outline-none appearance-none min-w-[160px]"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB', color: '#2c2b26' }}
                  >
                    <option value="all">Tous les camions</option>
                    <option value="assigned">Avec chauffeur</option>
                    <option value="unassigned">Sans chauffeur</option>
                  </select>
                </div>

                <div className="relative">
                  <Box className="absolute left-3 top-3.5" size={18} style={{ color: '#AA9766' }} />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border rounded-lg w-full focus:ring-2 focus:outline-none appearance-none min-w-[200px]"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB', color: '#2c2b26' }}
                  >
                    <option value="all">Tous les types</option>
                    {truckTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.shortLabel}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl shadow-md p-5 mb-6 overflow-hidden"
                style={{ background: '#fff', border: `1px solid #E8E0CC` }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: '#2c2b26' }}>
                    {editingTruck ? 'Modifier le camion' : 'Ajouter un nouveau camion'}
                  </h2>
                  <button 
                    onClick={resetForm}
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: '#AA9766' }}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Code *</label>
                    <input 
                      type="text" 
                      name="code" 
                      placeholder="Ex: CAM-001" 
                      value={formData.code} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                      required 
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Type de camion *</label>
                    <select 
                      name="type" 
                      value={formData.type} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ borderColor: '#E8E0CC', background: '#F8F5EB', color: '#2c2b26' }}
                      required
                    >
                      <option value="">Sélectionnez un type</option>
                      {truckTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.shortLabel} - {type.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs mt-1" style={{ color: '#AA9766' }}>
                      Sélectionnez le type de camion adapté à votre besoin
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Capacité (kg) *</label>
                    <input 
                      type="number" 
                      name="capacite" 
                      placeholder="Capacité en kg" 
                      value={formData.capacite} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#AA9766' }}>Chauffeur *</label>
                    <select 
                      name="chauffeur_id" 
                      value={formData.chauffeur_id} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ borderColor: '#E8E0CC', background: '#F8F5EB', color: '#2c2b26' }}
                      required
                    >
                      <option value="">Sélectionnez un chauffeur</option>
                      {chauffeurs.map(c => (
                        <option key={c.id} value={c.id}>{c.nom} {c.matricule && `(${c.matricule})`}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={resetForm}
                      className="px-5 py-2.5 border rounded-lg font-medium transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#E8E0CC', color: '#AA9766' }}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2.5 text-white font-medium rounded-lg shadow-sm transition-all hover:shadow-md"
                      style={{ background: GOLD_PRIMARY }}
                    >
                      {editingTruck ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-xl shadow-md overflow-hidden" style={{ background: '#fff', border: `1px solid #E8E0CC` }}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y" style={{ borderColor: '#E8E0CC' }}>
                <thead style={{ background: '#F8F5EB' }}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Code</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Capacité</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Chauffeur</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#AA9766' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ backgroundColor: '#fff', borderColor: '#E8E0CC' }}>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className="flex justify-center">
                          <Loader2 className="animate-spin h-8 w-8" style={{ color: GOLD_PRIMARY }} />
                        </div>
                        <p className="mt-2" style={{ color: '#AA9766' }}>Chargement des camions...</p>
                      </td>
                    </tr>
                  ) : paginatedTrucks.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className="flex justify-center">
                          <Truck className="h-10 w-10" style={{ color: '#D4C8A8' }} />
                        </div>
                        <p className="mt-3" style={{ color: '#AA9766' }}>Aucun camion disponible</p>
                        <button 
                          onClick={() => { resetForm(); setShowForm(true); }}
                          className="mt-3 font-medium"
                          style={{ color: GOLD_PRIMARY }}
                        >
                          Ajouter un camion
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedTrucks.map(truck => {
                      const typeInfo = getTruckTypeInfo(truck.type);
                      const TypeIcon = typeInfo.icon;
                      return (
                        <tr key={truck.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg mr-3" style={{ background: GOLD_BG }}>
                                <Truck size={20} style={{ color: GOLD_PRIMARY }} />
                              </div>
                              <div className="text-sm font-medium" style={{ color: '#2c2b26' }}>{truck.code}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 group relative">
                              <TypeIcon size={18} style={{ color: typeInfo.color }} />
                              <span className="text-sm" style={{ color: '#5e4b2a' }}>{typeInfo.shortLabel}</span>
                              <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 left-0 whitespace-nowrap z-10">
                                {typeInfo.description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm" style={{ color: '#5e4b2a' }}>{parseInt(truck.capacite).toLocaleString()} kg</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm" style={{ color: '#5e4b2a' }}>
                              {truck.chauffeur_nom ? (
                                <>
                                  {truck.chauffeur_nom}
                                  {truck.chauffeur_matricule && (
                                    <span className="text-xs block" style={{ color: '#AA9766' }}>
                                      Matricule: {truck.chauffeur_matricule}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="italic" style={{ color: '#D4C8A8' }}>Non assigné</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-3">
                            <button 
                              onClick={() => handleEdit(truck)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-opacity-20"
                              style={{ color: GOLD_PRIMARY }}
                              title="Modifier"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTruck(truck.id)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: '#AA9766' }}
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm" style={{ color: '#AA9766' }}>
                Affichage de <span className="font-medium" style={{ color: '#2c2b26' }}>{(currentPage - 1) * trucksPerPage + 1}</span> à <span className="font-medium" style={{ color: '#2c2b26' }}>
                  {Math.min(currentPage * trucksPerPage, filteredTrucks.length)}
                </span> sur <span className="font-medium" style={{ color: '#2c2b26' }}>{filteredTrucks.length}</span> camions
              </div>
              <div className="flex gap-1">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${currentPage === 1 ? 'cursor-not-allowed' : 'hover:bg-gray-100'}`}
                  style={{ color: currentPage === 1 ? '#D4C8A8' : '#AA9766' }}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      currentPage === index + 1 
                        ? 'text-white shadow' 
                        : 'hover:bg-gray-100'
                    }`}
                    style={currentPage === index + 1 ? { background: GOLD_PRIMARY } : { color: '#AA9766' }}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${currentPage === totalPages ? 'cursor-not-allowed' : 'hover:bg-gray-100'}`}
                  style={{ color: currentPage === totalPages ? '#D4C8A8' : '#AA9766' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TruckManagement;