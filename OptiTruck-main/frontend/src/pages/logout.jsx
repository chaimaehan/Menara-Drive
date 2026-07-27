import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

export default function Logout({ onLogout }) {
  const navigate = useNavigate();
  const [showMessage, setShowMessage] = useState(true);

  useEffect(() => {
    // Utilise le logout centralisé de App.jsx :
    // il vide le localStorage ET met user à null dans l'état React
    // -> évite la désynchronisation qui causait la boucle infinie
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("refresh_token");
    }

    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate, onLogout]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: GOLD_BG }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="text-center max-w-md w-full mx-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: GOLD_PRIMARY }}
        >
          <LogOut size={40} className="text-white" />
        </motion.div>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold mb-3"
          style={{ color: GOLD_DARK }}
        >
          Déconnexion en cours
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showMessage ? 1 : 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 text-sm"
          style={{ color: GOLD_PRIMARY }}
        >
          <CheckCircle size={16} />
          <span>Vous avez été déconnecté avec succès</span>
        </motion.div>

        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, ease: "linear" }}
          className="h-1 rounded-full mt-8"
          style={{ background: GOLD_PRIMARY }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.5 }}
          className="text-xs mt-4"
          style={{ color: GOLD_LIGHT }}
        >
          Redirection vers la page de connexion...
        </motion.p>
      </motion.div>
    </div>
  );
}