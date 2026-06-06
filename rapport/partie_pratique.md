\newpage

# CHAPITRE III : CONCEPTION, RÉALISATION ET EXPLOITATION DIDACTIQUE DE LA PLATEFORME CHIMIOLAB

Après avoir établi, dans les deux premiers chapitres, le cadre général du projet ainsi que les fondements théoriques relatifs à la gestion des laboratoires scolaires, à la réglementation de sécurité (SGH/CLP) et à l'apport pédagogique de la technologie QR, ce troisième chapitre est consacré à la dimension pratique du travail. Il décrit la conception, le développement et le déploiement de la plateforme **ChimioLab**, puis analyse son exploitation **didactique et pédagogique** au sein du laboratoire de chimie.

Conformément à l'esprit d'un projet de fin d'études mené dans le cadre du Cycle de Qualification des Cadres de l'Enseignement (filière Physique-Chimie), nous ne nous limitons pas à une description technique de l'outil : chaque fonctionnalité est mise en relation avec sa valeur pédagogique, c'est-à-dire avec la manière dont elle sert l'enseignement expérimental, la démarche scientifique de l'élève, la sensibilisation à la sécurité et la formation des professeurs-stagiaires. La section III.6 est entièrement dédiée à cette dimension didactique, cœur de notre projet en tant qu'enseignants.

L'ensemble de la démonstration s'appuie sur des captures d'écran de l'application réelle.

---

## III.1 Environnement et architecture technique

### III.1.1 Choix d'une architecture moderne (SPA + BaaS)

L'architecture logicielle retenue repose sur deux piliers complémentaires :

* **Une application monopage (Single Page Application, SPA)** développée avec la bibliothèque **React**. Dans ce modèle, l'application se charge une seule fois dans le navigateur, puis met à jour dynamiquement le contenu sans rechargement complet, offrant une expérience fluide proche d'une application mobile native — qualité essentielle pour un usage quotidien par le préparateur et les enseignants, et pour une consultation rapide sur la paillasse.
* **Un back-end « as a Service » (BaaS)** fourni par la plateforme **Supabase**, fondée sur la base de données relationnelle **PostgreSQL**, qui prend en charge le stockage des données, l'authentification, le stockage des fichiers (FDS au format PDF) et la sécurité d'accès.

Ce découplage entre l'interface (front-end) et les données (back-end), communiquant par une interface de programmation (API) sécurisée, garantit la synchronisation en temps réel et l'évolutivité de la solution, sans nécessiter de serveur physique au sein de l'établissement.

*[INSÉRER IMAGE ICI]*
**Figure III.1 — Architecture technique de ChimioLab (navigateur → application React → API Supabase → base PostgreSQL).**

### III.1.2 Les technologies du front-end

L'interface a été construite à l'aide de technologies modernes et largement éprouvées : **React 19** (interfaces en composants réutilisables), **Vite 7** (serveur de développement et compilation rapides), **TypeScript** (typage statique fiabilisant le code), **Tailwind CSS 4** (mise en forme responsive) et **React Router 7** (navigation entre pages). Le tableau suivant récapitule la pile technologique complète.

**Table III.1 — Pile technologique (technologies et bibliothèques) de la plateforme ChimioLab.**

| Couche | Technologie / Bibliothèque | Rôle dans le projet |
|--------|----------------------------|---------------------|
| Interface (front-end) | React 19 + TypeScript | Construction de l'interface en composants typés |
| Outillage | Vite 7 | Serveur de développement et compilation du projet |
| Style | Tailwind CSS 4 | Mise en forme responsive et charte graphique |
| Navigation | React Router 7 | Routage entre les pages (tableau de bord, produits, TP…) |
| Back-end | Supabase (PostgreSQL) | Base de données, authentification, stockage de fichiers |
| Formulaires | React Hook Form + Zod | Saisie et validation fiable des données |
| Graphiques | Recharts | Visualisation des statistiques du tableau de bord |
| Codes QR | qrcode.react / qrcode | Génération des codes QR des produits |
| Icônes | Lucide React | Jeu d'icônes homogène de l'interface |
| Dates | date-fns | Calcul et formatage des dates (péremptions, séances) |

### III.1.3 Le back-end et la base de données Supabase

**Supabase** constitue la colonne vertébrale de la plateforme. Construit autour de **PostgreSQL**, il apporte quatre services essentiels : la **base de données** relationnelle, l'**authentification** sécurisée (mots de passe chiffrés), le **stockage de fichiers** (Storage) pour les FDS au format PDF, et la **sécurité au niveau des lignes** (Row Level Security, RLS) qui filtre l'accès aux données directement dans la base — garantissant notamment qu'un visiteur public ne consulte que les informations autorisées.

*[INSÉRER IMAGE ICI]*
**Figure III.2 — Tableau de bord du projet Supabase et tables de la base de données ChimioLab.**

---

## III.2 Conception du système

### III.2.1 Le modèle conceptuel de données

La structure relationnelle traduit fidèlement le fonctionnement réel d'un laboratoire : des **produits** possèdent chacun une **fiche de sécurité** ; des **séances de TP** consomment des **réactifs** et mobilisent du **matériel** ; des **utilisateurs**, selon leur rôle, créent des **réclamations** ; et le système génère des **alertes** liées aux produits. Les principales entités sont : `users` et `allowed_emails` (comptes et liste blanche), `products`, `safety_sheets`, `materials`, `rooms`, `tp_sessions` et leurs tables associées (`tp_reactifs`, `tp_materials`, `tp_checklist_items`, `tp_consumption_logs`, `quiz`), `requests` et `alerts`.

*[INSÉRER IMAGE ICI]*
**Figure III.3 — Modèle conceptuel de données (diagramme entité-association) de ChimioLab.**

### III.2.2 L'architecture des rôles et la sécurité des accès

Pour structurer la collaboration, un contrôle d'accès basé sur les rôles (Role-Based Access Control, RBAC) a été implémenté autour des trois acteurs réels du laboratoire :

* **L'administrateur** gère les comptes et la liste blanche des adresses autorisées ;
* **Le préparateur** gère les stocks (produits, matériels), les salles, les alertes et la génération des QR codes ;
* **L'enseignant** planifie ses séances de TP et exprime ses besoins.

La sécurité repose sur un double mécanisme : une **liste blanche** (`allowed_emails`) n'autorisant la création de compte qu'aux adresses validées par l'administrateur, et un menu de navigation qui s'adapte dynamiquement au rôle, masquant les fonctionnalités non autorisées.

*[INSÉRER IMAGE ICI]*
**Figure III.4 — Adaptation du menu de navigation selon le rôle (administrateur, préparateur, enseignant).**

### III.2.3 La charte graphique et le caractère responsive

L'interface, destinée à des utilisateurs non informaticiens, adopte une charte sobre articulée autour d'un bleu nuit dominant rehaussé d'accents verts et bleus, et d'un **code couleur sémantique de sécurité** directement inspiré de la logique SGH/CLP exposée au chapitre II : **rouge** pour le danger élevé et la péremption, **orange/jaune** pour l'attention et le stock faible, **vert** pour le faible risque et la conformité. Conçue selon le principe du **Responsive Design**, elle s'adapte automatiquement à l'écran — un impératif puisque la consultation des fiches via QR code s'effectue majoritairement depuis un smartphone, sur la paillasse.

*[INSÉRER IMAGE ICI]*
**Figure III.5 — Adaptation responsive de l'interface (affichage ordinateur et affichage smartphone).**

---

## III.3 Réalisation des modules de gestion

### III.3.1 Authentification et contrôle d'accès

La porte d'entrée de la plateforme propose la connexion par e-mail et mot de passe, l'inscription des nouveaux enseignants (sous réserve d'appartenir à la liste blanche) et un accès « visiteur » menant au site public de consultation. Le formulaire valide les champs en temps réel et signale clairement tout identifiant incorrect ou adresse non autorisée.

*[INSÉRER IMAGE ICI]*
**Figure III.6 — Écran de connexion et d'inscription de la plateforme.**

### III.3.2 Le tableau de bord

Le tableau de bord constitue le centre de pilotage du laboratoire. Il synthétise l'état général en quatre indicateurs clés (cartes statistiques) : nombre total de produits, produits en stock faible, produits expirant bientôt et séances de TP prévues dans la semaine. Il présente également les séances à venir, un **graphique de la consommation de réactifs du mois**, la liste des dernières alertes et un bloc d'actions rapides. Cette vue d'ensemble matérialise l'objectif de **gestion proactive** énoncé au chapitre I.

*[INSÉRER IMAGE ICI]*
**Figure III.7 — Tableau de bord : indicateurs clés, séances à venir et graphique de consommation.**

### III.3.3 La gestion des produits chimiques (l'inventaire)

Ce module numérise le « registre d'inventaire » traditionnel. Il présente l'ensemble des réactifs sous forme de tableau (nom, formule, CAS, quantité, localisation, état de la FDS, badge de statut). Une barre de recherche filtre instantanément par nom ou par numéro CAS, et des filtres rapides isolent les produits en stock faible ou dépourvus de FDS — là où le cahier papier exigeait un dépouillement long et source d'erreurs.

*[INSÉRER IMAGE ICI]*
**Figure III.8 — Inventaire des produits chimiques avec recherche et badges de statut.**

L'ajout ou la modification d'un produit s'effectue via un formulaire structuré en trois sections : informations générales (nom, formule, CAS, fournisseur), stock et localisation (quantité, unité, seuil d'alerte, péremption, emplacement) et fiche technique destinée à la page QR. La saisie est sécurisée par une validation automatique des champs.

*[INSÉRER IMAGE ICI]*
**Figure III.9 — Formulaire d'ajout / de modification d'un produit chimique.**

### III.3.4 Les fiches de données de sécurité (FDS)

À chaque produit est associée une fiche de sécurité numérique conforme à la logique SGH/CLP. Le préparateur y sélectionne les **pictogrammes GHS** (cases à cocher : explosif, inflammable, comburant, corrosif, toxique, irritant…), les **EPI obligatoires** (gants, lunettes, blouse, écran facial, hotte, masque), les **règles de stockage** et les **propriétés physico-chimiques** (aspect, pH, points de fusion et d'ébullition, densité, point d'éclair, masse molaire, solubilité). La FDS complète peut être téléversée au format PDF dans Supabase Storage et consultée « d'un seul glissement de doigt », comme annoncé au chapitre II.

*[INSÉRER IMAGE ICI]*
**Figure III.10 — Saisie de la fiche de sécurité : sélection des pictogrammes GHS et des EPI obligatoires.**

### III.3.5 La gestion du matériel de laboratoire

Présenté sous forme de cartes visuelles, chaque matériel est rattaché à une catégorie (verrerie, mesure, sécurité, électricité, chauffage), avec sa quantité disponible et son **état de fonctionnement** (en bon état, en maintenance, hors service). Cet état numérise la logique du « registre de maintenance », permettant de signaler clairement un appareil défectueux et d'éviter qu'il ne soit remis entre les mains des élèves.

*[INSÉRER IMAGE ICI]*
**Figure III.11 — Gestion du matériel et de la verrerie (vue en cartes par catégorie).**

*[INSÉRER IMAGE ICI]*
**Figure III.12 — Formulaire d'ajout d'un nouveau matériel.**

### III.3.6 La gestion des salles

Un module simple gère la liste des salles du centre (salles de chimie, laboratoires), réutilisées lors de la planification des séances de TP afin d'assurer la cohérence des données.

*[INSÉRER IMAGE ICI]*
**Figure III.13 — Module de gestion des salles du centre.**

### III.3.7 Le système d'alertes automatiques

Conformément à l'objectif de prévention, la plateforme génère des alertes classées par gravité : produits **périmés** (rouge), **FDS manquantes** (ambre) et **stocks faibles** (orange). Chaque alerte peut être recherchée et marquée comme résolue. Ce dispositif transforme une surveillance autrefois manuelle et aléatoire en un suivi automatisé et fiable, diminuant le risque lié aux produits dégradés.

*[INSÉRER IMAGE ICI]*
**Figure III.14 — Page des alertes et notifications classées par niveau de gravité.**

---

## III.4 Réalisation des modules pédagogiques et collaboratifs

### III.4.1 La planification des séances de travaux pratiques

Ce module numérise le « cahier de liaison » entre l'enseignant et le préparateur. L'enseignant crée une séance en renseignant un code, un titre, le **niveau** (collège, lycée, CRMEF), la date, la durée, le nombre d'élèves et les **objectifs pédagogiques**. Surtout, il sélectionne directement, dans le stock réel, les **réactifs** nécessaires (avec leurs quantités prévisionnelles) et le **matériel** requis. La demande est ainsi transmise de manière claire, lisible et sans ambiguïté, supprimant les incompréhensions liées à l'écriture manuscrite et aux formulations imprécises évoquées au chapitre II.

*[INSÉRER IMAGE ICI]*
**Figure III.15 — Formulaire de planification d'une nouvelle séance de TP.**

*[INSÉRER IMAGE ICI]*
**Figure III.16 — Liste des séances de TP planifiées et terminées.**

### III.4.2 Le suivi de consommation, la checklist et le quiz

La fiche détaillée d'une séance regroupe l'ensemble de ses composantes : le matériel mobilisé, les réactifs prévus, une **liste de contrôle (checklist)** des étapes de préparation que le préparateur coche au fur et à mesure, un **quiz court de compréhension** destiné aux élèves, et un **journal de consommation** où sont saisies les quantités réellement utilisées. Ce journal assure la **traçabilité** des réactifs : chaque consommation alimente le graphique du tableau de bord et permet d'éditer, en fin d'année, un bilan en un clic — fonctionnalité directement issue des besoins identifiés au chapitre II.

*[INSÉRER IMAGE ICI]*
**Figure III.17 — Fiche détaillée d'une séance de TP : réactifs, checklist de préparation, quiz et journal de consommation.**

### III.4.3 Les réclamations et besoins

Pour fluidifier la communication interne, ce module permet à l'enseignant de formuler un besoin (matériel manquant, produit à recommander, demande diverse) en quelques clics. Chaque demande possède un type et un statut (en attente, approuvée, rejetée, terminée), offrant au préparateur et à l'administrateur un canal de suivi structuré qui remplace les demandes orales ou les notes éparses.

*[INSÉRER IMAGE ICI]*
**Figure III.18 — Module des réclamations et besoins (formulaire et suivi des demandes).**

---

## III.5 Intégration de la technologie QR

La technologie QR constitue la valeur ajoutée la plus innovante de ChimioLab : elle réalise le **pont** entre le flacon physique posé sur l'étagère et l'ensemble de ses métadonnées de sécurité.

### III.5.1 Le générateur et l'impression des étiquettes QR

Un module dédié permet au préparateur de sélectionner un ou plusieurs produits, de prévisualiser leurs étiquettes, puis de les **imprimer en planche** afin de les coller sur les flacons. Chaque code QR encode l'adresse de la fiche publique du produit concerné.

*[INSÉRER IMAGE ICI]*
**Figure III.19 — Générateur de codes QR : sélection des produits et aperçu des étiquettes.**

*[INSÉRER IMAGE ICI]*
**Figure III.20 — Planche d'étiquettes QR prêtes à être imprimées et collées sur les flacons.**

### III.5.2 La page publique de la fiche produit (cible du scan)

Le scan d'un code QR redirige immédiatement vers une **fiche de sécurité publique**, consultable sans authentification et optimisée pour l'affichage mobile : bannière colorée indiquant le niveau de danger, identification complète du produit, pictogrammes GHS, EPI obligatoires, propriétés physico-chimiques, règles de stockage et conduites à tenir en cas d'accident. L'information salvatrice est ainsi accessible en quelques secondes, directement sur la paillasse.

*[INSÉRER IMAGE ICI]*
**Figure III.21 — Fiche de sécurité publique d'un produit affichée après le scan du QR code (vue smartphone).**

### III.5.3 Le site web public et l'accès visiteur

Un **site web public** met en valeur le laboratoire et permet la consultation libre du catalogue des réactifs, du matériel et des séances de TP. Les produits y sont présentés sous forme de cartes filtrables par niveau de risque, chacune portant son propre QR code. Ce site constitue la vitrine pédagogique du projet et le point d'arrivée naturel des codes QR.

*[INSÉRER IMAGE ICI]*
**Figure III.22 — Page d'accueil du site web public de ChimioLab.**

*[INSÉRER IMAGE ICI]*
**Figure III.23 — Catalogue public des réactifs avec filtres par niveau de risque et accès aux QR codes.**

---

## III.6 La dimension didactique et pédagogique de ChimioLab

Cette section constitue le cœur de notre projet en tant que futurs enseignants de Physique-Chimie. Au-delà de sa fonction gestionnaire, ChimioLab a été pensé comme un **outil didactique** au service de l'enseignement expérimental, de la démarche scientifique de l'élève et de la culture de sécurité. Nous explicitons ici la valeur pédagogique des fonctionnalités décrites précédemment, en cohérence avec les intentions formulées au chapitre I (objectif n° 5 : *sensibiliser les acteurs, en particulier les professeurs-stagiaires*) et au chapitre II (le QR comme *levier pédagogique* et *dynamique pédagogique*).

### III.6.1 ChimioLab au service de la démarche d'investigation scientifique

L'enseignement de la Physique-Chimie repose sur la **démarche d'investigation** (ou démarche expérimentale), qui conduit l'élève de l'observation d'un phénomène à la conclusion, en passant par la formulation d'hypothèses, la manipulation et l'interprétation des résultats. Le module de **séances de TP** soutient explicitement cette démarche : l'enseignant y consigne les **objectifs pédagogiques**, structure le protocole au moyen de la **checklist** des étapes, et associe à chaque séance les réactifs et le matériel nécessaires. La préparation matérielle de la séance, autrefois chronophage, est ainsi fiabilisée, laissant à l'enseignant davantage de temps pour se concentrer sur la **conduite pédagogique** de la manipulation et l'accompagnement du raisonnement scientifique des élèves.

*[INSÉRER IMAGE ICI]*
**Figure III.24 — Une séance de TP structurée dans ChimioLab : objectifs, étapes (checklist) et réactifs, au service de la démarche d'investigation.**

### III.6.2 Le smartphone et le QR code comme leviers d'apprentissage actif

Comme souligné au chapitre II, la généralisation des smartphones chez les élèves, ordinairement perçue comme une contrainte disciplinaire, devient ici un **levier pédagogique**. En autorisant l'élève à scanner lui-même le code QR d'un flacon **avant** toute manipulation, ChimioLab transforme la vérification des risques en un **acte pédagogique conscient et actif**. L'élève devient acteur de son apprentissage (perspective socioconstructiviste) : il identifie de lui-même les pictogrammes de danger, vérifie les EPI requis et prend connaissance des conduites à tenir, en lieu et place d'une assimilation passive de consignes affichées au tableau. Cette **responsabilisation** développe l'autonomie et ancre durablement la culture de sécurité, tout en rendant la séance plus interactive et motivante.

*[INSÉRER IMAGE ICI]*
**Figure III.25 — Mise en situation : un élève scanne le QR code d'un flacon et consulte la fiche de sécurité sur son smartphone avant la manipulation.**

### III.6.3 L'évaluation formative par le quiz et la checklist

Le **quiz de compréhension** intégré à chaque séance constitue un outil d'**évaluation formative** : il permet à l'enseignant de vérifier rapidement l'acquisition des notions clés (réaction étudiée, règles de sécurité, interprétation des résultats) et à l'élève de s'autoévaluer. Couplée à la **checklist** des étapes de préparation et de manipulation, cette fonctionnalité installe une **culture de la rigueur et de la vérification** — compétences transversales explicitement visées par les programmes de sciences. L'enseignant peut ainsi articuler évaluation des savoirs (le quiz) et évaluation des savoir-faire et savoir-être (le respect du protocole et des consignes de sécurité).

*[INSÉRER IMAGE ICI]*
**Figure III.26 — Quiz de compréhension d'une séance de TP, support d'évaluation formative.**

### III.6.4 Les alertes contextuelles, outil de sensibilisation à la sécurité

La **sécurité chimique** est une compétence transversale majeure de l'enseignement expérimental. ChimioLab y contribue de deux manières : par le **code couleur sémantique** (rouge/orange/vert) qui rend le niveau de danger immédiatement lisible, et par les **recommandations de protection** associées à chaque produit (EPI, règles de stockage, conduites en cas d'accident). En rendant l'information de danger visible, normalisée et systématique, la plateforme participe à l'**éducation préventive** des apprenants et du corps professoral annoncée au chapitre I, et concourt à l'instauration durable d'une culture de sécurité dans l'établissement.

*[INSÉRER IMAGE ICI]*
**Figure III.27 — Signalétique de danger et recommandations de protection affichées par la plateforme.**

### III.6.5 ChimioLab dans la formation des professeurs-stagiaires au CRMEF

En tant que projet mené au sein du Cycle de Qualification des Cadres de l'Enseignement, ChimioLab possède une portée pour la **formation initiale des enseignants**. Le professeur-stagiaire qui découvre un laboratoire mal documenté peut, grâce à la plateforme, prendre rapidement connaissance de l'inventaire, des fiches de sécurité et des bonnes pratiques de stockage et d'élimination. L'outil agit ainsi comme un **support de professionnalisation** : il transmet, de manière structurée et pérenne, le savoir-faire du préparateur et la réglementation (notes ministérielles, SGH/CLP) au futur enseignant, contribuant à pallier la *discontinuité du savoir-faire* identifiée au chapitre II lors des départs à la retraite.

*[INSÉRER IMAGE ICI]*
**Figure III.28 — ChimioLab comme support de formation : consultation de l'inventaire et des fiches de sécurité par un professeur-stagiaire.**

### III.6.6 Scénario pédagogique d'usage en séance de TP

Pour illustrer concrètement l'intégration de l'outil dans une séquence d'enseignement, le tableau suivant décrit un scénario type d'utilisation de ChimioLab au cours d'une séance de travaux pratiques, depuis la préparation jusqu'au bilan.

**Table III.2 — Scénario pédagogique d'utilisation de ChimioLab au cours d'une séance de TP.**

| Phase | Acteur | Activité avec ChimioLab | Plus-value didactique |
|-------|--------|-------------------------|-----------------------|
| Avant la séance | Enseignant | Planifie la séance, fixe les objectifs, sélectionne réactifs et matériel | Préparation rigoureuse, gain de temps, clarté de la demande |
| Avant la séance | Préparateur | Reçoit la demande, coche la checklist de préparation | Coordination fiable, traçabilité |
| Début de séance | Élève | Scanne le QR du flacon, consulte les dangers et EPI | Apprentissage actif, autonomie, sécurité |
| Pendant la séance | Élève / Enseignant | Réalise la manipulation selon la démarche d'investigation | Confrontation théorie / expérience |
| Pendant la séance | Préparateur | Enregistre les quantités consommées | Suivi des stocks en temps réel |
| Fin de séance | Élève | Répond au quiz de compréhension | Évaluation formative, auto-évaluation |
| Après la séance | Enseignant / Administrateur | Consulte le bilan de consommation et les alertes | Gestion proactive, réapprovisionnement |

---

## III.7 Déploiement et tests de la solution

### III.7.1 Le déploiement en ligne

Afin de rendre la plateforme accessible à tout moment et depuis n'importe quel appareil, l'interface est compilée puis hébergée sur une plateforme d'hébergement web moderne, tandis que les données et l'authentification sont assurées par l'infrastructure cloud de Supabase. Cette combinaison garantit une disponibilité permanente, une mise à l'échelle automatique et une maintenance simplifiée, sans serveur à administrer dans l'établissement ni installation locale.

*[INSÉRER IMAGE ICI]*
**Figure III.29 — Mise en ligne de la plateforme et accès via une adresse web.**

### III.7.2 Les tests fonctionnels

La solution a fait l'objet d'une série de tests fonctionnels validant son bon fonctionnement avant la mise en service, résumés dans le tableau ci-dessous.

**Table III.3 — Extrait du cahier de tests fonctionnels de la plateforme.**

| Fonctionnalité testée | Scénario | Résultat attendu | Statut |
|-----------------------|----------|------------------|--------|
| Authentification | Connexion avec un compte autorisé | Accès au tableau de bord | Conforme |
| Liste blanche | Inscription avec un e-mail non autorisé | Accès refusé | Conforme |
| Contrôle des rôles | Connexion en tant qu'enseignant | Menus préparateur masqués | Conforme |
| Gestion produit | Ajout d'un nouveau réactif | Produit visible dans l'inventaire | Conforme |
| Alerte péremption | Produit dont la date est dépassée | Badge « périmé » affiché | Conforme |
| Alerte stock | Quantité ≤ seuil d'alerte | Produit signalé « stock faible » | Conforme |
| Technologie QR | Scan de l'étiquette d'un produit | Ouverture de la fiche publique | Conforme |
| Quiz / TP | Réponse au quiz d'une séance | Correction et retour affichés | Conforme |
| Responsive | Consultation sur smartphone | Affichage adapté et lisible | Conforme |

*[INSÉRER IMAGE ICI]*
**Figure III.30 — Vérification du comportement de l'application sur différents appareils (ordinateur, tablette, smartphone).**

---

## III.8 Conclusion du chapitre

Ce chapitre a présenté la réalisation complète de la plateforme ChimioLab, depuis l'architecture technique (React / Supabase) jusqu'au déploiement, en passant par la conception du modèle de données, la sécurité par les rôles et l'ensemble des modules de gestion, pédagogiques et collaboratifs. Au-delà de la performance technique, nous avons mis en évidence la **dimension didactique** de chaque fonctionnalité : soutien à la démarche d'investigation, apprentissage actif par le scan QR, évaluation formative par le quiz, sensibilisation à la sécurité et appui à la formation des professeurs-stagiaires. La plateforme réalise ainsi le pont — annoncé dans nos hypothèses — entre l'objet physique du laboratoire et une sphère numérique d'informations, au service à la fois d'une gestion sécurisée et d'un enseignement expérimental de qualité.

---

\newpage

# CONCLUSION GÉNÉRALE

Ce projet de fin d'études, mené dans le cadre du Cycle de Qualification des Cadres de l'Enseignement (filière Physique-Chimie), est parti d'un constat préoccupant : alors que l'école marocaine s'engage résolument dans la transformation numérique, la gestion des laboratoires scolaires demeure largement tributaire de méthodes artisanales — registres papier raturés, étiquettes effacées, suivi aléatoire des stocks et des péremptions — au détriment de l'efficacité et, surtout, de la sécurité des élèves et du personnel.

Face à cette problématique, nous avons conçu, développé et déployé **ChimioLab**, une plateforme web collaborative et didactique pour la gestion numérique d'un laboratoire de chimie. En articulant un cadre théorique solide (réglementation, normes SGH/CLP, rôle du préparateur, apport pédagogique du QR) et une réalisation technique aboutie (architecture React / Supabase, contrôle d'accès par rôles, intégration des codes QR, modules de gestion et de planification des TP), ce travail démontre qu'une solution numérique moderne, sécurisée et accessible peut transformer en profondeur l'organisation quotidienne du laboratoire.

Les résultats obtenus valident l'hypothèse de départ : le pont numérique établi entre l'objet physique et ses métadonnées de sécurité améliore significativement la prévention des risques, centralise l'information, fluidifie la communication entre les acteurs et ouvre la voie à de nouvelles pratiques pédagogiques.

Mais la contribution de ChimioLab dépasse la seule dimension organisationnelle. En tant que projet porté par de futurs enseignants, il revendique une **finalité didactique** : soutenir la démarche d'investigation scientifique, faire du smartphone et du code QR des leviers d'apprentissage actif, proposer une évaluation formative par le quiz, et instaurer durablement une **culture de la sécurité chimique** chez les élèves comme chez les professeurs-stagiaires. ChimioLab illustre ainsi la contribution que les Technologies de l'Information et de la Communication pour l'Enseignement (TICE) peuvent apporter à la qualité et à la sécurité de l'enseignement expérimental, en cohérence avec les orientations de la Vision Stratégique 2015-2030.

Plusieurs perspectives prolongent ce travail : le développement d'une **application mobile native** avec scan intégré et consultation hors ligne ; un **module de génération automatique de comptes rendus de TP** et de bilans de réapprovisionnement exportables ; une **vérification automatique des incompatibilités chimiques** lors du stockage et de la planification ; l'enrichissement du volet pédagogique par des **quiz notés** et un suivi des résultats des élèves ; enfin, l'extension de la solution à d'autres disciplines expérimentales (physique, SVT) et son déploiement à l'échelle de plusieurs établissements.

Nous formons le vœu que ChimioLab, au-delà du cadre de ce mémoire, puisse être adopté et enrichi par la communauté éducative, afin de faire du laboratoire scolaire un espace à la fois plus sûr, mieux géré et plus stimulant pour les générations d'élèves à venir.
