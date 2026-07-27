import { QrCode } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, MapPin, Package, CheckCircle, Clock, Navigation, 
  AlertTriangle, X, Send, Satellite, Star, Cloud, CloudRain,
  CloudSun, Sun, CloudSnow, CloudLightning, ArrowRight, TrendingUp
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import FatigueMonitor from '../components/FatigueMonitor';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_BG = '#F8F5EB';
const RED_ALERT = '#dc2626';
const RED_HOVER = '#b91c1c';
const GPS_API = 'http://localhost/OptiTruck/backend/controllers/gps/gps.php';
const DEFAULT_CENTER = [31.6295, -7.9811]; // Marrakech

// Icône camion personnalisée
const camionIcon = L.divIcon({
  className: '',
  html: `<div style="background:#AA9766;width:38px;height:38px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🚛</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

// Recentre la carte quand la position change
const MapRecenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom(), { animate: true, duration: 1.5 });
  }, [position, map]);
  return null;
};

// ─── Mini carte GPS intégrée ───────────────────────────────────────────────
const MiniGPSMap = ({ camionId }) => {
  const [position, setPosition] = useState(null);         // position depuis API
  const [gpsLocal, setGpsLocal] = useState(null);         // position depuis navigator
  const [historique, setHistorique] = useState([]);
  const [vitesse, setVitesse] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  // 1. Essayer de récupérer depuis l'API
  const fetchPosition = async () => {
    try {
      const res = await axios.get(GPS_API);
      if (res.data.success && res.data.data?.length > 0) {
        const camionData = res.data.data.find(
          c => String(c.camion_id) === String(camionId)
        ) || res.data.data[0];
        setPosition([parseFloat(camionData.latitude), parseFloat(camionData.longitude)]);
        setVitesse(parseFloat(camionData.vitesse || 0));
        setLastUpdate(new Date(camionData.timestamp));
      }
    } catch {
      // Silencieux : on utilise gpsLocal à la place
    }
  };

  const fetchHistorique = async () => {
    try {
      const res = await axios.get(`${GPS_API}?historique=1&camion_id=${camionId}`);
      if (res.data.success && res.data.data?.length > 0) {
        setHistorique(res.data.data.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)]));
      }
    } catch {}
  };

  // 2. Fallback : position du navigateur du chauffeur
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocal([pos.coords.latitude, pos.coords.longitude]);
        if (pos.coords.speed != null) setVitesse((pos.coords.speed || 0) * 3.6);
        setLastUpdate(new Date());
      },
      () => {},
      { enableHighAccuracy: true }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsLocal([pos.coords.latitude, pos.coords.longitude]);
        if (pos.coords.speed != null) setVitesse((pos.coords.speed || 0) * 3.6);
        setLastUpdate(new Date());
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!camionId) return;
    fetchPosition();
    fetchHistorique();
    intervalRef.current = setInterval(() => {
      fetchPosition();
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, [camionId]);

  const activePosition = position || gpsLocal;
  const mapCenter = activePosition || DEFAULT_CENTER;
  const isLive = !!activePosition;
  const sourceLabel = position ? 'GPS serveur' : gpsLocal ? 'GPS appareil' : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl shadow-sm border mb-8 overflow-hidden"
      style={{ background: '#fff', borderColor: '#E8E0CC' }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E8E0CC' }}>
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2" style={{ background: GOLD_BG }}>
            <Satellite className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: GOLD_DARK }}>Ma position GPS</h2>
            <p className="text-xs" style={{ color: GOLD_PRIMARY }}>
              {lastUpdate
                ? `Mis à jour : ${lastUpdate.toLocaleTimeString('fr-FR')}${sourceLabel ? ` · ${sourceLabel}` : ''}`
                : 'En attente de signal...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {vitesse > 0 && (
            <div className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ background: GOLD_BG, color: GOLD_DARK }}>
              ⚡ {vitesse.toFixed(0)} km/h
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: isLive ? '#f0fdf4' : '#fffbeb',
              color: isLive ? '#16a34a' : '#92400e'
            }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isLive ? '#16a34a' : '#f59e0b',
              display: 'inline-block'
            }} />
            {isLive ? 'GPS actif' : 'Position par défaut'}
          </div>
        </div>
      </div>

      <MapContainer center={mapCenter} zoom={13} style={{ height: 320, width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {activePosition && <MapRecenter position={activePosition} />}
        <Marker position={mapCenter} icon={camionIcon}>
          <Popup>
            {activePosition ? (
              <>
                <b>🚛 Ma position</b><br />
                📍 {mapCenter[0].toFixed(5)}, {mapCenter[1].toFixed(5)}<br />
                {vitesse > 0 && <>⚡ {vitesse.toFixed(0)} km/h<br /></>}
                {lastUpdate && <>🕐 {lastUpdate.toLocaleTimeString('fr-FR')}<br /></>}
                <span style={{ fontSize: 11, color: '#888' }}>{sourceLabel}</span>
              </>
            ) : (
              <span>📍 Position par défaut — Marrakech</span>
            )}
          </Popup>
        </Marker>
        {historique.length > 1 && (
          <Polyline positions={historique} color={GOLD_PRIMARY} weight={3} dashArray="8,4" opacity={0.7} />
        )}
      </MapContainer>

      <div className="px-6 py-3 flex items-center gap-2 text-xs border-t"
        style={{ borderColor: '#E8E0CC', color: GOLD_PRIMARY }}>
        <MapPin className="w-3 h-3" />
        <span>
          {activePosition
            ? `${mapCenter[0].toFixed(5)}, ${mapCenter[1].toFixed(5)}`
            : 'Marrakech (position par défaut)'}
        </span>
        {historique.length > 0 && (
          <span className="ml-auto" style={{ color: '#aaa' }}>
            {historique.length} points enregistrés aujourd'hui
          </span>
        )}
        {!isLive && (
          <span className="ml-auto text-xs" style={{ color: '#f59e0b' }}>
            ⚠️ Activez la géolocalisation pour un suivi précis
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ─── Widget Météo ───────────────────────────────────────────────────────────
const weatherIconFor = (code) => {
  // Codes WMO simplifiés (Open-Meteo)
  if (code === 0) return { Icon: Sun, label: 'Ciel dégagé' };
  if ([1, 2].includes(code)) return { Icon: CloudSun, label: 'Partiellement nuageux' };
  if (code === 3) return { Icon: Cloud, label: 'Couvert' };
  if ([45, 48].includes(code)) return { Icon: Cloud, label: 'Brouillard' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { Icon: CloudRain, label: 'Pluie' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { Icon: CloudSnow, label: 'Neige' };
  if ([95, 96, 99].includes(code)) return { Icon: CloudLightning, label: 'Orage' };
  return { Icon: CloudSun, label: 'Variable' };
};

const WeatherWidget = ({ position }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const [lat, lon] = position || DEFAULT_CENTER;
    axios.get('https://api.open-meteo.com/v1/forecast', {
      params: { latitude: lat, longitude: lon, current_weather: true }
    })
      .then(res => setWeather(res.data.current_weather))
      .catch(() => setWeather(null))
      .finally(() => setLoading(false));
  }, [position]);

  if (loading) {
    return (
      <div className="rounded-xl shadow-sm border p-5 flex items-center gap-3" style={{ background: '#fff', borderColor: '#E8E0CC' }}>
        <CloudSun className="w-6 h-6 animate-pulse" style={{ color: GOLD_PRIMARY }} />
        <span className="text-sm" style={{ color: GOLD_PRIMARY }}>Chargement météo...</span>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="rounded-xl shadow-sm border p-5" style={{ background: '#fff', borderColor: '#E8E0CC' }}>
        <span className="text-sm" style={{ color: GOLD_PRIMARY }}>Météo indisponible</span>
      </div>
    );
  }

  const { Icon, label } = weatherIconFor(weather.weathercode);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl shadow-sm border p-5 flex items-center justify-between"
      style={{ background: '#fff', borderColor: '#E8E0CC' }}
    >
      <div className="flex items-center gap-4">
        <div className="rounded-full p-3" style={{ background: GOLD_BG }}>
          <Icon className="w-7 h-7" style={{ color: GOLD_PRIMARY }} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: GOLD_DARK }}>{Math.round(weather.temperature)}°C</p>
          <p className="text-xs" style={{ color: GOLD_PRIMARY }}>{label} · vent {Math.round(weather.windspeed)} km/h</p>
        </div>
      </div>
      <span className="text-xs" style={{ color: '#aaa' }}>Météo du jour</span>
    </motion.div>
  );
};

// ─── Carte Prochaine livraison ─────────────────────────────────────────────
const NextDeliveryCard = ({ delivery }) => {
  if (!delivery) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl shadow-sm border p-5 flex items-center gap-3"
        style={{ background: '#fff', borderColor: '#E8E0CC' }}
      >
        <CheckCircle className="w-6 h-6" style={{ color: '#22c55e' }} />
        <span className="text-sm font-medium" style={{ color: GOLD_DARK }}>
          Toutes les livraisons du jour sont terminées 🎉
        </span>
      </motion.div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.address || '')}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl shadow-sm border p-5"
      style={{ background: '#fff', borderColor: '#E8E0CC' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-full p-3" style={{ background: GOLD_BG }}>
            <Navigation className="w-6 h-6" style={{ color: GOLD_PRIMARY }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: GOLD_PRIMARY }}>
              Prochaine livraison
            </p>
            <p className="text-lg font-bold mt-0.5" style={{ color: GOLD_DARK }}>
              {delivery.customerName || 'Client'}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm" style={{ color: GOLD_PRIMARY }}>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{delivery.address}</span>
              {delivery.deliveryTime && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{delivery.deliveryTime}</span>
              )}
            </div>
          </div>
        </div>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-md flex-shrink-0"
          style={{ background: GOLD_PRIMARY }}
        >
          Itinéraire <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
};

// ─── Carte Note de performance ─────────────────────────────────────────────
const PerformanceCard = ({ note }) => {
  const noteArrondie = note != null ? Math.round(note) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl shadow-sm border p-5"
      style={{ background: '#fff', borderColor: '#E8E0CC' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: GOLD_PRIMARY }}>
        Ma note de performance
      </p>
      {note != null ? (
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className="w-6 h-6"
              fill={i <= noteArrondie ? '#f59e0b' : 'none'}
              style={{ color: i <= noteArrondie ? '#f59e0b' : '#d4c8a8' }}
            />
          ))}
          <span className="ml-2 text-sm font-bold" style={{ color: GOLD_DARK }}>{note.toFixed(1)} / 5</span>
        </div>
      ) : (
        <p className="text-sm" style={{ color: GOLD_PRIMARY }}>Pas encore évalué</p>
      )}
    </motion.div>
  );
};

// ─── Historique / statistiques de la semaine ───────────────────────────────
const WEEKLY_KEY_PREFIX = 'menaradrive_weekly_';

const getWeeklyKey = (userId) => `${WEEKLY_KEY_PREFIX}${userId || 'anon'}`;

const readWeeklyData = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(getWeeklyKey(userId)) || '{}');
  } catch {
    return {};
  }
};

const bumpWeeklyData = (userId) => {
  const key = getWeeklyKey(userId);
  const data = readWeeklyData(userId);
  const today = new Date().toISOString().slice(0, 10);
  data[today] = (data[today] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(data));
};

const WeeklyStatsCard = ({ userId }) => {
  const days = useMemo(() => {
    const data = readWeeklyData(userId);
    const labels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ label: labels[d.getDay()], count: data[key] || 0 });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, readWeeklyData(userId)]);

  const maxCount = Math.max(1, ...days.map(d => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl shadow-sm border p-5 mb-8"
      style={{ background: '#fff', borderColor: '#E8E0CC' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: GOLD_PRIMARY }}>
          <TrendingUp className="w-4 h-4" /> Livraisons cette semaine
        </p>
        <span className="text-sm font-bold" style={{ color: GOLD_DARK }}>{total} au total</span>
      </div>
      <div className="flex items-end justify-between gap-2" style={{ height: 90 }}>
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${(d.count / maxCount) * 60}px`,
                minHeight: d.count > 0 ? 6 : 2,
                background: d.count > 0 ? GOLD_PRIMARY : '#E8E0CC',
              }}
            />
            <span className="text-[10px] mt-2" style={{ color: GOLD_PRIMARY }}>{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] mt-3" style={{ color: '#bbb' }}>
        Calculé localement depuis vos confirmations de livraison sur cet appareil.
      </p>
    </motion.div>
  );
};

// ─── Dashboard principal ───────────────────────────────────────────────────
const ChauffeurDashboard = ({ onLogout, user }) => {
  const [driverStats, setDriverStats] = useState({
    assignedTruck: null,
    todayDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    note: null
  });
  const [deliveries, setDeliveries] = useState([]);
  const [error, setError] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdownMessage, setBreakdownMessage] = useState('');
  const [isSubmittingBreakdown, setIsSubmittingBreakdown] = useState(false);
  const [breakdownSuccess, setBreakdownSuccess] = useState('');
  const [gpsPosition, setGpsPosition] = useState(null);
  const [weeklyTick, setWeeklyTick] = useState(0); // force le re-render du widget hebdo
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Position pour la météo (indépendante de la mini-carte GPS)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: false }
    );
  }, []);

  // Envoi GPS automatique
  useEffect(() => {
    const envoyerPosition = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const userData = JSON.parse(localStorage.getItem('user'));
          await axios.post(GPS_API, {
            camion_id: driverStats.assignedTruck?.id || 1,
            chauffeur_id: userData?.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            vitesse: (pos.coords.speed || 0) * 3.6,
            statut: 'en_route'
          });
        } catch {}
      }, null, { enableHighAccuracy: true });
    };
    envoyerPosition();
    const gpsInterval = setInterval(envoyerPosition, 10000);
    return () => clearInterval(gpsInterval);
  }, [driverStats.assignedTruck]);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const res = await axios.get(
          'http://localhost/OptiTruck/backend/controllers/chauffeurDashboard/driver_dashboard.php',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.error) throw new Error(res.data.error);
        if (!res.data.stats) throw new Error('Donnees statistiques manquantes');
        setDriverStats({
          assignedTruck: res.data.stats.assignedTruck || null,
          todayDeliveries: res.data.stats.todayDeliveries || 0,
          completedDeliveries: res.data.stats.completedDeliveries || 0,
          pendingDeliveries: res.data.stats.pendingDeliveries || 0,
          // Le backend ne renvoie pas encore ce champ : on le lit s'il existe,
          // sinon on retombe sur user.note si présent, sinon null (affiche "Pas encore évalué")
          note: res.data.stats.note ?? user?.note ?? null
        });
        setDeliveries(res.data.deliveries || []);
        setError('');
      } catch (error) {
        if (error.response) {
          if (error.response.status === 401) setError('Session expiree. Veuillez vous reconnecter.');
          else if (error.response.status === 403) setError('Acces non autorise');
          else setError('Erreur serveur: ' + (error.response.data?.error || error.message));
        } else {
          setError('Erreur reseau: ' + error.message);
        }
        setDriverStats({ assignedTruck: null, todayDeliveries: 0, completedDeliveries: 0, pendingDeliveries: 0, note: null });
        setDeliveries([]);
      }
    };
    if (token) fetchDriverData();
    else setError('Aucun token disponible');
  }, [token]);

  const handleMarkDelivered = async (deliveryId) => {
    try {
      await axios.post(
        'http://localhost/OptiTruck/backend/controllers/chauffeurDashboard/mark_delivered.php',
        { livraisonId: deliveryId, chauffeurId: user.id },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setDeliveries(deliveries.map(d => d.id === deliveryId ? { ...d, status: 'completed' } : d));
      setDriverStats(prev => ({
        ...prev,
        completedDeliveries: prev.completedDeliveries + 1,
        pendingDeliveries: Math.max(0, prev.pendingDeliveries - 1)
      }));
      bumpWeeklyData(user?.id);
      setWeeklyTick(t => t + 1);
    } catch (err) {
      setError('Echec de la mise a jour: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReportBreakdown = async () => {
    if (!breakdownMessage.trim()) { setError('Veuillez decrire le probleme rencontre'); return; }
    setIsSubmittingBreakdown(true);
    setError('');
    try {
      const response = await axios.post(
        'http://localhost/OptiTruck/backend/controllers/chauffeurDashboard/report_breakdown.php',
        { message: breakdownMessage.trim() },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (response.data.success) {
        setBreakdownSuccess("Panne signalee avec succes ! L'administrateur a ete notifie.");
        setBreakdownMessage('');
        setShowBreakdownModal(false);
        setTimeout(() => setBreakdownSuccess(''), 5000);
      }
    } catch (err) {
      setError('Echec du signalement: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmittingBreakdown(false);
    }
  };

  const statCards = [
    { title: "Livraisons du jour", value: driverStats.todayDeliveries, icon: Package, color: GOLD_PRIMARY },
    { title: 'Completees', value: driverStats.completedDeliveries, icon: CheckCircle, color: GOLD_PRIMARY },
    { title: 'En attente', value: driverStats.pendingDeliveries, icon: Clock, color: GOLD_PRIMARY }
  ];

  // Prochaine livraison = premier envoi non complété (ordre d'arrivée de l'API, supposé chronologique)
  const nextDelivery = deliveries.find(d => d.status !== 'completed') || null;

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ background: GOLD_BG, minHeight: '100vh' }}>

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: 4, height: 32, background: GOLD_PRIMARY, borderRadius: 2 }} />
              <h1 className="text-3xl font-bold" style={{ color: GOLD_DARK }}>Tableau de bord chauffeur</h1>
            </div>
            <p className="mt-1" style={{ color: GOLD_PRIMARY }}>Bienvenue, voici vos livraisons du jour.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBreakdownModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg"
              style={{ background: RED_ALERT, color: '#fff' }}
              onMouseEnter={(e) => e.currentTarget.style.background = RED_HOVER}
              onMouseLeave={(e) => e.currentTarget.style.background = RED_ALERT}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Signaler une panne</span>
            </button>
            <button
              onClick={() => navigate('/qr-scanner')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-md"
              style={{ background: GOLD_PRIMARY }}
            >
              <QrCode className="w-5 h-5" />
              Scanner QR
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: '#fff5f5', border: '1px solid #fecaca', color: GOLD_DARK }}>
            {error}
          </div>
        )}
        {breakdownSuccess && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: GOLD_BG, border: `1px solid ${GOLD_PRIMARY}`, color: GOLD_DARK }}>
            {breakdownSuccess}
          </div>
        )}

        {/* Prochaine livraison */}
        <div className="mb-8">
          <NextDeliveryCard delivery={nextDelivery} />
        </div>

        {/* Météo + Note de performance côte à côte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <WeatherWidget position={gpsPosition} />
          <PerformanceCard note={driverStats.note} />
        </div>

        {/* Camion assigné */}
        {driverStats.assignedTruck && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl shadow-sm border p-6 mb-8"
            style={{ background: '#fff', borderColor: '#E8E0CC' }}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full p-2" style={{ background: GOLD_BG }}>
                <Truck className="w-6 h-6" style={{ color: GOLD_PRIMARY }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: GOLD_PRIMARY }}>Camion assigne</h2>
                <p className="text-lg font-bold" style={{ color: '#2c2b26' }}>{driverStats?.assignedTruck?.code ?? "Aucun camion assigne"}</p>
                <p className="text-sm" style={{ color: GOLD_PRIMARY }}>Capacite: {driverStats?.assignedTruck?.capacite ?? 0} unites</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }} className="rounded-xl shadow-sm border p-6"
                style={{ background: '#fff', borderColor: '#E8E0CC' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: GOLD_PRIMARY }}>{card.title}</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: GOLD_DARK }}>{card.value}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: GOLD_BG }}>
                    <Icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Statistiques de la semaine */}
        <WeeklyStatsCard key={weeklyTick} userId={user?.id} />

        {/* Détection de fatigue par caméra */}
        <FatigueMonitor camionId={driverStats.assignedTruck?.id} />

        {/* Mini carte GPS */}
        <MiniGPSMap camionId={driverStats.assignedTruck?.id || 1} />

        {/* Livraisons du jour */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl shadow-sm border" style={{ background: '#fff', borderColor: '#E8E0CC' }}
        >
          <div className="p-6 border-b" style={{ borderColor: '#E8E0CC' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold" style={{ color: GOLD_DARK }}>Livraisons du jour</h2>
              <button onClick={() => navigate('/route-map')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg"
                style={{ background: GOLD_PRIMARY, color: '#fff' }}
              >
                <Navigation className="w-4 h-4" />
                <span>Voir les trajets</span>
              </button>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: '#E8E0CC' }}>
            {deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <div key={delivery.id} className="p-6" style={{ borderColor: '#E8E0CC' }}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-semibold" style={{ color: GOLD_DARK }}>Commande #{delivery.orderNumber}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${delivery.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                          style={delivery.status === 'pending' ? { background: GOLD_BG, color: GOLD_DARK } : {}}>
                          {delivery.status === 'completed' ? 'Livree' : 'En attente'}
                        </span>
                      </div>
                      <p className="font-medium" style={{ color: '#2c2b26' }}>{delivery.customerName}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: GOLD_PRIMARY }}>
                        <div className="flex items-center space-x-1"><MapPin className="w-4 h-4" /><span>{delivery.address}</span></div>
                        <div className="flex items-center space-x-1"><Clock className="w-4 h-4" /><span>{delivery.deliveryTime}</span></div>
                        <div className="flex items-center space-x-1"><Package className="w-4 h-4" /><span>{delivery.items} article(s)</span></div>
                      </div>
                    </div>
                    {delivery.status === 'pending' && (
                      <button onClick={() => handleMarkDelivered(delivery.id)}
                        className="px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md"
                        style={{ background: GOLD_PRIMARY, color: '#fff' }}
                      >
                        Marquer comme livree
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center" style={{ color: GOLD_PRIMARY }}>
                {error ? 'Erreur de chargement' : "Aucune livraison prevue aujourd'hui"}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal panne */}
      {showBreakdownModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{ background: '#fff', border: '1px solid #E8E0CC' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center" style={{ color: GOLD_DARK }}>
                <AlertTriangle className="w-5 h-5 mr-2" style={{ color: RED_ALERT }} />
                Signaler une panne
              </h3>
              <button onClick={() => { setShowBreakdownModal(false); setBreakdownMessage(''); setError(''); }}
                className="transition-colors hover:opacity-70" style={{ color: GOLD_PRIMARY }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: GOLD_PRIMARY }}>
                Decrivez le probleme rencontre
              </label>
              <textarea value={breakdownMessage} onChange={(e) => setBreakdownMessage(e.target.value)}
                rows={4} className="w-full px-3 py-2 border rounded-md focus:outline-none transition-all"
                style={{ borderColor: '#E8E0CC', background: GOLD_BG }}
                placeholder="Ex: Probleme moteur, pneu creve, probleme de frein..."
                disabled={isSubmittingBreakdown}
              />
            </div>
            {error && <div className="mb-4 p-3 text-sm rounded" style={{ background: '#fff5f5', color: GOLD_DARK }}>{error}</div>}
            <div className="flex space-x-3">
              <button onClick={() => { setShowBreakdownModal(false); setBreakdownMessage(''); setError(''); }}
                className="flex-1 px-4 py-2 border rounded-md transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E8E0CC', color: GOLD_PRIMARY }} disabled={isSubmittingBreakdown}>
                Annuler
              </button>
              <button onClick={handleReportBreakdown}
                disabled={isSubmittingBreakdown || !breakdownMessage.trim()}
                className="flex-1 px-4 py-2 rounded-md transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ background: RED_ALERT, color: '#fff' }}
                onMouseEnter={(e) => e.currentTarget.style.background = RED_HOVER}
                onMouseLeave={(e) => e.currentTarget.style.background = RED_ALERT}
              >
                {isSubmittingBreakdown ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Signaler</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default ChauffeurDashboard;