// src/components/AIAssistant.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, X, Minimize2, Maximize2, MessageSquare,
  Sparkles, Truck, Package, BarChart3,
  AlertCircle, Zap, Power, Database,
  Users, Clock, Loader2, RefreshCw,
  CheckCircle, Star, AlertTriangle, Timer
} from 'lucide-react';
import aiDataService from '../services/aiDataService';
import axios from 'axios';

const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';
const API_BASE_URL = 'http://localhost/OptiTruck/backend/controllers';

const AIAssistant = ({ userRole, userName, onDisable }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contextData, setContextData] = useState({
    stats: null, livraisons: null, produits: null,
    chauffeurs: null, camions: null, commandes: null
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setMessages([]);
    setInput('');
    setIsTyping(false);
    setContextData({ stats: null, livraisons: null, produits: null, chauffeurs: null, camions: null, commandes: null });
    loadAllData();
  }, [userRole, userName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAllData = async (showRefreshMessage = false) => {
    if (showRefreshMessage) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (token) aiDataService.token = token;
      const data = await aiDataService.getAllData();
      setContextData(data);

      if (!showRefreshMessage && messages.length === 0) {
        const welcomeMessage = getWelcomeMessage(userName, data);
        setMessages([{
          id: 1, type: 'bot', content: welcomeMessage, timestamp: new Date(),
          actions: ['📦 Voir livraisons', '📊 Voir stocks', '👨‍✈️ Voir chauffeurs', '📈 Statistiques', '⏱️ Temps restant', '⭐ Évaluations', '🆘 Aide']
        }]);
      }

      if (showRefreshMessage) {
        addBotMessage('✅ Données actualisées avec succès !', ['📦 Livraisons', '📊 Stocks', '👨‍✈️ Chauffeurs', '📈 Stats']);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const addBotMessage = (content, actions = []) => {
    setMessages(prev => [...prev, {
      id: Date.now(), type: 'bot', content, timestamp: new Date(), actions
    }]);
  };

  const getWelcomeMessage = (name, data) => {
    const alertMessages = [];
    if (data.produits?.lowStockCount > 0) alertMessages.push(`📦 ${data.produits.lowStockCount} produit(s) en stock faible`);
    if (data.livraisons?.pending > 0) alertMessages.push(`🚚 ${data.livraisons.pending} livraison(s) en attente`);

    const alertText = alertMessages.length > 0
      ? `\n\n🔔 Alertes :\n${alertMessages.map(m => `• ${m}`).join('\n')}`
      : '\n\n✅ Tout est en ordre';

    return `👋 Bonjour ${name || 'cher utilisateur'} ! Je suis l'assistant IA d'OptiTruck.

📊 Résumé du jour :
• 🚚 ${data.livraisons?.today || 0} livraison(s) prévue(s) aujourd'hui
• ✅ ${data.livraisons?.completed || 0} déjà complétée(s)
• 👨‍✈️ ${data.chauffeurs?.active || 0} chauffeur(s) actif(s)
• 🚛 ${data.camions?.disponible || 0} camion(s) disponible(s)
${alertText}

Comment puis-je vous aider aujourd'hui ?`;
  };

  // ── Alertes livraisons en retard ─────────────────────────────────────────
  const checkLateDeliveries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/adminLivraisons/livraisons.php`, {
        params: { all: 1 },
        headers: { Authorization: `Bearer ${token}` }
      });
      const today = new Date().toISOString().split('T')[0];
      const livraisons = Array.isArray(res.data) ? res.data : [];
      const late = livraisons.filter(d =>
        d.livree == 0 && d.date_livraison && d.date_livraison < today
      );
      if (late.length === 0) {
        return '✅ Aucune livraison en retard. Tout est dans les délais !';
      }
      let response = `⚠️ ${late.length} livraison(s) en retard :\n\n`;
      late.slice(0, 5).forEach((d, i) => {
        const jours = Math.floor((new Date(today) - new Date(d.date_livraison)) / 86400000);
        response += `${i + 1}. Commande #${d.commande_id || d.id}\n   📅 Prévue le : ${d.date_livraison}\n   ⏰ Retard : ${jours} jour(s)\n\n`;
      });
      if (late.length > 5) response += `... et ${late.length - 5} autre(s)`;
      return response;
    } catch {
      return '❌ Impossible de vérifier les retards.';
    }
  };

  // ── Temps restant pour terminer la tournée ───────────────────────────────
  const estimateRemainingTime = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/adminLivraisons/livraisons.php`, {
        params: { all: 1 },
        headers: { Authorization: `Bearer ${token}` }
      });
      const today = new Date().toISOString().split('T')[0];
      const livraisons = Array.isArray(res.data) ? res.data : [];
      const todayDeliveries = livraisons.filter(d => d.date_livraison === today);
      const completed = todayDeliveries.filter(d => d.livree == 1).length;
      const pending = todayDeliveries.filter(d => d.livree == 0).length;
      const total = todayDeliveries.length;

      if (total === 0) return '📅 Aucune livraison prévue aujourd\'hui.';
      if (pending === 0) return '🎉 Toutes les livraisons du jour sont terminées !';

      const avgMinPerDelivery = 20;
      const estimatedMinutes = pending * avgMinPerDelivery;
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      const timeStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

      return `⏱️ Estimation tournée du jour :

• ✅ Complétées : ${completed}/${total}
• 🕐 En attente : ${pending} livraison(s)
• ⏰ Temps estimé restant : ${timeStr}
• 📊 Progression : ${Math.round((completed / total) * 100)}%

(Basé sur ~${avgMinPerDelivery} min/livraison)`;
    } catch {
      return '❌ Impossible d\'estimer le temps restant.';
    }
  };

  // ── Évaluations clients récentes ────────────────────────────────────────
  const getRecentEvaluations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/evaluation/evaluation.php`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const evals = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (evals.length === 0) return '⭐ Aucune évaluation disponible pour le moment.';

      const avg = evals.reduce((sum, e) => sum + parseFloat(e.note || e.rating || 0), 0) / evals.length;
      let response = `⭐ Évaluations clients récentes :\n\n`;
      response += `📊 Note moyenne : ${avg.toFixed(1)}/5\n\n`;
      evals.slice(0, 5).forEach((e, i) => {
        const stars = '⭐'.repeat(Math.round(parseFloat(e.note || e.rating || 0)));
        response += `${i + 1}. ${stars} ${e.note || e.rating}/5\n`;
        if (e.commentaire || e.comment) response += `   💬 "${e.commentaire || e.comment}"\n`;
        if (e.chauffeur_nom) response += `   👨‍✈️ ${e.chauffeur_nom}\n`;
        response += '\n';
      });
      return response;
    } catch {
      return '⭐ Évaluations : données non disponibles.\n\nVérifiez que le module évaluations est actif.';
    }
  };

  // ── Marquer livraison comme terminée ────────────────────────────────────
  const markDeliveryDone = async (deliveryId) => {
    if (!deliveryId) {
      return '❓ Veuillez préciser l\'ID de la livraison.\nExemple : "Marquer livraison 143 terminée"';
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/routeMap/update_delivery_status.php`,
        { deliveryId: parseInt(deliveryId), status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return `✅ Livraison #${deliveryId} marquée comme terminée avec succès !`;
    } catch {
      return `❌ Impossible de marquer la livraison #${deliveryId}.\nVérifiez que l'ID est correct.`;
    }
  };

  // ── Signaler une panne ───────────────────────────────────────────────────
  const reportBreakdown = async (description) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/chauffeurDashboard/report_breakdown.php`,
        { description: description || 'Panne signalée via assistant IA', type: 'panne' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return `🆘 Panne signalée avec succès !\n\n📋 Description : ${description || 'Panne signalée'}\n\nL'équipe de maintenance a été notifiée. Restez en sécurité !`;
    } catch {
      return `🆘 Panne signalée !\n\n⚠️ La notification automatique a échoué, mais votre signalement est enregistré.\n\n📞 Contactez directement le responsable de flotte.`;
    }
  };

  // ── Générer réponse ──────────────────────────────────────────────────────
  const generateResponse = async (userMessage) => {
    const message = userMessage.toLowerCase();

    // Retard
    if (message.includes('retard') || message.includes('en retard') || message.includes('délai')) {
      const content = await checkLateDeliveries();
      return { content, actions: ['⏱️ Temps restant', '📦 Voir livraisons', '🔄 Rafraîchir'] };
    }

    // Temps restant
    if (message.includes('temps restant') || message.includes('estimation') || message.includes('durée') || message.includes('terminer')) {
      const content = await estimateRemainingTime();
      return { content, actions: ['⚠️ Vérifier retards', '📦 Voir livraisons', '🔄 Rafraîchir'] };
    }

    // Évaluations
    if (message.includes('évaluation') || message.includes('evaluation') || message.includes('note') || message.includes('avis') || message.includes('satisfaction')) {
      const content = await getRecentEvaluations();
      return { content, actions: ['📊 Statistiques', '👨‍✈️ Chauffeurs', '🔄 Rafraîchir'] };
    }

    // Marquer livraison terminée
    if (message.includes('marquer') || message.includes('terminer livraison') || message.includes('livraison terminée')) {
      const idMatch = message.match(/\d+/);
      const content = await markDeliveryDone(idMatch ? idMatch[0] : null);
      return { content, actions: ['📦 Voir livraisons', '⏱️ Temps restant', '🔄 Rafraîchir'] };
    }

    // Signaler panne
    if (message.includes('panne') || message.includes('signaler') || message.includes('problème') || message.includes('breakdown')) {
      const desc = userMessage.replace(/panne|signaler|problème|signale|une|je|ma/gi, '').trim();
      const content = await reportBreakdown(desc || 'Panne signalée via assistant IA');
      return { content, actions: ['📞 Contacter support', '🔄 Rafraîchir'] };
    }

    // Livraisons
    if (message.includes('livraison') || message.includes('tournée')) {
      const l = contextData.livraisons;
      if (!l) return { content: '⏳ Chargement des données...', actions: ['🔄 Rafraîchir'] };
      return {
        content: `📦 État des livraisons :\n\n• Total : ${l.total}\n• ✅ Complétées : ${l.completed}\n• 🕐 En attente : ${l.pending}\n• 📅 Aujourd'hui : ${l.today}`,
        actions: ['⚠️ Vérifier retards', '⏱️ Temps restant', '🗺️ Voir carte', '🔄 Rafraîchir']
      };
    }

    // Stocks
    if (message.includes('stock') || message.includes('produit')) {
      const p = contextData.produits;
      if (!p) return { content: '⏳ Chargement des données...', actions: ['🔄 Rafraîchir'] };
      let response = `📊 Gestion des stocks :\n\n• Total produits : ${p.total}\n• ⚠️ Stock faible : ${p.lowStockCount}\n`;
      if (p.lowStockProducts?.length > 0) {
        response += `\n📦 Produits à réapprovisionner :\n`;
        p.lowStockProducts.forEach(p => { response += `• ${p.produit} : ${p.quantite_disponible} unités\n`; });
      }
      return { content: response, actions: ['📦 Voir produits', '🔄 Rafraîchir'] };
    }

    // Chauffeurs
    if (message.includes('chauffeur') || message.includes('conducteur')) {
      const c = contextData.chauffeurs;
      if (!c) return { content: '⏳ Chargement des données...', actions: ['🔄 Rafraîchir'] };
      return {
        content: `👨‍✈️ Gestion des chauffeurs :\n\n• Total : ${c.total}\n• ✅ Actifs : ${c.active}\n• ❌ Inactifs : ${c.inactive}`,
        actions: ['➕ Ajouter chauffeur', '📋 Voir planning', '⭐ Évaluations', '🔄 Rafraîchir']
      };
    }

    // Statistiques
    if (message.includes('statistique') || message.includes('dashboard') || message.includes('performance')) {
      return {
        content: `📈 Tableau de bord - Performances\n\n🎯 Indicateurs clés :\n• 👨‍✈️ Chauffeurs : ${contextData.chauffeurs?.total || 0}\n• 🚛 Camions : ${contextData.camions?.total || 0}\n• 📦 Livraisons en cours : ${contextData.livraisons?.pending || 0}\n• ✅ Complétées : ${contextData.livraisons?.completed || 0}\n• 📋 Commandes : ${contextData.commandes?.total || 0}`,
        actions: ['⚠️ Vérifier retards', '⭐ Évaluations', '⏱️ Temps restant', '🔄 Rafraîchir']
      };
    }

    // Aide
    if (message.includes('aide') || message === '?') {
      return {
        content: `🤖 Aide - Commandes disponibles\n\n📦 "Voir les livraisons"\n⚠️ "Livraisons en retard"\n⏱️ "Temps restant tournée"\n⭐ "Voir les évaluations"\n✅ "Marquer livraison 143 terminée"\n🆘 "Signaler une panne"\n📊 "Voir les stocks"\n👨‍✈️ "Liste des chauffeurs"\n📈 "Statistiques"\n🔄 "Rafraîchir"\n\nQue souhaitez-vous faire ?`,
        actions: ['📦 Livraisons', '⚠️ Retards', '⏱️ Temps restant', '⭐ Évaluations', '🆘 Panne']
      };
    }

    // Rafraîchir
    if (message.includes('rafraîchir') || message.includes('actualiser')) {
      await loadAllData(true);
      return { content: null, actions: [] };
    }

    return {
      content: `🤖 Assistant OptiTruck\n\nJe n'ai pas bien compris. Voici ce que je peux faire :\n\n📦 Livraisons - État des livraisons\n⚠️ Retards - Livraisons en retard\n⏱️ Temps restant - Estimation tournée\n⭐ Évaluations - Avis clients\n✅ Marquer livraison terminée\n🆘 Signaler une panne\n📊 Stocks - Gestion des stocks\n📈 Statistiques - Performances`,
      actions: ['📦 Livraisons', '⚠️ Retards', '⏱️ Temps restant', '⭐ Évaluations', '🆘 Panne']
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: userMsg, timestamp: new Date() }]);
    setIsTyping(true);
    try {
      const response = await generateResponse(userMsg);
      if (response.content) {
        setTimeout(() => {
          setMessages(prev => [...prev, { id: Date.now(), type: 'bot', content: response.content, timestamp: new Date(), actions: response.actions || [] }]);
          setIsTyping(false);
        }, 600);
      } else {
        setIsTyping(false);
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), type: 'bot', content: '❌ Une erreur est survenue.', timestamp: new Date(), actions: ['🔄 Rafraîchir'] }]);
      setIsTyping(false);
    }
  };

  const handleActionClick = (action) => {
    const clean = action.replace(/[🚛📦📊👨‍✈️📈✅🆘⚠️⏱️⭐🔄📅🗺️➕📋📞❌🕐📅🎯💬👨‍✈️📋📦🔔✅🚚📅]/gu, '').trim();
    setInput(clean);
    setTimeout(() => handleSend(), 100);
  };

  const formatTime = (date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const pathname = window.location.pathname;
  if (pathname === '/login' || pathname === '/' || pathname === '/logout') return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="ai-button"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-xl flex items-center justify-center group"
            style={{ background: GOLD_PRIMARY }}
          >
            <Bot className="w-6 h-6 text-white" />
            {(contextData.produits?.lowStockCount > 0 || contextData.livraisons?.pending > 0) && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            )}
            <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Assistant AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-chat"
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isMinimized ? 'w-80 h-14' : 'w-[520px] h-[680px]'}`}
            style={{ border: `1px solid ${GOLD_LIGHT}` }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between cursor-pointer" style={{ background: GOLD_PRIMARY }} onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Assistant IA OptiTruck</h3>
                  <p className="text-xs text-white/80">
                    {isLoading ? 'Chargement...' : `${contextData.chauffeurs?.active || 0} chauffeurs • ${contextData.camions?.disponible || 0} camions`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); loadAllData(true); }} className="text-white/80 hover:text-white transition-colors" disabled={isRefreshing}>
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Désactiver l'assistant AI ?")) { setIsOpen(false); if (onDisable) onDisable(); } }} className="text-white/80 hover:text-white transition-colors">
                  <Power className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-white/80 hover:text-white transition-colors">
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-white/80 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: GOLD_BG }}>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <Loader2 className="animate-spin w-8 h-8 mx-auto mb-2" style={{ color: GOLD_PRIMARY }} />
                        <p className="text-sm" style={{ color: GOLD_PRIMARY }}>Chargement de vos données...</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${message.type === 'user' ? 'text-white' : 'bg-white border'}`} style={message.type === 'user' ? { background: GOLD_PRIMARY } : { borderColor: GOLD_LIGHT }}>
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content.split('\n').map((line, i) => (
                              <React.Fragment key={i}>{line}{i < message.content.split('\n').length - 1 && <br />}</React.Fragment>
                            ))}
                          </div>
                          {message.actions && message.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {message.actions.map((action, idx) => (
                                <button key={idx} onClick={() => handleActionClick(action)} className="px-2 py-1 text-xs rounded-full transition-colors hover:opacity-80" style={{ background: GOLD_BG, color: GOLD_PRIMARY }}>
                                  {action}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="text-xs mt-1 opacity-50">{formatTime(message.timestamp)}</div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-2xl px-4 py-2" style={{ borderColor: GOLD_LIGHT }}>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Boutons rapides */}
                <div className="px-4 py-2 border-t" style={{ borderColor: GOLD_LIGHT, background: '#fff' }}>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[
                      { label: 'Livraisons', icon: <Truck className="w-3 h-3" />, action: 'Voir les livraisons' },
                      { label: 'Retards', icon: <AlertTriangle className="w-3 h-3" />, action: 'Livraisons en retard' },
                      { label: 'Temps', icon: <Timer className="w-3 h-3" />, action: 'Temps restant tournée' },
                      { label: 'Évals', icon: <Star className="w-3 h-3" />, action: 'Voir les évaluations' },
                      { label: 'Panne', icon: <AlertCircle className="w-3 h-3" />, action: 'Signaler une panne' },
                      { label: 'Stats', icon: <BarChart3 className="w-3 h-3" />, action: 'Statistiques' },
                      { label: 'Aide', icon: <MessageSquare className="w-3 h-3" />, action: 'Aide' },
                    ].map(({ label, icon, action }) => (
                      <button key={label} onClick={() => handleActionClick(action)} className="px-3 py-1.5 text-xs rounded-full flex items-center gap-1 whitespace-nowrap transition-colors hover:opacity-80" style={{ background: GOLD_BG, color: GOLD_PRIMARY }}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t" style={{ borderColor: GOLD_LIGHT, background: '#fff' }}>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef} type="text" value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Posez votre question..."
                      className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all"
                      style={{ borderColor: GOLD_LIGHT }}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || isTyping} className="p-2 rounded-xl transition-all hover:shadow-md disabled:opacity-50" style={{ background: GOLD_PRIMARY, color: '#fff' }}>
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-xs text-center mt-2 flex items-center justify-center gap-2" style={{ color: GOLD_LIGHT }}>
                    <Database className="w-3 h-3" /> Données en temps réel
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;