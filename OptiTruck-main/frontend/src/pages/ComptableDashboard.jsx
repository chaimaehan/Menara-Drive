import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

const GOLD = '#AA9766';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';
const API = 'http://localhost/OptiTruck/backend/controllers';
const PAGE_SIZE = 10;

const STATUT_LABELS = {
  en_attente: 'En attente',
  payee: 'Payée',
  en_retard: 'En retard',
  annulee: 'Annulée',
};
const STATUT_COLORS = {
  en_attente: { bg: '#fef9c3', text: '#854d0e' },
  payee: { bg: '#dcfce7', text: '#166534' },
  en_retard: { bg: '#fee2e2', text: '#991b1b' },
  annulee: { bg: '#f3f4f6', text: '#6b7280' },
};

export default function ComptableDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('livraisons'); // livraisons | factures

  const token = useMemo(() => localStorage.getItem('token'), []);

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: GOLD_BG, fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, border: `1px solid ${GOLD_LIGHT}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: GOLD, margin: 0, fontSize: 22 }}>Dashboard Comptable</h1>
        <button onClick={onLogout} style={btnStyle(GOLD)}>Deconnexion</button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('livraisons')} style={tabBtnStyle(tab === 'livraisons')}>
          Livraisons
        </button>
        <button onClick={() => setTab('factures')} style={tabBtnStyle(tab === 'factures')}>
          Factures
        </button>
      </div>

      {tab === 'livraisons' ? (
        <LivraisonsTab token={token} />
      ) : (
        <FacturesTab token={token} />
      )}
    </div>
  );
}

/* =========================================================
   ONGLET LIVRAISONS (contenu original, inchangé)
========================================================= */
function LivraisonsTab({ token }) {
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/adminLivraisons/livraisons.php?all=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLivraisons(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const clientsUniques = useMemo(() => {
    const set = new Set(livraisons.map(l => l.client_nom).filter(Boolean));
    return Array.from(set).sort();
  }, [livraisons]);

  const livraisonsFiltrees = useMemo(() => {
    return livraisons.filter(l => {
      const livre = l.livree == 1 || l.status === 'livree';
      if (statutFilter === 'livree' && !livre) return false;
      if (statutFilter === 'attente' && livre) return false;
      if (clientFilter !== 'all' && l.client_nom !== clientFilter) return false;
      if (dateDebut && l.date_livraison && l.date_livraison < dateDebut) return false;
      if (dateFin && l.date_livraison && l.date_livraison > dateFin) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchClient = (l.client_nom || '').toLowerCase().includes(q);
        const matchProduit = (l.produit || '').toLowerCase().includes(q);
        if (!matchClient && !matchProduit) return false;
      }
      return true;
    });
  }, [livraisons, statutFilter, clientFilter, dateDebut, dateFin, search]);

  useEffect(() => { setPage(1); }, [statutFilter, clientFilter, dateDebut, dateFin, search]);

  const livrees = livraisonsFiltrees.filter(l => l.livree == 1 || l.status === 'livree').length;
  const distTotale = livraisonsFiltrees.reduce((s, l) => s + parseFloat(l.distance || 0), 0);
  const coutTotal = +(distTotale * 2.5).toFixed(2);
  const revenuTotal = +(coutTotal * 1.2).toFixed(2);
  const benefice = +(revenuTotal - coutTotal).toFixed(2);

  const chartData = useMemo(() => {
    const parDate = {};
    livraisonsFiltrees.forEach(l => {
      const date = l.date_livraison || 'Inconnue';
      const d = parseFloat(l.distance || 0);
      const cout = +(d * 2.5).toFixed(2);
      const revenu = +(cout * 1.2).toFixed(2);
      if (!parDate[date]) parDate[date] = { date, cout: 0, revenu: 0, livraisons: 0 };
      parDate[date].cout += cout;
      parDate[date].revenu += revenu;
      parDate[date].livraisons += 1;
    });
    return Object.values(parDate)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map(d => ({ ...d, cout: +d.cout.toFixed(2), revenu: +d.revenu.toFixed(2) }));
  }, [livraisonsFiltrees]);

  const chartDataClients = useMemo(() => {
    const parClient = {};
    livraisonsFiltrees.forEach(l => {
      const client = l.client_nom || 'Client inconnu';
      const d = parseFloat(l.distance || 0);
      const cout = +(d * 2.5).toFixed(2);
      const revenu = +(cout * 1.2).toFixed(2);
      if (!parClient[client]) parClient[client] = { client, revenu: 0, livraisons: 0 };
      parClient[client].revenu += revenu;
      parClient[client].livraisons += 1;
    });
    return Object.values(parClient)
      .map(c => ({ ...c, revenu: +c.revenu.toFixed(2) }))
      .sort((a, b) => b.revenu - a.revenu)
      .slice(0, 8);
  }, [livraisonsFiltrees]);

  const CLIENT_COLORS = ['#AA9766', '#8b5cf6', '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

  const totalPages = Math.max(1, Math.ceil(livraisonsFiltrees.length / PAGE_SIZE));
  const livraisonsPage = livraisonsFiltrees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFiltres = () => {
    setSearch(''); setStatutFilter('all'); setClientFilter('all'); setDateDebut(''); setDateFin('');
  };

  const exportExcel = () => {
    const rows = livraisonsFiltrees.map(l => {
      const d = parseFloat(l.distance || 0);
      const c = +(d * 2.5).toFixed(2);
      const livre = l.livree == 1 || l.status === 'livree';
      return {
        ID: l.id, Client: l.client_nom || '-', Produit: l.produit || '-',
        'Distance (km)': d.toFixed(1), 'Cout (DH)': c,
        Statut: livre ? 'Livree' : 'En attente', Date: l.date_livraison || '-',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Livraisons');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `livraisons_comptable_${dateStr}.xlsx`);
  };

  const exportPDF = () => {
    const rowsHtml = livraisonsFiltrees.map(l => {
      const d = parseFloat(l.distance || 0);
      const c = +(d * 2.5).toFixed(2);
      const livre = l.livree == 1 || l.status === 'livree';
      return `<tr><td>#${l.id}</td><td>${l.client_nom || '-'}</td><td>${l.produit || '-'}</td><td>${d.toFixed(1)} km</td><td>${c} DH</td><td>${livre ? 'Livree' : 'En attente'}</td><td>${l.date_livraison || '-'}</td></tr>`;
    }).join('');

    const html = `
      <html><head><meta charset="utf-8" /><title>Rapport Comptable - Livraisons</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
        h1 { color: ${GOLD}; font-size: 20px; }
        .stats { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .stat { border: 1px solid ${GOLD_LIGHT}; border-radius: 8px; padding: 10px 16px; }
        .stat p:first-child { font-size: 11px; color: #888; margin: 0 0 4px; }
        .stat p:last-child { font-size: 16px; font-weight: bold; margin: 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid ${GOLD_LIGHT}; padding: 6px 10px; text-align: left; }
        th { background: ${GOLD_BG}; color: ${GOLD}; }
      </style></head><body>
        <h1>Rapport Comptable - Livraisons (${livraisonsFiltrees.length})</h1>
        <div class="stats">
          <div class="stat"><p>Total livraisons</p><p>${livraisonsFiltrees.length}</p></div>
          <div class="stat"><p>Livrees</p><p>${livrees}</p></div>
          <div class="stat"><p>En attente</p><p>${livraisonsFiltrees.length - livrees}</p></div>
          <div class="stat"><p>Distance totale</p><p>${distTotale.toFixed(1)} km</p></div>
          <div class="stat"><p>Cout total</p><p>${coutTotal} DH</p></div>
          <div class="stat"><p>Benefice</p><p>${benefice} DH</p></div>
        </div>
        <table><thead><tr><th>ID</th><th>Client</th><th>Produit</th><th>Distance</th><th>Cout</th><th>Statut</th><th>Date</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
      </body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  if (loading) return <p style={{ color: GOLD, textAlign: 'center', padding: 40 }}>Chargement...</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
        <button onClick={exportExcel} style={btnStyle('#22c55e')}>Export Excel</button>
        <button onClick={exportPDF} style={btnStyle('#3b82f6')}>Export PDF</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total livraisons', value: livraisonsFiltrees.length, color: '#8b5cf6' },
          { label: 'Livrees', value: livrees, color: '#22c55e' },
          { label: 'En attente', value: livraisonsFiltrees.length - livrees, color: '#f59e0b' },
          { label: 'Distance totale', value: `${distTotale.toFixed(1)} km`, color: '#3b82f6' },
          { label: 'Cout total', value: `${coutTotal} DH`, color: '#ef4444' },
          { label: 'Benefice', value: `${benefice} DH`, color: GOLD },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 16, border: `1px solid ${GOLD_LIGHT}` }}>
            <p style={{ color: '#888', fontSize: 11, margin: '0 0 4px' }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 20, fontWeight: 'bold', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, border: `1px solid ${GOLD_LIGHT}` }}>
        <h3 style={{ color: GOLD, margin: '0 0 16px' }}>Evolution du CA</h3>
        {chartData.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>Aucune donnee a afficher pour ces filtres.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GOLD_LIGHT} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenu" name="Revenu (DH)" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="cout" name="Cout (DH)" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="livraisons" name="Nb livraisons" stroke={GOLD} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, border: `1px solid ${GOLD_LIGHT}` }}>
        <h3 style={{ color: GOLD, margin: '0 0 16px' }}>Repartition du CA par client (top 8)</h3>
        {chartDataClients.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>Aucune donnee a afficher pour ces filtres.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, chartDataClients.length * 40)}>
            <BarChart data={chartDataClients} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GOLD_LIGHT} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="client" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(v, n, props) => [`${v} DH (${props.payload.livraisons} livraison(s))`, 'Revenu']} />
              <Bar dataKey="revenu" radius={[0, 6, 6, 0]}>
                {chartDataClients.map((entry, i) => (
                  <Cell key={i} fill={CLIENT_COLORS[i % CLIENT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, border: `1px solid ${GOLD_LIGHT}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={labelStyle}>Recherche (client / produit)</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={labelStyle}>Statut</label>
          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={inputStyle}>
            <option value="all">Tous</option>
            <option value="livree">Livree</option>
            <option value="attente">En attente</option>
          </select>
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label style={labelStyle}>Client</label>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={inputStyle}>
            <option value="all">Tous</option>
            {clientsUniques.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={labelStyle}>Date debut</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={labelStyle}>Date fin</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={resetFiltres} style={{ ...btnStyle('#888'), height: 38 }}>Reinitialiser</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: `1px solid ${GOLD_LIGHT}` }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${GOLD_LIGHT}` }}>
          <h3 style={{ color: GOLD, margin: 0 }}>Livraisons ({livraisonsFiltrees.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: GOLD_BG }}>
                {['ID', 'Client', 'Produit', 'Distance', 'Cout', 'Statut', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: GOLD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {livraisonsPage.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#888' }}>Aucune livraison ne correspond aux filtres.</td></tr>
              ) : livraisonsPage.map((l, i) => {
                const d = parseFloat(l.distance || 0);
                const c = +(d * 2.5).toFixed(2);
                const livre = l.livree == 1 || l.status === 'livree';
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${GOLD_LIGHT}` }}>
                    <td style={{ padding: '10px 16px' }}>#{l.id}</td>
                    <td style={{ padding: '10px 16px' }}>{l.client_nom || '-'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 11 }}>{l.produit || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>{d.toFixed(1)} km</td>
                    <td style={{ padding: '10px 16px', color: '#ef4444', fontWeight: 500 }}>{c} DH</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: livre ? '#dcfce7' : '#fef9c3', color: livre ? '#166534' : '#854d0e' }}>
                        {livre ? 'Livree' : 'En attente'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: '#888' }}>{l.date_livraison || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${GOLD_LIGHT}`, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>Page {page} / {totalPages} - {livraisonsFiltrees.length} resultat(s)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pagerBtnStyle(page === 1)}>Precedent</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pagerBtnStyle(page === totalPages)}>Suivant</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   ONGLET FACTURES (nouveau)
========================================================= */
function FacturesTab({ token }) {
  const [view, setView] = useState('liste'); // liste | generer
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtres liste
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [page, setPage] = useState(1);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const chargerFactures = () => {
    setLoading(true);
    fetch(`${API}/factures/factures.php`, { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setFactures(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { chargerFactures(); }, [token]);

  const facturesFiltrees = useMemo(() => {
    return factures.filter(f => {
      if (statutFilter !== 'all' && f.statut !== statutFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchNum = (f.numero_facture || '').toLowerCase().includes(q);
        const matchClient = (f.client_nom || '').toLowerCase().includes(q);
        if (!matchNum && !matchClient) return false;
      }
      return true;
    });
  }, [factures, statutFilter, search]);

  useEffect(() => { setPage(1); }, [statutFilter, search]);

  const totalTTC = facturesFiltrees.reduce((s, f) => s + parseFloat(f.montant_ttc || 0), 0);
  const totalPayee = facturesFiltrees.filter(f => f.statut === 'payee').reduce((s, f) => s + parseFloat(f.montant_ttc || 0), 0);
  const totalEnAttente = facturesFiltrees.filter(f => f.statut === 'en_attente' || f.statut === 'en_retard').reduce((s, f) => s + parseFloat(f.montant_ttc || 0), 0);
  const nbEnRetard = facturesFiltrees.filter(f => f.statut === 'en_retard').length;

  const totalPages = Math.max(1, Math.ceil(facturesFiltrees.length / PAGE_SIZE));
  const facturesPage = facturesFiltrees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const marquerPayee = async (facture) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/factures/factures.php`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: facture.id, statut: 'payee', mode_paiement: 'virement' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur');
      chargerFactures();
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const supprimerFacture = async (facture) => {
    if (!window.confirm(`Supprimer la facture ${facture.numero_facture} ?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/factures/factures.php?id=${facture.id}`, {
        method: 'DELETE',
        headers,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur');
      chargerFactures();
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const exportExcel = () => {
    const rows = facturesFiltrees.map(f => ({
      Numero: f.numero_facture,
      Client: f.client_nom || '-',
      'Montant HT': f.montant_ht,
      TVA: f.tva,
      'Montant TTC': f.montant_ttc,
      Statut: STATUT_LABELS[f.statut] || f.statut,
      'Date emission': f.date_emission,
      'Date echeance': f.date_echeance,
      'Date paiement': f.date_paiement || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Factures');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `factures_comptable_${dateStr}.xlsx`);
  };

  const exportPDF = (facture = null) => {
    const liste = facture ? [facture] : facturesFiltrees;
    const rowsHtml = liste.map(f => `
      <tr>
        <td>${f.numero_facture}</td>
        <td>${f.client_nom || '-'}</td>
        <td>${parseFloat(f.montant_ht).toFixed(2)} DH</td>
        <td>${parseFloat(f.tva).toFixed(2)} DH</td>
        <td>${parseFloat(f.montant_ttc).toFixed(2)} DH</td>
        <td>${STATUT_LABELS[f.statut] || f.statut}</td>
        <td>${f.date_emission}</td>
        <td>${f.date_echeance}</td>
      </tr>`).join('');

    const html = `
      <html><head><meta charset="utf-8" /><title>Factures</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
        h1 { color: ${GOLD}; font-size: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid ${GOLD_LIGHT}; padding: 6px 10px; text-align: left; }
        th { background: ${GOLD_BG}; color: ${GOLD}; }
      </style></head><body>
        <h1>${facture ? `Facture ${facture.numero_facture}` : `Factures (${liste.length})`}</h1>
        <table><thead><tr><th>Numero</th><th>Client</th><th>HT</th><th>TVA</th><th>TTC</th><th>Statut</th><th>Emission</th><th>Echeance</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
      </body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <>
      {errorMsg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('liste')} style={subTabBtnStyle(view === 'liste')}>Liste des factures</button>
          <button onClick={() => setView('generer')} style={subTabBtnStyle(view === 'generer')}>+ Generer une facture</button>
        </div>
        {view === 'liste' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportExcel} style={btnStyle('#22c55e')}>Export Excel</button>
            <button onClick={() => exportPDF()} style={btnStyle('#3b82f6')}>Export PDF</button>
          </div>
        )}
      </div>

      {view === 'generer' ? (
        <GenererFacture headers={headers} onGenerated={() => { chargerFactures(); setView('liste'); }} setErrorMsg={setErrorMsg} />
      ) : loading ? (
        <p style={{ color: GOLD, textAlign: 'center', padding: 40 }}>Chargement...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total factures', value: facturesFiltrees.length, color: '#8b5cf6' },
              { label: 'Montant total', value: `${totalTTC.toFixed(2)} DH`, color: GOLD },
              { label: 'Encaisse', value: `${totalPayee.toFixed(2)} DH`, color: '#22c55e' },
              { label: 'En attente', value: `${totalEnAttente.toFixed(2)} DH`, color: '#f59e0b' },
              { label: 'Factures en retard', value: nbEnRetard, color: '#ef4444' },
            ].map((k, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 16, border: `1px solid ${GOLD_LIGHT}` }}>
                <p style={{ color: '#888', fontSize: 11, margin: '0 0 4px' }}>{k.label}</p>
                <p style={{ color: k.color, fontSize: 20, fontWeight: 'bold', margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, border: `1px solid ${GOLD_LIGHT}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={labelStyle}>Recherche (numero / client)</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={inputStyle} />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={labelStyle}>Statut</label>
              <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={inputStyle}>
                <option value="all">Tous</option>
                <option value="en_attente">En attente</option>
                <option value="payee">Payee</option>
                <option value="en_retard">En retard</option>
                <option value="annulee">Annulee</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: `1px solid ${GOLD_LIGHT}` }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${GOLD_LIGHT}` }}>
              <h3 style={{ color: GOLD, margin: 0 }}>Factures ({facturesFiltrees.length})</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: GOLD_BG }}>
                    {['Numero', 'Client', 'Montant TTC', 'Statut', 'Emission', 'Echeance', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: GOLD }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {facturesPage.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#888' }}>Aucune facture ne correspond aux filtres.</td></tr>
                  ) : facturesPage.map(f => {
                    const c = STATUT_COLORS[f.statut] || STATUT_COLORS.en_attente;
                    return (
                      <tr key={f.id} style={{ borderTop: `1px solid ${GOLD_LIGHT}` }}>
                        <td style={{ padding: '10px 16px', fontWeight: 500 }}>{f.numero_facture}</td>
                        <td style={{ padding: '10px 16px' }}>{f.client_nom || '-'}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 500 }}>{parseFloat(f.montant_ttc).toFixed(2)} DH</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: c.bg, color: c.text }}>
                            {STATUT_LABELS[f.statut] || f.statut}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#888' }}>{f.date_emission}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#888' }}>{f.date_echeance}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {f.statut !== 'payee' && f.statut !== 'annulee' && (
                              <button disabled={actionLoading} onClick={() => marquerPayee(f)} style={miniBtnStyle('#22c55e')}>
                                Payee
                              </button>
                            )}
                            <button onClick={() => exportPDF(f)} style={miniBtnStyle('#3b82f6')}>PDF</button>
                            {f.statut !== 'payee' && (
                              <button disabled={actionLoading} onClick={() => supprimerFacture(f)} style={miniBtnStyle('#ef4444')}>
                                Suppr.
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${GOLD_LIGHT}`, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>Page {page} / {totalPages} - {facturesFiltrees.length} resultat(s)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pagerBtnStyle(page === 1)}>Precedent</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pagerBtnStyle(page === totalPages)}>Suivant</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* =========================================================
   SOUS-VUE : GENERER UNE FACTURE
========================================================= */
function GenererFacture({ headers, onGenerated, setErrorMsg }) {
  const [eligibles, setEligibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`${API}/factures/factures.php?action=eligible`, { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEligibles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const parClient = useMemo(() => {
    const groupes = {};
    eligibles.forEach(l => {
      const key = l.client_id;
      if (!groupes[key]) groupes[key] = { client_id: l.client_id, client_nom: l.client_nom, livraisons: [] };
      groupes[key].livraisons.push(l);
    });
    return Object.values(groupes);
  }, [eligibles]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleClientAll = (groupe) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = groupe.livraisons.every(l => next.has(l.livraison_id));
      groupe.livraisons.forEach(l => {
        if (allSelected) next.delete(l.livraison_id); else next.add(l.livraison_id);
      });
      return next;
    });
  };

  const selectionParClient = useMemo(() => {
    const map = {};
    parClient.forEach(g => {
      const ids = g.livraisons.filter(l => selected.has(l.livraison_id)).map(l => l.livraison_id);
      if (ids.length > 0) map[g.client_id] = { client_id: g.client_id, client_nom: g.client_nom, ids, distance: g.livraisons.filter(l => ids.includes(l.livraison_id)).reduce((s, l) => s + parseFloat(l.distance), 0) };
    });
    return map;
  }, [selected, parClient]);

  const clientsSelectionnes = Object.values(selectionParClient);
  const peutGenerer = clientsSelectionnes.length === 1; // une facture = un seul client à la fois

  const genererFacture = async () => {
    if (!peutGenerer) return;
    const { client_id, ids } = clientsSelectionnes[0];
    setGenerating(true);
    try {
      const res = await fetch(`${API}/factures/factures.php`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ client_id, livraison_ids: ids }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la generation');
      setSelected(new Set());
      onGenerated();
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p style={{ color: GOLD, textAlign: 'center', padding: 40 }}>Chargement des livraisons eligibles...</p>;

  if (eligibles.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', border: `1px solid ${GOLD_LIGHT}` }}>
        <p style={{ color: '#888' }}>Toutes les livraisons livrees sont deja facturees. Aucune livraison eligible pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        Selectionnez les livraisons livrees a facturer. Une facture regroupe les livraisons d'un seul client a la fois (TVA 20% appliquee automatiquement).
      </p>

      {parClient.map(groupe => {
        const montantGroupe = groupe.livraisons.reduce((s, l) => s + parseFloat(l.distance) * 2.5, 0);
        return (
          <div key={groupe.client_id} style={{ background: '#fff', borderRadius: 16, marginBottom: 16, border: `1px solid ${GOLD_LIGHT}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: GOLD_BG, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, color: GOLD }}>
                <input
                  type="checkbox"
                  checked={groupe.livraisons.every(l => selected.has(l.livraison_id))}
                  onChange={() => toggleClientAll(groupe)}
                />
                {groupe.client_nom || 'Client inconnu'} ({groupe.livraisons.length} livraison(s))
              </label>
              <span style={{ fontSize: 12, color: '#888' }}>Total HT estime : {montantGroupe.toFixed(2)} DH</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['', 'ID', 'Produit', 'Distance', 'Montant HT', 'Date'].map(h => (
                      <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: '#888', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupe.livraisons.map(l => {
                    const montant = +(parseFloat(l.distance) * 2.5).toFixed(2);
                    return (
                      <tr key={l.livraison_id} style={{ borderTop: `1px solid ${GOLD_LIGHT}` }}>
                        <td style={{ padding: '8px 16px' }}>
                          <input type="checkbox" checked={selected.has(l.livraison_id)} onChange={() => toggleSelect(l.livraison_id)} />
                        </td>
                        <td style={{ padding: '8px 16px' }}>#{l.livraison_id}</td>
                        <td style={{ padding: '8px 16px', fontSize: 11 }}>{l.produit || '-'}</td>
                        <td style={{ padding: '8px 16px' }}>{parseFloat(l.distance).toFixed(1)} km</td>
                        <td style={{ padding: '8px 16px', color: '#ef4444' }}>{montant} DH</td>
                        <td style={{ padding: '8px 16px', fontSize: 11, color: '#888' }}>{l.date_livraison || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {selected.size > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: `2px solid ${GOLD}`, position: 'sticky', bottom: 16 }}>
          {!peutGenerer ? (
            <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>
              Merci de selectionner des livraisons d'un seul client a la fois pour generer une facture.
            </p>
          ) : (
            (() => {
              const { client_nom, distance, ids } = clientsSelectionnes[0];
              const ht = +(distance * 2.5).toFixed(2);
              const tva = +(ht * 0.20).toFixed(2);
              const ttc = +(ht + tva).toFixed(2);
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{ids.length} livraison(s) - {client_nom}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 'bold', color: GOLD }}>
                      Total TTC : {ttc} DH <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>(HT {ht} DH + TVA {tva} DH)</span>
                    </p>
                  </div>
                  <button onClick={genererFacture} disabled={generating} style={btnStyle('#22c55e')}>
                    {generating ? 'Generation...' : 'Generer la facture'}
                  </button>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STYLES REUTILISABLES
========================================================= */
const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 10,
  padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
});

const miniBtnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500,
});

const tabBtnStyle = (active) => ({
  background: active ? GOLD : '#fff',
  color: active ? '#fff' : GOLD,
  border: `1px solid ${GOLD}`,
  borderRadius: 10,
  padding: '10px 20px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
});

const subTabBtnStyle = (active) => ({
  background: active ? GOLD_LIGHT : '#fff',
  color: GOLD,
  border: `1px solid ${GOLD_LIGHT}`,
  borderRadius: 10,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
});

const labelStyle = { display: 'block', fontSize: 11, color: '#888', marginBottom: 4 };

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: `1px solid ${GOLD_LIGHT}`, fontSize: 13, boxSizing: 'border-box',
};

const pagerBtnStyle = (disabled) => ({
  background: disabled ? '#eee' : GOLD,
  color: disabled ? '#aaa' : '#fff',
  border: 'none', borderRadius: 8, padding: '6px 14px',
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12,
});