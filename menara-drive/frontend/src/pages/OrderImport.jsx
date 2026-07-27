import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle, AlertCircle, X, Loader2, Plus, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const emptyProduct = () => ({ nom: '', quantite: '', prix: '' });

const emptyForm = {
  nom_client: '',
  societe: '',
  telephone: '',
  email: '',
  adresse: '',
  date_commande: new Date().toISOString().split('T')[0],
  date_livraison: '',
  produits: [emptyProduct()],
  remise: '',
  mode_paiement: '',
  notes: '',
  livree: false,
};

const OrderImport = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [importing, setImporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  // Modal nouvelle commande
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formSending, setFormSending] = useState(false);
  const [formStatus, setFormStatus] = useState(null);

  // ── Import Excel ──────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      const parsed = json.map((row) => ({
        nom_client: row['Nom Client']?.trim() || '',
        adresse_client: row['Adresse Client']?.trim() || '',
        produit: row['Produit']?.trim() || '',
        quantite: parseInt(row['Quantité']) || 0,
      }));
      setOrders(parsed);
      setImporting(false);
      setStatus(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const sendToServer = async () => {
    setSending(true);
    setStatus(null);
    try {
      const res = await axios.post(
        'http://localhost/OptiTruck/backend/controllers/orderImport/import_commands.php',
        { commands: orders },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setStatus({ success: true, inserted: res.data.inserted });
      setOrders([]);
    } catch (err) {
      setStatus({ success: false, message: "Erreur lors de l'envoi", error: err.message });
    }
    setSending(false);
  };

  const removeOrder = (index) => setOrders(orders.filter((_, i) => i !== index));

  // ── Formulaire nouvelle commande ──────────────────────────────
  const handleField = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleProduct = (idx, field, value) =>
    setForm((f) => {
      const produits = [...f.produits];
      produits[idx] = { ...produits[idx], [field]: value };
      return { ...f, produits };
    });

  const addProduct = () =>
    setForm((f) => ({ ...f, produits: [...f.produits, emptyProduct()] }));

  const removeProduct = (idx) =>
    setForm((f) => ({
      ...f,
      produits: f.produits.length > 1 ? f.produits.filter((_, i) => i !== idx) : f.produits,
    }));

  const handleSubmitForm = async () => {
    if (!form.nom_client.trim()) return;
    setFormSending(true);
    setFormStatus(null);
    try {
      // Adapter selon votre API — on envoie client_id si dispo, sinon nom
      const produitStr = form.produits.map((p) => `${p.nom} (x${p.quantite})`).join(', ');
      const totalQte = form.produits.reduce((s, p) => s + (parseInt(p.quantite) || 0), 0);

      await axios.post(
        'http://localhost/OptiTruck/backend/controllers/orderManagement/commandes.php',
        {
          client_id: null, // à remplacer si vous avez un select client
          nom_client: form.nom_client,
          societe: form.societe,
          telephone: form.telephone,
          email: form.email,
          adresse: form.adresse,
          produit: produitStr,
          quantite: totalQte,
          date_commande: form.date_commande,
          date_livraison: form.date_livraison,
          remise: form.remise,
          mode_paiement: form.mode_paiement,
          notes: form.notes,
          livree: form.livree ? 1 : 0,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setFormStatus({ success: true });
      setTimeout(() => {
        setShowModal(false);
        setForm(emptyForm);
        setFormStatus(null);
      }, 1500);
    } catch (err) {
      setFormStatus({ success: false, message: "Erreur lors de l'enregistrement" });
    }
    setFormSending(false);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#F8F5EB' }}>
        <div className="max-w-6xl mx-auto">

          {/* Titre */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div style={{ width: 4, height: 40, background: GOLD_PRIMARY, borderRadius: 2 }} />
            <h1 className="text-4xl font-extrabold text-center select-none" style={{ color: '#2c2b26' }}>
              📦 Importer des commandes
            </h1>
          </div>

          {/* Boutons d'action */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
            style={{ background: '#fff', border: '1px solid #E8E0CC', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Bouton Excel */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 font-semibold rounded-2xl shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed select-none"
              style={{ background: GOLD_PRIMARY, color: '#fff' }}
            >
              {importing ? (
                <><Loader2 className="animate-spin w-6 h-6" /> Chargement...</>
              ) : (
                <><Upload className="w-6 h-6" /> Choisir un fichier Excel</>
              )}
            </button>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Bouton Nouvelle commande */}
              <button
                onClick={() => { setShowModal(true); setFormStatus(null); }}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 font-semibold rounded-2xl border-2 transition-all hover:shadow-md select-none"
                style={{ borderColor: GOLD_PRIMARY, color: GOLD_DARK, background: GOLD_BG }}
              >
                <Plus className="w-6 h-6" />
                Nouvelle commande
              </button>

              {/* Bouton Envoyer Excel */}
              {orders.length > 0 && (
                <button
                  onClick={sendToServer}
                  disabled={sending}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 font-semibold rounded-2xl shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed select-none"
                  style={{ background: GOLD_PRIMARY, color: '#fff' }}
                >
                  {sending ? (
                    <><Loader2 className="animate-spin w-6 h-6" /> Envoi...</>
                  ) : (
                    <><CheckCircle className="w-6 h-6" /> Envoyer ({orders.length})</>
                  )}
                </button>
              )}
            </div>
          </motion.section>

          {/* Status import Excel */}
          {status && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              role="alert"
              className="mt-8 max-w-3xl mx-auto p-5 rounded-xl flex items-center gap-4 text-lg font-medium shadow-md border"
              style={status.success
                ? { background: GOLD_BG, color: GOLD_DARK, borderColor: GOLD_PRIMARY }
                : { background: '#fff5f5', color: '#c0392b', borderColor: '#f0b3b3' }}
            >
              {status.success
                ? <><CheckCircle className="w-7 h-7 flex-shrink-0" style={{ color: GOLD_PRIMARY }} /><p>{status.inserted} commande(s) importée(s) avec succès.</p></>
                : <><AlertCircle className="w-7 h-7 flex-shrink-0" /><p>{status.message}</p></>}
            </motion.div>
          )}

          {/* Tableau aperçu Excel */}
          {orders.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-12 rounded-3xl shadow-xl p-8"
              style={{ background: '#fff', border: '1px solid #E8E0CC' }}
            >
              <h2 className="text-2xl font-bold mb-6 select-none" style={{ color: '#2c2b26' }}>
                Aperçu des commandes importées
              </h2>
              <div className="overflow-x-auto max-h-[450px] rounded-xl shadow-inner" style={{ border: '1px solid #E8E0CC' }}>
                <table className="min-w-full table-fixed border-collapse">
                  <thead className="sticky top-0" style={{ background: GOLD_BG }}>
                    <tr>
                      {['Client', 'Adresse', 'Produit', 'Quantité', ''].map((h, i) => (
                        <th key={i} className={`px-6 py-3 text-left font-semibold whitespace-nowrap ${i === 3 ? 'text-right' : ''}`} style={{ color: GOLD_DARK }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ color: '#5e4b2a' }}>
                    {orders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-amber-50 transition border-t" style={{ borderColor: '#E8E0CC' }}>
                        <td className="px-6 py-4 truncate" style={{ color: '#2c2b26' }}>{order.nom_client}</td>
                        <td className="px-6 py-4 truncate">{order.adresse_client}</td>
                        <td className="px-6 py-4 truncate">{order.produit}</td>
                        <td className="px-6 py-4 text-right font-semibold" style={{ color: GOLD_DARK }}>{order.quantite}</td>
                        <td className="px-2 py-4 text-center">
                          <button onClick={() => removeOrder(idx)} style={{ color: GOLD_PRIMARY }} className="hover:opacity-70 transition">
                            <X className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>
          )}
        </div>
      </main>

      {/* ── Modal Nouvelle Commande ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid #E8E0CC' }}
            >
              {/* Header modal */}
              <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: '#E8E0CC' }}>
                <h2 className="text-xl font-bold" style={{ color: '#2c2b26' }}>✏️ Nouvelle commande</h2>
                <button onClick={() => setShowModal(false)} className="hover:opacity-70 transition" style={{ color: GOLD_DARK }}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Body modal */}
              <div className="px-8 py-6 flex flex-col gap-5">

                {/* Client */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nom du client *">
                    <input value={form.nom_client} onChange={(e) => handleField('nom_client', e.target.value)}
                      placeholder="ex. Mohamed Alami" className={inputCls} />
                  </Field>
                  <Field label="Société">
                    <input value={form.societe} onChange={(e) => handleField('societe', e.target.value)}
                      placeholder="ex. Alami SARL" className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Téléphone">
                    <input value={form.telephone} onChange={(e) => handleField('telephone', e.target.value)}
                      placeholder="ex. 06 00 00 00 00" className={inputCls} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={form.email} onChange={(e) => handleField('email', e.target.value)}
                      placeholder="ex. contact@alami.ma" className={inputCls} />
                  </Field>
                </div>

                <Field label="Adresse de livraison">
                  <input value={form.adresse} onChange={(e) => handleField('adresse', e.target.value)}
                    placeholder="ex. Rue Mohammed V, Casablanca" className={inputCls} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Date de commande">
                    <input type="date" value={form.date_commande} onChange={(e) => handleField('date_commande', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Date de livraison souhaitée">
                    <input type="date" value={form.date_livraison} onChange={(e) => handleField('date_livraison', e.target.value)} className={inputCls} />
                  </Field>
                </div>

                {/* Produits */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: GOLD_DARK }}>Produits</p>
                  <div className="flex flex-col gap-2">
                    {form.produits.map((p, idx) => (
                      <div key={idx} className="grid gap-2" style={{ gridTemplateColumns: '1fr 80px 100px 36px' }}>
                        <input value={p.nom} onChange={(e) => handleProduct(idx, 'nom', e.target.value)}
                          placeholder="Nom du produit" className={inputCls} />
                        <input type="number" value={p.quantite} onChange={(e) => handleProduct(idx, 'quantite', e.target.value)}
                          placeholder="Qté" min="1" className={inputCls} />
                        <input type="number" value={p.prix} onChange={(e) => handleProduct(idx, 'prix', e.target.value)}
                          placeholder="Prix (MAD)" min="0" step="0.01" className={inputCls} />
                        <button onClick={() => removeProduct(idx)}
                          className="flex items-center justify-center rounded-xl border transition hover:opacity-70"
                          style={{ borderColor: '#E8E0CC', color: GOLD_DARK }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addProduct}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed text-sm font-medium transition hover:opacity-80"
                    style={{ borderColor: GOLD_PRIMARY, color: GOLD_DARK, background: GOLD_BG }}>
                    <Plus className="w-4 h-4" /> Ajouter un produit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Remise (%)">
                    <input type="number" value={form.remise} onChange={(e) => handleField('remise', e.target.value)}
                      placeholder="0" min="0" max="100" className={inputCls} />
                  </Field>
                  <Field label="Mode de paiement">
                    <select value={form.mode_paiement} onChange={(e) => handleField('mode_paiement', e.target.value)} className={inputCls}>
                      <option value="">Choisir...</option>
                      <option>Virement bancaire</option>
                      <option>Chèque</option>
                      <option>Espèces</option>
                      <option>Carte bancaire</option>
                    </select>
                  </Field>
                </div>

                <Field label="Notes / Remarques">
                  <textarea value={form.notes} onChange={(e) => handleField('notes', e.target.value)}
                    placeholder="Instructions spéciales, priorité de livraison..."
                    rows={3} className={inputCls} style={{ resize: 'vertical' }} />
                </Field>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={form.livree} onChange={(e) => handleField('livree', e.target.checked)}
                    className="w-4 h-4 accent-amber-500" />
                  <span className="text-sm" style={{ color: '#2c2b26' }}>Commande déjà livrée</span>
                </label>

                {/* Status formulaire */}
                {formStatus && (
                  <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium border"
                    style={formStatus.success
                      ? { background: GOLD_BG, color: GOLD_DARK, borderColor: GOLD_PRIMARY }
                      : { background: '#fff5f5', color: '#c0392b', borderColor: '#f0b3b3' }}>
                    {formStatus.success
                      ? <><CheckCircle className="w-5 h-5" /> Commande enregistrée avec succès !</>
                      : <><AlertCircle className="w-5 h-5" /> {formStatus.message}</>}
                  </div>
                )}
              </div>

              {/* Footer modal */}
              <div className="flex justify-end gap-3 px-8 py-5 border-t" style={{ borderColor: '#E8E0CC' }}>
                <button onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-2xl border font-medium transition hover:opacity-80"
                  style={{ borderColor: '#D4C8A8', color: '#5e4b2a' }}>
                  Annuler
                </button>
                <button onClick={handleSubmitForm} disabled={formSending || !form.nom_client.trim()}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold shadow-md transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: GOLD_PRIMARY, color: '#fff' }}>
                  {formSending
                    ? <><Loader2 className="animate-spin w-5 h-5" /> Enregistrement...</>
                    : <><CheckCircle className="w-5 h-5" /> Enregistrer</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Helpers ────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition focus:ring-[#AA9766]/30';

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: GOLD_DARK }}>{label}</label>
    {children}
  </div>
);

export default OrderImport;
