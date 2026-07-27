import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Search, XCircle, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';

const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_BG = '#F8F5EB';
const PAGE_SIZE = 10;

const formatClientNumber = (id) => `CL${String(id).padStart(4, '0')}`;

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white max-w-md w-full rounded-lg shadow-lg p-6 relative">
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg" style={{ background: GOLD_PRIMARY }} />
        <h2 className="text-xl font-bold mb-4" style={{ color: GOLD_DARK }}>{title}</h2>
        {children}
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 focus:outline-none">
          <XCircle size={20} />
        </button>
      </div>
    </div>
  );
};

const ClientManagement = ({ onLogout }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ nom: '', adresse: '', telephone: '', email: '', prix: '', solde: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('nom');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState({ open: false, type: '', message: '', onConfirm: null });
  const [showFormModal, setShowFormModal] = useState(false);

  const openModal = (type, message, onConfirm = null) => setModal({ open: true, type, message, onConfirm });
  const closeModal = () => setModal({ open: false, type: '', message: '', onConfirm: null });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost/OptiTruck/backend/controllers/clientManagement/clients.php');
      setClients(res.data);
    } catch {
      openModal('error', 'Erreur lors de la récupération des clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const validateForm = () => {
    if (!form.nom.trim() || !form.adresse.trim()) {
      openModal('error', 'Nom et adresse sont obligatoires.');
      return false;
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      openModal('error', 'Email invalide.');
      return false;
    }
    return true;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    setForm({ nom: '', adresse: '', telephone: '', email: '', prix: '', solde: '' });
    setEditingId(null);
    setShowFormModal(true);
  };

  const handleEdit = client => {
    setForm({
      nom: client.nom || '',
      adresse: client.adresse || '',
      telephone: client.telephone || '',
      email: client.email || '',
      prix: String(client.prix || ''),
      solde: String(client.solde || '')
    });
    setEditingId(client.id);
    setShowFormModal(true);
  };

  const handleCancel = () => {
    setShowFormModal(false);
    setEditingId(null);
    setForm({ nom: '', adresse: '', telephone: '', email: '', prix: '', solde: '' });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (editingId) {
        await axios.put('http://localhost/OptiTruck/backend/controllers/clientManagement/clients.php', { id: editingId, ...form });
        openModal('success', 'Client modifié avec succès.');
      } else {
        await axios.post('http://localhost/OptiTruck/backend/controllers/clientManagement/clients.php', form);
        openModal('success', 'Client ajouté avec succès.');
      }
      handleCancel();
      fetchClients();
    } catch {
      openModal('error', 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = id => {
    openModal('confirm', 'Voulez-vous vraiment supprimer ce client ?', async () => {
      setLoading(true);
      try {
        await axios.delete(`http://localhost/OptiTruck/backend/controllers/clientManagement/clients.php?id=${id}`);
        fetchClients();
        setCurrentPage(1);
        closeModal();
        openModal('success', 'Client supprimé avec succès.');
      } catch {
        openModal('error', 'Erreur lors de la suppression.');
      } finally {
        setLoading(false);
      }
    });
  };

  const filteredClients = useMemo(() => {
    let filtered = clients.filter(c => {
      const term = searchTerm.toLowerCase();
      return (
        (c.nom?.toLowerCase().includes(term)) ||
        (c.adresse?.toLowerCase().includes(term)) ||
        (c.email?.toLowerCase().includes(term)) ||
        formatClientNumber(c.id).toLowerCase().includes(term)
      );
    });
    filtered.sort((a, b) => {
      let valA = a[sortKey] ?? '';
      let valB = b[sortKey] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [clients, searchTerm, sortKey, sortDirection]);

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const pagedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <main className="max-w-7xl mx-auto p-6 space-y-10" style={{ background: GOLD_BG, minHeight: '100vh' }}>
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div style={{ width: 4, height: 40, background: GOLD_PRIMARY, borderRadius: 2 }} />
            <h2 className="text-4xl font-extrabold" style={{ color: GOLD_DARK }}>Gestion des Clients</h2>
          </div>
          <button
            onClick={handleAdd}
            className="text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all hover:shadow-md"
            style={{ background: GOLD_PRIMARY }}
          >
            <Plus size={18} /> Ajouter un client
          </button>
        </div>

        {/* Recherche */}
        <div className="flex justify-center">
          <div className="flex items-center w-full max-w-md border rounded-lg px-4 py-2 shadow-sm" style={{ borderColor: '#E8E0CC', background: '#fff' }}>
            <Search size={20} className="text-gray-400 mr-2" />
            <input
              type="search"
              placeholder="Rechercher par numéro, nom, adresse ou email..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full border-none focus:ring-0 focus:outline-none"
            />
          </div>
        </div>

        {/* Formulaire modal */}
        <AnimatePresence>
          {showFormModal && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl p-6 shadow-lg w-full max-w-2xl"
                initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
              >
                <h3 className="text-xl font-bold mb-4" style={{ color: GOLD_DARK }}>
                  {editingId ? 'Modifier un client' : 'Ajouter un client'}
                </h3>
                <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="nom" value={form.nom} onChange={handleChange} placeholder="Nom *" className="border rounded p-2 focus:outline-none" style={{ borderColor: '#E8E0CC' }} required />
                  <input name="adresse" value={form.adresse} onChange={handleChange} placeholder="Adresse *" className="border rounded p-2 focus:outline-none" style={{ borderColor: '#E8E0CC' }} required />
                  <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="Téléphone" className="border rounded p-2 focus:outline-none" style={{ borderColor: '#E8E0CC' }} />
                  <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" className="border rounded p-2 focus:outline-none" style={{ borderColor: '#E8E0CC' }} />
                  <input name="prix" value={form.prix} onChange={handleChange} placeholder="Prix (MAD)" type="number" step="0.01" className="border rounded p-2 focus:outline-none" style={{ borderColor: '#E8E0CC' }} />
                  <input name="solde" value={form.solde} onChange={handleChange} placeholder="Solde (MAD)" type="number" step="0.01" className="border rounded p-2 focus:outline-none" style={{ borderColor: '#E8E0CC' }} />
                  <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                    <button type="submit" className="text-white px-5 py-2 rounded transition-all hover:shadow-md" style={{ background: GOLD_PRIMARY }}>
                      {editingId ? 'Mettre à jour' : 'Ajouter'}
                    </button>
                    <button type="button" onClick={handleCancel} className="px-5 py-2 rounded" style={{ background: '#E8E0CC', color: '#5e4b2a' }}>
                      Annuler
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tableau */}
        <section className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full table-auto border-collapse">
            <thead style={{ background: GOLD_BG }}>
              <tr>
                {['N° Client', 'Nom', 'Adresse', 'Téléphone', 'Email', 'Prix (MAD)', 'Solde (MAD)', 'Actions'].map((label, idx) => (
                  <th key={idx} className="p-3 text-left border font-semibold" style={{ borderColor: '#E8E0CC', color: GOLD_PRIMARY }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50 border-t" style={{ borderColor: '#E8E0CC' }}>
                  <td className="p-3 font-mono font-medium" style={{ color: GOLD_DARK }}>{formatClientNumber(client.id)}</td>
                  <td className="p-3 font-medium" style={{ color: '#2c2b26' }}>{client.nom}</td>
                  <td className="p-3" style={{ color: '#5e4b2a' }}>{client.adresse}</td>
                  <td className="p-3" style={{ color: '#5e4b2a' }}>{client.telephone}</td>
                  <td className="p-3" style={{ color: '#5e4b2a' }}>{client.email}</td>
                  <td className="p-3 font-medium" style={{ color: GOLD_DARK }}>
                    {client.prix ? parseFloat(client.prix).toFixed(2) + ' DH' : '-'}
                  </td>
                  <td className="p-3 font-medium" style={{ color: parseFloat(client.solde) < 0 ? '#ef4444' : '#16a34a' }}>
                    {client.solde ? parseFloat(client.solde).toFixed(2) + ' DH' : '-'}
                  </td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => handleEdit(client)} className="transition-colors hover:opacity-70" style={{ color: GOLD_PRIMARY }} title="Modifier">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="transition-colors hover:opacity-70" style={{ color: GOLD_DARK }} title="Supprimer">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {pagedClients.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-8" style={{ color: '#AA9766' }}>Aucun client trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}
              className="px-4 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#E8E0CC', color: '#5e4b2a' }}>←</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium"
                style={i + 1 === currentPage ? { background: GOLD_PRIMARY, color: '#fff' } : { background: '#E8E0CC', color: '#5e4b2a' }}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}
              className="px-4 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#E8E0CC', color: '#5e4b2a' }}>→</button>
          </div>
        )}
      </main>

      <Modal isOpen={modal.open} onClose={closeModal} title={
        modal.type === 'confirm' ? 'Confirmation' : modal.type === 'success' ? 'Succès' : 'Erreur'
      }>
        <div className="flex items-center gap-3">
          {modal.type === 'success' && <CheckCircle className="text-green-600" />}
          {modal.type === 'error' && <AlertTriangle className="text-red-600" />}
          {modal.type === 'confirm' && <AlertTriangle className="text-yellow-600" />}
          <p className="text-gray-700 text-sm">{modal.message}</p>
        </div>
        {modal.type === 'confirm' && (
          <div className="flex justify-end mt-6 gap-3">
            <button onClick={closeModal} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Annuler</button>
            <button onClick={modal.onConfirm} className="px-4 py-2 text-white rounded hover:opacity-80" style={{ background: GOLD_PRIMARY }}>Confirmer</button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ClientManagement;