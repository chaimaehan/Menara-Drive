import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Truck, Calendar as CalendarIcon, RefreshCcw, Check, AlertCircle, 
  TrendingUp, MapPin, Layers, Users, Loader2, Clock, DollarSign,
  Target, Fuel, Leaf, Award, Route, Package, AlertTriangle,
  BarChart3, PieChart, Activity, Settings, Info, Star, Zap
} from 'lucide-react';
import Navbar from '../components/Navbar';

// Couleurs - Palette #AA9766
const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_LIGHT = '#D4C8A8';
const GOLD_BG = '#F8F5EB';

const DeliveryPlanning = ({ onLogout }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawData, setRawData] = useState(null);
  const [activeTab, setActiveTab] = useState('planning');

  const fetchPlanification = async () => {
    setLoading(true);
    setPlanData(null);
    setPlanGenerated(false);
    setMessage(null);
    setRawData(null);
    console.log('Date envoyée au backend:', selectedDate.toISOString().split('T')[0]);

    try {
      const response = await axios.get(
        'http://localhost/OptiTruck/backend/controllers/delivery_plan/delivery_plan.php',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { date: selectedDate.toISOString().split('T')[0] }
        }
      );

      setRawData(response.data);
      console.log('Réponse API:', response.data);

      // Vérifier que la réponse correspond à la date sélectionnée
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      // Adaptation à votre format de réponse
      if (response.data.success && response.data.data?.tournees) {
  const hasDataForDate = response.data.data.tournees.length > 0;

  if (hasDataForDate) {
    setPlanData(response.data.data);
    setPlanGenerated(true);
    setMessage(response.data.message || 'Planification générée avec succès !');
  } else {
    setPlanData(null);
    setPlanGenerated(false);
    setMessage(`Aucune commande à planifier pour la date du ${selectedDateStr}`);
  }
} else {
  setPlanData(null);
  setPlanGenerated(false);
  setMessage(response.data.message || `Aucune planification disponible pour la date du ${selectedDateStr}`);
}


    } catch (error) {
      console.error('Erreur planification:', error);
      setMessage('Erreur lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  const confirmPlan = async () => {
  if (!planGenerated || !planData) {
    setMessage("Aucun plan généré à sauvegarder.");
    return;
  }
  
  setSaving(true);
  try {
    // Envoyer les données dans le format que votre PHP attend
    const payload = {
      date: selectedDate.toISOString().split('T')[0],
      data: {
        tournees: planData.tournees || [], // Garder la structure originale des tournées
        metriques: planData.metriques || {},
        statistiques: planData.statistiques || {}
      },
      version_algorithme: "5.0",
      timestamp_generation: planData.timestamp || rawData.timestamp
    };

    console.log('Payload envoyé:', payload); // Pour debug

    const res = await axios.post(
      'http://localhost/OptiTruck/backend/controllers/delivery_plan/save_delivery_plan.php',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setMessage(res.data.success ? '✅ Plan confirmé et enregistré !' : res.data.message);

  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    setMessage('Erreur lors de la sauvegarde des données.');
  } finally {
    setSaving(false);
  }
};

  const getRecommendationColor = (type) => {
    switch(type) {
      case 'error': return 'border-red-500 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'success': return 'border-green-500 bg-green-50 text-green-800';
      case 'info': return 'border-blue-500 bg-blue-50 text-blue-800';
      default: return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const formatCurrency = (amount) => `${amount?.toFixed(2)} DH`;
  const formatDistance = (distance) => `${distance?.toFixed(2)} km`;
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  // Accès aux données selon votre structure API
  const tournees = planData?.tournees || [];
  const metriques = planData?.metriques || {};
  const statistiques = planData?.statistiques || {};
  const recommandations = planData?.recommandations || [];

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="min-h-screen" style={{ background: GOLD_BG }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: GOLD_PRIMARY }}>
              <Truck size={32} /> Planification Intelligente
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 font-semibold" style={{ color: '#5e4b2a' }}>
                <CalendarIcon size={20} />
                <span>Date :</span>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(new Date(e.target.value))}
                  className="border rounded px-3 py-2 focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E8E0CC', focusRing: GOLD_PRIMARY }}
                />
              </label>
              <button 
                onClick={fetchPlanification} 
                disabled={loading || saving}
                className="flex items-center gap-2 text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition-all hover:shadow-md"
                style={{ background: GOLD_PRIMARY }}
              >
                {loading ? <><Loader2 className="animate-spin" size={20} /> Génération...</> :
                  <>Générer le plan <RefreshCcw size={18} /></>}
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded flex items-center gap-3 ${
              message.startsWith('✅') ? 'bg-green-100 text-green-700' : 
              message.includes('Erreur') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              <AlertCircle size={22} />
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Navigation Tabs */}
          {planGenerated && (
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex space-x-8">
                {[
                  { id: 'planning', label: 'Tournées', icon: Route },
                  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
                  { id: 'vehicles', label: 'Véhicules', icon: Truck },
                  { id: 'recommendations', label: 'Recommandations', icon: Target }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id 
                        ? 'border-[#AA9766] text-[#AA9766]' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Confirm Button */}
          {planGenerated && (
            <div className="mb-8">
              <button 
                onClick={confirmPlan} 
                disabled={saving}
                className="flex items-center gap-2 text-white px-6 py-3 rounded font-medium disabled:opacity-50 transition-all hover:shadow-md"
                style={{ background: '#2c7a4d' }}
              >
                {saving ? <><Loader2 className="animate-spin" size={20} /> Enregistrement...</> :
                  <>Confirmer le plan <Check size={20} /></>}
              </button>
            </div>
          )}

          {/* Planification Info */}
          {planGenerated && rawData && (
            <div className="mb-8 p-4 rounded border" style={{ background: GOLD_BG, borderColor: '#D4C8A8' }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: GOLD_PRIMARY }}>
                <Info size={20} />
                Informations de planification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2" style={{ color: '#5e4b2a' }}>
                  <CalendarIcon size={16} />
                  <span><strong>Date sélectionnée :</strong> {selectedDate.toISOString().split('T')[0]}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: '#5e4b2a' }}>
                  <Clock size={16} />
                  <span><strong>Timestamp :</strong> {rawData.timestamp}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: '#5e4b2a' }}>
                  <Zap size={16} />
                  <span><strong>Mode :</strong> {rawData.mode_utilise}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: '#5e4b2a' }}>
                  <Check size={16} />
                  <span><strong>Complète :</strong> {rawData.planification_complete ? 'Oui' : 'Non'}</span>
                </div>
              </div>
              {planData.temps_execution && (
                <div className="mt-2 text-sm" style={{ color: GOLD_PRIMARY }}>
                  <strong>Temps d'exécution :</strong> {planData.temps_execution}s
                </div>
              )}
            </div>
          )}

          {/* Onglet Planning - Tournées */}
          {activeTab === 'planning' && planGenerated && tournees.length > 0 && (
            <div className="space-y-6">
              {tournees.map((tournee, index) => (
                <div key={tournee.vehicule_id || index} className="bg-white border rounded-lg p-6 shadow-sm" style={{ borderColor: '#E8E0CC' }}>
                  {/* En-tête de la tournée */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Truck size={24} style={{ color: GOLD_PRIMARY }} />
                      <div>
                        <h3 className="font-semibold text-lg" style={{ color: '#2c2b26' }}>Véhicule #{tournee.vehicule_id}</h3>
                        <p className="text-gray-600">{tournee.chauffeur_nom}</p>
                        <p className="text-sm" style={{ color: '#AA9766' }}>{tournee.heure_depart} → {tournee.heure_retour_prevue}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">Capacité: {(tournee.taux_utilisation_capacite * 100).toFixed(0)}%</p>
                      <p className="text-gray-600">Satisfaction: {tournee.satisfaction_moyenne}%</p>
                    </div>
                  </div>

                  {/* Métriques de la tournée */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded" style={{ background: GOLD_BG }}>
                    <div className="text-center">
                      <p className="text-sm" style={{ color: '#AA9766' }}>Distance totale</p>
                      <p className="font-bold text-lg" style={{ color: GOLD_PRIMARY }}>{formatDistance(tournee.distance_totale)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm" style={{ color: '#AA9766' }}>Temps total</p>
                      <p className="font-bold text-lg" style={{ color: GOLD_PRIMARY }}>{formatTime(tournee.temps_total)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm" style={{ color: '#AA9766' }}>Coût estimé</p>
                      <p className="font-bold text-lg" style={{ color: GOLD_PRIMARY }}>{formatCurrency(tournee.cout_estime)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm" style={{ color: '#AA9766' }}>Stocks visités</p>
                      <p className="font-bold text-lg" style={{ color: GOLD_PRIMARY }}>{tournee.nb_stocks_visites}</p>
                    </div>
                  </div>

                  {/* Timeline des étapes */}
                  <div className="space-y-3">
                    <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2c2b26' }}>
                      <Route size={18} />
                      Planning détaillé ({tournee.etapes?.length} étapes)
                    </h4>
                    {tournee.etapes?.map((etape, i) => (
                      <div key={i} className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${
                        etape.type === 'chargement' ? 'border-blue-500 bg-blue-50' :
                        etape.type === 'collecte_stock' ? 'border-orange-500 bg-orange-50' :
                        etape.type === 'livraison' ? 'border-green-500 bg-green-50' :
                        'border-gray-500 bg-gray-50'
                      }`}>
                        <div className="flex-shrink-0 w-20 text-center">
                          <p className="text-sm font-medium text-gray-800">{etape.heure_arrivee}</p>
                          {etape.heure_depart && (
                            <p className="text-xs text-gray-500">→ {etape.heure_depart}</p>
                          )}
                          {etape.duree && (
                            <p className="text-xs text-gray-500">({etape.duree}min)</p>
                          )}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          {/* Chargement initial */}
                          {etape.type === 'chargement' && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Package size={16} className="text-blue-600" />
                                <span className="font-medium text-blue-800">Chargement - {etape.lieu}</span>
                              </div>
                              <p className="text-sm text-gray-700">{etape.description}</p>
                            </div>
                          )}

                          {/* Collecte de stock */}
                          {etape.type === 'collecte_stock' && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Layers size={16} className="text-orange-600" />
                                <span className="font-medium text-orange-800">Collecte - {etape.lieu}</span>
                                <span className="text-sm text-gray-600">({etape.adresse})</span>
                              </div>
                              <div className="text-sm text-gray-700 space-y-1">
                                <p><strong>Produits:</strong> {etape.produits_collectes?.join(', ')}</p>
                                <p><strong>Commandes:</strong> {etape.nb_commandes}</p>
                                {etape.distance_depuis_precedent > 0 && (
                                  <p><strong>Distance:</strong> {formatDistance(etape.distance_depuis_precedent)}</p>
                                )}
                                {etape.instructions_speciales?.length > 0 && (
                                  <p><strong>Instructions:</strong> {etape.instructions_speciales.join(', ')}</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Livraison */}
                          {etape.type === 'livraison' && (
                            <div>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <MapPin size={16} className="text-green-600" />
                                <span className="font-medium text-green-800">Livraison - {etape.client_nom}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  etape.priorite === 'élevée' ? 'bg-red-100 text-red-800' :
                                  etape.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {etape.priorite}
                                </span>
                                {etape.satisfaction_prevue && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Satisfaction: {etape.satisfaction_prevue}%
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-700 space-y-1">
                                <p><strong>Produit:</strong> {etape.produit} × {etape.quantite}</p>
                                <p><strong>Adresse:</strong> {etape.adresse}</p>
                                {etape.telephone && <p><strong>Tél:</strong> {etape.telephone}</p>}
                                <p><strong>Commande:</strong> #{etape.commande_id} | <strong>Client:</strong> #{etape.client}</p>
                                {etape.distance_depuis_precedent > 0 && (
                                  <p><strong>Distance:</strong> {formatDistance(etape.distance_depuis_precedent)} | <strong>Trajet:</strong> {etape.temps_trajet}min</p>
                                )}
                                {etape.instructions_speciales?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="font-medium text-gray-600">Instructions spéciales:</p>
                                    <ul className="list-disc list-inside text-xs text-gray-600 ml-2">
                                      {etape.instructions_speciales.map((instruction, idx) => (
                                        <li key={idx}>{instruction}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Retour */}
                          {etape.type === 'retour' && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Truck size={16} className="text-gray-600" />
                                <span className="font-medium text-gray-800">Retour - {etape.lieu}</span>
                              </div>
                              <div className="text-sm text-gray-700">
                                <p>{etape.description}</p>
                                {etape.distance_depuis_precedent > 0 && (
                                  <p>Distance: {formatDistance(etape.distance_depuis_precedent)} | Temps: {etape.temps_trajet}min</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Onglet Statistiques */}
          {activeTab === 'stats' && planGenerated && metriques && (
            <div className="space-y-6">
              {/* Métriques principales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border" style={{ background: '#EBF5FF', borderColor: '#BFDBFE' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Commandes</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{metriques.nb_commandes_total}</p>
                  <p className="text-sm text-blue-700">Planifiées: {metriques.nb_commandes_planifiees}</p>
                </div>
                
                <div className="p-4 rounded-lg border" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={20} className="text-green-600" />
                    <h3 className="font-semibold text-green-800">Coût total</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(metriques.cout_total)}</p>
                </div>

                <div className="p-4 rounded-lg border" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Route size={20} className="text-purple-600" />
                    <h3 className="font-semibold text-purple-800">Distance</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatDistance(metriques.distance_totale)}</p>
                </div>

                <div className="p-4 rounded-lg border" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={20} className="text-orange-600" />
                    <h3 className="font-semibold text-orange-800">Temps</h3>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{formatTime(metriques.temps_total)}</p>
                </div>
              </div>

              {/* Métriques détaillées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8E0CC' }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2b26' }}>Ressources utilisées</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span style={{ color: '#5e4b2a' }}>Véhicules utilisés:</span>
                      <span className="font-bold" style={{ color: GOLD_PRIMARY }}>{metriques.nb_vehicules_utilises}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#5e4b2a' }}>Véhicules virtuels:</span>
                      <span className="font-bold" style={{ color: GOLD_PRIMARY }}>{metriques.nb_vehicules_virtuels}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#5e4b2a' }}>Efficacité ressources:</span>
                      <span className="font-bold" style={{ color: GOLD_PRIMARY }}>{metriques.efficacite_ressources}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8E0CC' }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2b26' }}>Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span style={{ color: '#5e4b2a' }}>Taux planification:</span>
                      <span className="font-bold text-green-600">{metriques.taux_planification}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#5e4b2a' }}>Satisfaction prévue:</span>
                      <span className="font-bold" style={{ color: GOLD_PRIMARY }}>{metriques.satisfaction_prevue}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#5e4b2a' }}>Mode urgence:</span>
                      <span className={`font-bold ${metriques.mode_urgence ? 'text-red-600' : 'text-green-600'}`}>
                        {metriques.mode_urgence ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistiques complémentaires si disponibles */}
              {statistiques && Object.keys(statistiques).length > 0 && (
                <div className="p-6 rounded-lg border" style={{ background: GOLD_BG, borderColor: '#D4C8A8' }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2b26' }}>Statistiques détaillées</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Commandes traitées</p>
                      <p className="text-xl font-bold" style={{ color: GOLD_PRIMARY }}>{statistiques.commandes_traitees || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Commandes rejetées</p>
                      <p className="text-xl font-bold" style={{ color: GOLD_PRIMARY }}>{statistiques.commandes_rejetees || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Taux de réussite</p>
                      <p className="text-xl font-bold" style={{ color: GOLD_PRIMARY }}>{(statistiques.taux_reussite * 100) || 0}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Solutions trouvées</p>
                      <p className="text-xl font-bold" style={{ color: GOLD_PRIMARY }}>{statistiques.solutions_trouvees || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onglet Véhicules */}
          {activeTab === 'vehicles' && planGenerated && tournees.length > 0 && (
            <div className="grid gap-4">
              {tournees.map((tournee, index) => (
                <div key={tournee.vehicule_id || index} className="bg-white border p-4 rounded-lg" style={{ borderColor: '#E8E0CC' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck size={20} style={{ color: GOLD_PRIMARY }} />
                      <h4 className="font-semibold text-lg" style={{ color: '#2c2b26' }}>Véhicule #{tournee.vehicule_id}</h4>
                      <span className="text-sm text-gray-600">- {tournee.chauffeur_nom}</span>
                    </div>
                    <div className={`px-3 py-1 rounded text-sm font-medium ${
                      tournee.taux_utilisation_capacite >= 0.8 ? 'bg-green-100 text-green-800' :
                      tournee.taux_utilisation_capacite >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(tournee.taux_utilisation_capacite * 100).toFixed(0)}% utilisé
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Distance</p>
                      <p className="font-semibold" style={{ color: GOLD_PRIMARY }}>{formatDistance(tournee.distance_totale)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Coût</p>
                      <p className="font-semibold" style={{ color: GOLD_PRIMARY }}>{formatCurrency(tournee.cout_estime)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Temps</p>
                      <p className="font-semibold" style={{ color: GOLD_PRIMARY }}>{formatTime(tournee.temps_total)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Satisfaction</p>
                      <p className="font-semibold" style={{ color: GOLD_PRIMARY }}>{tournee.satisfaction_moyenne}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Livraisons</p>
                      <p className="font-semibold">{tournee.livraisons?.length || 0}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t text-xs text-gray-600" style={{ borderColor: '#E8E0CC' }}>
                    <p>Horaires: {tournee.heure_depart} → {tournee.heure_retour_prevue}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Onglet Recommandations */}
          {activeTab === 'recommendations' && planGenerated && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#2c2b26' }}>
                <Target size={20} style={{ color: GOLD_PRIMARY }} />
                Recommandations d'optimisation
              </h3>
              
              {recommandations.length > 0 ? (
                <div className="space-y-4">
                  {recommandations.map((rec, i) => (
                    <div key={i} className={`p-4 rounded-lg border-l-4 ${getRecommendationColor(rec.type)}`}>
                      <div className="flex items-start gap-3">
                        {rec.type === 'success' ? <Check size={20} className="text-green-600 mt-0.5" /> :
                         rec.type === 'warning' ? <AlertTriangle size={20} className="text-yellow-600 mt-0.5" /> :
                         rec.type === 'error' ? <AlertCircle size={20} className="text-red-600 mt-0.5" /> :
                         <Info size={20} className="text-blue-600 mt-0.5" />}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                              rec.type === 'success' ? 'bg-green-100 text-green-800' :
                              rec.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              rec.type === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {rec.type}
                            </span>
                            <span className="font-semibold">{rec.titre}</span>
                          </div>
                          <p className="text-gray-800 mb-3">{rec.message}</p>
                          
                          {rec.actions && rec.actions.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-700 mb-2">Actions recommandées:</p>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {rec.actions.map((action, idx) => (
                                  <li key={idx}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Info size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Aucune recommandation disponible pour cette planification.</p>
                </div>
              )}
            </div>
          )}

          {/* État vide */}
          {!planGenerated && !loading && (
            <div className="text-center text-gray-400 mt-20">
              <Truck size={64} className="mx-auto mb-4 opacity-40" style={{ color: '#D4C8A8' }} />
              <p className="text-lg font-medium">Aucun plan généré pour cette date.</p>
              <p className="text-gray-500">Sélectionnez une date et cliquez sur <strong>Générer le plan</strong> pour commencer.</p>
            </div>
          )}

         
        </div>
        </div>
      </div>
    </>
  );
};

export default DeliveryPlanning;