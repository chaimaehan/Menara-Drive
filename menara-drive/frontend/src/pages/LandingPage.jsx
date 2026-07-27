import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, BarChart3, MapPin, Clock, Users, Shield, ArrowRight, CheckCircle,
  Star, Building2, Factory, Award, Globe, ChevronDown, BookOpen, X,
  LogIn, Package, ClipboardList, Calendar, ChevronRight, Eye, PlusCircle,
  Pencil, Trash2, RefreshCcw, CheckSquare, AlertCircle, Info, PlayCircle,
  Layers, LayoutDashboard, Gauge, QrCode, Wrench, Route
} from 'lucide-react';

/* ══════════════════════════════════════════
   GUIDE DATA
══════════════════════════════════════════ */
const guideSteps = [
  {
    id: 1,
    icon: <LogIn className="w-6 h-6" />,
    color: "from-[#AA9766]/80 to-[#AA9766]",
    accent: "#AA9766",
    title: "Connexion au système",
    subtitle: "Accéder à Menara Drive",
    tag: null,
    steps: [
      { icon: <Eye className="w-4 h-4" />, text: "Rendez-vous sur la page d'accueil et cliquez sur « Accéder au système »." },
      { icon: <LogIn className="w-4 h-4" />, text: "Entrez votre identifiant et mot de passe fournis par le service IT." },
      { icon: <Shield className="w-4 h-4" />, text: "Votre rôle (Admin / Opérateur) détermine les fonctionnalités accessibles." },
    ],
    tip: "En cas d'oubli de mot de passe, contactez le support IT interne.",
    preview: null,
  },
  {
    id: 2,
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: "from-[#378add]/80 to-[#378add]",
    accent: "#378add",
    title: "Dashboard Admin",
    subtitle: "Vue d'ensemble globale du système",
    tag: { label: "Vue Admin", color: "#378add", bg: "rgba(55,138,221,0.15)", border: "rgba(55,138,221,0.3)", icon: <Shield className="w-3 h-3" /> },
    steps: [
      { icon: <BarChart3 className="w-4 h-4" />, text: "Le dashboard affiche 4 KPIs principaux : Total chauffeurs, Total camions, Livraisons actives et Complétées aujourd'hui." },
      { icon: <Layers className="w-4 h-4" />, text: "La section « Actions Rapides » permet d'accéder directement aux modules : Chauffeurs, Camions, Commandes, Livraisons, Clients et Stocks." },
      { icon: <AlertCircle className="w-4 h-4" />, text: "Le panneau « Activités » à droite affiche en temps réel les événements du système (livraisons en cours, alertes...)." },
      { icon: <RefreshCcw className="w-4 h-4" />, text: "Cliquez sur « Actualiser » en haut à droite pour forcer la mise à jour des données." },
    ],
    tip: "Le badge rouge sur la cloche indique le nombre de notifications non lues (ex: 9+).",
    preview: "admin",
  },
  {
    id: 3,
    icon: <Gauge className="w-6 h-6" />,
    color: "from-[#4eb88a]/80 to-[#4eb88a]",
    accent: "#4eb88a",
    title: "Dashboard Chauffeur",
    subtitle: "Interface personnelle du chauffeur",
    tag: { label: "Vue Chauffeur", color: "#4eb88a", bg: "rgba(78,184,138,0.15)", border: "rgba(78,184,138,0.3)", icon: <Users className="w-3 h-3" /> },
    steps: [
      { icon: <Truck className="w-4 h-4" />, text: "Le camion assigné (ex: CAM-003, capacité 30 000 unités) est affiché en haut de page." },
      { icon: <Package className="w-4 h-4" />, text: "3 compteurs clés sont visibles : Livraisons du jour, Complétées et En attente." },
      { icon: <MapPin className="w-4 h-4" />, text: "La carte GPS affiche votre position en temps réel avec l'horodatage de la dernière mise à jour." },
      { icon: <AlertCircle className="w-4 h-4" />, text: "Le bouton « Signaler une panne » (rouge) permet de notifier immédiatement l'Admin." },
      { icon: <QrCode className="w-4 h-4" />, text: "Le bouton « Scanner QR » permet de valider une livraison en scannant le code du client." },
    ],
    tip: "Le menu chauffeur est simplifié : Dashboard, Mes Trajets et Chat uniquement.",
    preview: "chauffeur",
  },
  {
    id: 4,
    icon: <Users className="w-6 h-6" />,
    color: "from-[#AA9766]/80 to-[#AA9766]",
    accent: "#AA9766",
    title: "Gestion des chauffeurs",
    subtitle: "Module Drivers",
    tag: null,
    steps: [
      { icon: <PlusCircle className="w-4 h-4" />, text: "Cliquez sur « + Nouveau chauffeur » pour ajouter un chauffeur avec ses informations (nom, téléphone, permis)." },
      { icon: <Pencil className="w-4 h-4" />, text: "Utilisez l'icône crayon ✏️ pour modifier un profil existant." },
      { icon: <Trash2 className="w-4 h-4" />, text: "L'icône poubelle 🗑️ supprime un chauffeur. Cette action est irréversible." },
    ],
    tip: "Assurez-vous que chaque chauffeur a un statut « actif » pour apparaître dans la planification.",
    preview: null,
  },
  {
    id: 5,
    icon: <Truck className="w-6 h-6" />,
    color: "from-[#AA9766]/80 to-[#AA9766]",
    accent: "#AA9766",
    title: "Gestion des camions",
    subtitle: "Module Trucks",
    tag: null,
    steps: [
      { icon: <PlusCircle className="w-4 h-4" />, text: "Ajoutez un camion avec son code, sa capacité de charge et le chauffeur assigné." },
      { icon: <Layers className="w-4 h-4" />, text: "Les statuts disponibles sont : Disponible, En route, Maintenance." },
      { icon: <Info className="w-4 h-4" />, text: "Seuls les camions avec le statut « disponible » ou « actif » sont inclus dans la planification." },
    ],
    tip: "Mettez régulièrement à jour les statuts pour que la planification reflète la réalité terrain.",
    preview: null,
  },
  {
    id: 6,
    icon: <ClipboardList className="w-6 h-6" />,
    color: "from-[#AA9766]/80 to-[#AA9766]",
    accent: "#AA9766",
    title: "Gestion des commandes",
    subtitle: "Module Orders",
    tag: null,
    steps: [
      { icon: <PlusCircle className="w-4 h-4" />, text: "Cliquez sur « + Nouvelle commande » et renseignez : client, produit, quantité et priorité." },
      { icon: <Eye className="w-4 h-4" />, text: "Filtrez par date avec le sélecteur calendrier pour voir les commandes du jour." },
      { icon: <CheckSquare className="w-4 h-4" />, text: "Le statut « En attente » signifie que la commande n'est pas encore planifiée." },
    ],
    tip: "Définissez bien la priorité (Normale / Élevée / Urgente) pour que l'algorithme optimise correctement les tournées.",
    preview: null,
  },
  {
    id: 7,
    icon: <Calendar className="w-6 h-6" />,
    color: "from-[#AA9766]/80 to-[#AA9766]",
    accent: "#AA9766",
    title: "Planification intelligente",
    subtitle: "Module Planning",
    tag: null,
    steps: [
      { icon: <Calendar className="w-4 h-4" />, text: "Sélectionnez la date souhaitée dans le champ « Date »." },
      { icon: <PlayCircle className="w-4 h-4" />, text: "Cliquez sur « Générer le plan » — l'algorithme crée automatiquement les tournées optimisées." },
      { icon: <CheckSquare className="w-4 h-4" />, text: "Vérifiez les tournées générées, puis cliquez sur « Confirmer le plan » pour enregistrer." },
    ],
    tip: "Pour que la planification fonctionne, des commandes, camions et stocks actifs doivent exister pour la date choisie.",
    preview: null,
  },
];

/* ══════════════════════════════════════════
   ADMIN PREVIEW (inside GuideModal)
══════════════════════════════════════════ */
const AdminPreview = () => (
  <div className="rounded-2xl p-4 mb-6 border border-white/10" style={{ background: 'rgba(55,138,221,0.05)' }}>
    <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
      <LayoutDashboard className="w-3 h-3" /> Aperçu — Dashboard Admin
    </p>
    <div className="grid grid-cols-4 gap-2 mb-3">
      {[
        { label: 'Chauffeurs', val: '13', sub: 'Équipe active', badge: '+12%', badgeColor: '#4eb88a' },
        { label: 'Camions', val: '12', sub: 'Flotte disponible', badge: '+5%', badgeColor: '#4eb88a' },
        { label: 'Livraisons actives', val: '37', sub: 'En transit', badge: 'En cours', badgeColor: '#AA9766' },
        { label: 'Complétées', val: '0', sub: 'Performance', badge: '+8 vs hier', badgeColor: '#6b7a99' },
      ].map((k, i) => (
        <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider leading-tight">{k.label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: k.badgeColor + '22', color: k.badgeColor }}>{k.badge}</span>
          </div>
          <div className="text-2xl font-black text-white">{k.val}</div>
          <div className="text-xs text-gray-500">{k.sub}</div>
        </div>
      ))}
    </div>
    {['Livraison en cours — Camion ID: 1 · il y a 2h', 'Livraison en cours — Camion ID: 1 · il y a 2h'].map((t, i) => (
      <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 mb-1 text-xs text-gray-400" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#4eb88a] flex-shrink-0" />{t}
      </div>
    ))}
  </div>
);

/* ══════════════════════════════════════════
   CHAUFFEUR PREVIEW (inside GuideModal)
══════════════════════════════════════════ */
const ChauffeurPreview = () => (
  <div className="rounded-2xl p-4 mb-6 border border-white/10" style={{ background: 'rgba(78,184,138,0.04)' }}>
    <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
      <Gauge className="w-3 h-3" /> Aperçu — Tableau de bord chauffeur
    </p>
    <div className="flex items-center gap-3 rounded-xl p-3 mb-3" style={{ background: 'rgba(201,168,76,0.1)', border: '0.5px solid rgba(201,168,76,0.2)' }}>
      <Truck className="w-5 h-5 text-[#AA9766] flex-shrink-0" />
      <div>
        <div className="text-sm font-bold text-white">CAM-003</div>
        <div className="text-xs text-gray-400">Capacité: 30 000 unités</div>
      </div>
      <div className="ml-auto flex gap-2">
        <span className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(217,50,50,0.15)', color: '#e05555', border: '0.5px solid rgba(217,50,50,0.3)' }}>
          <AlertCircle className="w-3 h-3" /> Panne
        </span>
        <span className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(201,168,76,0.15)', color: '#AA9766', border: '0.5px solid rgba(201,168,76,0.3)' }}>
          <QrCode className="w-3 h-3" /> QR
        </span>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 mb-3">
      {[{ n: '29', l: 'Livraisons du jour', c: '#fff' }, { n: '5', l: 'Complétées', c: '#4eb88a' }, { n: '24', l: 'En attente', c: '#AA9766' }].map((s, i) => (
        <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="text-xl font-black" style={{ color: s.c }}>{s.n}</div>
          <div className="text-xs text-gray-500">{s.l}</div>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400" style={{ background: 'rgba(78,184,138,0.08)' }}>
      <MapPin className="w-3 h-3 text-[#4eb88a]" />
      GPS actif — Marrakech · Mis à jour 03:44:48
      <span className="ml-auto w-2 h-2 rounded-full bg-[#4eb88a]" />
    </div>
  </div>
);

/* ══════════════════════════════════════════
   GUIDE MODAL
══════════════════════════════════════════ */
const GuideModal = ({ onClose, initialStep = 0 }) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const step = guideSteps[activeStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-[#AA9766]/20 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 50%, #1a1a2e 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-[#AA9766]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Guide d'utilisation</h2>
              <p className="text-[#AA9766] text-sm">Menara Drive — Menara Préfa</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 border-r border-[#AA9766]/20 overflow-y-auto py-4 px-3">
            {/* Group: Démarrage */}
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">Démarrage</p>
            {guideSteps.slice(0, 1).map((s, i) => (
              <SidebarItem key={s.id} step={s} index={0} activeStep={activeStep} setActiveStep={setActiveStep} />
            ))}
            {/* Group: Vues principales */}
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest px-3 mt-4 mb-2">Vues principales</p>
            {guideSteps.slice(1, 3).map((s, i) => (
              <SidebarItem key={s.id} step={s} index={i + 1} activeStep={activeStep} setActiveStep={setActiveStep} />
            ))}
            {/* Group: Modules */}
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest px-3 mt-4 mb-2">Modules</p>
            {guideSteps.slice(3).map((s, i) => (
              <SidebarItem key={s.id} step={s} index={i + 3} activeStep={activeStep} setActiveStep={setActiveStep} />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div key={step.id} className="h-full flex flex-col">
              {/* Tag */}
              {step.tag && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3 w-fit"
                  style={{ background: step.tag.bg, color: step.tag.color, border: `1px solid ${step.tag.border}` }}>
                  {step.tag.icon}{step.tag.label}
                </div>
              )}

              {/* Step header */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl`}>
                  <span className="text-white scale-125">{step.icon}</span>
                </div>
                <div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border mb-1 inline-block"
                    style={{ color: step.accent, borderColor: step.accent + '40', background: step.accent + '15' }}>
                    Étape {step.id} / {guideSteps.length}
                  </span>
                  <h3 className="text-2xl font-black text-white">{step.title}</h3>
                  <p className="text-gray-400">{step.subtitle}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/10 rounded-full mb-6">
                <div className={`h-full rounded-full bg-gradient-to-r ${step.color} transition-all duration-500`}
                  style={{ width: `${((activeStep + 1) / guideSteps.length) * 100}%` }} />
              </div>

              {/* Preview */}
              {step.preview === 'admin' && <AdminPreview />}
              {step.preview === 'chauffeur' && <ChauffeurPreview />}

              {/* Steps list */}
              <div className="space-y-3 flex-1">
                {step.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: step.accent + '30', border: `1px solid ${step.accent}40`, color: step.accent }}>
                      {s.icon}
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 flex-shrink-0 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-gray-300 leading-relaxed">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <div className="mt-5 p-4 rounded-2xl flex items-start gap-3"
                style={{ background: step.accent + '15', border: `1px solid ${step.accent}30` }}>
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: step.accent }} />
                <p className="text-sm leading-relaxed" style={{ color: step.accent }}>
                  <span className="font-bold">Conseil : </span>{step.tip}
                </p>
              </div>

              {/* Nav buttons */}
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/10">
                <button
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-medium disabled:opacity-30 hover:bg-white/20 transition-colors">
                  ← Précédent
                </button>
                {activeStep < guideSteps.length - 1 ? (
                  <button
                    onClick={() => setActiveStep(activeStep + 1)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold bg-gradient-to-r ${step.color} hover:opacity-90 transition-opacity`}>
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 hover:opacity-90 transition-opacity">
                    <CheckCircle className="w-4 h-4" /> Terminer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   SIDEBAR ITEM (sub-component)
══════════════════════════════════════════ */
const SidebarItem = ({ step, index, activeStep, setActiveStep }) => (
  <button
    onClick={() => setActiveStep(index)}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all duration-200 text-left group
      ${activeStep === index
        ? 'bg-[#AA9766]/20 border border-[#AA9766]/40'
        : 'hover:bg-white/5 border border-transparent'}`}
  >
    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 text-white
      ${activeStep === index ? 'shadow-lg' : 'opacity-70 group-hover:opacity-100'}`}>
      {step.icon}
    </div>
    <div className="min-w-0">
      <p className={`text-xs font-semibold truncate ${activeStep === index ? 'text-[#AA9766]' : 'text-gray-400'}`}>{step.title}</p>
      <p className="text-xs text-gray-500 truncate">{step.subtitle}</p>
    </div>
    {activeStep === index && <ChevronRight className="w-4 h-4 text-[#AA9766] flex-shrink-0 ml-auto" />}
  </button>
);

/* ══════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════ */
const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [guideInitialStep, setGuideInitialStep] = useState(0);
  const aboutRef = useRef(null);
  const featuresRef = useRef(null);
  const navigate = useNavigate();

  const handleClick = () => navigate('/login');
  const scrollToAbout = () => aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' });

  const openGuide = (step = 0) => { setGuideInitialStep(step); setShowGuide(true); };

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: <BarChart3 className="w-8 h-8" />, title: "Tableau de Bord Unifié", description: "Centralisez la gestion des commandes, stocks et véhicules de livraison dans un seul système intégré." },
    { icon: <MapPin className="w-8 h-8" />, title: "Optimisation des Livraisons", description: "Planification intelligente des tournées pour optimiser les livraisons de produits préfabriqués." },
    { icon: <Clock className="w-8 h-8" />, title: "Suivi en Temps Réel", description: "Monitoring GPS des véhicules et notifications automatiques pour les clients et équipes." }
  ];

  const stats = [
    { number: "15+", label: "Véhicules gérés" },
    { number: "200+", label: "Livraisons/mois" },
    { number: "5", label: "Départements" },
    { number: "24/7", label: "Monitoring actif" }
  ];

  const testimonials = [
    { text: "Le nouveau système de gestion logistique a considérablement amélioré notre efficacité opérationnelle.", author: "Responsable Logistique", company: "Menara Préfa - Département Transport", rating: 5 },
    { text: "Interface intuitive qui facilite grandement le suivi des livraisons et la coordination des équipes.", author: "Chef d'équipe", company: "Menara Préfa - Production", rating: 5 },
    { text: "La planification automatique nous fait gagner un temps précieux dans l'organisation des tournées.", author: "Coordinateur Transport", company: "Menara Préfa - Livraisons", rating: 5 }
  ];

  const benefits = [
    "Optimisation des itinéraires de livraison",
    "Amélioration de la satisfaction client",
    "Réduction du temps de planification",
    "Traçabilité complète des produits",
    "Coordination efficace des équipes",
    "Rapports détaillés pour la direction"
  ];

  const aboutStats = [
    { number: "1990", label: "Année de fondation", icon: <Award className="w-6 h-6" /> },
    { number: "500+", label: "Employés", icon: <Users className="w-6 h-6" /> },
    { number: "30+", label: "Années d'expérience", icon: <Star className="w-6 h-6" /> },
    { number: "3", label: "Sites de production", icon: <Factory className="w-6 h-6" /> },
  ];

  const departments = [
    { icon: <Factory className="w-7 h-7" />, name: "Production", description: "Fabrication de produits préfabriqués en béton de haute qualité pour la construction." },
    { icon: <Truck className="w-7 h-7" />, name: "Transport & Logistique", description: "Gestion de la flotte de livraison et coordination des tournées à travers le Maroc." },
    { icon: <BarChart3 className="w-7 h-7" />, name: "Commercial", description: "Suivi des commandes clients et développement des partenariats commerciaux." },
    { icon: <Shield className="w-7 h-7" />, name: "Qualité & Contrôle", description: "Garantie des standards de qualité et conformité des produits aux normes marocaines." },
    { icon: <Globe className="w-7 h-7" />, name: "Informatique", description: "Développement et maintenance des systèmes internes dont Menara Drive." },
    { icon: <Users className="w-7 h-7" />, name: "Ressources Humaines", description: "Gestion du capital humain et développement des compétences des équipes." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-x-hidden">

      {/* Guide Modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} initialStep={guideInitialStep} />}

      {/* ── HEADER ── */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-lg bg-black/30 border-b border-[#AA9766]/30">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 rounded-xl flex items-center justify-center shadow-lg shadow-[#AA9766]/20">
              <Route className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent">Menara Drive</h1>
              <p className="text-xs text-[#AA9766]/70">Menara Préfa Internal System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={scrollToFeatures} className="hidden md:block text-gray-300 hover:text-[#AA9766] transition-colors font-medium">Fonctionnalités</button>
            <button onClick={scrollToAbout} className="hidden md:block text-gray-300 hover:text-[#AA9766] transition-colors font-medium">À propos</button>
            <button
              onClick={() => openGuide(0)}
              className="hidden md:flex items-center gap-2 text-gray-300 hover:text-[#AA9766] transition-colors font-medium border border-gray-600 hover:border-[#AA9766]/50 px-4 py-2 rounded-full">
              <BookOpen className="w-4 h-4" /> Guide
            </button>
            <button
              onClick={handleClick}
              className="bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 text-white font-semibold px-6 py-2 rounded-full hover:shadow-lg hover:shadow-[#AA9766]/25 hover:scale-105 transition-all duration-300">
              Accéder au système
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#AA9766]/10 to-[#AA9766]/5 animate-pulse"></div>
        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className={`space-y-8 transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
            <div className="inline-flex items-center space-x-2 bg-[#AA9766]/10 px-4 py-2 rounded-full border border-[#AA9766]/30">
              <Building2 className="w-4 h-4 text-[#AA9766]" />
              <span className="text-sm text-[#AA9766]">Système Interne Menara Préfa</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-tight">
              Optimisez
              <span className="block bg-gradient-to-r from-[#AA9766] via-[#AA9766]/80 to-[#AA9766]/60 bg-clip-text text-transparent">votre logistique</span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
              Système de gestion logistique développé spécialement pour
              <span className="text-[#AA9766] font-semibold"> Menara Préfa</span>,
              optimisant les livraisons de produits préfabriqués et la coordination des équipes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleClick}
                className="group bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-[#AA9766]/25 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2">
                <span>Accéder au système</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => openGuide(0)}
                className="group border-2 border-[#AA9766]/50 text-[#AA9766] font-semibold px-8 py-4 rounded-2xl backdrop-blur-sm hover:bg-[#AA9766]/10 transition-all duration-300 flex items-center justify-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Voir le guide</span>
              </button>
            </div>
            <div className="flex items-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Données sécurisées</span></div>
              <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Support IT inclus</span></div>
              <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Formation équipes</span></div>
            </div>
          </div>

          <div className={`relative transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#AA9766]/20 to-[#AA9766]/10 blur-3xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="text-center space-y-6">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#AA9766] to-[#AA9766]/80 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-[#AA9766]/20">
                    <Route className="w-16 h-16 text-white" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-3">
                      <span className="text-sm">Flotte active</span>
                      <div className="w-16 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-3">
                      <span className="text-sm">Livraisons en cours</span>
                      <div className="w-20 h-2 bg-[#AA9766] rounded-full"></div>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-3">
                      <span className="text-sm">Efficacité système</span>
                      <div className="w-24 h-2 bg-[#AA9766] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-12">
          <button onClick={scrollToAbout} className="flex flex-col items-center text-[#AA9766] hover:text-[#AA9766]/80 transition-colors animate-bounce">
            <span className="text-sm mb-1">Découvrir Menara Préfa</span>
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 bg-white/5 backdrop-blur-sm border-y border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">{stat.number}</div>
                <div className="text-gray-400 mt-2 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUIDE SECTION ── */}
      <section className="py-20 bg-gradient-to-r from-[#AA9766]/10 to-[#AA9766]/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-[#AA9766]/10 px-4 py-2 rounded-full border border-[#AA9766]/30 mb-6">
              <BookOpen className="w-4 h-4 text-[#AA9766]" />
              <span className="text-sm text-[#AA9766] font-medium">Prise en main rapide</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">
              Comment utiliser
              <span className="bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent"> Menara Drive</span> ?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {guideSteps.length} étapes simples pour maîtriser le système et optimiser vos opérations logistiques.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {guideSteps.map((step, i) => (
              <div key={step.id}
                className="group flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#AA9766]/40 transition-all duration-300 cursor-pointer"
                onClick={() => openGuide(i)}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold" style={{ color: step.accent }}>Étape {step.id}</span>
                    {step.tag && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: step.tag.bg, color: step.tag.color }}>
                        {step.tag.label}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white mb-1">{step.title}</h4>
                  <p className="text-gray-400 text-sm">{step.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => openGuide(0)}
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 text-white font-bold px-10 py-4 rounded-2xl shadow-2xl hover:shadow-[#AA9766]/25 transform hover:scale-105 transition-all duration-300">
              <BookOpen className="w-5 h-5" />
              <span>Ouvrir le guide complet</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section ref={featuresRef} id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              Fonctionnalités<span className="bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent"> clés</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">Un système complet développé pour répondre aux besoins spécifiques de Menara Préfa</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:border-[#AA9766]/50 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── À PROPOS ── */}
      <section ref={aboutRef} id="about" className="py-24 bg-gradient-to-br from-gray-800/60 to-gray-900/40 backdrop-blur-sm border-y border-white/10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-[#AA9766]/10 px-4 py-2 rounded-full border border-[#AA9766]/30 mb-6">
              <Building2 className="w-4 h-4 text-[#AA9766]" />
              <span className="text-sm text-[#AA9766] font-medium">Notre entreprise</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              À propos de<span className="bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent"> Menara Préfa</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Menara Préfa est un acteur majeur de l'industrie du béton préfabriqué au Maroc, engagé dans l'innovation et la qualité depuis plus de 30 ans.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-white">Leader marocain du béton préfabriqué</h3>
              <p className="text-gray-400 leading-relaxed text-lg">Fondée en 1990, Menara Préfa s'est imposée comme une référence dans la fabrication et la livraison de produits en béton préfabriqué destinés aux grands projets d'infrastructure, de construction résidentielle et industrielle au Maroc.</p>
              <p className="text-gray-400 leading-relaxed">Avec plus de 500 collaborateurs répartis sur 3 sites de production, l'entreprise livre chaque mois des centaines de chantiers à travers le Royaume, grâce à une logistique maîtrisée et des équipes dédiées.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                {["Béton préfabriqué", "Infrastructure", "Construction", "Logistique", "Innovation"].map((tag, i) => (
                  <span key={i} className="px-4 py-2 bg-[#AA9766]/20 border border-[#AA9766]/30 rounded-full text-[#AA9766] text-sm font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {aboutStats.map((item, index) => (
                <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-[#AA9766]/50 transition-all duration-300 hover:scale-105 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 rounded-xl flex items-center justify-center mx-auto mb-4">{item.icon}</div>
                  <div className="text-3xl font-black bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent mb-1">{item.number}</div>
                  <div className="text-gray-400 text-sm font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-20">
            <h3 className="text-3xl font-bold text-white text-center mb-10">Nos <span className="bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent">valeurs</span></h3>
            <div className="grid lg:grid-cols-3 gap-6">
              {[
                { icon: <Award className="w-8 h-8" />, title: "Excellence", description: "Nous visons l'excellence dans chaque produit fabriqué et chaque livraison effectuée, garantissant la satisfaction totale de nos clients." },
                { icon: <Shield className="w-8 h-8" />, title: "Qualité", description: "Nos produits répondent aux normes marocaines et internationales les plus strictes, certifiés par des laboratoires agréés." },
                { icon: <Users className="w-8 h-8" />, title: "Engagement humain", description: "Nos équipes sont au cœur de notre réussite. Nous investissons continuellement dans la formation et le bien-être de nos collaborateurs." }
              ].map((val, i) => (
                <div key={i} className="group bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-8 border border-white/20 hover:border-[#AA9766]/50 transition-all duration-300">
                  <div className="w-14 h-14 bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">{val.icon}</div>
                  <h4 className="text-xl font-bold text-white mb-3">{val.title}</h4>
                  <p className="text-gray-400 leading-relaxed">{val.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-white text-center mb-10">Nos <span className="bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent">départements</span></h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept, index) => (
                <div key={index} className="flex items-start space-x-4 bg-white/5 rounded-xl p-5 border border-white/10 hover:border-[#AA9766]/40 hover:bg-white/10 transition-all duration-300 group">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#AA9766]/80 to-[#AA9766] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">{dept.icon}</div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{dept.name}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{dept.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="inline-block bg-gradient-to-r from-[#AA9766]/20 to-[#AA9766]/10 border border-[#AA9766]/30 rounded-2xl px-10 py-8">
              <h4 className="text-2xl font-bold text-white mb-3">Menara Drive — Développé par et pour Menara Préfa</h4>
              <p className="text-gray-400 mb-6 max-w-xl mx-auto">Ce système a été conçu sur mesure pour répondre aux défis logistiques uniques de notre entreprise.</p>
              <button onClick={handleClick}
                className="group bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 text-white font-bold px-10 py-4 rounded-2xl shadow-2xl hover:shadow-[#AA9766]/25 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto">
                <span>Accéder au système</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-20 bg-gradient-to-r from-white/5 to-transparent">
        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-4xl font-black mb-8">Bénéfices<span className="bg-gradient-to-r from-green-400 to-[#AA9766] bg-clip-text text-transparent"> opérationnels</span></h3>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white group-hover:text-[#AA9766] transition-colors">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
              <div className="text-center">
                <div className="text-6xl font-black text-[#AA9766] mb-2">100%</div>
                <div className="text-white text-xl font-semibold mb-4">Adaptation interne</div>
                <div className="text-gray-400">Système développé sur mesure pour les processus métier de Menara Préfa</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h3 className="text-4xl font-black text-center mb-16">Retours des<span className="bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent"> équipes</span></h3>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-[#AA9766] fill-current" />
                  ))}
                </div>
                <blockquote className="text-2xl text-white mb-6 font-light italic">"{testimonials[currentTestimonial].text}"</blockquote>
                <div>
                  <div className="font-bold text-[#AA9766] text-lg">{testimonials[currentTestimonial].author}</div>
                  <div className="text-gray-400">{testimonials[currentTestimonial].company}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentTestimonial ? 'bg-[#AA9766]' : 'bg-white/30'}`}
                  onClick={() => setCurrentTestimonial(index)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#AA9766]/10 to-[#AA9766]/5"></div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl lg:text-6xl font-black mb-6">
            Accédez à votre
            <span className="block bg-gradient-to-r from-[#AA9766] to-[#AA9766]/60 bg-clip-text text-transparent">système Menara Drive</span>
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">Plateforme de gestion logistique développée spécialement pour optimiser les opérations de Menara Préfa</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button onClick={handleClick}
              className="group bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 text-white font-bold px-12 py-5 rounded-2xl shadow-2xl hover:shadow-[#AA9766]/25 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3">
              <span className="text-lg">Connexion système</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => openGuide(0)}
              className="border-2 border-[#AA9766]/50 text-[#AA9766] font-semibold px-12 py-5 rounded-2xl backdrop-blur-sm hover:bg-[#AA9766]/10 transition-all duration-300 flex items-center justify-center space-x-3">
              <BookOpen className="w-6 h-6" />
              <span className="text-lg">Guide d'utilisation</span>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-gray-400">
            <div className="flex items-center space-x-2"><Shield className="w-5 h-5 text-green-500" /><span>Données sécurisées interne</span></div>
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Formation incluse</span></div>
            <div className="flex items-center space-x-2"><Users className="w-5 h-5 text-green-500" /><span>Support IT dédié</span></div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900/80 backdrop-blur-xl border-t border-[#AA9766]/20 py-12">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-[#AA9766] to-[#AA9766]/80 rounded-xl flex items-center justify-center shadow-lg shadow-[#AA9766]/20"><Route className="w-6 h-6 text-white" /></div>
                <div><h3 className="text-2xl font-bold text-white">Menara Drive</h3><p className="text-xs text-[#AA9766]/70">Menara Préfa Internal</p></div>
              </div>
              <p className="text-gray-400">Système de gestion logistique développé pour optimiser les opérations de Menara Préfa.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Système</h4>
              <div className="space-y-2 text-gray-400">
                <button className="block hover:text-[#AA9766] transition-colors">Tableau de bord</button>
                <button className="block hover:text-[#AA9766] transition-colors">Gestion flotte</button>
                <button className="block hover:text-[#AA9766] transition-colors">Planification</button>
                <button className="block hover:text-[#AA9766] transition-colors">Rapports</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Support</h4>
              <div className="space-y-2 text-gray-400">
                <button onClick={() => openGuide(0)} className="block hover:text-[#AA9766] transition-colors">Guide utilisateur</button>
                <button className="block hover:text-[#AA9766] transition-colors">Documentation</button>
                <button className="block hover:text-[#AA9766] transition-colors">Formation</button>
                <button className="block hover:text-[#AA9766] transition-colors">Support IT</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Menara Préfa</h4>
              <div className="space-y-2 text-gray-400">
                <button onClick={scrollToAbout} className="block hover:text-[#AA9766] transition-colors">À propos</button>
                <button className="block hover:text-[#AA9766] transition-colors">Départements</button>
                <button className="block hover:text-[#AA9766] transition-colors">Intranet</button>
                <button className="block hover:text-[#AA9766] transition-colors">Politique IT</button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col lg:flex-row justify-between items-center text-gray-500">
            <p>© 2026 Menara Préfa - Système Interne Menara Drive.</p>
            <div className="flex space-x-6 mt-4 lg:mt-0">
              <button className="hover:text-[#AA9766] transition-colors">Politique interne</button>
              <button className="hover:text-[#AA9766] transition-colors">Sécurité données</button>
              <button className="hover:text-[#AA9766] transition-colors">Guide IT</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;