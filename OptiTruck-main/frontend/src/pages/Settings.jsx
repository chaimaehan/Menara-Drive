
import i18n from '../i18n';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Globe,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  Check,
  Palette,
  Languages,
  Save,
  RotateCcw
} from 'lucide-react';
import Navbar from '../components/Navbar';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const SettingsPage = ({ onLogout, onSettingsChange }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  const savedSettings = JSON.parse(localStorage.getItem('appSettings')) || {};

  const [language, setLanguage] = useState(savedSettings.language || 'fr');
  const [theme, setTheme] = useState(savedSettings.theme || 'light');
  const [saved, setSaved] = useState(false);

  // ✅ Appliquer le thème en temps réel quand on clique
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.style.colorScheme = prefersDark ? 'dark' : 'light';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // ✅ Appliquer la langue en temps réel quand on clique
 useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    i18n.changeLanguage(language);
}, [language]);

  const handleSave = () => {
    const settings = { language, theme };
    localStorage.setItem('appSettings', JSON.stringify(settings));

    // ✅ Notifier App.jsx
    if (onSettingsChange) {
      onSettingsChange(settings);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setLanguage('fr');
    setTheme('light');
    localStorage.removeItem('appSettings');
    if (onSettingsChange) {
      onSettingsChange({ language: 'fr', theme: 'light' });
    }
  };

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇲🇦' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const themes = [
    { value: 'light', label: 'Clair', icon: Sun, description: 'Interface lumineuse' },
    { value: 'dark', label: 'Sombre', icon: Moon, description: 'Interface sombre' },
    { value: 'system', label: 'Système', icon: Monitor, description: 'Selon votre OS' },
  ];

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />

      <div className="min-h-screen bg-gradient-to-br from-[#F8F5EB] via-[#FDFBF7] to-[#F5F0E4] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden transition-colors duration-500">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#AA9766]/20 to-[#8A7A52]/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#D4C8A8]/20 to-[#AA9766]/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/20 p-8 relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/admin')}
                    className="p-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/80 transition-all duration-300"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </motion.button>
                  <div className="bg-gradient-to-r from-[#AA9766] to-[#8A7A52] p-3 rounded-2xl">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-[#8A7A52] to-[#AA9766] dark:from-white dark:via-[#D4C8A8] dark:to-[#AA9766] bg-clip-text text-transparent">
                      Paramètres
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Configuration de l'application</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReset}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-white/80 transition-all duration-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-sm font-medium">Réinitialiser</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    className={`flex items-center space-x-2 px-5 py-2 rounded-xl font-medium text-sm shadow-lg transition-all duration-300 ${
                      saved
                        ? 'bg-green-500 text-white shadow-green-200'
                        : 'bg-gradient-to-r from-[#AA9766] to-[#8A7A52] text-white hover:from-[#B8A87A] hover:to-[#9A8A62] shadow-[#AA9766]/20'
                    }`}
                  >
                    {saved ? (
                      <><Check className="w-4 h-4" /><span>Sauvegardé !</span></>
                    ) : (
                      <><Save className="w-4 h-4" /><span>Sauvegarder</span></>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section Langue */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/20 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-[#AA9766] to-[#8A7A52] p-3 rounded-2xl">
                  <Languages className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Langue</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choisissez la langue de l'interface</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {languages.map((lang) => (
                  <motion.button
                    key={lang.code}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setLanguage(lang.code)}
                    className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                      language === lang.code
                        ? 'border-[#AA9766] bg-gradient-to-br from-[#F8F5EB] to-[#FDFBF7] dark:from-[#AA9766]/40 dark:to-[#8A7A52]/40 shadow-lg shadow-[#AA9766]/20'
                        : 'border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-700/60 hover:border-[#AA9766]/50 hover:bg-[#F8F5EB]/50'
                    }`}
                  >
                    {language === lang.code && (
                      <div className="absolute top-3 right-3 bg-[#AA9766] rounded-full p-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="text-3xl mb-2">{lang.flag}</div>
                    <div className={`font-semibold ${language === lang.code ? 'text-[#AA9766] dark:text-[#D4C8A8]' : 'text-gray-700 dark:text-gray-300'}`}>
                      {lang.label}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Section Thème */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/20 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-[#8A7A52] to-[#AA9766] p-3 rounded-2xl">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Apparence</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mode clair, sombre ou selon votre système</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {themes.map((t) => {
                  const Icon = t.icon;
                  return (
                    <motion.button
                      key={t.value}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setTheme(t.value)}
                      className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                        theme === t.value
                          ? 'border-[#AA9766] bg-gradient-to-br from-[#F8F5EB] to-[#FDFBF7] dark:from-[#AA9766]/40 dark:to-[#8A7A52]/40 shadow-lg shadow-[#AA9766]/20'
                          : 'border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-700/60 hover:border-[#AA9766]/50 hover:bg-[#F8F5EB]/50'
                      }`}
                    >
                      {theme === t.value && (
                        <div className="absolute top-3 right-3 bg-[#AA9766] rounded-full p-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={`p-2 rounded-xl w-fit mb-3 ${theme === t.value ? 'bg-gradient-to-r from-[#AA9766] to-[#8A7A52]' : 'bg-gray-100 dark:bg-gray-600'}`}>
                        <Icon className={`w-5 h-5 ${theme === t.value ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`} />
                      </div>
                      <div className={`font-semibold mb-1 ${theme === t.value ? 'text-[#AA9766] dark:text-[#D4C8A8]' : 'text-gray-700 dark:text-gray-300'}`}>
                        {t.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t.description}</div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Aperçu mode sombre */}
              {theme === 'dark' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-gray-900 rounded-2xl border border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <Moon className="w-5 h-5 text-[#D4C8A8]" />
                    <div>
                      <p className="text-white font-medium text-sm">Mode sombre activé</p>
                      <p className="text-gray-400 text-xs">L'interface bascule immédiatement en mode sombre</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Résumé */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Globe className="w-4 h-4 text-[#AA9766]" />
                    <span>Langue : <span className="font-semibold text-gray-800 dark:text-white">{languages.find(l => l.code === language)?.label}</span></span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-[#AA9766]" /> : theme === 'light' ? <Sun className="w-4 h-4 text-[#AA9766]" /> : <Monitor className="w-4 h-4 text-[#AA9766]" />}
                    <span>Thème : <span className="font-semibold text-gray-800 dark:text-white">{themes.find(t => t.value === theme)?.label}</span></span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">Les paramètres sont sauvegardés localement</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  );
};

export default SettingsPage;