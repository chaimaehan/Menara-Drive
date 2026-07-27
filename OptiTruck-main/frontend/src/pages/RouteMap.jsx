import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Navbar from '../components/Navbar';
import {
  MapPin, Navigation, CheckCircle, Clock, Package, Phone, MessageSquare,
  Truck, Route, Star, AlertCircle, Play, Pause, RotateCcw, Zap, Users,
  Calendar, Timer, TrendingUp, Award, Target, ArrowRight
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ CORRECTION : URL de base centralisée avec casse correcte (OptiTruck)
const API_BASE_URL = 'http://localhost/OptiTruck/backend/controllers';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK    = '#8A7A52';
const GOLD_LIGHT   = '#D4C8A8';
const GOLD_BG      = '#F8F5EB';
const RED_ALERT    = '#dc2626';
const RED_HOVER    = '#b91c1c';

// ─── Icône numérotée ─────────────────────────────────────────────────────────
function numberedIcon(number, color = "gold") {
  const iconColor =
    color === "green" ? "#10b981" :
    color === "blue"  ? GOLD_PRIMARY :
    color === "red"   ? RED_ALERT :
    GOLD_PRIMARY;

  return L.divIcon({
    html: `<div style="
      background-color: ${iconColor};
      color: white;
      border-radius: 50%;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 0 3px rgba(0,0,0,0.3);
    ">${number}</div>`,
    className: "",
    iconSize:   [28, 28],
    iconAnchor: [14, 14]
  });
}

// ─── Atelier (point de départ) ───────────────────────────────────────────────
const atelier = { lat: 31.584044, lng: -8.102375, nom: "Atelier Souihla" };

// ─── Auto-zoom carte ─────────────────────────────────────────────────────────
function FitBounds({ deliveries, atelier }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    try {
      const bounds = [[atelier.lat, atelier.lng]];
      deliveries.forEach((d) => { if (d.coordinates) bounds.push(d.coordinates); });
      if (bounds.length > 1) {
        setTimeout(() => {
  try { 
    if (map && map._loaded && map.getContainer()) {
      map.fitBounds(bounds, { padding: [50, 50] }); 
    }
  }
  catch (e) { console.warn("FitBounds error:", e); }
}, 300);
      } else {
        setTimeout(() => {
          try { if (map?.getContainer()) map.setView([atelier.lat, atelier.lng], 11); }
          catch (e) { console.warn("SetView error:", e); }
        }, 300);
      }
    } catch (e) { console.warn("Bounds error:", e); }
  }, [deliveries, atelier, map]);
  return null;
}

// ─── Carte Leaflet ────────────────────────────────────────────────────────────
const InteractiveMap = ({ deliveries, selectedDelivery, setSelectedDelivery }) => {
  const sortedDeliveries = deliveries
    .filter((d) => d.coordinates)
    .sort((a, b) => {
      const oA = a.deliveryOrder || a.stopNumber || deliveries.indexOf(a);
      const oB = b.deliveryOrder || b.stopNumber || deliveries.indexOf(b);
      return oA - oB;
    });

  const routePoints = [
    [atelier.lat, atelier.lng],
    ...sortedDeliveries.map((d) => d.coordinates)
  ];

  return (
    <MapContainer
      center={[atelier.lat, atelier.lng]}
      zoom={11}
      scrollWheelZoom={true}
      className="h-[400px] w-full z-10 rounded-2xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[atelier.lat, atelier.lng]} icon={numberedIcon(0, "green")}>
        <Popup>{atelier.nom}</Popup>
      </Marker>

      {sortedDeliveries.map((delivery, index) => (
        <Marker
          key={delivery.id}
          position={delivery.coordinates}
          icon={numberedIcon(
            index + 1,
            delivery.status === 'completed'   ? 'green' :
            delivery.status === 'in-progress' ? 'blue'  : 'red'
          )}
          eventHandlers={{ click: () => setSelectedDelivery(delivery) }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold" style={{ color: '#2c2b26' }}>{delivery.customerName}</h3>
              <p className="text-sm"  style={{ color: '#5e4b2a' }}>{delivery.address}</p>
              <p className="text-xs"  style={{ color: GOLD_PRIMARY }}>Arrêt {index + 1}</p>
              {delivery.phone && (
                <p className="text-xs" style={{ color: GOLD_PRIMARY }}>📞 {delivery.phone}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {routePoints.length > 1 && (
        <Polyline
          positions={routePoints}
          color={GOLD_PRIMARY}
          weight={4}
          opacity={0.7}
          dashArray="5, 10"
        />
      )}

      <FitBounds deliveries={sortedDeliveries} atelier={atelier} />
    </MapContainer>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
const RouteMap = ({ user, onLogout }) => {
  const [currentRoute,     setCurrentRoute]     = useState(null);
  const [deliveries,       setDeliveries]       = useState([]);
  const [routeInfo,        setRouteInfo]        = useState({ totalStops: 0, estimatedTime: '', totalDistance: 0 });
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [routeProgress,    setRouteProgress]    = useState(0);
  const [liveTracking,     setLiveTracking]     = useState(false);
  const [showModal,        setShowModal]        = useState(false);
  const [currentDeliveryId,setCurrentDeliveryId]= useState(null);
  const [formData,         setFormData]         = useState({ satisfaction: "", cout: "" });
  const [startTimes,       setStartTimes]       = useState({});
  const [realTimeStats,    setRealTimeStats]    = useState({
    deliveredToday: 0, averageDeliveryTime: '12min',
    customerSatisfaction: 4.8, fuelEfficiency: '8.2L/100km'
  });
  const [weatherInfo, setWeatherInfo] = useState({
    temperature: '22°C', condition: 'Ensoleillé', icon: '☀️', trafficStatus: 'Fluide'
  });

  // ── Démarrer une livraison ──────────────────────────────────────────────────
  const handleStartDelivery = (deliveryId) => {
    setStartTimes(prev => ({ ...prev, [deliveryId]: new Date() }));
    updateStatus(deliveryId, 'in-progress');
  };

  // ── Ouvrir modal confirmation ───────────────────────────────────────────────
  const handleMarkDelivered = (deliveryId) => {
    setCurrentDeliveryId(deliveryId);
    setShowModal(true);
  };

  // ── Soumettre livraison complète ────────────────────────────────────────────
  const submitDeliveryForm = async () => {
    if (!currentDeliveryId) return;
    const start = startTimes[currentDeliveryId];
    const end   = new Date();
    const tempsReelMinutes = start ? Math.floor((end - start) / 60000) : null;

    try {
      // ✅ CORRECTION : URL avec casse correcte OptiTruck
      await axios.post(
        `${API_BASE_URL}/routeMap/update_delivery_status.php`,
        {
          deliveryId:          currentDeliveryId,
          status:              "completed",
          satisfaction_reelle: formData.satisfaction,
          cout_reel:           formData.cout,
          temps_reel_minutes:  tempsReelMinutes
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      setDeliveries(prev =>
        prev.map(d =>
          d.id === currentDeliveryId
            ? { ...d, status: "completed", satisfaction_reelle: formData.satisfaction,
                cout_reel: formData.cout, temps_reel_minutes: tempsReelMinutes }
            : d
        )
      );

      const updated   = deliveries.map(d => d.id === currentDeliveryId ? { ...d, status: "completed" } : d);
      const completed = updated.filter(d => d.status === 'completed').length;
      setRouteProgress((completed / updated.length) * 100);
      setRealTimeStats(prev => ({ ...prev, deliveredToday: completed }));

      setShowModal(false);
      setFormData({ satisfaction: "", cout: "" });
      setCurrentDeliveryId(null);
    } catch (err) {
      console.error("Erreur de mise à jour livraison", err);
    }
  };

  // ── Chargement initial ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        setLoading(true);
        // ✅ CORRECTION : URL avec casse correcte OptiTruck
        const res = await axios.get(
          `${API_BASE_URL}/routeMap/get_delivery_route.php`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );

        if (res.data.success) {
          setCurrentRoute(res.data.route);
          const deliveriesData = res.data.deliveries || [];

          // ✅ CORRECTION : vérification que deliveries est un tableau
          if (!Array.isArray(deliveriesData)) {
            console.error('fetchRouteData: tableau attendu pour deliveries, reçu :', deliveriesData);
            setError('Format de données invalide');
            return;
          }

          setDeliveries(deliveriesData);
          setRouteInfo({
            totalStops:    res.data.totalStops    || 0,
            estimatedTime: res.data.estimatedTime || '',
            totalDistance: res.data.totalDistance || 0,
          });
          if (res.data.realTimeStats) setRealTimeStats(res.data.realTimeStats);
          if (res.data.weather)       setWeatherInfo(res.data.weather);

          const completed = deliveriesData.filter(d => d.status === 'completed').length;
          const total     = deliveriesData.length;
          setRouteProgress(total > 0 ? (completed / total) * 100 : 0);
          setRealTimeStats(prev => ({ ...prev, deliveredToday: completed }));
        } else {
          setError(res.data.error || 'Erreur lors du chargement des données');
        }
      } catch (err) {
        console.error('Erreur chargement route', err);
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };
    fetchRouteData();
  }, []);

  // ── Mise à jour statut ──────────────────────────────────────────────────────
  const updateStatus = async (deliveryId, status) => {
    try {
      // ✅ CORRECTION : URL avec casse correcte OptiTruck
      await axios.post(
        `${API_BASE_URL}/routeMap/update_delivery_status.php`,
        { deliveryId, status },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, status } : d));
      const updated   = deliveries.map(d => d.id === deliveryId ? { ...d, status } : d);
      const completed = updated.filter(d => d.status === 'completed').length;
      setRouteProgress((completed / updated.length) * 100);
      if (status === 'completed') {
        setRealTimeStats(prev => ({ ...prev, deliveredToday: prev.deliveredToday + 1 }));
      }
    } catch (err) {
      console.error('Erreur mise à jour statut', err);
      setError('Erreur lors de la mise à jour du statut');
    }
  };

  // ✅ Pas d'alert si pas de numéro
  const handleCall = (phone) => {
    if (phone && phone.trim() !== '') {
      window.location.href = `tel:${phone.trim()}`;
    }
  };

  // ── Navigation Google Maps ──────────────────────────────────────────────────
  const startNavigation = () => {
    const next = deliveries.find(d => d.status === 'pending' || d.status === 'in-progress');
    if (next) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next.address)}`, '_blank');
    }
  };

  // ── Helpers UI ──────────────────────────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':   return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pending':     return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':   return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <Navigation  className="w-4 h-4" />;
      default:            return <Clock       className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':   return 'Livrée';
      case 'in-progress': return 'En cours';
      case 'pending':     return 'Pending';
      default:            return status;
    }
  };

  // ── Écrans de chargement / erreur ───────────────────────────────────────────
  if (loading) return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen flex items-center justify-center" style={{ background: GOLD_BG }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto" style={{ borderColor: GOLD_PRIMARY }} />
          <p className="mt-4" style={{ color: GOLD_PRIMARY }}>Chargement de votre tournée...</p>
        </div>
      </div>
    </>
  );

  if (error) return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen flex items-center justify-center" style={{ background: GOLD_BG }}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: RED_ALERT }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: GOLD_DARK }}>Erreur de chargement</h2>
          <p className="mb-4" style={{ color: GOLD_PRIMARY }}>{error}</p>
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg shadow-md hover:shadow-lg"
            style={{ background: GOLD_PRIMARY, color: '#fff' }}>
            Réessayer
          </button>
        </div>
      </div>
    </>
  );

  // ── Rendu principal ─────────────────────────────────────────────────────────
  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen" style={{ background: GOLD_BG }}>

        {/* Header stats */}
        <div className="shadow-sm border-b" style={{ background: '#fff', borderColor: '#E8E0CC' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div style={{ width: 4, height: 24, background: GOLD_PRIMARY, borderRadius: 2 }} />
                  <h1 className="text-2xl font-bold" style={{ color: GOLD_DARK }}>Tournée du jour</h1>
                </div>
                <p className="text-sm" style={{ color: GOLD_PRIMARY }}>Chauffeur : {user?.name || 'Utilisateur'}</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: GOLD_PRIMARY }}>{realTimeStats.deliveredToday}</div>
                  <div className="text-xs"           style={{ color: GOLD_PRIMARY }}>Livrées</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: GOLD_PRIMARY }}>{realTimeStats.averageDeliveryTime}</div>
                  <div className="text-xs"           style={{ color: GOLD_PRIMARY }}>Temps moyen</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center text-2xl font-bold" style={{ color: GOLD_PRIMARY }}>
                    <Star className="w-5 h-5 mr-1" />{realTimeStats.customerSatisfaction}
                  </div>
                  <div className="text-xs" style={{ color: GOLD_PRIMARY }}>Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Barre de progression */}
          {routeInfo.totalStops > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl shadow-sm border p-6 mb-6"
              style={{ background: '#fff', borderColor: '#E8E0CC' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center" style={{ color: GOLD_DARK }}>
                  <Route className="w-5 h-5 mr-2" style={{ color: GOLD_PRIMARY }} />
                  Progression de la tournée
                </h2>
                <span className="text-sm font-medium" style={{ color: GOLD_PRIMARY }}>{Math.round(routeProgress)}% terminé</span>
              </div>
              <div className="w-full rounded-full h-3 mb-4" style={{ background: '#E8E0CC' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${routeProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-3 rounded-full relative"
                  style={{ background: `linear-gradient(90deg, ${GOLD_PRIMARY}, ${GOLD_DARK})` }}>
                  <div className="absolute right-0 top-0 h-3 w-3 bg-white rounded-full border-2 transform translate-x-1"
                    style={{ borderColor: GOLD_PRIMARY }} />
                </motion.div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: GOLD_DARK }}>{routeInfo.totalStops}</div>
                  <div className="text-sm"           style={{ color: GOLD_PRIMARY }}>Arrêts total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: GOLD_DARK }}>{routeInfo.totalDistance} km</div>
                  <div className="text-sm"           style={{ color: GOLD_PRIMARY }}>Distance</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: GOLD_DARK }}>{routeInfo.estimatedTime}</div>
                  <div className="text-sm"           style={{ color: GOLD_PRIMARY }}>Temps estimé</div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Carte */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 rounded-xl shadow-sm border"
              style={{ background: '#fff', borderColor: '#E8E0CC' }}>
              <div className="p-6 border-b" style={{ borderColor: '#E8E0CC' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold flex items-center" style={{ color: GOLD_DARK }}>
                    <MapPin className="w-5 h-5 mr-2" style={{ color: GOLD_PRIMARY }} />
                    Carte interactive
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button onClick={startNavigation}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all"
                      style={{ background: GOLD_PRIMARY, color: '#fff' }}>
                      <Navigation className="w-4 h-4" /><span>Navigation</span>
                    </button>
                    <button onClick={() => setLiveTracking(!liveTracking)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:scale-105 transition-all"
                      style={liveTracking ? { background: RED_ALERT, color: '#fff' } : { background: GOLD_PRIMARY, color: '#fff' }}>
                      {liveTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{liveTracking ? 'Arrêter' : 'Tracker'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <InteractiveMap
                  deliveries={deliveries}
                  selectedDelivery={selectedDelivery}
                  setSelectedDelivery={setSelectedDelivery}
                />
              </div>
            </motion.div>

            {/* Liste livraisons */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-xl shadow-sm border"
              style={{ background: '#fff', borderColor: '#E8E0CC' }}>
              <div className="p-6 border-b" style={{ borderColor: '#E8E0CC' }}>
                <h2 className="text-xl font-bold flex items-center" style={{ color: GOLD_DARK }}>
                  <Package className="w-5 h-5 mr-2" style={{ color: GOLD_PRIMARY }} />
                  Livraisons ({deliveries.length})
                </h2>
              </div>

              <div className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: '#E8E0CC' }}>
                <AnimatePresence>
                  {deliveries.map((delivery, index) => (
                    <motion.div key={delivery.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }} transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-gray-50 transition-all border-l-4"
                      style={{ borderLeftColor:
                        delivery.priority === 'high'   ? RED_ALERT   :
                        delivery.priority === 'medium' ? GOLD_PRIMARY : '#10b981'
                      }}
                    >
                      {/* En-tête livraison */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold" style={{ color: GOLD_DARK }}>{delivery.orderNumber}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${getStatusColor(delivery.status)}`}>
                              {getStatusIcon(delivery.status)}
                              {getStatusLabel(delivery.status)}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: GOLD_BG, color: GOLD_DARK }}>
                              #{index + 1}
                            </span>
                          </div>

                          <p className="font-medium flex items-center" style={{ color: GOLD_DARK }}>
                            <Users className="w-4 h-4 mr-1" style={{ color: GOLD_PRIMARY }} />
                            {delivery.customerName}
                          </p>

                          <div className="flex items-center space-x-2 mt-1 text-sm" style={{ color: GOLD_PRIMARY }}>
                            <MapPin className="w-4 h-4" />
                            <span>{delivery.address}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: GOLD_PRIMARY }}>
                            <div className="flex items-center space-x-1">
                              <Clock   className="w-4 h-4" />
                              <span>{delivery.estimatedTime || '—'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Package className="w-4 h-4" />
                              <span>{delivery.items} articles</span>
                            </div>
                          </div>

                          {delivery.phone && (
                            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: GOLD_PRIMARY }}>
                              <Phone className="w-3 h-3" />
                              <span>{delivery.phone}</span>
                            </div>
                          )}

                          {delivery.notes && (
                            <div className="flex items-start space-x-2 mt-2 text-sm p-2 rounded"
                              style={{ background: GOLD_BG, color: GOLD_DARK }}>
                              <MessageSquare className="w-4 h-4 mt-0.5" />
                              <span>{delivery.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Boutons actions */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">

                        {delivery.phone && delivery.phone.trim() !== '' ? (
                          <button
                            onClick={() => handleCall(delivery.phone)}
                            className="flex items-center space-x-1 px-3 py-2 border rounded-lg hover:scale-105 transition-all"
                            style={{ borderColor: '#E8E0CC', color: GOLD_PRIMARY }}
                            title={`Appeler ${delivery.phone}`}
                          >
                            <Phone className="w-4 h-4" />
                            <span className="hidden sm:inline">Appeler</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center space-x-1 px-3 py-2 border rounded-lg opacity-40 cursor-not-allowed"
                            style={{ borderColor: '#E8E0CC', color: '#aaa' }}
                            title="Numéro non disponible"
                          >
                            <Phone className="w-4 h-4" />
                            <span className="hidden sm:inline">Appeler</span>
                          </button>
                        )}

                        {delivery.status === 'pending' && (
                          <button
                            onClick={() => handleStartDelivery(delivery.id)}
                            className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:scale-105 shadow-sm hover:shadow-md transition-all"
                            style={{ background: GOLD_PRIMARY, color: '#fff' }}
                          >
                            <Play className="w-4 h-4" />
                            <span>Démarrer</span>
                          </button>
                        )}

                        {delivery.status === 'in-progress' && (
                          <button
                            onClick={() => handleMarkDelivered(delivery.id)}
                            className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:scale-105 shadow-sm hover:shadow-md transition-all"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Livrée</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {deliveries.length === 0 && (
                  <div className="p-8 text-center" style={{ color: GOLD_PRIMARY }}>
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Aucune livraison aujourd'hui</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Modal confirmation livraison */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="p-6 rounded-xl shadow-lg w-full max-w-md"
                style={{ background: '#fff', borderTop: `3px solid ${GOLD_PRIMARY}` }}
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              >
                <h2 className="text-lg font-bold mb-4" style={{ color: GOLD_DARK }}>Confirmer la livraison</h2>

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1" style={{ color: GOLD_PRIMARY }}>
                    Satisfaction réelle (0-100)
                  </label>
                  <input type="number" min="0" max="100"
                    className="mt-1 w-full border rounded-lg p-2 focus:outline-none focus:ring-2"
                    style={{ borderColor: '#E8E0CC', background: GOLD_BG }}
                    value={formData.satisfaction}
                    onChange={(e) => setFormData({ ...formData, satisfaction: e.target.value })}
                    placeholder="Note de 0 à 100"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" style={{ color: GOLD_PRIMARY }}>
                    Coût réel (DH)
                  </label>
                  <input type="number" step="0.01"
                    className="mt-1 w-full border rounded-lg p-2 focus:outline-none focus:ring-2"
                    style={{ borderColor: '#E8E0CC', background: GOLD_BG }}
                    value={formData.cout}
                    onChange={(e) => setFormData({ ...formData, cout: e.target.value })}
                    placeholder="Coût réel en DH"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => { setShowModal(false); setFormData({ satisfaction: "", cout: "" }); setCurrentDeliveryId(null); }}
                    className="px-4 py-2 rounded-lg"
                    style={{ background: '#E8E0CC', color: GOLD_PRIMARY }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={submitDeliveryForm}
                    disabled={!formData.satisfaction || !formData.cout}
                    className="px-4 py-2 rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#10b981', color: '#fff' }}
                  >
                    Confirmer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
};

export default RouteMap;