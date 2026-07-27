import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, Shield, Award, Search, X, Send, User } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const COLORS = { gold: '#AA9766', dark: '#8A7A52', bg: '#F8F5EB' };

const DriverEvaluation = ({ user, onLogout }) => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [history, setHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ driver_id: '', rating: 0, comment: '', criteria_punctuality: 3, criteria_professionalism: 3, criteria_safety: 3, criteria_communication: 3 });

  useEffect(() => { loadDrivers(); }, []);

  const loadDrivers = async () => {
    const res = await axios.get('http://localhost/OptiTruck/backend/controllers/driverEvaluation/evaluation.php');
    setDrivers(res.data.data || []);
  };

  const selectDriver = async (driver) => {
    setSelectedDriver(driver);
    const res = await axios.get(`http://localhost/OptiTruck/backend/controllers/driverEvaluation/evaluation.php?driver_id=${driver.id}`);
    setHistory(res.data.data || []);
  };

  const submitEval = async () => {
    if (form.rating === 0) return alert("Note requise");
    await axios.post('http://localhost/OptiTruck/backend/controllers/driverEvaluation/evaluation.php', form);
    setShowModal(false);
    loadDrivers();
    if(selectedDriver) selectDriver(selectedDriver);
  };

  const renderStars = (note, size = 16) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} className={s <= Math.round(note) ? "fill-current" : "text-gray-300"} style={{ color: s <= Math.round(note) ? COLORS.gold : '#D1D5DB' }} />
      ))}
    </div>
  );

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen p-8" style={{ background: COLORS.bg }}>
        <div className="max-w-7xl mx-auto">
          
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <div className="w-1 h-10 rounded" style={{ background: COLORS.gold }} />
              <h1 className="text-3xl font-bold" style={{ color: COLORS.dark }}>Performance Chauffeurs</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                className="pl-11 pr-5 py-3 border rounded-xl w-80 shadow-sm outline-none focus:ring-2"
                style={{ borderColor: COLORS.gold }}
                placeholder="Rechercher par nom ou matricule..."
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.filter(d => d.nom.toLowerCase().includes(searchTerm.toLowerCase())).map(driver => (
              <motion.div 
                key={driver.id} whileHover={{ y: -5 }} onClick={() => selectDriver(driver)}
                className="bg-white p-6 rounded-2xl border shadow-sm cursor-pointer" style={{ borderColor: '#E8E0CC' }}
              >
                <div className="flex justify-between mb-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: COLORS.gold }}><User /></div>
                    <div>
                      <h3 className="font-bold text-lg">{driver.nom}</h3>
                      <p className="text-sm font-mono text-gray-400">{driver.matricule}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: COLORS.gold }}>{Number(driver.avg_rating).toFixed(1)}</span>
                    {renderStars(driver.avg_rating)}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={(e) => { e.stopPropagation(); setForm({...form, driver_id: driver.id}); setShowModal(true); }} className="flex-1 py-2 rounded-lg text-white font-bold text-sm" style={{ background: COLORS.gold }}>Évaluer</button>
                </div>
              </motion.div>
            ))}
          </div>

          {selectedDriver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 bg-white rounded-2xl border p-8" style={{ borderColor: '#E8E0CC' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Historique de {selectedDriver.nom}</h2>
                <button onClick={() => setSelectedDriver(null)}><X /></button>
              </div>
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl border flex justify-between items-center" style={{ background: COLORS.bg }}>
                    <div>
                      <div className="flex gap-2 items-center mb-1">{renderStars(h.rating)} <span className="font-bold">{h.rating}/5</span></div>
                      <p className="text-sm text-gray-600 italic">"{h.comment || 'Sans commentaire'}"</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-center">Nouvelle Évaluation</h2>
              <div className="flex justify-center gap-2 mb-8">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={40} onClick={() => setForm({...form, rating: s})} className={`cursor-pointer transition-all ${form.rating >= s ? 'fill-current' : ''}`} style={{ color: form.rating >= s ? COLORS.gold : '#DDD' }} />
                ))}
              </div>
              <textarea placeholder="Commentaire..." className="w-full p-4 border rounded-xl mb-6 outline-none" rows="3" onChange={e => setForm({...form, comment: e.target.value})} />
              <div className="flex gap-4">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border font-bold">Annuler</button>
                <button onClick={submitEval} className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: COLORS.gold }}>Envoyer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DriverEvaluation;