// src/components/FatigueMonitor.jsx
//
// ─────────────────────────────────────────────────────────────────────────
// PRÉREQUIS AVANT UTILISATION :
//
// 1) Installer les librairies de vision par ordinateur :
//      npm install @vladmandic/face-api @tensorflow/tfjs @tensorflow-models/coco-ssd --legacy-peer-deps
//
//    - @vladmandic/face-api → détection du visage, des yeux, de la bouche
//      (fork maintenu de face-api.js, compatible avec les versions récentes
//      de TensorFlow.js — l'original "face-api.js" embarque une VIEILLE copie
//      interne de TF.js qui rentre en conflit avec coco-ssd. NE PAS installer
//      "face-api.js" en même temps que ce fork, ça recréerait le conflit.)
//    - coco-ssd      → détection d'objets (utilisé ici pour repérer un téléphone
//                      tenu en main). Ce modèle se télécharge automatiquement
//                      depuis internet au premier chargement (nécessite une
//                      connexion internet active, contrairement aux poids de
//                      @vladmandic/face-api qui eux sont hébergés localement).
//
// 2) Télécharger les poids du modèle (léger, adapté au navigateur) depuis :
//      https://github.com/justadudewhohacks/face-api.js/tree/master/weights
//    Fichiers nécessaires (à placer dans /public/models/) :
//      - tiny_face_detector_model-weights_manifest.json
//      - tiny_face_detector_model-shard1
//      - face_landmark_68_tiny_model-weights_manifest.json
//      - face_landmark_68_tiny_model-shard1
//
// 3) Le chauffeur doit positionner son téléphone/tablette sur un support
//    face à lui (jamais tenu en main pendant la conduite).
//
// Fonctionnement :
//   - Calcule l'EAR (Eye Aspect Ratio) à partir des points du visage :
//     un EAR bas et prolongé = micro-sommeil (yeux fermés).
//   - Calcule le PERCLOS (% de temps yeux fermés sur une fenêtre glissante) :
//     un taux élevé = fatigue progressive.
//   - Détecte les bâillements via un ratio d'ouverture de la bouche.
//   - Déclenche une alerte sonore + vocale + visuelle, et notifie le
//     backend (qui notifie l'administrateur).
// ─────────────────────────────────────────────────────────────────────────

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, AlertTriangle, Eye, EyeOff, Coffee, Loader2, Smartphone } from 'lucide-react';
import axios from 'axios';

const GOLD_PRIMARY = '#AA9766';
const GOLD_DARK = '#8A7A52';
const GOLD_BG = '#F8F5EB';
const RED_ALERT = '#dc2626';

const FATIGUE_API = 'http://localhost/OptiTruck/backend/controllers/chauffeurDashboard/report_fatigue.php';
const MODEL_URL = '/models';

// ── Seuils (ajustables selon retours terrain) ───────────────────────────────
const EAR_THRESHOLD = 0.25;          // en dessous = yeux considérés fermés
const MICROSLEEP_MS = 1500;          // yeux fermés en continu > 1.5s = alerte critique
const PERCLOS_WINDOW_MS = 60000;     // fenêtre glissante de 60s
const PERCLOS_THRESHOLD = 0.3;       // 30% du temps yeux fermés = alerte fatigue
const MAR_THRESHOLD = 0.65;          // au-dessus = bouche ouverte (bâillement potentiel)
const YAWN_SUSTAINED_MS = 600;       // doit rester ouverte ce temps minimum (vs. parler = bref)
const YAWN_COOLDOWN_MS = 8000;       // anti double-comptage d'un même bâillement
const YAWN_WINDOW_MS = 10 * 60000;   // fenêtre de 10 min pour compter les bâillements
const YAWN_ALERT_COUNT = 3;          // 3 bâillements en 10 min = alerte
const ALERT_COOLDOWN_MS = 45000;     // anti-spam : 45s entre 2 alertes du même type
const DETECTION_INTERVAL_MS = 400;
const NO_FACE_ALERT_MS = 4000;       // aucun visage détecté pendant 4s = distraction
const PHONE_SUSTAINED_MS = 1200;     // téléphone visible en continu > 1.2s = alerte
const PHONE_DETECTION_INTERVAL_MS = 1200; // détection objet plus coûteuse = moins fréquente
const PHONE_CONFIDENCE = 0.5;        // score de confiance minimum du modèle

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const eyeAspectRatio = (eye) => {
  // eye = tableau de 6 points, convention dlib/face-api.js
  const A = dist(eye[1], eye[5]);
  const B = dist(eye[2], eye[4]);
  const C = dist(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
};

const mouthAspectRatio = (mouth) => {
  const xs = mouth.map((p) => p.x);
  const ys = mouth.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return width > 0 ? height / width : 0;
};

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 350);
  } catch {
    // Web Audio non disponible : on ignore silencieusement
  }
};

const speak = (text) => {
  try {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  } catch {}
};

const ALERT_LABELS = {
  microsommeil: {
    title: 'Micro-sommeil détecté !',
    voice: 'Attention, signes de micro sommeil détectés. Arrêtez-vous et faites une pause.',
  },
  perclos: {
    title: 'Signes de fatigue détectés',
    voice: 'Vous montrez des signes de fatigue. Pensez à faire une pause.',
  },
  baillements: {
    title: 'Bâillements répétés détectés',
    voice: 'Bâillements répétés détectés. Une pause est recommandée.',
  },
  distraction: {
    title: 'Visage non détecté',
    voice: 'Attention, gardez les yeux sur la route.',
  },
  telephone: {
    title: 'Utilisation du téléphone détectée',
    voice: 'Attention, gardez les mains sur le volant.',
  },
};

const FatigueMonitor = ({ camionId }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const eyesClosedSinceRef = useRef(null);
  const mouthOpenSinceRef = useRef(null);
  const noFaceSinceRef = useRef(null);
  const phoneSinceRef = useRef(null);
  const cocoModelRef = useRef(null);
  const phoneIntervalRef = useRef(null);
  const perclosWindowRef = useRef([]); // [{ t, closed }]
  const lastYawnTimeRef = useRef(0);
  const yawnTimestampsRef = useRef([]);
  const lastAlertByTypeRef = useRef({});

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [eyeState, setEyeState] = useState('inconnu'); // 'ouverts' | 'fermes' | 'inconnu'
  const [faceDetected, setFaceDetected] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [yawnCount, setYawnCount] = useState(0);
  const [debugValues, setDebugValues] = useState({ ear: null, mar: null });
  const [alertActive, setAlertActive] = useState(null); // { type, title }
  const [sessionLog, setSessionLog] = useState([]);

  // ── Chargement des modèles (une seule fois) ───────────────────────────────
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return;
    setLoadingModels(true);
    setModelError('');
    try {
      const faceapi = await import('@vladmandic/face-api');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);

      // Modèle de détection d'objets (pour repérer un téléphone tenu en main)
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      cocoModelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      setModelsLoaded(true);
    } catch (err) {
      console.error(err);
      setModelError(
        "Impossible de charger le modèle de détection. Vérifiez que les fichiers sont bien dans /public/models."
      );
    } finally {
      setLoadingModels(false);
    }
  }, [modelsLoaded, loadingModels]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // ── Envoi de l'alerte au backend ──────────────────────────────────────────
  const sendAlertToBackend = async (type, niveau, details) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        FATIGUE_API,
        { type, niveau, camionId: camionId || null, details },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('Échec envoi alerte fatigue :', err);
    }
  };

  const triggerAlert = useCallback((type, niveau, details = {}) => {
    const now = Date.now();
    const last = lastAlertByTypeRef.current[type] || 0;
    if (now - last < ALERT_COOLDOWN_MS) return; // anti-spam
    lastAlertByTypeRef.current[type] = now;

    const info = ALERT_LABELS[type];
    setAlertActive({ type, title: info.title });
    playBeep();
    speak(info.voice);
    sendAlertToBackend(type, niveau, details);
    setSessionLog((log) => [
      { type, niveau, time: new Date().toLocaleTimeString('fr-FR') },
      ...log,
    ].slice(0, 10));

    setTimeout(() => setAlertActive(null), 6000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camionId]);

  // ── Boucle de détection ───────────────────────────────────────────────────
  const detectFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    try {
      const faceapi = await import('@vladmandic/face-api');
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true); // true = utilise le modèle "tiny" landmarks

      const now = Date.now();

      if (!detection) {
        setFaceDetected(false);
        if (noFaceSinceRef.current === null) noFaceSinceRef.current = now;
        const noFaceDuration = now - noFaceSinceRef.current;
        if (noFaceDuration >= NO_FACE_ALERT_MS) {
          triggerAlert('distraction', 'attention', { dureeMs: noFaceDuration });
        }
        return;
      }
      noFaceSinceRef.current = null;
      setFaceDetected(true);

      const leftEye = detection.landmarks.getLeftEye();
      const rightEye = detection.landmarks.getRightEye();
      const mouth = detection.landmarks.getMouth();

      const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
      const mar = mouthAspectRatio(mouth);
      const closed = ear < EAR_THRESHOLD;

      setDebugValues({ ear: ear.toFixed(2), mar: mar.toFixed(2) });
      setEyeState(closed ? 'fermes' : 'ouverts');

      // ── Micro-sommeil : yeux fermés en continu ──────────────────────────
      if (closed) {
        if (eyesClosedSinceRef.current === null) eyesClosedSinceRef.current = now;
        const elapsed = now - eyesClosedSinceRef.current;
        if (elapsed >= MICROSLEEP_MS) {
          triggerAlert('microsommeil', 'critique', { earMoyen: ear.toFixed(3), dureeMs: elapsed });
        }
      } else {
        eyesClosedSinceRef.current = null;
      }

      // ── PERCLOS : % de temps yeux fermés sur la fenêtre glissante ───────
      const window_ = perclosWindowRef.current;
      window_.push({ t: now, closed });
      while (window_.length && now - window_[0].t > PERCLOS_WINDOW_MS) window_.shift();
      if (window_.length >= 20) {
        const closedCount = window_.filter((f) => f.closed).length;
        const ratio = closedCount / window_.length;
        if (ratio >= PERCLOS_THRESHOLD) {
          triggerAlert('perclos', 'attention', { perclos: ratio.toFixed(2) });
        }
      }

      // ── Bâillements : la bouche doit rester ouverte un temps minimum ────
      // (parler/sourire = ouvertures brèves, un vrai bâillement dure plus longtemps)
      const mouthOpen = mar > MAR_THRESHOLD;
      if (mouthOpen) {
        if (mouthOpenSinceRef.current === null) mouthOpenSinceRef.current = now;
        const openDuration = now - mouthOpenSinceRef.current;
        if (
          openDuration >= YAWN_SUSTAINED_MS &&
          now - lastYawnTimeRef.current > YAWN_COOLDOWN_MS
        ) {
          lastYawnTimeRef.current = now;
          yawnTimestampsRef.current.push(now);
          yawnTimestampsRef.current = yawnTimestampsRef.current.filter(
            (t) => now - t <= YAWN_WINDOW_MS
          );
          setYawnCount(yawnTimestampsRef.current.length);
          if (yawnTimestampsRef.current.length >= YAWN_ALERT_COUNT) {
            triggerAlert('baillements', 'attention', { count: yawnTimestampsRef.current.length });
          }
        }
      } else {
        mouthOpenSinceRef.current = null;
      }
    } catch (err) {
      console.error('Erreur de détection :', err);
    }
  }, [triggerAlert]);

  // ── Détection téléphone (modèle d'objets, moins fréquente) ────────────────
  const detectPhone = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2 || !cocoModelRef.current) return;
    try {
      const predictions = await cocoModelRef.current.detect(videoRef.current);
      const now = Date.now();
      const phoneFound = predictions.some(
        (p) => p.class === 'cell phone' && p.score > PHONE_CONFIDENCE
      );
      setPhoneVisible(phoneFound);

      if (phoneFound) {
        if (phoneSinceRef.current === null) phoneSinceRef.current = now;
        const elapsed = now - phoneSinceRef.current;
        if (elapsed >= PHONE_SUSTAINED_MS) {
          triggerAlert('telephone', 'attention', { dureeMs: elapsed });
        }
      } else {
        phoneSinceRef.current = null;
      }
    } catch (err) {
      console.error('Erreur de détection téléphone :', err);
    }
  }, [triggerAlert]);

  // ── Démarrer / arrêter la caméra ───────────────────────────────────────────
  const startMonitoring = async () => {
    setCameraError('');
    if (!modelsLoaded) {
      await loadModels();
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsMonitoring(true);
      intervalRef.current = setInterval(detectFrame, DETECTION_INTERVAL_MS);
      phoneIntervalRef.current = setInterval(detectPhone, PHONE_DETECTION_INTERVAL_MS);
    } catch (err) {
      console.error(err);
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur.");
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (phoneIntervalRef.current) clearInterval(phoneIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    eyesClosedSinceRef.current = null;
    mouthOpenSinceRef.current = null;
    phoneSinceRef.current = null;
    perclosWindowRef.current = [];
    setEyeState('inconnu');
    setFaceDetected(false);
    setPhoneVisible(false);
  };

  useEffect(() => stopMonitoring, []); // cleanup au démontage

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl shadow-sm border mb-8 overflow-hidden"
      style={{ background: '#fff', borderColor: '#E8E0CC' }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-wrap gap-3" style={{ borderColor: '#E8E0CC' }}>
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2" style={{ background: GOLD_BG }}>
            {isMonitoring ? (
              <Camera className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />
            ) : (
              <CameraOff className="w-5 h-5" style={{ color: GOLD_PRIMARY }} />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: GOLD_DARK }}>Détection de fatigue</h2>
            <p className="text-xs" style={{ color: GOLD_PRIMARY }}>
              {isMonitoring ? (faceDetected ? 'Visage détecté · surveillance active' : 'Recherche du visage...') : 'Surveillance désactivée'}
            </p>
          </div>
        </div>

        <button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          disabled={loadingModels}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all"
          style={{
            background: isMonitoring ? RED_ALERT : GOLD_PRIMARY,
            color: '#fff',
            opacity: loadingModels ? 0.6 : 1,
          }}
        >
          {loadingModels ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Chargement du modèle...</>
          ) : isMonitoring ? (
            <><CameraOff className="w-4 h-4" /> Arrêter</>
          ) : (
            <><Camera className="w-4 h-4" /> Activer la surveillance</>
          )}
        </button>
      </div>

      {modelError && (
        <div className="mx-6 mt-4 p-3 rounded-lg text-sm" style={{ background: '#fff5f5', color: RED_ALERT }}>
          {modelError}
        </div>
      )}
      {cameraError && (
        <div className="mx-6 mt-4 p-3 rounded-lg text-sm" style={{ background: '#fff5f5', color: RED_ALERT }}>
          {cameraError}
        </div>
      )}

      {/* Alerte en cours */}
      <AnimatePresence>
        {alertActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-6 mt-4 p-4 rounded-xl flex items-center gap-3"
            style={{ background: '#fef2f2', border: `1px solid ${RED_ALERT}40` }}
          >
            <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: RED_ALERT }} />
            <div>
              <p className="font-bold" style={{ color: RED_ALERT }}>{alertActive.title}</p>
              <p className="text-xs" style={{ color: '#991b1b' }}>Faites une pause dès que possible.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aperçu caméra + statut */}
      <div className="px-6 py-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-shrink-0">
          <div
            className="rounded-lg overflow-hidden"
            style={{ width: 160, height: 120, background: '#000', display: isMonitoring ? 'block' : 'none' }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          </div>
          {isMonitoring && (
            <div className="text-[10px] mt-1 text-center" style={{ color: '#bbb' }}>
              EAR: {debugValues.ear ?? '—'} · MAR: {debugValues.mar ?? '—'}
            </div>
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg p-3 text-center" style={{ background: GOLD_BG }}>
            {eyeState === 'fermes' ? (
              <EyeOff className="w-5 h-5 mx-auto mb-1" style={{ color: RED_ALERT }} />
            ) : (
              <Eye className="w-5 h-5 mx-auto mb-1" style={{ color: GOLD_PRIMARY }} />
            )}
            <p className="text-xs font-semibold" style={{ color: GOLD_DARK }}>
              {eyeState === 'fermes' ? 'Yeux fermés' : eyeState === 'ouverts' ? 'Yeux ouverts' : '—'}
            </p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: GOLD_BG }}>
            <Coffee className="w-5 h-5 mx-auto mb-1" style={{ color: GOLD_PRIMARY }} />
            <p className="text-xs font-semibold" style={{ color: GOLD_DARK }}>{yawnCount} bâillement(s)</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: GOLD_BG }}>
            <Smartphone className="w-5 h-5 mx-auto mb-1" style={{ color: phoneVisible ? RED_ALERT : GOLD_PRIMARY }} />
            <p className="text-xs font-semibold" style={{ color: GOLD_DARK }}>
              {phoneVisible ? 'Téléphone détecté' : 'Pas de téléphone'}
            </p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: GOLD_BG }}>
            <AlertTriangle className="w-5 h-5 mx-auto mb-1" style={{ color: GOLD_PRIMARY }} />
            <p className="text-xs font-semibold" style={{ color: GOLD_DARK }}>{sessionLog.length} alerte(s)</p>
          </div>
        </div>
      </div>

      {/* Historique de session */}
      {sessionLog.length > 0 && (
        <div className="px-6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: GOLD_PRIMARY }}>
            Alertes de cette session
          </p>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {sessionLog.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded"
                style={{ background: '#F8F5EB' }}>
                <span style={{ color: GOLD_DARK }}>{ALERT_LABELS[a.type]?.title}</span>
                <span style={{ color: GOLD_PRIMARY }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 pb-4 text-[11px]" style={{ color: '#bbb' }}>
        Positionnez l'appareil sur un support face à vous. La détection tourne localement dans le
        navigateur — aucune image n'est envoyée au serveur, seules les alertes le sont.
      </div>
    </motion.div>
  );
};

export default FatigueMonitor;