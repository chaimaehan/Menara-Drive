🚛 Menara Drive - Plateforme de Gestion Logistique Intelligente



Menara Drive est une application web complète de gestion logistique développée dans le cadre d'un projet de fin d'études d'ingénierie pour Menara Holding.
La solution optimise la gestion de la flotte, les opérations des chauffeurs, le traitement des commandes, le suivi des livraisons et la communication en temps réel à travers une interface intégrée, moderne et centrée sur l'utilisateur.


Notre solution apporte :

- ✅ Gestion centralisée des camions, chauffeurs, commandes et livraisons
- ✅ Planification intelligente des tournées avec optimisation de la distance, du temps et du coût
- ✅ Suivi GPS en temps réel avec géolocalisation et alertes de déviation
- ✅ Communication intégrée (Email, SMS, Chat en temps réel)
- ✅ Évaluation objective des performances des chauffeurs avec notation par étoiles
- ✅ Assistant virtuel IA pour des informations opérationnelles instantanées
- ✅ Détection de fatigue des chauffeurs pour une sécurité routière renforcée



 ✨ Fonctionnalités principales

 👨‍💼 Tableau de bord Administrateur
| Fonctionnalité | Description |
|----------------|-------------|
| Gestion de flotte | Opérations CRUD complètes pour les camions avec recherche par code, type ou chauffeur |
| Gestion des chauffeurs | Profils complets des chauffeurs avec permis, suivi de statut et évaluations de performance |
| Gestion des commandes | Cycle de vie complet des commandes avec filtrage par date et statut |
| Gestion des produits et stocks | Surveillance des inventaires en temps réel avec alertes de stock bas |
| Planification intelligente | Optimisation des tournées par IA prenant en compte la capacité, la disponibilité, les plages horaires et la distance |
| Suivi GPS | Carte interactive avec positions en temps réel, historique des trajets et alertes de géolocalisation |
| Centre de communication | Envoi d'emails (PHPMailer) et SMS (Twilio) directement depuis la plateforme |
| Performance chauffeurs | Évaluation par étoiles avec métriques de ponctualité et de complétion des livraisons |
| Importation massive| Téléchargement de fichiers Excel pour créer automatiquement des commandes |
| Tableaux de bord dynamiques | Indicateurs clés en temps réel avec graphiques pour la prise de décision stratégique |

 👀 Tableau de bord Superviseur
- Supervision opérationnelle : Visualisation de toutes les livraisons avec filtrage par chauffeur et statut
- Suivi des performances : Consultation des performances des chauffeurs et des indicateurs financiers
- Génération de rapports : Export des données au format Excel ou PDF

 💰 Tableau de bord Comptable
- Indicateurs financiers : Chiffre d'affaires, coûts opérationnels, marge brute
- Gestion des factures : Suivi des factures impayées et des échéances
- Analyse budgétaire : Graphiques dynamiques pour l'analyse des tendances financières

 🚚 Interface mobile Chauffeur
- Tableau de bord personnel : Visualisation des livraisons du jour et informations du camion assigné
- Progression de la tournée : Carte interactive avec itinéraire optimisé
- Confirmation par QR Code: Validation instantanée des livraisons par scan de codes QR uniques
- Chat en temps réel : Messagerie instantanée avec les administrateurs et collègues
- Détection de fatigue : Surveillance locale dans le navigateur avec alertes pour :
  - Détection et suivi du visage
  - État des yeux (ouverts/fermés)
  - Compteur de bâillements
  - Détection de l'utilisation du téléphone au volant

 🤖 Assistant IA
- Interface en langage naturel pour les requêtes opérationnelles
- Réponses en temps réel sur le statut des livraisons, les performances des chauffeurs et les indicateurs financiers
- Support de la saisie vocale via Web Speech API


 🛠 Stack technologique

 Backend
| Technologie | Version | Objectif |
|-------------|---------|----------|
| PHP | 8.0+ | Scripting côté serveur et logique métier |
| MySQL | 8.0+ | Système de gestion de base de données relationnelle |
| PHPMailer | 6.8+ | Envoi d'emails et notifications |
| API Twilio | Dernière | Envoi de SMS et alertes |
| API Groq | Dernière | Assistant virtuel basé sur l'IA |

 Frontend
| Technologie | Version | Objectif |
|-------------|---------|----------|
| React | 18.0+ | Framework d'interface utilisateur |
| React Router DOM | 6.0+ | Navigation et routage |
| Tailwind CSS | 3.0+ | Framework CSS utilitaire |
| Framer Motion | 10.0+ | Animations et transitions |
| Recharts | 2.0+ | Visualisation de données et graphiques |
| Leaflet.js | 1.9+ | Cartes interactives et suivi GPS |
| html5-qrcode | 2.0+ | Scan de QR code pour confirmation des livraisons |
| Axios | 1.0+ | Client HTTP pour la communication API |
| i18next | 23.0+ | Internationalisation et support multilingue |
| Lucide React | Dernière | Bibliothèque d'icônes |
| Socket.io | 4.0+ | Communication en temps réel |

 Sécurité et DevOps
| Technologie | Objectif |
|-------------|----------|
| JWT (JSON Web Tokens) | Authentification sécurisée et gestion de session |
| Docker | Conteneurisation et cohérence de l'environnement |
| Docker Compose | Orchestration multi-conteneurs |

 Outils de développement
- Visual Studio Code - IDE principal
- XAMPP - Environnement de développement PHP/Apache local
-phpMyAdmin - Administration et visualisation de la base de données


