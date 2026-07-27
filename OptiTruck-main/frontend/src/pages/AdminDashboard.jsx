import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Truck, Package, Calendar, TrendingUp, AlertTriangle,
  ShoppingCart, MapPin, UserCheck, Archive, Clock, Activity,
  BarChart3, ArrowUpRight, Target, Settings, RefreshCw,
  Eye, Star, Filter, Search, Zap, ChevronRight, PlusCircle, Mail, Navigation  // ← AJOUTER Mail ICI
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import NotificationCenter from '../components/ui/NotificationCenter';

// Couleurs - Palette #AA9766 (UNIQUEMENT CETTE PALETTE, PAS DE BLEU)
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const AdminDashboard = ({ onLogout }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [stats, setStats] = useState({ totalDrivers: 0, totalTrucks: 0, activeDeliveries: 0, completedToday: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExpiredSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    try {
      const res = await axios.post(
        'http://localhost/OptiTruck/backend/controllers/auth/refresh_token.php',
        { refresh_token: refreshToken }
      );
      if (res.data.success && res.data.token) {
        localStorage.setItem('token', res.data.token);
        return res.data.token;
      }
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!token) {
      handleExpiredSession();
      return;
    }

    const fetchStats = async (retried = false) => {
      try {
        setIsRefreshing(true);
        const currentToken = localStorage.getItem('token');
        const res = await axios.get(
          'http://localhost/OptiTruck/backend/controllers/adminDashboard/dashboard_stats.php',
          { headers: { Authorization: `Bearer ${currentToken}` } }
        );
        setStats(res.data.stats);
        setRecentActivity(res.data.activities || []);
        setError(null);
      } catch (err) {
        if (err.response?.status === 401 && !retried) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            fetchStats(true);
          } else {
            handleExpiredSession();
          }
        } else if (err.response?.status === 401) {
          handleExpiredSession();
        } else {
          setError('Erreur de connexion au serveur.');
        }
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchStats();
  }, [token]);

  const handleNavigation = (path) => navigate(path);
  const handleRefresh = () => window.location.reload();
  const handleSettings = () => navigate('/settings');

  const statCards = [
    { title: 'Total Chauffeurs', value: stats.totalDrivers, icon: Users, trend: '+12%', desc: 'Équipe active' },
    { title: 'Total Camions', value: stats.totalTrucks, icon: Truck, trend: '+5%', desc: 'Flotte disponible' },
    { title: 'Livraisons Actives', value: stats.activeDeliveries, icon: Package, trend: 'En cours', desc: 'En transit' },
    { title: "Complétées aujourd'hui", value: stats.completedToday, icon: Calendar, trend: '+8 vs hier', desc: 'Performance' },
  ];

  const quickActions = [
    { title: 'Chauffeurs', description: "Gestion de l'équipe", icon: Users, path: '/drivers', category: 'Personnel', badge: null },
    { title: 'Camions', description: 'Gestion de la flotte', icon: Truck, path: '/trucks', category: 'Flotte', badge: null },
    { title: 'Commandes', description: 'Traitement des commandes', icon: ShoppingCart, path: '/commandes', category: 'Opérations', badge: '24' },
    { title: 'Livraisons', description: 'Suivi des livraisons', icon: MapPin, path: '/livraisons', category: 'Opérations', badge: null },
    { title: 'Clients', description: 'Base clients', icon: UserCheck, path: '/clients', category: 'Commercial', badge: null },
    { title: 'Stocks', description: "Niveaux d'inventaire", icon: Archive, path: '/stocks', category: 'Inventaire', badge: '!' },
    { title: 'Produits', description: 'Catalogue produits', icon: Archive, path: '/produits', category: 'Inventaire', badge: null },
    { title: 'Import', description: 'Import Excel/CSV', icon: Package, path: '/orders', category: 'Données', badge: null },
    { title: 'Planning IA', description: 'Optimisation trajets', icon: Calendar, path: '/planning', category: 'Planification', badge: 'IA' },
    { title: 'Évaluations', description: 'Performance des chauffeurs', icon: Star, path: '/evaluations', category: 'Personnel', badge: null },
    { title: 'Communications', description: 'Envoi emails/SMS', icon: Mail, path: '/communications', category: 'Communication', badge: null }, { title: 'GPS Tracking', description: 'Suivi en temps réel', icon: Navigation, path: '/gps', category: 'Opérations', badge: '🔴' },
  ];

  const metrics = [
    { title: 'Efficacité', value: '94.2%', change: '+2.1%', icon: Target },
    { title: 'Temps moyen', value: '23 min', change: '-3 min', icon: Clock },
    { title: 'Satisfaction', value: '4.8/5', change: '+0.2', icon: Star },
    { title: 'Éco. carburant', value: '15.4%', change: '+4.2%', icon: TrendingUp },
  ];

  // ← AJOUTER 'Communication' ICI
  const categories = ['all', 'Personnel', 'Flotte', 'Opérations', 'Commercial', 'Inventaire', 'Données', 'Planification', 'Communication'];

  const filteredActions = quickActions.filter(a => {
    const mc = selectedCategory === 'all' || a.category === selectedCategory;
    const ms = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.description.toLowerCase().includes(searchTerm.toLowerCase());
    return mc && ms;
  });

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Style des cartes
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    border: `1px solid #E8E0CC`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: GOLD_DARK,
    textTransform: 'uppercase',
    letterSpacing: '0.07em'
  };

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div style={{ minHeight: '100vh', background: GOLD_BG, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
            <div style={{ ...cardStyle, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 4, height: 26, background: GOLD_PRIMARY, borderRadius: 2 }} />
                  <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#2c2b26', letterSpacing: '-0.4px' }}>
                    Dashboard Menara Drive
                  </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#7f6b3c' }}>
                    Bonjour, <strong style={{ color: '#2c2b26' }}>{user?.name || 'Admin'}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: GOLD_PRIMARY, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />{formatDate(currentTime)}
                  </span>
                  <span style={{ fontSize: 12, color: GOLD_PRIMARY, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD_PRIMARY, display: 'inline-block', boxShadow: '0 0 0 2px #F8F5EB' }} />
                    Système en ligne
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button 
                  onClick={handleRefresh} 
                  disabled={isRefreshing} 
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                    background: GOLD_PRIMARY, color: '#fff', border: 'none', borderRadius: 10,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    opacity: isRefreshing ? 0.6 : 1
                  }}>
                  <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                  Actualiser
                </button>
                <NotificationCenter />
                <button 
                  onClick={handleSettings} 
                  style={{ padding: 8, background: '#F8F5EB', border: `1px solid #E8E0CC`, borderRadius: 10, cursor: 'pointer', display: 'flex' }}>
                  <Settings size={16} color={GOLD_PRIMARY} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ ...cardStyle, marginBottom: 16, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, borderColor: '#fcd34d', background: '#fef9e6' }}>
                <AlertTriangle size={15} color={GOLD_PRIMARY} />
                <span style={{ fontSize: 13, color: GOLD_DARK }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {statCards.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div key={c.title}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(170,151,102,0.12)' }}
                  style={{ ...cardStyle, padding: '20px', position: 'relative', overflow: 'hidden', cursor: 'default', transition: 'all 0.2s' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: GOLD_PRIMARY, borderRadius: '16px 16px 0 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: GOLD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={GOLD_PRIMARY} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: GOLD_PRIMARY, background: GOLD_BG, padding: '3px 9px', borderRadius: 20 }}>
                      {c.trend}
                    </span>
                  </div>
                  <p style={labelStyle}>{c.title}</p>
                  <p style={{ margin: '0 0 3px', fontSize: 34, fontWeight: 800, color: '#2c2b26', lineHeight: 1 }}>{c.value}</p>
                  <p style={{ margin: 0, fontSize: 11, color: GOLD_PRIMARY }}>{c.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Main Grid - 2 colonnes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>

            {/* Quick Actions - Partie gauche */}
            <div style={cardStyle}>
              <div style={{ padding: '16px 22px', borderBottom: `1px solid #E8E0CC`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: GOLD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={16} color={GOLD_PRIMARY} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2c2b26' }}>Actions Rapides</h2>
                    <p style={{ margin: 0, fontSize: 11, color: GOLD_PRIMARY }}>Gestion centralisée de votre système</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: GOLD_PRIMARY }} />
                    <input 
                      type="text" 
                      placeholder="Rechercher..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: `1px solid #E8E0CC`, borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#F8F5EB', width: 140 }} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Filter size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: GOLD_PRIMARY }} />
                    <select 
                      value={selectedCategory} 
                      onChange={e => setSelectedCategory(e.target.value)}
                      style={{ paddingLeft: 26, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: `1px solid #E8E0CC`, borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#F8F5EB', cursor: 'pointer', appearance: 'none' }}>
                      {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'Toutes' : c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ padding: '18px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {filteredActions.slice(0, 11).map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <motion.button key={action.title}
                        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                        onClick={() => handleNavigation(action.path)}
                        whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(170,151,102,0.15)', borderColor: GOLD_PRIMARY }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          position: 'relative', padding: '16px 14px', background: '#F8F5EB',
                          border: `1px solid #E8E0CC`, borderRadius: 12, cursor: 'pointer',
                          textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.18s'
                        }}>
                        {action.badge && (
                          <span style={{
                            position: 'absolute', top: 9, right: 9, fontSize: 9, fontWeight: 800,
                            color: '#fff', background: action.badge === 'IA' ? GOLD_PRIMARY : action.badge === '!' ? GOLD_PRIMARY : GOLD_DARK,
                            padding: '1px 6px', borderRadius: 10
                          }}>{action.badge}</span>
                        )}
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: GOLD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                          <Icon size={16} color={GOLD_PRIMARY} />
                        </div>
                        <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: '#2c2b26' }}>{action.title}</p>
                        <p style={{ margin: 0, fontSize: 11, color: GOLD_PRIMARY, lineHeight: 1.4 }}>{action.description}</p>
                        <ChevronRight size={12} color="#D4C8A8" style={{ position: 'absolute', bottom: 12, right: 12 }} />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Activités - Partie droite - inchangée */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 18px', borderBottom: `1px solid #E8E0CC`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: GOLD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={16} color={GOLD_PRIMARY} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2c2b26' }}>Activités</h2>
                    <p style={{ margin: 0, fontSize: 11, color: GOLD_PRIMARY }}>Temps réel</p>
                  </div>
                </div>
                <button style={{ padding: 6, background: '#F8F5EB', border: `1px solid #E8E0CC`, borderRadius: 8, cursor: 'pointer', display: 'flex' }}>
                  <Eye size={12} color={GOLD_PRIMARY} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', maxHeight: 400 }}>
                {recentActivity.length > 0 ? recentActivity.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', gap: 9, padding: '9px 0', borderBottom: i < recentActivity.length - 1 ? `1px solid #E8E0CC` : 'none' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD_PRIMARY, marginTop: 5, flexShrink: 0, boxShadow: '0 0 0 3px #F8F5EB' }} />
                    <div>
                      <p style={{ margin: '0 0 3px', fontSize: 12, color: '#5e4b2a', lineHeight: 1.5 }}>{a.message}</p>
                      <span style={{ fontSize: 10, color: GOLD_PRIMARY, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} />{a.time}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                    <Activity size={26} color="#D4C8A8" style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 12, color: GOLD_PRIMARY }}>Aucune activité récente</p>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 16px', borderTop: `1px solid #E8E0CC`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: '#F8F5EB', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, color: GOLD_PRIMARY }}>{recentActivity.length}</p>
                  <p style={labelStyle}>Activités</p>
                </div>
                <div style={{ background: '#F8F5EB', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, color: GOLD_PRIMARY }}>98%</p>
                  <p style={labelStyle}>Uptime</p>
                </div>
              </div>
            </div>
          </div>

          {/* Métriques de Performance */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={{ padding: '16px 22px', borderBottom: `1px solid #E8E0CC`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: GOLD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={16} color={GOLD_PRIMARY} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2c2b26' }}>Métriques de Performance</h2>
                    <p style={{ margin: 0, fontSize: 11, color: GOLD_PRIMARY }}>Indicateurs clés en temps réel</p>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: GOLD_PRIMARY, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD_PRIMARY, display: 'inline-block', boxShadow: '0 0 0 2px #F8F5EB' }} />
                  Mise à jour automatique
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {metrics.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.title} style={{ padding: '20px 22px', borderRight: i < metrics.length - 1 ? `1px solid #E8E0CC` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: GOLD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={16} color={GOLD_PRIMARY} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: GOLD_PRIMARY, background: GOLD_BG, padding: '2px 8px', borderRadius: 20 }}>
                          {m.change}
                        </span>
                      </div>
                      <p style={labelStyle}>{m.title}</p>
                      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2c2b26' }}>{m.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <div style={{ ...cardStyle, padding: '12px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <span style={{ fontSize: 12, color: '#7f6b3c', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD_PRIMARY, display: 'inline-block' }} />
                Tous les systèmes opérationnels
              </span>
              <span style={{ fontSize: 12, color: GOLD_PRIMARY, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Dernière MàJ : {currentTime.toLocaleTimeString('fr-FR')}
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD_PRIMARY, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Menara Drive v1.0
            </span>
          </div>

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
      `}</style>
    </>
  );
};

export default AdminDashboard;