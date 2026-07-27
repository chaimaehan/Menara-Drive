import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Users, Truck, Package, CheckCircle, Clock, AlertTriangle, RefreshCw, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const GOLD = '#AA9766';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';
const API = 'http://localhost/OptiTruck/backend/controllers';
const PAGE_SIZE = 10;

const SuperviseurDashboard = ({ user, onLogout }) => {
  const [livraisons, setLivraisons] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterChauffeur, setFilterChauffeur] = useState('tous');
  const [filterStatus, setFilterStatus] = useState('tous');
  const [page, setPage] = useState(1);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [livRes, chRes] = await Promise.all([
        axios.get(`${API}/adminLivraisons/livraisons.php?all=1`, { headers }),
        axios.get(`${API}/driverManagement/chauffeurs.php`, { headers }),
      ]);
      setLivraisons(Array.isArray(livRes.data) ? livRes.data : []);
      setChauffeurs(Array.isArray(chRes.data) ? chRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Une livraison est en retard si sa date est dépassée et qu'elle n'est pas livrée
  const isEnRetard = (l) => {
    const livre = l.livree == 1 || l.status === 'livree';
    if (livre || !l.date_livraison) return false;
    const today = new Date().toISOString().slice(0, 10);
    return l.date_livraison < today;
  };

  const filtered = livraisons.filter(l => {
    const matchSearch = search === '' ||
      (l.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.chauffeur_nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.produit || '').toLowerCase().includes(search.toLowerCase());
    const matchChauffeur = filterChauffeur === 'tous' || l.chauffeur_id == filterChauffeur;
    const matchStatus =
      filterStatus === 'tous' ||
      l.status === filterStatus ||
      (filterStatus === 'livree' && l.livree == 1) ||
      (filterStatus === 'retard' && isEnRetard(l));
    return matchSearch && matchChauffeur && matchStatus;
  });

  // Reset page quand un filtre change
  useEffect(() => { setPage(1); }, [search, filterChauffeur, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const filteredPage = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: livraisons.length,
    livrees: livraisons.filter(l => l.livree == 1 || l.status === 'livree').length,
    enAttente: livraisons.filter(l => !l.livree || l.livree == 0).length,
    chauffeurs: chauffeurs.length,
    enRetard: livraisons.filter(isEnRetard).length,
  };

  // Données du graphique : taux de livraison par chauffeur
  const chartData = useMemo(() => {
    return chauffeurs.map(ch => {
      const livsCh = livraisons.filter(l => l.chauffeur_id == ch.id);
      const livrees = livsCh.filter(l => l.livree == 1 || l.status === 'livree').length;
      const taux = livsCh.length ? Math.round((livrees / livsCh.length) * 100) : 0;
      return {
        nom: `${ch.nom || ''}`.trim() || `#${ch.id}`,
        taux,
        total: livsCh.length,
      };
    }).sort((a, b) => b.taux - a.taux);
  }, [chauffeurs, livraisons]);

  const getBarColor = (taux) => {
    if (taux >= 75) return '#22c55e';
    if (taux >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusBadge = (l) => {
    if (l.livree == 1 || l.status === 'livree') return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">✅ Livrée</span>;
    if (isEnRetard(l)) return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">⚠️ En retard</span>;
    if (l.status === 'en_cours') return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">🚚 En cours</span>;
    if (l.status === 'planifiee') return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">📋 Planifiée</span>;
    return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">⏳ En attente</span>;
  };

  return (
    <div className="min-h-screen p-6" style={{ background: GOLD_BG }}>
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm flex items-center justify-between" style={{ border: `1px solid ${GOLD_LIGHT}` }}>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: GOLD }}>
            <Users className="w-7 h-7" /> Dashboard Superviseur
          </h1>
          <p className="text-gray-500 text-sm mt-1">Vue globale de toutes les livraisons par chauffeur</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadAll} className="p-2 rounded-xl border hover:opacity-80" style={{ borderColor: GOLD_LIGHT }}>
            <RefreshCw className="w-5 h-5" style={{ color: GOLD }} />
          </button>
          <button onClick={onLogout} className="px-4 py-2 rounded-xl text-sm text-white hover:opacity-80" style={{ background: GOLD }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total livraisons', value: stats.total, icon: <Package className="w-5 h-5" />, color: GOLD },
          { label: 'Livrées', value: stats.livrees, icon: <CheckCircle className="w-5 h-5" />, color: '#22c55e' },
          { label: 'En attente', value: stats.enAttente, icon: <Clock className="w-5 h-5" />, color: '#f59e0b' },
          { label: 'En retard', value: stats.enRetard, icon: <AlertTriangle className="w-5 h-5" />, color: '#ef4444' },
          { label: 'Chauffeurs', value: stats.chauffeurs, icon: <Users className="w-5 h-5" />, color: '#3b82f6' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${GOLD_LIGHT}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: k.color }}>{k.icon}</span>
              <span className="text-xs text-gray-500">{k.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {stats.enRetard > 0 && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <b>{stats.enRetard} livraison(s)</b> ont dépassé leur date prévue sans être marquées comme livrées. Vérifiez leur statut avec les chauffeurs concernés.
          </p>
        </div>
      )}

      {/* Graphique performance par chauffeur */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm" style={{ border: `1px solid ${GOLD_LIGHT}` }}>
        <h3 className="font-semibold mb-4" style={{ color: GOLD }}>📊 Taux de livraison par chauffeur</h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune donnée disponible.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GOLD_LIGHT} />
              <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v, n, props) => [`${v}% (${props.payload.total} livraison(s))`, 'Taux']} />
              <Bar dataKey="taux" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.taux)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-3 items-center" style={{ border: `1px solid ${GOLD_LIGHT}` }}>
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher client, chauffeur, produit..."
            className="flex-1 outline-none text-sm" />
        </div>
        <select value={filterChauffeur} onChange={e => setFilterChauffeur(e.target.value)}
          className="px-3 py-2 border rounded-xl text-sm" style={{ borderColor: GOLD_LIGHT }}>
          <option value="tous">Tous les chauffeurs</option>
          {chauffeurs.map(ch => (
            <option key={ch.id} value={ch.id}>{ch.nom} {ch.prenom} ({ch.matricule})</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-xl text-sm" style={{ borderColor: GOLD_LIGHT }}>
          <option value="tous">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="livree">Livrée</option>
          <option value="retard">En retard</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} résultat(s)</span>
      </div>

      {/* Tableau livraisons */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: `1px solid ${GOLD_LIGHT}` }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: GOLD_LIGHT }}>
          <h3 className="font-semibold" style={{ color: GOLD }}>🚚 Toutes les livraisons</h3>
        </div>
        {loading ? (
          <div className="flex justify-center p-10">
            <RefreshCw className="animate-spin w-8 h-8" style={{ color: GOLD }} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: GOLD_BG }}>
                  <tr>
                    {['ID', 'Chauffeur', 'Matricule', 'Client', 'Produit', 'Distance', 'Statut', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: GOLD }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPage.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">Aucune livraison trouvée</td></tr>
                  ) : filteredPage.map((l, i) => (
                    <tr key={i} className={`border-t hover:bg-gray-50 ${isEnRetard(l) ? 'bg-red-50/40' : ''}`} style={{ borderColor: GOLD_LIGHT }}>
                      <td className="px-4 py-3 font-mono text-xs">#{l.id}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: GOLD }}>{l.chauffeur_nom || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.matricule || '-'}</td>
                      <td className="px-4 py-3">{l.client_nom || '-'}</td>
                      <td className="px-4 py-3 text-xs">{l.produit || '-'}</td>
                      <td className="px-4 py-3">{l.distance ? `${parseFloat(l.distance).toFixed(1)} km` : '-'}</td>
                      <td className="px-4 py-3">{getStatusBadge(l)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.date_livraison || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center px-4 py-3 border-t flex-wrap gap-2" style={{ borderColor: GOLD_LIGHT }}>
              <span className="text-xs text-gray-500">
                Page {page} / {totalPages} — {filtered.length} résultat(s)
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: page === 1 ? '#eee' : GOLD, color: page === 1 ? '#aaa' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                  Précédent
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: page === totalPages ? '#eee' : GOLD, color: page === totalPages ? '#aaa' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Résumé par chauffeur */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chauffeurs.map(ch => {
          const livsCh = livraisons.filter(l => l.chauffeur_id == ch.id);
          const livrees = livsCh.filter(l => l.livree == 1 || l.status === 'livree').length;
          const retards = livsCh.filter(isEnRetard).length;
          const taux = livsCh.length ? Math.round((livrees / livsCh.length) * 100) : 0;
          return (
            <div key={ch.id} className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${GOLD_LIGHT}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: GOLD }}>
                  {(ch.nom || '?')[0]}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: GOLD }}>{ch.nom} {ch.prenom}</p>
                  <p className="text-xs text-gray-500">{ch.matricule}</p>
                </div>
                {retards > 0 && (
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                    {retards} retard(s)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-bold" style={{ color: GOLD }}>{livsCh.length}</p><p className="text-xs text-gray-400">Total</p></div>
                <div><p className="text-lg font-bold text-green-600">{livrees}</p><p className="text-xs text-gray-400">Livrées</p></div>
                <div><p className="text-lg font-bold text-blue-600">{taux}%</p><p className="text-xs text-gray-400">Taux</p></div>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${taux}%`, background: getBarColor(taux) }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuperviseurDashboard;