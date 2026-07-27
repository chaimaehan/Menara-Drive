// src/pages/TeamChat.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Users, UserPlus, Search, X,
  Paperclip, File, Phone, Video, Info, Check, CheckCheck,
  Loader2, Plus
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK    = '#8A7A52';
const GOLD_LIGHT   = '#D4C8A8';
const GOLD_BG      = '#F8F5EB';

const API = 'http://localhost/OptiTruck/backend/controllers/chat/chat.php';

const TeamChat = ({ user, onLogout }) => {
  const [conversations,       setConversations]       = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages,            setMessages]            = useState([]);
  const [inputMessage,        setInputMessage]        = useState('');
  const [users,               setUsers]               = useState([]);
  const [sending,             setSending]             = useState(false);
  const [showNewChatModal,    setShowNewChatModal]    = useState(false);
  const [selectedUsers,       setSelectedUsers]       = useState([]);
  const [groupName,           setGroupName]           = useState('');
  const [chatType,            setChatType]            = useState('private');
  const [notifications,       setNotifications]       = useState([]);
  const [unreadCount,         setUnreadCount]         = useState(0);
  // ── deux états de recherche séparés ──
  const [convSearchTerm,      setConvSearchTerm]      = useState('');
  const [userSearchTerm,      setUserSearchTerm]      = useState('');
  const [creatingConv,        setCreatingConv]        = useState(false);
  const [errorMsg,            setErrorMsg]            = useState('');

  const messagesEndRef  = useRef(null);
  const inputRef        = useRef(null);
  const fileInputRef    = useRef(null);
  const pollingRef      = useRef(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  const getToken = () => localStorage.getItem('token');
  const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const formatTime = (date) => {
    if (!date) return '';
    const d    = new Date(date);
    const now  = new Date();
    const diff = now - d;
    const min  = Math.floor(diff / 60000);
    const hr   = Math.floor(diff / 3600000);
    const day  = Math.floor(diff / 86400000);
    if (min < 1)  return "À l'instant";
    if (min < 60) return `${min} min`;
    if (hr  < 24) return `${hr} h`;
    return `${day} j`;
  };

  const getConversationName = (conv) => {
    if (conv.type === 'group') return conv.name || 'Groupe';
    return conv.participant_name || 'Discussion';
  };

  // ── fetch helpers ─────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}?conversations=1`, { headers: authHeader() });
      setConversations(res.data.data || []);
    } catch (e) {
      console.error('Conversations:', e);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const res = await axios.get(`${API}?messages=1&conv_id=${conversationId}`, {
        headers: authHeader()
      });
      setMessages(res.data.data || []);
      scrollToBottom();

      // marquer comme lus
      await axios.post(API,
        { action: 'mark_read', conversation_id: conversationId },
        { headers: authHeader() }
      );
    } catch (e) {
      console.error('Messages:', e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}?users=1`, { headers: authHeader() });
      setUsers(res.data.data || []);
    } catch (e) {
      console.error('Users:', e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}?notifications=1`, { headers: authHeader() });
      const notifs = res.data.data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    } catch (e) {
      console.error('Notifs:', e);
    }
  }, []);

  // ── effets ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
    fetchUsers();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (!selectedConversation) return;

    fetchMessages(selectedConversation.id);
    pollingRef.current = setInterval(() => {
      fetchMessages(selectedConversation.id);
      fetchConversations();
    }, 3000);

    return () => clearInterval(pollingRef.current);
  }, [selectedConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── actions ───────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!selectedConversation) return;

    setSending(true);
    try {
      const res = await axios.post(API, {
        action:          'send_message',
        conversation_id: selectedConversation.id,
        message:         inputMessage,
      }, { headers: authHeader() });

      if (res.data.success) {
        setInputMessage('');
        await fetchMessages(selectedConversation.id);
        fetchConversations();
      }
    } catch (e) {
      console.error('Envoi message:', e);
    } finally {
      setSending(false);
    }
  };

  const closeModal = () => {
    setShowNewChatModal(false);
    setSelectedUsers([]);
    setGroupName('');
    setChatType('private');
    setUserSearchTerm('');
    setErrorMsg('');
  };

  const toggleUserSelection = (u) => {
    if (chatType === 'private') {
      // en mode privé : on ne garde qu'un seul utilisateur
      setSelectedUsers(prev =>
        prev.find(su => su.id === u.id) ? [] : [u]
      );
    } else {
      setSelectedUsers(prev =>
        prev.find(su => su.id === u.id)
          ? prev.filter(su => su.id !== u.id)
          : [...prev, u]
      );
    }
  };

  const createConversation = async () => {
    setErrorMsg('');

    if (chatType === 'private' && selectedUsers.length !== 1) {
      setErrorMsg('Sélectionnez un utilisateur pour une conversation privée.');
      return;
    }
    if (chatType === 'group' && !groupName.trim()) {
      setErrorMsg('Donnez un nom au groupe.');
      return;
    }
    if (selectedUsers.length === 0) {
      setErrorMsg('Sélectionnez au moins un participant.');
      return;
    }

    setCreatingConv(true);
    try {
      const res = await axios.post(API, {
        action:       'create_conversation',
        name:         chatType === 'group' ? groupName.trim() : null,
        type:         chatType,
        participants: selectedUsers.map(u => u.id),
      }, { headers: authHeader() });

      if (res.data.success) {
        closeModal();
        await fetchConversations();
        // sélectionner la nouvelle conversation automatiquement
        if (res.data.conversation_id) {
          setSelectedConversation({ id: res.data.conversation_id, type: chatType, name: groupName });
        }
      } else {
        setErrorMsg("Erreur lors de la création. Veuillez réessayer.");
      }
    } catch (e) {
      console.error('Création conversation:', e);
      setErrorMsg("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setCreatingConv(false);
    }
  };

  // ── filtres ───────────────────────────────────────────────────────────────
  const filteredConversations = conversations.filter(conv =>
    getConversationName(conv).toLowerCase().includes(convSearchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.nom.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen" style={{ background: GOLD_BG }}>
        <div className="max-w-7xl mx-auto px-4 py-6">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div style={{ width: 4, height: 40, background: GOLD_PRIMARY, borderRadius: 2 }} />
              <div>
                <h1 className="text-3xl font-bold" style={{ color: GOLD_DARK }}>💬 Chat Équipe</h1>
                <p className="mt-1" style={{ color: GOLD_PRIMARY }}>
                  Communication en temps réel avec votre équipe
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <span className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ background: GOLD_PRIMARY }}>
                  {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-medium transition-all hover:shadow-md"
                style={{ background: GOLD_PRIMARY }}
              >
                <UserPlus className="w-5 h-5" />
                Nouvelle conversation
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Liste conversations ─────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
              style={{ borderColor: '#E8E0CC' }}>
              <div className="p-4 border-b" style={{ borderColor: '#E8E0CC', background: GOLD_BG }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: GOLD_PRIMARY }} />
                  <input
                    type="text"
                    placeholder="Rechercher une conversation..."
                    value={convSearchTerm}
                    onChange={e => setConvSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none"
                    style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                  />
                </div>
              </div>

              <div className="divide-y max-h-[600px] overflow-y-auto" style={{ borderColor: '#E8E0CC' }}>
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: GOLD_LIGHT }} />
                    <p style={{ color: GOLD_PRIMARY }}>Aucune conversation</p>
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      className="mt-3 text-sm underline"
                      style={{ color: GOLD_PRIMARY }}
                    >
                      Créer une conversation
                    </button>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedConversation(conv)}
                      className="p-4 cursor-pointer transition-all hover:bg-amber-50"
                      style={{
                        borderLeft: selectedConversation?.id === conv.id
                          ? `3px solid ${GOLD_PRIMARY}` : '3px solid transparent',
                        background: selectedConversation?.id === conv.id ? '#FFF8E7' : ''
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: GOLD_BG }}>
                          {conv.type === 'group' ? '👥' : '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold truncate" style={{ color: GOLD_DARK }}>
                              {getConversationName(conv)}
                            </h3>
                            <span className="text-xs ml-2 flex-shrink-0" style={{ color: GOLD_LIGHT }}>
                              {formatTime(conv.last_message_time)}
                            </span>
                          </div>
                          <p className="text-sm truncate"
                            style={{ color: conv.unread_count > 0 ? GOLD_PRIMARY : '#9ca3af' }}>
                            {conv.last_message || 'Aucun message'}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                            style={{ background: GOLD_PRIMARY }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* ── Zone de chat ────────────────────────────────────────── */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col"
              style={{ borderColor: '#E8E0CC', height: '700px' }}>

              {selectedConversation ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b flex justify-between items-center flex-shrink-0"
                    style={{ borderColor: '#E8E0CC', background: GOLD_BG }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ background: '#fff' }}>
                        {selectedConversation.type === 'group' ? '👥' : '👤'}
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: GOLD_DARK }}>
                          {getConversationName(selectedConversation)}
                        </h3>
                        <p className="text-xs" style={{ color: GOLD_PRIMARY }}>
                          {selectedConversation.type === 'group' ? 'Conversation de groupe' : 'Conversation privée'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: GOLD_PRIMARY }}>
                        <Phone className="w-5 h-5" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: GOLD_PRIMARY }}>
                        <Video className="w-5 h-5" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: GOLD_PRIMARY }}>
                        <Info className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4"
                    style={{ background: GOLD_BG }}>
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <p style={{ color: GOLD_LIGHT }}>Aucun message. Soyez le premier !</p>
                      </div>
                    )}
                    {messages.map(msg => {
                      const isOwn = msg.sender_id == user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isOwn && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0"
                              style={{ background: '#fff', color: GOLD_PRIMARY, border: `1px solid ${GOLD_LIGHT}` }}>
                              {msg.sender_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`max-w-[70%]`}>
                            {!isOwn && (
                              <p className="text-xs mb-1" style={{ color: GOLD_PRIMARY }}>
                                {msg.sender_name}
                              </p>
                            )}
                            <div
                              className="rounded-2xl px-4 py-2"
                              style={isOwn
                                ? { background: GOLD_PRIMARY, color: '#fff' }
                                : { background: '#fff', border: `1px solid #E8E0CC`, color: '#333' }}
                            >
                              {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                              {msg.file_url && (
                                <div className="mt-2">
                                  {msg.file_type?.startsWith('image/') ? (
                                    <img src={msg.file_url} alt={msg.file_name}
                                      className="max-w-full rounded-lg max-h-48" />
                                  ) : (
                                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm underline">
                                      <File className="w-4 h-4" />
                                      {msg.file_name}
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}
                              style={{ color: GOLD_LIGHT }}>
                              <span>{formatTime(msg.created_at)}</span>
                              {isOwn && (
                                msg.is_read
                                  ? <CheckCheck className="w-3 h-3" />
                                  : <Check className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t flex-shrink-0"
                    style={{ borderColor: '#E8E0CC', background: '#fff' }}>
                    <div className="flex gap-2 items-center">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Écrivez votre message..."
                        className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-1"
                        style={{ borderColor: '#E8E0CC' }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sending || !inputMessage.trim()}
                        className="p-2 rounded-xl transition-all hover:shadow-md disabled:opacity-40"
                        style={{ background: GOLD_PRIMARY, color: '#fff' }}
                      >
                        {sending
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4" style={{ color: GOLD_LIGHT }} />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: GOLD_DARK }}>
                      Bienvenue sur le chat
                    </h3>
                    <p style={{ color: GOLD_PRIMARY }}>
                      Sélectionnez une conversation ou démarrez-en une nouvelle
                    </p>
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
                      style={{ background: GOLD_PRIMARY }}
                    >
                      Nouvelle conversation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Nouvelle conversation ─────────────────────────────────── */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-5 border-b flex justify-between items-center flex-shrink-0"
                style={{ borderColor: '#E8E0CC' }}>
                <h2 className="text-xl font-bold" style={{ color: GOLD_DARK }}>
                  Nouvelle conversation
                </h2>
                <button onClick={closeModal} className="p-1 hover:opacity-70">
                  <X className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                    Type de conversation
                  </label>
                  <div className="flex gap-3">
                    {['private', 'group'].map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setChatType(type);
                          setSelectedUsers([]);
                        }}
                        className={`flex-1 py-2 rounded-lg border-2 font-medium transition-all`}
                        style={{
                          borderColor: chatType === type ? GOLD_PRIMARY : '#E8E0CC',
                          background:  chatType === type ? GOLD_BG : '#fff',
                          color:       chatType === type ? GOLD_DARK : '#999',
                        }}
                      >
                        {type === 'private' ? '💬 Privé' : '👥 Groupe'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nom groupe */}
                {chatType === 'group' && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                      Nom du groupe
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      placeholder="Ex : Équipe Livraison"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1"
                      style={{ borderColor: '#E8E0CC' }}
                    />
                  </div>
                )}

                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: GOLD_DARK }}>
                    Participants
                    {selectedUsers.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs text-white"
                        style={{ background: GOLD_PRIMARY }}>
                        {selectedUsers.length} sélectionné{selectedUsers.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </label>

                  {/* Recherche utilisateurs */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: GOLD_PRIMARY }} />
                    <input
                      type="text"
                      placeholder="Rechercher un utilisateur..."
                      value={userSearchTerm}
                      onChange={e => setUserSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#E8E0CC', background: GOLD_BG }}
                    />
                  </div>

                  {/* Liste utilisateurs */}
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2"
                    style={{ borderColor: '#E8E0CC' }}>
                    {users.length === 0 && (
                      <p className="text-center py-4 text-sm" style={{ color: GOLD_LIGHT }}>
                        Chargement des utilisateurs...
                      </p>
                    )}
                    {filteredUsers.length === 0 && users.length > 0 && (
                      <p className="text-center py-4 text-sm" style={{ color: GOLD_LIGHT }}>
                        Aucun utilisateur trouvé
                      </p>
                    )}
                    {filteredUsers.map(u => {
                      const isSelected = selectedUsers.find(su => su.id === u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleUserSelection(u)}
                          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                          style={{ background: isSelected ? GOLD_BG : 'transparent' }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                            style={{ background: isSelected ? GOLD_PRIMARY : '#E8E0CC', color: isSelected ? '#fff' : GOLD_DARK }}>
                            {u.nom.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: GOLD_DARK }}>{u.nom}</p>
                            <p className="text-xs truncate" style={{ color: GOLD_PRIMARY }}>{u.role}</p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 flex-shrink-0" style={{ color: GOLD_PRIMARY }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Message d'erreur */}
                {errorMsg && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
                )}
              </div>

              {/* Modal footer */}
              <div className="p-5 border-t flex gap-3 flex-shrink-0" style={{ borderColor: '#E8E0CC' }}>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2 rounded-lg border font-medium"
                  style={{ borderColor: '#E8E0CC', color: GOLD_PRIMARY }}
                >
                  Annuler
                </button>
                <button
                  onClick={createConversation}
                  disabled={creatingConv}
                  className="flex-1 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: GOLD_PRIMARY }}
                >
                  {creatingConv && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TeamChat;