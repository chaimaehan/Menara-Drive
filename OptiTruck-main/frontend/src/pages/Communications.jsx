// src/pages/Communications.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Send, Clock, Bell,
  CheckCircle, AlertCircle, X, Search,
  Phone, MessageSquare, RefreshCw, BarChart3
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK    = '#8A7A52';
const GOLD_LIGHT   = '#D4C8A8';
const GOLD_BG      = '#F8F5EB';
const API_BASE     = 'http://localhost/OptiTruck/backend/controllers/communications/send.php';

const Communications = ({ user, onLogout }) => {
  const [showSendModal, setShowSendModal]         = useState(false);
  const [communications, setCommunications]       = useState([]);
  const [stats, setStats]                         = useState({ total: 0, emails: 0, sms: 0, sent: 0, failed: 0 });
  const [loading, setLoading]                     = useState(false);
  const [sending, setSending]                     = useState(false);
  const [toast, setToast]                         = useState(null); // { type: 'success'|'error', message }
  const [formData, setFormData]                   = useState({
    type: 'email', to: '', to_name: '', subject: '', message: '', category: 'info'
  });
  const [recipients, setRecipients]               = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [searchTerm, setSearchTerm]               = useState('');
  const [filterType, setFilterType]               = useState('all');

  useEffect(() => {
    fetchCommunications();
    fetchStatistics();
    fetchRecipients();
  }, []);

  // ─── Auto-hide toast ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (type, message) => setToast({ type, message });

  const getToken = () => localStorage.getItem('token');

  // ─── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchCommunications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setCommunications(res.data.data || []);
    } catch (error) {
      console.error('Erreur chargement communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await axios.get(`${API_BASE}?stats=1`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      // ✅ Toujours un objet avec des entiers grâce au COALESCE côté PHP
      if (res.data.success && res.data.data) {
        setStats({
          total:  Number(res.data.data.total)  || 0,
          emails: Number(res.data.data.emails) || 0,
          sms:    Number(res.data.data.sms)    || 0,
          sent:   Number(res.data.data.sent)   || 0,
          failed: Number(res.data.data.failed) || 0,
        });
      }
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const fetchRecipients = async () => {
    try {
      const [driversRes, clientsRes] = await Promise.all([
        axios.get('http://localhost/OptiTruck/backend/controllers/driverManagement/chauffeurs.php', {
          headers: { Authorization: `Bearer ${getToken()}` }
        }),
        axios.get('http://localhost/OptiTruck/backend/controllers/clientManagement/clients.php', {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
      ]);

      const drivers = (driversRes.data || []).map(d => ({
        id: d.id, name: d.nom, email: d.email, phone: d.telephone, type: 'chauffeur'
      }));
      const clients = (clientsRes.data || []).map(c => ({
        id: c.id, name: c.nom, email: c.email, phone: c.telephone, type: 'client'
      }));

      setRecipients([...drivers, ...clients]);
    } catch (error) {
      console.error('Erreur chargement destinataires:', error);
    }
  };

  // ─── Envoi ─────────────────────────────────────────────────────────────────
  const handleSendCommunication = async () => {
    if (!formData.to && selectedRecipients.length === 0) {
      showToast('error', 'Veuillez sélectionner ou saisir un destinataire.');
      return;
    }
    if (!formData.message.trim()) {
      showToast('error', 'Le message ne peut pas être vide.');
      return;
    }
    if (formData.type === 'email' && !formData.subject.trim()) {
      showToast('error', 'Veuillez saisir un sujet.');
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount    = 0;

    try {
      const recipientsToSend = selectedRecipients.length > 0
        ? selectedRecipients
        : [{ name: formData.to_name, email: formData.to, phone: formData.to }];

      for (const recipient of recipientsToSend) {
        const payload = {
          type:     formData.type,
          to:       formData.type === 'email' ? recipient.email : recipient.phone,
          to_name:  recipient.name || formData.to_name,
          subject:  formData.subject,
          message:  formData.message,
          category: formData.category
        };

        try {
          const res = await axios.post(API_BASE, payload, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          // success = true même si SMTP échoue, tant que la comm est sauvegardée
          if (res.data.success || res.data.saved) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      // ✅ Toujours rafraîchir après envoi
      await fetchCommunications();
      await fetchStatistics();

      if (successCount > 0) {
        showToast('success', `✅ ${successCount} message(s) enregistré(s) avec succès !`);
      }
      if (failCount > 0) {
        showToast('error', `⚠️ ${failCount} message(s) ont échoué.`);
      }

      // Reset du formulaire
      setShowSendModal(false);
      setFormData({ type: 'email', to: '', to_name: '', subject: '', message: '', category: 'info' });
      setSelectedRecipients([]);

    } catch (error) {
      console.error('Erreur envoi:', error);
      showToast('error', 'Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  // ─── Helpers UI ────────────────────────────────────────────────────────────
  const getCategoryColor = (category) => {
    switch (category) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'error':   return 'bg-red-100 text-red-700';
      default:        return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':   return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:       return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const filteredCommunications = communications.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (searchTerm &&
        !c.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !c.subject?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const templates = [
    { title: 'Livraison confirmée',
      subject: '✅ Votre livraison est confirmée',
      message: 'Votre livraison est programmée pour aujourd\'hui. Le chauffeur arrivera entre 14h et 16h.' },
    { title: 'Retard de livraison',
      subject: '⚠️ Retard sur votre livraison',
      message: 'Nous vous informons d\'un léger retard sur votre livraison. Le nouveau créneau est prévu pour demain matin.' },
    { title: 'Nouvelle commande',
      subject: '📦 Nouvelle commande assignée',
      message: 'Une nouvelle commande vous a été assignée. Veuillez consulter votre planning pour plus de détails.' },
    { title: 'Rappel de planning',
      subject: '📅 Rappel de votre planning',
      message: 'N\'oubliez pas vos livraisons prévues aujourd\'hui. Bonne journée !' }
  ];

  const applyTemplate = (template) => {
    setFormData({ ...formData, subject: template.subject, message: template.message });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar user={user} onLogout={onLogout} />

      {/* ─── Toast notification ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl shadow-lg text-white font-medium flex items-center gap-2"
            style={{ background: toast.type === 'success' ? '#10b981' : '#ef4444' }}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />
            }
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen" style={{ background: GOLD_BG }}>
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* ─── Header ─── */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div style={{ width: 4, height: 40, background: GOLD_PRIMARY, borderRadius: 2 }} />
              <div>
                <h1 className="text-3xl font-bold" style={{ color: GOLD_DARK }}>📧 Communications</h1>
                <p className="mt-1" style={{ color: GOLD_PRIMARY }}>Envoyez des emails et SMS à vos clients et chauffeurs</p>
              </div>
            </div>
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-medium transition-all hover:shadow-md"
              style={{ background: GOLD_PRIMARY }}
            >
              <Send className="w-5 h-5" />
              Nouvelle communication
            </button>
          </div>

          {/* ─── Statistiques ─── */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {[
              { icon: <Mail className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />, value: stats.emails, label: 'Emails envoyés', color: GOLD_DARK },
              { icon: <Phone className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />, value: stats.sms, label: 'SMS envoyés', color: GOLD_DARK },
              { icon: <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />, value: stats.sent, label: 'Livrés', color: '#10b981' },
              { icon: <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />, value: stats.failed, label: 'Échoués', color: '#ef4444' },
              { icon: <BarChart3 className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />, value: stats.total, label: 'Total', color: GOLD_DARK },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border" style={{ borderColor: '#E8E0CC' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: GOLD_BG }}>{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-sm" style={{ color: GOLD_PRIMARY }}>{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Filtres ─── */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6" style={{ borderColor: '#E8E0CC' }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: GOLD_PRIMARY }} />
                <input
                  type="text"
                  placeholder="Rechercher par destinataire ou sujet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
              >
                <option value="all">Tous les types</option>
                <option value="email">Emails</option>
                <option value="sms">SMS</option>
              </select>
              <button
                onClick={() => { fetchCommunications(); fetchStatistics(); }}
                className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                style={{ background: GOLD_BG, color: GOLD_PRIMARY }}
              >
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
            </div>
          </div>

          {/* ─── Liste ─── */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#E8E0CC' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#E8E0CC', background: GOLD_BG }}>
              <h2 className="font-semibold" style={{ color: GOLD_DARK }}>
                Historique des communications
                {filteredCommunications.length > 0 && (
                  <span className="ml-2 text-sm font-normal" style={{ color: GOLD_PRIMARY }}>
                    ({filteredCommunications.length})
                  </span>
                )}
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: '#E8E0CC' }}>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: GOLD_PRIMARY }}></div>
                  <p className="mt-3" style={{ color: GOLD_PRIMARY }}>Chargement...</p>
                </div>
              ) : filteredCommunications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: GOLD_LIGHT }} />
                  <p style={{ color: GOLD_PRIMARY }}>Aucune communication envoyée</p>
                  <button
                    onClick={() => setShowSendModal(true)}
                    className="mt-3 px-4 py-2 rounded-lg text-white text-sm"
                    style={{ background: GOLD_PRIMARY }}
                  >
                    Envoyer la première
                  </button>
                </div>
              ) : (
                filteredCommunications.map((comm, idx) => (
                  <motion.div
                    key={comm.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${comm.type === 'email' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {comm.type === 'email'
                          ? <Mail className="w-5 h-5 text-blue-600" />
                          : <MessageSquare className="w-5 h-5 text-green-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium" style={{ color: GOLD_DARK }}>{comm.subject || 'SMS'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryColor(comm.category)}`}>
                            {comm.category}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            {getStatusIcon(comm.status)}
                            <span className="capitalize">{comm.status}</span>
                          </span>
                        </div>
                        <p className="text-sm mb-2 truncate" style={{ color: '#5e4b2a' }}>
                          {comm.message?.substring(0, 150)}{comm.message?.length > 150 ? '…' : ''}
                        </p>
                        <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: GOLD_LIGHT }}>
                          <span>📧 {comm.recipient}</span>
                          {comm.recipient_name && <span>👤 {comm.recipient_name}</span>}
                          <span>📅 {new Date(comm.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── Modal d'envoi ─── */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center z-10" style={{ borderColor: '#E8E0CC' }}>
                <h2 className="text-xl font-bold" style={{ color: GOLD_DARK }}>Nouvelle communication</h2>
                <button onClick={() => setShowSendModal(false)} className="p-1 hover:opacity-70">
                  <X className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />
                </button>
              </div>

              <div className="p-5 space-y-5">

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Type de communication</label>
                  <div className="flex gap-3">
                    {['email', 'sms'].map(t => (
                      <button
                        key={t}
                        onClick={() => setFormData({ ...formData, type: t })}
                        className={`flex-1 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                          formData.type === t ? 'border-[#AA9766] bg-[#F8F5EB]' : 'border-gray-200'
                        }`}
                      >
                        {t === 'email'
                          ? <Mail className="w-5 h-5" style={{ color: formData.type === t ? GOLD_PRIMARY : '#9ca3af' }} />
                          : <MessageSquare className="w-5 h-5" style={{ color: formData.type === t ? GOLD_PRIMARY : '#9ca3af' }} />
                        }
                        <span style={{ color: formData.type === t ? GOLD_DARK : '#9ca3af' }}>
                          {t === 'email' ? 'Email' : 'SMS'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destinataires */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Destinataires</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedRecipients.map(recipient => (
                      <span key={recipient.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm" style={{ background: GOLD_BG, color: GOLD_DARK }}>
                        {recipient.name}
                        <button onClick={() => setSelectedRecipients(prev => prev.filter(r => r.id !== recipient.id))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    onChange={(e) => {
                      const recipient = recipients.find(r => r.id === parseInt(e.target.value));
                      if (recipient && !selectedRecipients.find(r => r.id === recipient.id)) {
                        setSelectedRecipients([...selectedRecipients, recipient]);
                      }
                      e.target.value = '';
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                    defaultValue=""
                  >
                    <option value="" disabled>Sélectionner un destinataire</option>
                    <optgroup label="Chauffeurs">
                      {recipients.filter(r => r.type === 'chauffeur').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {formData.type === 'email' ? r.email : r.phone}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Clients">
                      {recipients.filter(r => r.type === 'client').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {formData.type === 'email' ? r.email : r.phone}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-xs mt-2 mb-1" style={{ color: GOLD_LIGHT }}>Ou saisir manuellement</p>
                  <input
                    type={formData.type === 'email' ? 'email' : 'tel'}
                    placeholder={formData.type === 'email' ? 'email@exemple.com' : '+212 6XX XXX XXX'}
                    value={formData.to}
                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none mb-2"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                  />
                  <input
                    type="text"
                    placeholder="Nom du destinataire"
                    value={formData.to_name}
                    onChange={(e) => setFormData({ ...formData, to_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                  />
                </div>

                {/* Templates */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Modèles rapides</label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-1.5 text-sm rounded-full transition-colors hover:opacity-80"
                        style={{ background: GOLD_BG, color: GOLD_PRIMARY }}
                      >
                        {template.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sujet (email uniquement) */}
                {formData.type === 'email' && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Sujet *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                      placeholder="Sujet du message"
                    />
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Message *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none resize-none"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                    placeholder={formData.type === 'email' ? 'Contenu de votre email...' : 'Contenu de votre SMS (160 caractères max)...'}
                  />
                  {formData.type === 'sms' && (
                    <p className="text-xs mt-1 text-right" style={{ color: formData.message.length > 160 ? '#ef4444' : GOLD_LIGHT }}>
                      {formData.message.length}/160 caractères
                    </p>
                  )}
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>Catégorie</label>
                  <div className="flex gap-3 flex-wrap">
                    {['info', 'success', 'warning', 'error'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`px-4 py-2 rounded-lg capitalize transition-all ${formData.category === cat ? 'text-white' : 'border'}`}
                        style={formData.category === cat
                          ? { background: GOLD_PRIMARY }
                          : { borderColor: '#E8E0CC', color: GOLD_LIGHT }
                        }
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSendModal(false)}
                    className="flex-1 py-3 rounded-lg border font-medium transition-colors hover:bg-gray-50"
                    style={{ borderColor: '#E8E0CC', color: GOLD_PRIMARY }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSendCommunication}
                    disabled={sending || (!formData.to && selectedRecipients.length === 0)}
                    className="flex-1 py-3 rounded-lg text-white font-medium transition-all hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: GOLD_PRIMARY }}
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Communications;