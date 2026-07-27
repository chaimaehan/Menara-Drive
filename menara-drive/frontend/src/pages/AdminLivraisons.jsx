import React, { useEffect, useState, useMemo } from "react";
import { X, CheckSquare, Square, Edit3, Trash2, Loader2, Package, Truck, MapPin, Calendar, Clock, FileText, Phone } from "lucide-react";
import Navbar from '../components/Navbar';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK    = '#8A7A52';
const GOLD_LIGHT   = '#D4C8A8';
const GOLD_BG      = '#F8F5EB';

const AdminLivraisons = ({ onLogout }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  // États principaux
  const [livraisons,        setLivraisons]        = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [selectedLivraison, setSelectedLivraison] = useState(null);
  const [filters,           setFilters]           = useState({
    camion_id:      "",
    stock_id:       "",
    dateLivraison:  "",
    livree:         "",
    search:         "",
  });
  const [stats, setStats] = useState({
    total: 0, livrees: 0, percentOnTime: 0, totalDistance: 0,
  });
  const [notes,        setNotes]        = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);

  // ─── Chargement des livraisons ────────────────────────────────────────────
  const fetchLivraisons = async () => {
    setLoading(true);
    try {
      // ✅ ?all=1 pour récupérer toutes les dates côté admin
      const res  = await fetch("http://localhost/OptiTruck/backend/controllers/adminLivraisons/livraisons.php?all=1");
      const data = await res.json();
      setLivraisons(data);

      const total         = data.length;
      const livrees       = data.filter((l) => l.livree).length;
      const totalDistance = data.reduce((sum, l) => sum + (parseFloat(l.distance) || 0), 0);
      const percentOnTime = total ? Math.round((livrees / total) * 100) : 0;

      setStats({ total, livrees, percentOnTime, totalDistance: totalDistance.toFixed(1) });
    } catch (err) {
      console.error("Erreur chargement livraisons", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLivraisons(); }, []);

  // ─── Filtrage dynamique ───────────────────────────────────────────────────
  const filteredLivraisons = useMemo(() => {
    return livraisons.filter((l) => {
      if (filters.camion_id && String(l.camion_id) !== filters.camion_id) return false;
      if (filters.stock_id  && String(l.stock_id)  !== filters.stock_id)  return false;
      if (filters.livree !== "" && String(l.livree) !== filters.livree)    return false;
      if (filters.dateLivraison) {
        const dateRef = l.date_livraison || l.completed_at || "";
        if (!dateRef.startsWith(filters.dateLivraison)) return false;
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        if (
          !(
            (l.client_nom     && l.client_nom.toLowerCase().includes(term))     ||
            (l.produit        && l.produit.toLowerCase().includes(term))         ||
            (l.camion_code    && l.camion_code.toLowerCase().includes(term))     ||
            (l.chauffeur_nom  && l.chauffeur_nom.toLowerCase().includes(term))   ||
            (l.stock_nom      && l.stock_nom.toLowerCase().includes(term))       ||
            String(l.id).includes(term)
          )
        ) return false;
      }
      return true;
    });
  }, [livraisons, filters]);

  // ─── Toggle livrée ────────────────────────────────────────────────────────
  const toggleLivree = async (livraison) => {
    try {
      const response = await fetch(
        "http://localhost/OptiTruck/backend/controllers/adminLivraisons/livraisons.php",
        {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:           livraison.id,
            livree:       livraison.livree ? 0 : 1,
            completed_at: livraison.livree
              ? null
              : new Date().toISOString().slice(0, 19).replace("T", " "),
          }),
        }
      );
      if (response.ok) {
        fetchLivraisons();
        if (selectedLivraison?.id === livraison.id) setSelectedLivraison(null);
      } else throw new Error('Erreur mise à jour');
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut");
      console.error(err);
    }
  };

  // ─── Modifier ordre ───────────────────────────────────────────────────────
  const changeOrdre = async (livraison) => {
    const newOrdre = prompt("Nouveau ordre de livraison :", livraison.ordre);
    if (newOrdre === null) return;
    if (isNaN(newOrdre) || newOrdre < 1) { alert("Ordre invalide"); return; }
    try {
      const response = await fetch(
        "http://localhost/OptiTruck/backend/controllers/adminLivraisons/livraisons.php",
        {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: livraison.id, ordre: parseInt(newOrdre, 10) }),
        }
      );
      if (response.ok) fetchLivraisons();
      else throw new Error('Erreur modification');
    } catch (err) {
      alert("Erreur lors de la modification de l'ordre");
    }
  };

  // ─── Supprimer ────────────────────────────────────────────────────────────
  const deleteLivraison = async (id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      const response = await fetch(
        `http://localhost/OptiTruck/backend/controllers/adminLivraisons/livraisons.php?id=${id}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        fetchLivraisons();
        if (selectedLivraison?.id === id) setSelectedLivraison(null);
      } else throw new Error('Erreur suppression');
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  // ─── Sauvegarder note ─────────────────────────────────────────────────────
  const saveNote = async (id) => {
    const note = notes[id];
    if (!note) return alert("Note vide");
    setSavingNoteId(id);
    try {
      const response = await fetch(
        "http://localhost/OptiTruck/backend/controllers/adminLivraisons/livraisons.php",
        {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, note }),
        }
      );
      if (response.ok) { alert("Note sauvegardée"); fetchLivraisons(); }
      else throw new Error('Erreur sauvegarde');
    } catch (err) {
      alert("Erreur sauvegarde note");
    } finally {
      setSavingNoteId(null);
    }
  };

  // ✅ Appel téléphonique sécurisé — pas d'alerte si numéro absent
  const handleCall = (phone, e) => {
    if (e) e.stopPropagation();
    if (phone && phone.trim() !== '') {
      window.open(`tel:${phone.trim()}`);
    }
    // Si null/vide → on ne fait rien (pas d'alert)
  };

  // ─── Badge statut ─────────────────────────────────────────────────────────
  const getStatusBadge = (livraison) => {
    if (livraison.livree) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckSquare size={12} className="mr-1" /> Livrée
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            style={{ background: GOLD_BG, color: GOLD_DARK }}>
        <Clock size={12} className="mr-1" /> En attente
      </span>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen" style={{ background: GOLD_BG }}>
        <div className="max-w-7xl mx-auto p-6">

          {/* En-tête */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <div style={{ width: 4, height: 40, background: GOLD_PRIMARY, borderRadius: 2 }} />
                <h1 className="text-3xl font-bold" style={{ color: GOLD_DARK }}>Gestion des Livraisons</h1>
              </div>
              <p className="text-gray-600 mt-1">Suivi et administration des livraisons</p>
            </div>
            <div className="flex items-center space-x-2 text-sm" style={{ color: GOLD_PRIMARY }}>
              <Calendar size={16} />
              <span>{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Livraisons', value: stats.total,         icon: <Package    className="h-6 w-6" style={{ color: GOLD_PRIMARY }} />, bg: GOLD_BG,          textColor: GOLD_DARK        },
              { label: 'Livrées',          value: stats.livrees,       icon: <CheckSquare className="h-6 w-6 text-green-600" />,                  bg: '#dcfce7',        textColor: '#16a34a'        },
              { label: 'Taux de réussite', value: `${stats.percentOnTime}%`, icon: <Clock className="h-6 w-6" style={{ color: GOLD_PRIMARY }} />, bg: GOLD_BG,         textColor: GOLD_DARK        },
              { label: 'Distance Totale',  value: `${stats.totalDistance} km`, icon: <MapPin className="h-6 w-6 text-purple-600" />,              bg: '#f3e8ff',        textColor: '#7e22ce'        },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: '#E8E0CC' }}>
                <div className="flex items-center">
                  <div className="p-2 rounded-lg" style={{ background: s.bg }}>{s.icon}</div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{s.label}</p>
                    <p className="text-2xl font-bold" style={{ color: s.textColor }}>{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-lg p-6 shadow-sm border mb-6" style={{ borderColor: '#E8E0CC' }}>
            <h3 className="text-lg font-medium mb-4" style={{ color: GOLD_DARK }}>Filtres de recherche</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recherche globale</label>
                <input type="text" placeholder="Client, produit, chauffeur..."
                  className="w-full border rounded-md px-3 py-2 focus:outline-none"
                  style={{ borderColor: '#E8E0CC' }}
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de livraison</label>
                <input type="date"
                  className="w-full border rounded-md px-3 py-2 focus:outline-none"
                  style={{ borderColor: '#E8E0CC' }}
                  value={filters.dateLivraison}
                  onChange={(e) => setFilters(f => ({ ...f, dateLivraison: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select className="w-full border rounded-md px-3 py-2 focus:outline-none"
                  style={{ borderColor: '#E8E0CC' }}
                  value={filters.livree}
                  onChange={(e) => setFilters(f => ({ ...f, livree: e.target.value }))}
                >
                  <option value="">Tous les statuts</option>
                  <option value="1">Livrée</option>
                  <option value="0">En attente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Camion ID</label>
                <input type="number" placeholder="ID du camion"
                  className="w-full border rounded-md px-3 py-2 focus:outline-none"
                  style={{ borderColor: '#E8E0CC' }}
                  value={filters.camion_id}
                  onChange={(e) => setFilters(f => ({ ...f, camion_id: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock ID</label>
                <input type="number" placeholder="ID du stock"
                  className="w-full border rounded-md px-3 py-2 focus:outline-none"
                  style={{ borderColor: '#E8E0CC' }}
                  value={filters.stock_id}
                  onChange={(e) => setFilters(f => ({ ...f, stock_id: e.target.value }))}
                />
              </div>

            </div>
          </div>

          {/* Liste */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden" style={{ borderColor: '#E8E0CC' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#E8E0CC' }}>
              <h3 className="text-lg font-medium" style={{ color: GOLD_DARK }}>
                Livraisons ({filteredLivraisons.length})
              </h3>
            </div>

            {loading ? (
              <div className="flex justify-center items-center p-20">
                <Loader2 className="animate-spin h-8 w-8" style={{ color: GOLD_PRIMARY }} />
                <span className="ml-2 text-gray-600">Chargement des livraisons...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ borderColor: '#E8E0CC' }}>
                  <thead style={{ background: GOLD_BG }}>
                    <tr>
                      {['Livraison','Client','Produit','Camion / Chauffeur','Distance','Statut','Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                            style={{ color: GOLD_PRIMARY }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y" style={{ borderColor: '#E8E0CC' }}>
                    {filteredLivraisons.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <Package className="mx-auto h-12 w-12 mb-4" style={{ color: '#D4C8A8' }} />
                          <p className="text-lg font-medium">Aucune livraison trouvée</p>
                          <p className="text-sm">Essayez de modifier vos filtres de recherche</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLivraisons.map((liv) => (
                        <tr key={liv.id}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedLivraison?.id === liv.id ? "border-l-4" : ""}`}
                          style={selectedLivraison?.id === liv.id ? { borderLeftColor: GOLD_PRIMARY, background: GOLD_BG } : {}}
                          onClick={() => setSelectedLivraison(liv)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="font-medium" style={{ color: GOLD_DARK }}>#{liv.id}</div>
                            <div className="text-gray-500">Ordre: {liv.ordre}</div>
                            <div className="text-gray-500">Cmd: {liv.commande_id}</div>
                            {liv.date_livraison && (
                              <div className="text-gray-400 text-xs">{new Date(liv.date_livraison).toLocaleDateString('fr-FR')}</div>
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900">{liv.client_nom || 'N/A'}</div>
                            <div className="text-gray-500 truncate max-w-xs">{liv.client_adresse || 'Adresse non renseignée'}</div>
                            {/* ✅ Téléphone affiché si disponible */}
                            {liv.chauffeur_telephone && (
                              <div className="text-gray-400 text-xs flex items-center gap-1">
                                <Phone size={10} /> {liv.chauffeur_telephone}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900">{liv.produit || 'Produit non spécifié'}</div>
                            <div className="text-gray-500">{liv.quantite || 0} unités</div>
                          </td>

                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900 flex items-center">
                              <Truck size={14} className="mr-1" style={{ color: GOLD_PRIMARY }} />
                              {liv.camion_code || `Camion ${liv.camion_id}`}
                            </div>
                            <div className="text-gray-500">{liv.chauffeur_nom || 'Chauffeur non assigné'}</div>
                            <div className="text-gray-500 text-xs">Cap: {liv.camion_capacite || 'N/A'}</div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <MapPin size={14} className="mr-1 text-gray-400" />
                              {liv.distance ? `${liv.distance} km` : '—'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(liv)}
                            {liv.completed_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(liv.completed_at).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button onClick={(e) => { e.stopPropagation(); toggleLivree(liv); }}
                                title={liv.livree ? "Marquer non livrée" : "Marquer livrée"}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50">
                                {liv.livree ? <Square size={16} /> : <CheckSquare size={16} />}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); changeOrdre(liv); }}
                                title="Modifier ordre"
                                className="p-1 rounded transition-colors"
                                style={{ color: GOLD_PRIMARY }}>
                                <Edit3 size={16} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteLivraison(liv.id); }}
                                title="Supprimer livraison"
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Panneau latéral détails */}
          {selectedLivraison && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
              <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">

                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
                     style={{ borderColor: '#E8E0CC' }}>
                  <h2 className="text-xl font-bold" style={{ color: GOLD_DARK }}>
                    Détails Livraison #{selectedLivraison.id}
                  </h2>
                  <button onClick={() => setSelectedLivraison(null)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-6">

                  {/* Statut */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Statut</span>
                    {getStatusBadge(selectedLivraison)}
                  </div>

                  {/* Client */}
                  <div className="rounded-lg p-4" style={{ background: GOLD_BG }}>
                    <h3 className="font-medium mb-3 flex items-center" style={{ color: GOLD_DARK }}>
                      <Package size={16} className="mr-2" /> Informations Client
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Nom :</span> {selectedLivraison.client_nom || 'N/A'}</div>
                      <div><span className="font-medium">Adresse :</span> {selectedLivraison.client_adresse || 'Non renseignée'}</div>

                      {/* ✅ Téléphone client : bouton cliquable si disponible, texte grisé sinon */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Téléphone :</span>
                        {selectedLivraison.chauffeur_telephone ? (
                          <button
                            onClick={() => handleCall(selectedLivraison.chauffeur_telephone)}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone size={13} />
                            {selectedLivraison.chauffeur_telephone}
                          </button>
                        ) : (
                          <span className="italic text-gray-400">Non renseigné</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Produit */}
                  <div className="rounded-lg p-4" style={{ background: GOLD_BG }}>
                    <h3 className="font-medium mb-3" style={{ color: GOLD_DARK }}>Produit & Commande</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Produit :</span> {selectedLivraison.produit || 'Non spécifié'}</div>
                      <div><span className="font-medium">Quantité :</span> {selectedLivraison.quantite || 0} unités</div>
                      <div>
                        <span className="font-medium">Date commande :</span>{" "}
                        {selectedLivraison.date_commande
                          ? new Date(selectedLivraison.date_commande).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="rounded-lg p-4" style={{ background: GOLD_BG }}>
                    <h3 className="font-medium mb-3 flex items-center" style={{ color: GOLD_DARK }}>
                      <Truck size={16} className="mr-2" /> Transport
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Camion :</span> {selectedLivraison.camion_code || `Camion ${selectedLivraison.camion_id}`}</div>
                      <div><span className="font-medium">Capacité :</span> {selectedLivraison.camion_capacite || 'N/A'}</div>
                      <div><span className="font-medium">Chauffeur :</span> {selectedLivraison.chauffeur_nom || 'Non assigné'}</div>

                      {/* ✅ Téléphone chauffeur : cliquable si présent */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Tél. chauffeur :</span>
                        {selectedLivraison.chauffeur_telephone ? (
                          <button
                            onClick={() => handleCall(selectedLivraison.chauffeur_telephone)}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone size={13} />
                            {selectedLivraison.chauffeur_telephone}
                          </button>
                        ) : (
                          <span className="italic text-gray-400">Non renseigné</span>
                        )}
                      </div>

                      <div><span className="font-medium">Entrepôt :</span> {selectedLivraison.stock_nom || 'N/A'}</div>
                      <div><span className="font-medium">Adresse entrepôt :</span> {selectedLivraison.stock_adresse || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Détails livraison */}
                  <div className="rounded-lg p-4" style={{ background: GOLD_BG }}>
                    <h3 className="font-medium mb-3 flex items-center" style={{ color: GOLD_DARK }}>
                      <MapPin size={16} className="mr-2" /> Détails Livraison
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Ordre :</span> {selectedLivraison.ordre}</div>
                      <div><span className="font-medium">Distance :</span> {selectedLivraison.distance ? `${selectedLivraison.distance} km` : '—'}</div>
                      <div><span className="font-medium">Date livraison :</span>{" "}
                        {selectedLivraison.date_livraison
                          ? new Date(selectedLivraison.date_livraison).toLocaleDateString('fr-FR')
                          : <span className="italic text-gray-400">Non définie</span>}
                      </div>
                      <div><span className="font-medium">Complété le :</span>{" "}
                        {selectedLivraison.completed_at
                          ? new Date(selectedLivraison.completed_at).toLocaleString('fr-FR')
                          : <span className="italic text-gray-400">Non complété</span>}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="rounded-lg p-4" style={{ background: GOLD_BG }}>
                    <h3 className="font-medium mb-3 flex items-center" style={{ color: GOLD_DARK }}>
                      <FileText size={16} className="mr-2" /> Notes et Commentaires
                    </h3>
                    {selectedLivraison.note && (
                      <div className="mb-3 p-3 bg-white border rounded text-sm" style={{ borderColor: '#E8E0CC' }}>
                        <strong>Note existante :</strong> {selectedLivraison.note}
                      </div>
                    )}
                    <textarea rows={4}
                      value={notes[selectedLivraison.id] || ""}
                      onChange={(e) => setNotes(prev => ({ ...prev, [selectedLivraison.id]: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none resize-none"
                      style={{ borderColor: '#E8E0CC' }}
                      placeholder="Ajouter une note pour cette livraison..."
                    />
                    <button onClick={() => saveNote(selectedLivraison.id)}
                      disabled={savingNoteId === selectedLivraison.id}
                      className="mt-3 w-full text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center justify-center hover:shadow-md"
                      style={{ background: GOLD_PRIMARY }}
                    >
                      {savingNoteId === selectedLivraison.id ? (
                        <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Sauvegarde...</>
                      ) : "Sauvegarder la note"}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default AdminLivraisons;