import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Route,
  Menu,
  X,
  LogOut,
  Users,
  Settings,
  MapPin,
  Calendar,
  Home,
  Package,
  ShoppingCart,
  UserCheck,
  Archive,
  Star,
  Mail,
  MessageSquare,
  Bell,
  ChevronDown,
  Navigation,
  Truck
} from 'lucide-react';
import axios from 'axios';

// Palette
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Messages non lus
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get(
          'http://localhost/OptiTruck/backend/controllers/chat/chat.php?notifications=1',
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setUnreadChatCount(res.data.data?.length || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/drivers', label: 'Chauffeurs', icon: Users },
    { path: '/trucks', label: 'Camions', icon: Truck },
    { path: '/clients', label: 'Clients', icon: UserCheck },
    { path: '/commandes', label: 'Commandes', icon: ShoppingCart },
    { path: '/livraisons', label: 'Livraisons', icon: MapPin },
    { path: '/stocks', label: 'Stocks', icon: Package },
    { path: '/produits', label: 'Produits', icon: Archive },
    { path: '/planning', label: 'Planning IA', icon: Calendar },
    { path: '/evaluations', label: 'Évaluations', icon: Star },
    { path: '/communications', label: 'Communications', icon: Mail },
{ path: '/gps', label: 'GPS', icon: Navigation },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
  ];

  const driverNavItems = [
    { path: '/chauffeur', label: 'Dashboard', icon: Home },
   { path: '/route-map', label: 'Mes Trajets', icon: MapPin },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : driverNavItems;

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    navigate('/logout');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 shadow-lg" style={{ background: GOLD_PRIMARY }}>
      
      {/* Container FULL WIDTH */}
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() =>
              handleNavigation(user?.role === 'admin' ? '/admin' : '/chauffeur')
            }
          >
            <div className="bg-white/20 p-2 rounded-lg">
              <Route className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Menara Drive</span>
          </div>

          {/* MENU DESKTOP SCROLLABLE */}
          <div className="hidden md:flex flex-1 mx-6 overflow-x-auto whitespace-nowrap scrollbar-hide">

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isChat = item.path === '/chat';

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`relative flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-sm transition ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}

                  {isChat && unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* USER + NOTIF */}
          {user && (
            <div className="hidden md:flex items-center space-x-3">

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <Bell className="text-white w-5 h-5" />
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50">
                    <div className="p-3 border-b">
                      <b>Notifications</b>
                    </div>

                    <div className="p-3 text-sm">
                      {unreadChatCount > 0
                        ? `${unreadChatCount} message(s)`
                        : 'Aucune notification'}
                    </div>
                  </div>
                )}
              </div>

              {/* USER DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">
                    {user.name?.charAt(0)}
                  </div>
                  <ChevronDown className="text-white w-4 h-4" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl">
                    <div className="p-3 border-b">
                      <p>{user.name}</p>
                      <p className="text-xs">{user.email}</p>
                    </div>

                    <button
                      onClick={() => handleNavigation('/settings')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    >
                      Paramètres
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MOBILE BUTTON */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isOpen && (
        <motion.div className="md:hidden p-4 space-y-2 bg-white">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className="flex items-center gap-3 w-full p-3 rounded hover:bg-gray-100"
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;