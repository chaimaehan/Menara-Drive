import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Truck, Bell, Clock, Zap, AlertTriangle, CheckCircle, Navigation, History, Shield } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import Navbar from '../components/Navbar';

const GOLD = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_BG = '#F8F5EB';
const API = 'http://localhost/OptiTruck/backend/controllers/gps/gps.php';

// Icône camion personnalisée
const camionIcon = (statut) => L.divIcon({
  className: '',
  html: `<div style="background:${statut === 'en_route' ? '#AA9766' : statut === 'arrete' ? '#ef4444' : '#16a34a'};
    width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🚛</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const GPSTracking = ({ user, onLogout }) => {
  const [camions, setCamions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [geofences, setGeofences] = useState([
    { id: 1, nom: 'Zone Marrakech', lat: 31.6295, lng: -7.9811, rayon: 5000 },
    { id: 2, nom: 'Zone Casablanca', lat: 33.5731, lng: -7.5898, rayon: 8000 },
  ]);
  const [vue, setVue] = useState('carte'); // carte | historique | alertes
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await axios.get(API);
      if (res.data.success) setCamions(res.data.data);
    } catch (err) {
      console.error('Erreur GPS:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistorique = async (camion_id) => {
    try {
      const res = await axios.get(`${API}?historique=1&camion_id=${camion_id}`);
      if (res.data.success) setHistorique(res.data.data);
    } catch (err) {}
  };

  const fetchAlertes = async () => {
    try {
      const res = await axios.get(`${API}?alertes=1`);
      if (res.data.success) setAlertes(res.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchPositions();
    fetchAlertes();
    intervalRef.current = setInterval(() => {
      fetchPositions();
      fetchAlertes();
    }, 5000); // Refresh toutes les 5 secondes
    return () => clearInterval(intervalRef.current);
  }, [fetchPositions]);

  const handleSelect = (camion) => {
    setSelected(camion);
    fetchHistorique(camion.camion_id);
  };

  const statColor = (s) => s === 'en_route' ? '#AA9766' : s === 'arrete' ? '#ef4444' : '#16a34a';
  const statLabel = (s) => s === 'en_route' ? 'En route' : s === 'arrete' ? 'Arrêté' : 'Livré';

  const center = camions.length > 0 
    ? [parseFloat(camions[0].latitude), parseFloat(camions[0].longitude)]
    : [31.6295, -7.9811];

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div style={{ background: GOLD_BG, minHeight: '100vh', padding: '1.5rem' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 4, height: 40, background: GOLD, borderRadius: 2 }} />
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: GOLD_DARK }}>🛰️ Tracking GPS</h1>
                <p style={{ fontSize: 13, color: GOLD }}>Suivi en temps réel des camions</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'carte', label: '🗺️ Carte', icon: MapPin },
                { key: 'historique', label: '📍 Historique', icon: History },
                { key: 'alertes', label: `🔔 Alertes ${alertes.length > 0 ? `(${alertes.length})` : ''}`, icon: Bell },
              ].map(tab => (
                <button key={tab.key} onClick={() => setVue(tab.key)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13,
                    background: vue === tab.key ? GOLD : '#fff',
                    color: vue === tab.key ? '#fff' : GOLD_DARK,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Camions actifs', value: camions.filter(c => c.statut === 'en_route').length, color: GOLD, icon: '🚛' },
              { label: 'Arrêtés', value: camions.filter(c => c.statut === 'arrete').length, color: '#ef4444', icon: '⛔' },
              { label: 'Alertes actives', value: alertes.length, color: '#f59e0b', icon: '🔔' },
              { label: 'Zones surveillées', value: geofences.length, color: '#3b82f6', icon: '📍' },
            ].map((stat, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 24 }}>{stat.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>

            {/* Liste camions */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', maxHeight: 600, overflowY: 'auto' }}>
              <h3 style={{ color: GOLD_DARK, fontWeight: 700, marginBottom: 12, fontSize: 15 }}>🚛 Flotte ({camions.length})</h3>
              {loading ? (
                <p style={{ color: '#aaa', fontSize: 13 }}>Chargement...</p>
              ) : camions.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucune position disponible</p>
              ) : (
                camions.map(c => (
                  <div key={c.id} onClick={() => handleSelect(c)}
                    style={{
                      padding: 12, borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                      background: selected?.id === c.id ? GOLD_BG : '#fafafa',
                      border: `1.5px solid ${selected?.id === c.id ? GOLD : '#E8E0CC'}`,
                      transition: 'all 0.2s'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#2c2b26', fontSize: 14 }}>🚛 {c.camion_code}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: statColor(c.statut) + '20', color: statColor(c.statut)
                      }}>{statLabel(c.statut)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>👤 {c.chauffeur_nom || 'Non assigné'}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      📍 {parseFloat(c.latitude).toFixed(4)}, {parseFloat(c.longitude).toFixed(4)}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      🕐 {new Date(c.timestamp).toLocaleTimeString('fr-FR')}
                    </div>
                    {c.vitesse > 0 && (
                      <div style={{ fontSize: 12, color: GOLD, marginTop: 4, fontWeight: 600 }}>
                        ⚡ {parseFloat(c.vitesse).toFixed(0)} km/h
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Contenu principal */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', minHeight: 600 }}>

              {/* Vue Carte */}
              {vue === 'carte' && (
                <MapContainer center={center} zoom={10} style={{ height: 600, width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {/* Zones géofencing */}
                  {geofences.map(zone => (
                    <Circle key={zone.id}
                      center={[zone.lat, zone.lng]}
                      radius={zone.rayon}
                      color="#3b82f6"
                      fillColor="#3b82f6"
                      fillOpacity={0.1}
                      weight={2}
                      dashArray="5,5"
                    >
                      <Popup><b>📍 {zone.nom}</b><br/>Rayon: {zone.rayon}m</Popup>
                    </Circle>
                  ))}

                  {/* Marqueurs camions */}
                  {camions.map(c => (
                    <Marker key={c.id}
                      position={[parseFloat(c.latitude), parseFloat(c.longitude)]}
                      icon={camionIcon(c.statut)}
                      eventHandlers={{ click: () => handleSelect(c) }}
                    >
                      <Popup>
                        <div style={{ minWidth: 160 }}>
                          <b>🚛 {c.camion_code}</b><br/>
                          👤 {c.chauffeur_nom || 'Non assigné'}<br/>
                          ⚡ {parseFloat(c.vitesse || 0).toFixed(0)} km/h<br/>
                          🕐 {new Date(c.timestamp).toLocaleTimeString('fr-FR')}<br/>
                          <span style={{ color: statColor(c.statut), fontWeight: 600 }}>{statLabel(c.statut)}</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Tracé historique */}
                  {selected && historique.length > 1 && (
                    <Polyline
                      positions={historique.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)])}
                      color={GOLD}
                      weight={3}
                      dashArray="8,4"
                    />
                  )}
                </MapContainer>
              )}

              {/* Vue Historique */}
              {vue === 'historique' && (
                <div style={{ padding: 20 }}>
                  <h3 style={{ color: GOLD_DARK, fontWeight: 700, marginBottom: 16 }}>📍 Historique des trajets</h3>
                  {!selected ? (
                    <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Sélectionnez un camion dans la liste</p>
                  ) : historique.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Aucun historique disponible</p>
                  ) : (
                    <>
                      <p style={{ color: GOLD, marginBottom: 16, fontWeight: 600 }}>
                        🚛 {selected.camion_code} — {historique.length} positions (24h)
                      </p>
                      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                        {historique.slice().reverse().map((h, i) => (
                          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ width: 32, height: 32, background: GOLD + '20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 14 }}>📍</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: '#2c2b26', fontWeight: 600 }}>
                                {parseFloat(h.latitude).toFixed(5)}, {parseFloat(h.longitude).toFixed(5)}
                              </div>
                              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                                🕐 {new Date(h.timestamp).toLocaleString('fr-FR')}
                                {h.vitesse > 0 && <span> · ⚡ {parseFloat(h.vitesse).toFixed(0)} km/h</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: statColor(h.statut), fontWeight: 600 }}>{statLabel(h.statut)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Vue Alertes */}
              {vue === 'alertes' && (
                <div style={{ padding: 20 }}>
                  <h3 style={{ color: GOLD_DARK, fontWeight: 700, marginBottom: 16 }}>🔔 Alertes Géofencing</h3>
                  {alertes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                      <p style={{ color: '#16a34a', fontWeight: 600 }}>Aucune alerte active</p>
                    </div>
                  ) : (
                    alertes.map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 12, padding: 14, borderRadius: 12, marginBottom: 10,
                        background: a.type === 'entree' ? '#f0fdf4' : '#fff5f5',
                        border: `1px solid ${a.type === 'entree' ? '#86efac' : '#fecaca'}`
                      }}>
                        <span style={{ fontSize: 24 }}>{a.type === 'entree' ? '🟢' : '🔴'}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#2c2b26', fontSize: 14 }}>
                            {a.type === 'entree' ? 'Entrée' : 'Sortie'} — {a.geofence_nom}
                          </div>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            🚛 {a.camion_code} · 🕐 {new Date(a.timestamp).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GPSTracking;