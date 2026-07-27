// src/components/AIAssistant.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, X, Minimize2, Maximize2, MessageSquare,
  Sparkles, Truck, BarChart3,
  AlertCircle, Power,
  Loader2, RefreshCw,
  Star, AlertTriangle, Timer, Mic, MicOff, Globe, Trash2, History
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import aiDataService from '../services/aiDataService';
import axios from 'axios';

const GOLD_PRIMARY = '#AA9766';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';
const API_BASE_URL = 'http://localhost/OptiTruck/backend/controllers';
const MAX_MEMORY_MESSAGES = 20;

const LANGUAGES = [
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷', short: 'FR' },
  { code: 'en-US', label: 'English', flag: '🇬🇧', short: 'EN' },
  { code: 'ar-SA', label: 'العربية', flag: '🇸🇦', short: 'AR', rtl: true },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸', short: 'ES' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪', short: 'DE' },
];

const CHART_COLORS = ['#AA9766', '#D4C8A8', '#8A7A52', '#C4B08A', '#6B5E3E', '#E8DFC8'];

// ── Mémoire ───────────────────────────────────────────────────────────────
const getMemoryKey = (userName) => `optitruck_ai_memory_${userName || 'admin'}`;
const saveMemory = (userName, messages) => {
  try {
    const toSave = messages.filter(m => m.content?.trim() && !m.chart).slice(-MAX_MEMORY_MESSAGES)
      .map(m => ({ type: m.type, content: m.content, timestamp: m.timestamp, isVoice: m.isVoice || false }));
    localStorage.setItem(getMemoryKey(userName), JSON.stringify({ messages: toSave, savedAt: new Date().toISOString() }));
  } catch (e) {}
};
const loadMemory = (userName) => {
  try {
    const raw = localStorage.getItem(getMemoryKey(userName));
    if (!raw) return null;
    const data = JSON.parse(raw);
    data.messages = data.messages.map(m => ({ ...m, id: Date.now() + Math.random(), timestamp: new Date(m.timestamp) }));
    return data;
  } catch (e) { return null; }
};
const clearMemory = (userName) => localStorage.removeItem(getMemoryKey(userName));

// ── Composant graphique ───────────────────────────────────────────────────
const ChartMessage = ({ chart }) => {
  if (!chart) return null;
  const { type, title, data, dataKey, nameKey } = chart;

  return (
    <div className="bg-white rounded-xl p-3 border" style={{ borderColor: GOLD_LIGHT }}>
      <p className="text-xs font-semibold mb-2" style={{ color: GOLD_PRIMARY }}>📊 {title}</p>
      <ResponsiveContainer width="100%" height={180}>
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        ) : type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          </PieChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Line type="monotone" dataKey={dataKey} stroke={GOLD_PRIMARY} strokeWidth={2} dot={{ fill: GOLD_PRIMARY, r: 3 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// ── Détection graphique depuis la question ────────────────────────────────
const detectChart = (message, contextData) => {
  const msg = message.toLowerCase();

  if (msg.includes('graphique') || msg.includes('chart') || msg.includes('statistique') ||
      msg.includes('dashboard') || msg.includes('performance') || msg.includes('graphe') ||
      msg.includes('camembert') || msg.includes('courbe') || msg.includes('barres') ||
      msg.includes('رسم') || msg.includes('gráfico') || msg.includes('diagramm')) {

    // Graphique livraisons
    if (msg.includes('livraison') || msg.includes('delivery') || msg.includes('تسليم')) {
      const l = contextData.livraisons;
      return {
        type: 'pie',
        title: 'État des livraisons',
        nameKey: 'name',
        dataKey: 'value',
        data: [
          { name: 'Complétées', value: l?.completed || 0 },
          { name: 'En attente', value: l?.pending || 0 },
          { name: "Aujourd'hui", value: l?.today || 0 },
        ].filter(d => d.value > 0)
      };
    }

    // Graphique chauffeurs
    if (msg.includes('chauffeur') || msg.includes('driver') || msg.includes('سائق')) {
      const c = contextData.chauffeurs;
      return {
        type: 'bar',
        title: 'Statut des chauffeurs',
        nameKey: 'name',
        dataKey: 'value',
        data: [
          { name: 'Actifs', value: c?.active || 0 },
          { name: 'Inactifs', value: c?.inactive || 0 },
          { name: 'Total', value: c?.total || 0 },
        ]
      };
    }

    // Graphique stock/produits
    if (msg.includes('stock') || msg.includes('produit') || msg.includes('مخزون')) {
      const p = contextData.produits;
      return {
        type: 'bar',
        title: 'Gestion des stocks',
        nameKey: 'name',
        dataKey: 'value',
        data: [
          { name: 'Total', value: p?.total || 0 },
          { name: 'Stock OK', value: (p?.total || 0) - (p?.lowStockCount || 0) },
          { name: 'Stock faible', value: p?.lowStockCount || 0 },
        ]
      };
    }

    // Graphique général dashboard
    return {
      type: 'bar',
      title: 'Vue d\'ensemble OptiTruck',
      nameKey: 'name',
      dataKey: 'value',
      data: [
        { name: 'Chauffeurs', value: contextData.chauffeurs?.total || 0 },
        { name: 'Camions', value: contextData.camions?.total || 0 },
        { name: 'Livraisons', value: contextData.livraisons?.total || 0 },
        { name: 'Commandes', value: contextData.commandes?.total || 0 },
        { name: 'Produits', value: contextData.produits?.total || 0 },
      ]
    };
  }
  return null;
};

const AIAssistant = ({ userRole, userName, onDisable }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [hasMemory, setHasMemory] = useState(false);
  const [showMemoryBanner, setShowMemoryBanner] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [contextData, setContextData] = useState({
    stats: null, livraisons: null, produits: null,
    chauffeurs: null, camions: null, commandes: null
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const isTypingRef = useRef(false);
  const isSendingRef = useRef(false);

  useEffect(() => {
    if (messages.length > 1) saveMemory(userName, messages);
  // eslint-disable-next-line
    }, [messages]);

  const initRecognition = (lang) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = lang.code;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); setVoiceError(''); isSendingRef.current = false; };
    recognition.onresult = (event) => {
      let transcript = ''; let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      setInput(transcript);
      if (isFinal && !isSendingRef.current) {
        isSendingRef.current = true; recognition.stop();
        setTimeout(() => { if (transcript.trim()) handleSendVoice(transcript.trim()); isSendingRef.current = false; }, 300);
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false); isSendingRef.current = false;
      if (event.error === 'not-allowed') setVoiceError('Microphone non autorisé.');
      else if (event.error === 'no-speech') setVoiceError('Aucune voix détectée.');
      else if (event.error !== 'aborted') setVoiceError(`Erreur: ${event.error}`);
      setTimeout(() => setVoiceError(''), 3000);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  };

  useEffect(() => { initRecognition(selectedLang); }, []);

  const changeLang = (lang) => {
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
    setSelectedLang(lang); setShowLangMenu(false); initRecognition(lang);
  };

  useEffect(() => {
    setIsOpen(false); setIsMinimized(false); setInput('');
    setIsTyping(false); isTypingRef.current = false;
    const memory = loadMemory(userName);
    if (memory?.messages?.length > 0) { setHasMemory(true); setMemoryInfo(memory); setShowMemoryBanner(true); }
    else { setHasMemory(false); setMessages([]); }
    loadAllData();
  }, [userRole, userName]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); }
    else {
      setInput(''); isSendingRef.current = false;
      try { recognitionRef.current.start(); }
      catch (e) { initRecognition(selectedLang); setTimeout(() => recognitionRef.current?.start(), 100); }
    }
  };

  const loadAllData = async (showRefreshMessage = false) => {
    if (showRefreshMessage) setIsRefreshing(true); else setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (token) aiDataService.token = token;
      const data = await aiDataService.getAllData();
      setContextData(data);
      if (!showRefreshMessage && !hasMemory) {
        setMessages([{ id: 1, type: 'bot', content: getWelcomeMessage(userName, data), timestamp: new Date(),
          actions: ['📦 Livraisons', '📊 Graphique dashboard', '👨‍✈️ Chauffeurs', '📈 Graphique livraisons', '⏱️ Temps restant', '⭐ Évaluations'] }]);
      } else if (showRefreshMessage) {
        addBotMessage('✅ Données actualisées !', ['📦 Livraisons', '📊 Graphique dashboard']);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  const addBotMessage = (content, actions = [], chart = null) => {
    setMessages(prev => [...prev, { id: Date.now(), type: 'bot', content, timestamp: new Date(), actions, chart }]);
  };

  const getWelcomeMessage = (name, data) => {
    const pending = data?.livraisons?.pending || 0;
    const low = data?.produits?.lowStockCount || 0;
    const alerts = [low > 0 ? `📦 ${low} produit(s) en stock faible` : null, pending > 0 ? `🚚 ${pending} livraison(s) en attente` : null].filter(Boolean);
    return `👋 Bonjour ${name || ''} ! Je suis l'assistant IA d'OptiTruck.

📊 Résumé :
• 🚚 ${data?.livraisons?.today || 0} livraison(s) aujourd'hui
• ✅ ${data?.livraisons?.completed || 0} complétée(s)
• 👨‍✈️ ${data?.chauffeurs?.active || 0} chauffeur(s) actif(s)
• 🚛 ${data?.camions?.disponible || 0} camion(s) disponible(s)
${alerts.length ? '\n🔔 Alertes :\n' + alerts.map(a => `• ${a}`).join('\n') : '\n✅ Tout est en ordre'}

💡 Essayez : "Montre-moi un graphique des livraisons"
🧠 Mémoire activée • 🎤 Commandes vocales actives`;
  };

  const callGroq = async (userMessage, currentMessages) => {
    const history = currentMessages.filter(m => m.content?.trim() && !m.chart).slice(-10)
      .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }));
    history.push({ role: 'user', content: userMessage });
    const res = await axios.post(`${API_BASE_URL}/chat/claude_chat.php`, { messages: history, language: selectedLang.label });
    if (res.data.success) return res.data.content;
    throw new Error(res.data.error || 'Erreur inconnue');
  };

  const handleSend = async () => {
    if (!input.trim() || isTypingRef.current) return;
    const msg = input.trim(); setInput('');
    await processMessage(msg, false);
  };

  const handleSendVoice = async (text) => {
    if (!text || isTypingRef.current) return;
    setInput(''); await processMessage(text, true);
  };

  const processMessage = async (userMsg, isVoice) => {
    if (isTypingRef.current) return;
    if (userMsg.includes('Effacer mémoire')) { handleClearMemory(); return; }

    isTypingRef.current = true; setIsTyping(true);
    const userMessage = { id: Date.now(), type: 'user', content: userMsg, timestamp: new Date(), isVoice };
    let updatedMessages = [];
    setMessages(prev => { updatedMessages = [...prev, userMessage]; return updatedMessages; });
    await new Promise(r => setTimeout(r, 50));

    // Détecter si un graphique est demandé
    const chart = detectChart(userMsg, contextData);

    try {
      const content = await callGroq(userMsg, updatedMessages);
      // Nettoyer le markdown
      const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'bot', content: cleanContent, timestamp: new Date(), chart,
        actions: ['📦 Livraisons', '⚠️ Retards', '📊 Graphique dashboard', '👨‍✈️ Chauffeurs', '🗑️ Effacer mémoire']
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), type: 'bot', content: `❌ Erreur : ${err.message}`, timestamp: new Date(), actions: ['🔄 Rafraîchir'] }]);
    } finally { isTypingRef.current = false; setIsTyping(false); }
  };

  const handleClearMemory = () => {
    if (window.confirm('Effacer tout l\'historique ?')) {
      clearMemory(userName); setHasMemory(false); setMemoryInfo(null);
      setMessages([{ id: Date.now(), type: 'bot', content: '🗑️ Mémoire effacée.\n\nBonjour ! Comment puis-je vous aider ?', timestamp: new Date(), actions: ['📦 Livraisons', '📊 Graphique dashboard'] }]);
    }
  };

  const restoreMemory = () => {
    if (!memoryInfo) return;
    const dateStr = new Date(memoryInfo.savedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    setMessages([...memoryInfo.messages, { id: Date.now(), type: 'bot',
      content: `🧠 Mémoire restaurée !\n📅 Dernière conversation : ${dateStr}\n💬 ${memoryInfo.messages.length} message(s)\n\nComment puis-je vous aider ?`,
      timestamp: new Date(), actions: ['📦 Livraisons', '📊 Graphique dashboard', '🗑️ Effacer mémoire'] }]);
    setShowMemoryBanner(false);
  };

  const startFresh = () => {
    setMessages([{ id: Date.now(), type: 'bot', content: getWelcomeMessage(userName, contextData), timestamp: new Date(),
      actions: ['📦 Livraisons', '📊 Graphique dashboard', '👨‍✈️ Chauffeurs'] }]);
    setShowMemoryBanner(false);
  };

  const handleActionClick = (action) => {
    if (action.includes('Effacer mémoire')) { handleClearMemory(); return; }
    if (!isTypingRef.current) processMessage(action, false);
  };

  const formatTime = (date) => { try { return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const formatDate = (date) => { try { return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch { return ''; } };

  const pathname = window.location.pathname;
  if (pathname === '/login' || pathname === '/' || pathname === '/logout') return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button key="ai-button"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-xl flex items-center justify-center group"
            style={{ background: GOLD_PRIMARY }}
          >
            <Bot className="w-6 h-6 text-white" />
            {hasMemory && <span className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><History className="w-2.5 h-2.5 text-white" /></span>}
            {(contextData.produits?.lowStockCount > 0 || contextData.livraisons?.pending > 0) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
            <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Assistant Groq AI 📊🧠🎤</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div key="ai-chat"
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isMinimized ? 'w-80 h-14' : 'w-[540px] h-[720px]'}`}
            style={{ border: `1px solid ${GOLD_LIGHT}` }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between cursor-pointer" style={{ background: GOLD_PRIMARY }} onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-1">
                    Assistant Groq AI {selectedLang.flag}
                    {hasMemory && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">🧠</span>}
                  </h3>
                  <p className="text-xs text-white/80">{isLoading ? 'Chargement...' : `${contextData.chauffeurs?.active || 0} chauffeurs • 📊 Graphiques actifs`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleClearMemory(); }} className="text-white/80 hover:text-white" title="Effacer mémoire"><Trash2 className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); loadAllData(true); }} className="text-white/80 hover:text-white" disabled={isRefreshing}><RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
                <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Désactiver ?")) { setIsOpen(false); if (onDisable) onDisable(); } }} className="text-white/80 hover:text-white"><Power className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-white/80 hover:text-white">{isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Langue */}
                <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: GOLD_LIGHT, background: '#fff' }}>
                  <span className="text-xs text-gray-500">🌍 Langue :</span>
                  <div className="relative">
                    <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium hover:opacity-80" style={{ background: GOLD_BG, color: GOLD_PRIMARY, border: `1px solid ${GOLD_LIGHT}` }}>
                      <Globe className="w-3 h-3" /> {selectedLang.flag} {selectedLang.label}
                    </button>
                    {showLangMenu && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border z-10 overflow-hidden" style={{ borderColor: GOLD_LIGHT, minWidth: '140px' }}>
                        {LANGUAGES.map(lang => (
                          <button key={lang.code} onClick={() => changeLang(lang)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:opacity-80 text-left"
                            style={{ background: selectedLang.code === lang.code ? GOLD_BG : '#fff', color: selectedLang.code === lang.code ? GOLD_PRIMARY : '#333', fontWeight: selectedLang.code === lang.code ? 'bold' : 'normal' }}>
                            <span>{lang.flag}</span><span>{lang.label}</span>{selectedLang.code === lang.code && <span className="ml-auto">✓</span>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Bannière mémoire */}
                <AnimatePresence>
                  {showMemoryBanner && memoryInfo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-3 mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD_LIGHT}`, background: GOLD_BG }}>
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1"><History className="w-4 h-4" style={{ color: GOLD_PRIMARY }} /><span className="text-xs font-semibold" style={{ color: GOLD_PRIMARY }}>🧠 Conversation précédente trouvée</span></div>
                        <p className="text-xs text-gray-500 mb-2">📅 {formatDate(memoryInfo.savedAt)} • {memoryInfo.messages.length} message(s)</p>
                        <div className="flex gap-2">
                          <button onClick={restoreMemory} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-80" style={{ background: GOLD_PRIMARY }}>🧠 Restaurer</button>
                          <button onClick={startFresh} className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: '#fff', color: GOLD_PRIMARY, border: `1px solid ${GOLD_LIGHT}` }}>✨ Nouvelle session</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: GOLD_BG }}>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto mb-2" style={{ color: GOLD_PRIMARY }} /><p className="text-sm" style={{ color: GOLD_PRIMARY }}>Chargement...</p></div>
                    </div>
                  ) : messages.map((message) => (
                    <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-2 ${message.type === 'user' ? 'text-white' : 'bg-white border'}`}
                        style={message.type === 'user' ? { background: GOLD_PRIMARY } : { borderColor: GOLD_LIGHT }}
                        dir={selectedLang.rtl ? 'rtl' : 'ltr'}
                      >
                        {message.isVoice && message.type === 'user' && (
                          <div className="flex items-center gap-1 mb-1 opacity-70"><Mic className="w-3 h-3" /><span className="text-xs">🎤 Vocal</span></div>
                        )}
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content.split('\n').map((line, i) => (
                            <React.Fragment key={i}>{line}{i < message.content.split('\n').length - 1 && <br />}</React.Fragment>
                          ))}
                        </div>
                        {/* Graphique intégré */}
                        {message.chart && <div className="mt-3"><ChartMessage chart={message.chart} /></div>}
                        {message.actions?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {message.actions.map((action, idx) => (
                              <button key={idx} onClick={() => handleActionClick(action)} className="px-2 py-1 text-xs rounded-full hover:opacity-80"
                                style={{ background: action.includes('Effacer') ? '#fee2e2' : GOLD_BG, color: action.includes('Effacer') ? '#ef4444' : GOLD_PRIMARY }}
                              >{action}</button>
                            ))}
                          </div>
                        )}
                        <div className="text-xs mt-1 opacity-50">{formatTime(message.timestamp)}</div>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-2xl px-4 py-2" style={{ borderColor: GOLD_LIGHT }}>
                        <div className="flex gap-1 items-center">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          <span className="text-xs ml-2 text-gray-400">Groq réfléchit...</span>
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
                      { label: 'Livraisons', icon: <Truck className="w-3 h-3" />, action: 'État des livraisons' },
                      { label: 'Graphique', icon: <BarChart3 className="w-3 h-3" />, action: 'Graphique dashboard statistiques' },
                      { label: 'Retards', icon: <AlertTriangle className="w-3 h-3" />, action: 'Livraisons en retard ?' },
                      { label: 'Chauffeurs', icon: <Star className="w-3 h-3" />, action: 'Graphique chauffeurs' },
                      { label: 'Stocks', icon: <BarChart3 className="w-3 h-3" />, action: 'Graphique stock produits' },
                      { label: 'Temps', icon: <Timer className="w-3 h-3" />, action: 'Temps restant tournée ?' },
                      { label: 'Aide', icon: <MessageSquare className="w-3 h-3" />, action: 'Que peux-tu faire ?' },
                    ].map(({ label, icon, action }) => (
                      <button key={label} onClick={() => handleActionClick(action)} disabled={isTyping}
                        className="px-3 py-1.5 text-xs rounded-full flex items-center gap-1 whitespace-nowrap hover:opacity-80 disabled:opacity-40"
                        style={{ background: GOLD_BG, color: GOLD_PRIMARY }}
                      >{icon} {label}</button>
                    ))}
                  </div>
                </div>

                {voiceError && <div className="mx-4 mb-1 px-3 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">⚠️ {voiceError}</div>}

                {/* Input */}
                <div className="p-4 border-t" style={{ borderColor: GOLD_LIGHT, background: '#fff' }}>
                  <div className="flex gap-2">
                    {voiceSupported && (
                      <button onClick={toggleVoice} disabled={isTyping}
                        className={`p-2 rounded-xl flex-shrink-0 disabled:opacity-40 ${isListening ? 'animate-pulse' : 'hover:shadow-md'}`}
                        style={{ background: isListening ? '#ef4444' : GOLD_BG, color: isListening ? '#fff' : GOLD_PRIMARY, border: isListening ? '2px solid #ef4444' : `2px solid ${GOLD_LIGHT}` }}
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                    )}
                    <input ref={inputRef} type="text" value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      disabled={isTyping}
                      dir={selectedLang.rtl ? 'rtl' : 'ltr'}
                      placeholder={isListening ? `🎤 Parlez en ${selectedLang.label}...` : `Question ou "graphique livraisons"...`}
                      className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                      style={{ borderColor: isListening ? '#ef4444' : GOLD_LIGHT, background: isListening ? '#fff5f5' : '#fff' }}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || isTyping} className="p-2 rounded-xl hover:shadow-md disabled:opacity-50" style={{ background: GOLD_PRIMARY, color: '#fff' }}>
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  {isListening && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 mt-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      <span className="text-xs text-red-500 font-medium">🎤 Écoute en {selectedLang.label}...</span>
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    </motion.div>
                  )}
                  <div className="text-xs text-center mt-2 flex items-center justify-center gap-1" style={{ color: GOLD_LIGHT }}>
                    <Sparkles className="w-3 h-3" /> Groq AI • 📊 Graphiques • 🧠 Mémoire • {selectedLang.flag} • 🎤 Vocal
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
