// src/pages/Register.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Lock, User, Mail, Phone, MapPin, AlertCircle, Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const Register = ({ onRegister }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
    telephone: '',
    adresse: '',
    role: 'chauffeur'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.nom.trim()) {
      setError('Le nom est requis');
      return false;
    }
    if (!formData.email.trim()) {
      setError('L\'email est requis');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Email invalide');
      return false;
    }
    if (!formData.password) {
      setError('Le mot de passe est requis');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        'http://localhost/OptiTruck/backend/controllers/auth/register.php',
        {
          nom: formData.nom,
          email: formData.email,
          password: formData.password,
          telephone: formData.telephone,
          adresse: formData.adresse,
          role: formData.role
        }
      );
      console.log('Réponse backend :', res.data);

      if (res.data.success) {
        setSuccess('Compte créé avec succès ! Redirection vers la connexion...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(res.data.message || 'Échec de la création du compte');
      }
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4" style={{ background: 'linear-gradient(135deg, #F8F5EB 0%, #FDFBF7 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-2xl shadow-2xl w-full max-w-md"
        style={{ background: '#fff', border: `1px solid #E8E0CC` }}
      >
        <div className="text-center mb-6">
          <div
            className="flex justify-center mb-4 cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/')}
          >
            <div className="p-3 rounded-full shadow-lg" style={{ background: GOLD_PRIMARY }}>
              <Truck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#2c2b26' }}>Créer un compte</h1>
          <p className="mt-2 text-sm" style={{ color: GOLD_PRIMARY }}>Inscrivez-vous pour accéder à OptiTruck</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom complet */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Nom complet *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type="text"
                name="nom"
                required
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="Votre nom complet"
                value={formData.nom}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type="email"
                name="email"
                required
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="exemple@optitruck.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type="tel"
                name="telephone"
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="06 00 00 00 00"
                value={formData.telephone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Adresse
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type="text"
                name="adresse"
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="Votre adresse"
                value={formData.adresse}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Rôle *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
              style={{ borderColor: '#E8E0CC', background: '#F8F5EB', color: '#2c2b26' }}
            >
              <option value="chauffeur">Chauffeur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Mot de passe *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="Minimum 6 caractères"
                value={formData.password}
                onChange={handleChange}
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

          {/* Confirmation mot de passe */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: GOLD_PRIMARY }} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200"
                style={{ borderColor: '#E8E0CC', background: '#F8F5EB' }}
                placeholder="Confirmez votre mot de passe"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <div
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer transition-colors hover:opacity-70"
                style={{ color: GOLD_PRIMARY }}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
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

          {/* Succès */}
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-2 p-3 rounded-lg"
              style={{ background: '#f0fdf4', border: `1px solid #bbf7d0`, color: '#166534' }}
            >
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">{success}</span>
            </motion.div>
          )}

          {/* Bouton inscription */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: GOLD_PRIMARY, color: '#fff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Création en cours...
              </span>
            ) : (
              <>
                <UserPlus size={18} />
                Créer mon compte
              </>
            )}
          </button>
        </form>

        {/* Lien vers connexion */}
        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: '#7f6b3c' }}>
            Vous avez déjà un compte ?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium transition-colors hover:underline"
              style={{ color: GOLD_PRIMARY }}
            >
              Se connecter
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs" style={{ color: GOLD_PRIMARY }}>
            Système interne Menara Préfa
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;