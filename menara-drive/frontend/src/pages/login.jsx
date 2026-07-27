// src/pages/login.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Route, Lock, User, AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(
        'http://localhost/OptiTruck/backend/controllers/login/login.php',
        formData
      );
      console.log('Réponse backend :', res.data);

      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        onLogin(res.data.user);
        
        if (res.data.user.role === 'admin') {
          window.location.href = '/admin';
          } else if (res.data.user.role === 'superviseur') {
          window.location.href = '/superviseur';
          } else if (res.data.user.role === 'comptable') {
          window.location.href = '/comptable';
        } else {
          window.location.href = '/chauffeur';
        }
      } else {
        setError(res.data.message || 'Échec de la connexion');
      }
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8F5EB 0%, #FDFBF7 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-2xl shadow-2xl w-full max-w-md"
        style={{ background: '#fff', border: `1px solid #E8E0CC` }}
      >
        <div className="text-center mb-8">
          <div
            className="flex justify-center mb-4 cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/')}
          >
            <div className="p-3 rounded-full shadow-lg" style={{ background: GOLD_PRIMARY }}>
              <Route className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#2c2b26' }}>Menara Drive</h1>
          <p className="mt-2" style={{ color: GOLD_PRIMARY }}>Smart Logistics Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="admin@menaradrive.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="Mot de passe"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <div
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer transition-colors hover:opacity-70"
                style={{ color: GOLD_PRIMARY }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
          </div>

          {/* Mot de passe oublié */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm transition-colors hover:underline"
              style={{ color: GOLD_PRIMARY }}
              onClick={() => navigate('/forgot-password')}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Erreur */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-2 p-3 rounded-lg"
              style={{ background: '#fff5f5', border: `1px solid #fecaca` }}
            >
              <AlertCircle className="w-5 h-5" style={{ color: GOLD_DARK }} />
              <span className="text-sm" style={{ color: GOLD_DARK }}>{error}</span>
            </motion.div>
          )}

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: GOLD_PRIMARY, color: '#fff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Lien vers inscription */}
        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: '#7f6b3c' }}>
            Vous n'avez pas de compte ?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-medium transition-colors hover:underline inline-flex items-center gap-1"
              style={{ color: GOLD_PRIMARY }}
            >
              <UserPlus size={14} />
              Créer un compte
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs" style={{ color: GOLD_PRIMARY }}>
            Système interne Menara Préfa
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;