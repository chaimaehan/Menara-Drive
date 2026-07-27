import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, X, Check, Loader2, User, MapPin,
  Package, Hash, Calendar, ShoppingCart,
  AlertCircle, ArrowLeft, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';

// ── Palette #AA9766 ──────────────────────────────────────────────
const G = {
  primary: '#AA9766',
  dark:    '#8A7A52',
  light:   '#D4C8A8',
  bg:      '#F8F5EB',
  text:    '#2c2b26',
  sub:     '#5e4b2a',
  muted:   '#AA9766',
  border:  '#E8E0CC',
  pageBg:  '#F8F5EB',
  white:   '#ffffff',
};

// ── Champ réutilisable ────────────────────────────────────────
const Field = ({ label, icon: Icon, error, required, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between">
      <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: G.muted }}>
        {label}
        {required && <span style={{ color: G.primary }}>*</span>}
      </label>
      {hint && <span className="text-xs" style={{ color: G.muted }}>{hint}</span>}
    </div>
    <div
      className="relative flex items-center rounded-2xl transition-all duration-200"
      style={{
        border: `1.5px solid ${error ? '#e57373' : G.border}`,
        background: error ? '#fff8f8' : '#fffdf5',
        boxShadow: error
          ? '0 0 0 3px rgba(229,115,115,0.10)'
          : '0 1px 3px rgba(170,151,102,0.06)',
      }}
    >
      {Icon && (
        <span className="pl-4 pr-2 flex-shrink-0" style={{ color: error ? '#e57373' : G.primary }}>
          <Icon size={16} />
        </span>
      )}
      {children}
    </div>
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0,  height: 'auto' }}
          exit={{   opacity: 0, y: -4, height: 0 }}
          className="text-xs flex items-center gap-1"
          style={{ color: '#c62828' }}
        >
          <AlertCircle size={11} /> {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

const inp = 'w-full bg-transparent px-3 py-3 text-sm outline-none placeholder-[#D4C8A8]';

// ── Section Card ──────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="rounded-3xl overflow-hidden"
    style={{ background: G.white, border: `1px solid ${G.border}`, boxShadow: '0 4px 20px rgba(170,151,102,0.08)' }}
  >
    <div
      className="flex items-center gap-3 px-7 py-4"
      style={{ background: G.bg, borderBottom: `1px solid ${G.border}` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: G.primary }}
      >
        <Icon size={15} color="#fff" />
      </div>
      <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: G.dark }}>
        {title}
      </h3>
    </div>
    <div className="px-7 py-6 flex flex-col gap-4">
      {children}
    </div>
  </motion.div>
);

// ── Page principale ───────────────────────────────────────────
const OrderFormPage = ({ user, onLogout, onBack }) => {
  const [clients, setClients]       = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [toast, setToast]           = useState(null);
  const [form, setForm] = useState({
    client_id:      '',
    adresse_client: '',
    produit:        '',
    quantite:       '',
    date_commande:  new Date().toISOString().split('T')[0],
    notes:          '',
    livree:         'Non',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    axios
      .get('http://localhost/OptiTruck/backend/controllers/clientManagement/clients.php')
      .then(r => setClients(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.client_id) {
      const c = clients.find(c => String(c.id) === String(form.client_id));
      if (c) setForm(f => ({ ...f, adresse_client: c.adresse || '' }));
    }
  }, [form.client_id, clients]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.client_id)              e.client_id      = 'Veuillez sélectionner un client.';
    if (!form.adresse_client.trim())  e.adresse_client = 'L\'adresse de livraison est requise.';
    if (!form.produit.trim())         e.produit        = 'Le nom du produit est requis.';
    if (!form.quantite || Number(form.quantite) <= 0)
                                      e.quantite       = 'Entrez une quantité valide (> 0).';
    if (!form.date_commande)          e.date_commande  = 'La date est requise.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setToast({ type: 'error', msg: 'Veuillez corriger les erreurs avant de continuer.' });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        'http://localhost/OptiTruck/backend/controllers/orderManagement/commandes.php',
        form
      );
      setSubmitted(true);
      setToast({ type: 'success', msg: 'Commande ajoutée avec succès !' });
    } catch {
      setToast({ type: 'error', msg: "Erreur lors de l'enregistrement." });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      client_id: '', adresse_client: '', produit: '',
      quantite: '', date_commande: new Date().toISOString().split('T')[0],
      notes: '', livree: 'Non',
    });
    setErrors({});
    setSubmitted(false);
    setToast(null);
  };

  // ── Écran de succès ───────────────────────────────────────
  if (submitted) {
    return (
      <>
        <Navbar user={user} onLogout={onLogout} />
        <main className="min-h-screen flex items-center justify-center px-4" style={{ background: G.pageBg }}>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="text-center max-w-md w-full rounded-3xl p-12"
            style={{ background: G.white, border: `1px solid ${G.border}`, boxShadow: '0 20px 60px rgba(170,151,102,0.15)' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: G.bg, border: `2px solid ${G.primary}` }}
            >
              <Check size={36} style={{ color: G.primary }} />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: G.text }}>Commande enregistrée !</h2>
            <p className="text-sm mb-8" style={{ color: G.muted }}>
              La commande a été ajoutée avec succès dans le système.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-2xl font-semibold text-sm shadow-md transition-all hover:shadow-lg"
                style={{ background: G.primary, color: '#fff' }}
              >
                <Plus size={15} className="inline mr-2" />
                Ajouter une autre commande
              </button>
              <button
                onClick={onBack}
                className="w-full py-3 rounded-2xl font-medium text-sm transition-colors hover:bg-[#F8F5EB]"
                style={{ border: `1px solid ${G.border}`, color: G.muted }}
              >
                Retour à la liste
              </button>
            </div>
          </motion.div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <main className="min-h-screen py-10 px-4 sm:px-6 lg:px-8" style={{ background: G.pageBg }}>
        <div className="max-w-2xl mx-auto">

          {/* ── En-tête de page ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors hover:bg-[#F8F5EB]"
                style={{ border: `1px solid ${G.border}`, color: G.muted, background: G.white }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div style={{ width: 4, height: 40, background: G.primary, borderRadius: 2 }} />
              <div>
                <h1 className="text-3xl font-extrabold" style={{ color: G.text }}>
                  Nouvelle commande
                </h1>
                <p className="text-sm" style={{ color: G.muted }}>
                  Renseignez les informations ci-dessous
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Toast ── */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-medium mb-6"
                style={
                  toast.type === 'success'
                    ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }
                    : { background: '#fff8f8', color: '#c62828', border: '1px solid #fecaca' }
                }
              >
                {toast.type === 'success'
                  ? <Check size={16} />
                  : <AlertCircle size={16} />}
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-5">

            {/* ── Section Client ── */}
            <Section title="Informations client" icon={User} delay={0.05}>
              <Field label="Client" icon={User} error={errors.client_id} required>
                <select
                  value={form.client_id}
                  onChange={e => set('client_id', e.target.value)}
                  className={inp}
                  style={{ color: form.client_id ? G.text : '#D4C8A8', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">Sélectionner un client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <span className="pr-4 flex-shrink-0" style={{ color: G.muted, pointerEvents: 'none' }}>
                  <ChevronDown size={15} />
                </span>
              </Field>

              <Field label="Adresse de livraison" icon={MapPin} error={errors.adresse_client} required
                hint="Pré-remplie depuis le client">
                <input
                  type="text"
                  placeholder="Ex : 12 Rue Mohammed V, Marrakech"
                  value={form.adresse_client}
                  onChange={e => set('adresse_client', e.target.value)}
                  className={inp}
                  style={{ color: G.text }}
                />
              </Field>
            </Section>

            {/* ── Section Commande ── */}
            <Section title="Détails de la commande" icon={ShoppingCart} delay={0.10}>
              <Field label="Produit" icon={Package} error={errors.produit} required>
                <input
                  type="text"
                  placeholder="Nom du produit commandé"
                  value={form.produit}
                  onChange={e => set('produit', e.target.value)}
                  className={inp}
                  style={{ color: G.text }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantité" icon={Hash} error={errors.quantite} required>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={form.quantite}
                    onChange={e => set('quantite', e.target.value)}
                    className={inp}
                    style={{ color: G.text }}
                  />
                </Field>

                <Field label="Date de commande" icon={Calendar} error={errors.date_commande} required>
                  <input
                    type="date"
                    value={form.date_commande}
                    onChange={e => set('date_commande', e.target.value)}
                    className={inp}
                    style={{ color: G.text }}
                  />
                </Field>
              </div>

              {/* Statut livraison */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: G.muted }}>
                  Statut de livraison
                </label>
                <div className="flex gap-3">
                  {['Non', 'Oui'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => set('livree', val)}
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all duration-200"
                      style={
                        form.livree === val
                          ? { background: G.primary, color: '#fff', boxShadow: '0 4px 12px rgba(170,151,102,0.35)' }
                          : { background: G.bg, color: G.muted, border: `1px solid ${G.border}` }
                      }
                    >
                      {val === 'Non' ? '⏳ En attente' : '✅ Livrée'}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── Section Notes ── */}
            <Section title="Notes (optionnel)" icon={Package} delay={0.15}>
              <div className="flex flex-col gap-1.5">
                <div
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{ border: `1.5px solid ${G.border}`, background: '#fffdf5' }}
                >
                  <textarea
                    rows={4}
                    placeholder="Remarques, instructions spéciales, informations complémentaires…"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    className="w-full bg-transparent px-4 py-3 text-sm outline-none resize-none"
                    style={{ color: G.text }}
                  />
                </div>
              </div>
            </Section>

            {/* ── Boutons d'action ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.20 }}
              className="flex flex-col sm:flex-row gap-3 pb-8"
            >
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-colors hover:bg-[#F8F5EB]"
                style={{ border: `1.5px solid ${G.border}`, color: G.muted, background: G.white }}
              >
                <X size={15} />
                Réinitialiser
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 sm:flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: G.primary, color: '#fff' }}
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                  : <><Check size={16} /> Enregistrer la commande</>
                }
              </button>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
};

export default OrderFormPage;