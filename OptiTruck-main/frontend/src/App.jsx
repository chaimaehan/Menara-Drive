import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './i18n';
import i18n from 'i18next';
import Login from './pages/login';
import AdminDashboard from './pages/AdminDashboard';
import ChauffeurDashboard from './pages/ChauffeurDashboard';
import SuperviseurDashboard from './pages/SuperviseurDashboard';
import ComptableDashboard from './pages/ComptableDashboard';
import DriverManagement from './pages/DriverManagement';
import DeliveryPlanning from './pages/DeliveryPlanning';
import TruckManagement from './pages/TruckManagement';
import OrderImport from './pages/OrderImport';
import RouteMap from './pages/RouteMap';
import StockManagement from './pages/StockManagement';
import ClientManagement from './pages/ClientManagement';
import OrderManagement from './pages/OrderManagement';
import AdminLivraisons from './pages/AdminLivraisons';
import GestionProduits from './pages/GestionProduits';
import LandingPage from './pages/LandingPage';
import Logout from './pages/logout';
import SettingsPage from './pages/Settings';
import AIAssistant from './components/AIAssistant';
import Register from './pages/Register';
import DriverEvaluation from './pages/DriverEvaluation';
import Communications from './pages/Communications';
import TeamChat from './pages/TeamChat';
import QRScanner from './pages/QRScanner';
import GPSTracking from './pages/GPSTracking';

const PrivateRoute = ({ children, allowedRoles, user }) => {
  const token = localStorage.getItem('token');
  if (!token || !user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [showAIAssistant, setShowAIAssistant] = useState(() => {
    return localStorage.getItem('aiAssistantDisabled') !== 'true';
  });

  useEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    applyTheme(savedSettings.theme || 'light');
    applyLanguage(savedSettings.language || 'fr');
  }, []);

  const applyTheme = (t) => {
    const root = document.documentElement;
    if (t === 'dark') { root.classList.add('dark'); root.style.colorScheme = 'dark'; }
    else { root.classList.remove('dark'); root.style.colorScheme = 'light'; }
  };

  const applyLanguage = (lang) => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleSettingsChange = (newSettings) => {
    applyTheme(newSettings.theme);
    applyLanguage(newSettings.language);
  };

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  const disableAIAssistant = () => {
    localStorage.setItem('aiAssistantDisabled', 'true');
    setShowAIAssistant(false);
  };

  const getRedirect = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'superviseur') return '/superviseur';
    if (user.role === 'comptable') return '/comptable';
    return '/chauffeur';
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to={getRedirect()} /> : <Login onLogin={handleLogin} />} />
        <Route path="/logout" element={<Logout onLogout={handleLogout} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']} user={user}><AdminDashboard user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/superviseur" element={<PrivateRoute allowedRoles={['superviseur']} user={user}><SuperviseurDashboard user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/comptable" element={<PrivateRoute allowedRoles={['comptable']} user={user}><ComptableDashboard user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/chauffeur" element={<PrivateRoute allowedRoles={['chauffeur']} user={user}><ChauffeurDashboard user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/drivers" element={<PrivateRoute allowedRoles={['admin']} user={user}><DriverManagement user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/planning" element={<PrivateRoute allowedRoles={['admin']} user={user}><DeliveryPlanning user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/trucks" element={<PrivateRoute allowedRoles={['admin']} user={user}><TruckManagement user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute allowedRoles={['admin']} user={user}><OrderImport user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/route-map" element={<PrivateRoute allowedRoles={['chauffeur']} user={user}><RouteMap user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/stocks" element={<PrivateRoute allowedRoles={['admin']} user={user}><StockManagement user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/clients" element={<PrivateRoute allowedRoles={['admin']} user={user}><ClientManagement user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/commandes" element={<PrivateRoute allowedRoles={['admin']} user={user}><OrderManagement user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/livraisons" element={<PrivateRoute allowedRoles={['admin']} user={user}><AdminLivraisons user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/produits" element={<PrivateRoute allowedRoles={['admin']} user={user}><GestionProduits user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/evaluations" element={<PrivateRoute allowedRoles={['admin']} user={user}><DriverEvaluation user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/communications" element={<PrivateRoute allowedRoles={['admin']} user={user}><Communications user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute allowedRoles={['admin','chauffeur','superviseur','comptable']} user={user}><TeamChat user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/qr-scanner" element={<PrivateRoute allowedRoles={['chauffeur']} user={user}><QRScanner user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/gps" element={<PrivateRoute allowedRoles={['admin']} user={user}><GPSTracking user={user} onLogout={handleLogout} /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute allowedRoles={['admin']} user={user}><SettingsPage user={user} onLogout={handleLogout} onSettingsChange={handleSettingsChange} /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {user && showAIAssistant && user.role === 'admin' && (
        <AIAssistant userRole={user.role} userName={user.nom} onDisable={disableAIAssistant} />
      )}
    </Router>
  );
};

export default App;