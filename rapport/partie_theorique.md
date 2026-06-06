# **ChimioLab : Plateforme Collaborative et Didactique pour la Gestion Numérique d'un Laboratoire de Chimie**

**Projet de Fin d'Études**
**Cycle de Qualification des Cadres de l'Enseignement — Physique-Chimie**

---

**Réalisé par :**
- BENSALAH Abdelaziz
- KHAIRI Abdessalam

**Encadré par :**
- Pr. Azzeddine ATIBI

**Établissement :**
Centre Régional des Métiers de l'Éducation et de la Formation (CRMEF)
Derb Ghallef — Casablanca

**Année universitaire : 2025-2026**

---

\newpage

# PARTIE I : CADRE GÉNÉRAL DU PROJET

### I.1 Contexte générale

La gestion des substances chimiques constitue un enjeu crucial dans les établissements scolaires, notamment au sein des laboratoires de sciences physiques et chimiques. L'enseignement expérimental y occupe une place prépondérante, car il permet aux apprenants de confronter la théorie à la pratique. Cependant, compte tenu de la nature potentiellement dangereuse de nombreux réactifs, il est primordial d'assurer une identification claire, une traçabilité rigoureuse ainsi qu'une diffusion efficace des informations concernant leur manipulation, leur stockage et leur élimination.

Dans un contexte national et international où la digitalisation prend une place grandissante au sein des institutions éducatives, les outils technologiques offrent des solutions innovantes pour améliorer la sécurité et l'organisation. L'intégration des Technologies de l'Information et de la Communication pour l'Enseignement (TICE) n'est plus une simple option, mais une directive stratégique (notamment via la Vision Stratégique 2015-2030 au Maroc). 

C'est dans cette perspective que l'utilisation d'applications web modernes associées aux codes QR (Quick Response) se révèle particulièrement pertinente. La transition d'une gestion traditionnelle basée sur des registres papier vers une plateforme collaborative accessible via smartphone ou ordinateur permet de transformer radicalement la gestion du laboratoire. En substituant l'encombrement documentaire par une centralisation des données (inventaires, fiches de données de sécurité, alertes de péremption), l'outil numérique améliore non seulement l'efficacité du personnel (professeurs et préparateurs), mais renforce également préventivement la santé et la sécurité dans l'environnement scolaire.

### I.2 Problématique

Dans les laboratoires scolaires marocains, la gestion des produits chimiques et du matériel didactique représente un défi constant. Ce défi s'articule autour des risques potentiels liés à la nature des substances manipulées, de la fluctuation des ressources matérielles, et de l'absence fréquente d'outils numériques intégrés et spécifiques au contexte de l'éducation nationale. Une gestion efficace ne peut se contenter d'un simple stockage physique : elle nécessite une identification rigoureuse normalisée, une centralisation fiable des données accessibles à tout moment, et une anticipation proactive (systèmes d'alertes) des besoins en matière de consommation et de renouvellement.

Face au décalage entre les exigences sécuritaires modernes (normes GHS/CLP) et les pratiques artisanales souvent observées sur le terrain, la problématique centrale de ce projet est la suivante :

**Comment concevoir et développer une solution numérique collaborative, efficace et sécurisée permettant de centraliser les données de l'inventaire des produits chimiques, de faciliter la gestion du laboratoire scolaire, et d'assurer une diffusion fluide des informations en s'adaptant aux contraintes techniques, humaines et pédagogiques ?**

Dans cette perspective, comment l'intégration de la technologie QR, couplée à une architecture logicielle moderne (React, Supabase), peut-elle lier chaque produit physique à une sphère numérique d'informations consultables instantanément, tout en respectant une hiérarchie stricte des rôles (enseignant, préparateur, administrateur) ?

### I.3 Justification de choix de projet

Dans le contexte actuel du laboratoire scolaire, il est devenu indispensable d'abandonner les méthodes de gestion obsolètes au profit d'une solution numérique structurée. Le choix de développer la plateforme "ChimioLab" se justifie par plusieurs impératifs :

1. **Le besoin d'une gestion proactive et sécuritaire :** La création d'une base de données centralisée permet non seulement de connaître l'état des stocks à l'instant T, mais aussi d'intégrer des alertes automatisées (produits périmés, stocks critiques). Cette approche de prévention des risques diminue considérablement les dangers liés aux produits chimiques dégradés.
2. **L'adaptabilité aux utilisateurs :** Contrairement à des progiciels industriels (LIMS) lourds et coûteux, ChimioLab est pensée spécifiquement pour l'écosystème éducatif. L'intégration de la gestion des séances de Travaux Pratiques (TP) et d'un espace de requêtes/réclamations répond exactement aux besoins de coordination entre les professeurs et les préparateurs.
3. **L'innovation par la technologie QR :** Le couplage de l'application avec la génération de codes QR imprimables offre un outil pédagogique interactif. Un simple scan à partir d'un appareil mobile donne accès immédiat à la fiche de sécurité (FDS), aux pictogrammes de danger et aux conduites à tenir en cas d'accident, rendant l'information salvatrice accessible sur la paillasse même du laboratoire.

### I.4 Objectif de ce travail

Ce travail vise à concevoir, développer et déployer une plateforme collaborative (ChimioLab) destinée aux établissements scolaires et de formation (tels que le CRMEF), permettant une gestion efficace, sécurisée et pédagogique des dispositifs expérimentaux. 

Les objectifs spécifiques sont :
* **Centraliser et numériser** les informations relatives aux inventaires des produits chimiques, de la verrerie et des équipements, ainsi que leurs fiches de données de sécurité (FDS).
* **Faciliter l'accès rapide** aux informations de danger via la génération et l'utilisation de la technologie QR lors des manipulations.
* **Structurer la collaboration** en attribuant des rôles informatiques précis (Role-Based Access Control) : l'administrateur gère les accès, le préparateur gère les stocks et les salles, et le professeur planifie ses TP et exprime ses besoins.
* **Assurer la traçabilité** de la consommation des réactifs à travers un journal de suivi couplé aux planifications des séances de TP.
* **Sensibiliser** l'ensemble des acteurs, particulièrement les professeurs-stagiaires, aux bonnes pratiques de gestion et à la réglementation internationale sur l'étiquetage.

### I.5 Hypothèse de recherche

Le développement de ce projet repose sur l'hypothèse centrale suivante :
**L'intégration d'une plateforme Web collaborative et sécurisée, exploitant une base de données en temps réel et des codes QR pour faire le pont entre l'objet physique et ses métadonnées, permet d'améliorer significativement la gestion globale des laboratoires scolaires.**

On suppose que cette solution technologique :
* Facilitera l'accès instantané aux informations réglementaires et sécuritaires en supprimant la barrière des archives papier ;
* Renforcera la prévention des risques par un système visuel de repérage et d'alertes ;
* Améliorera la communication interne de l'établissement en offrant un canal direct (réclamations, planification) entre l'enseignant et l'équipe préparatrice ;
* Contribuera à l'éducation préventive des apprenants et du corps professoral sur les bonnes pratiques de manipulation.

### I.6 Méthodologie de travail adoptée

Pour vérifier cette hypothèse et atteindre les objectifs fixés, une démarche méthodologique rigoureuse a été adoptée, structurée en plusieurs étapes itératives :

1. **Analyse du contexte et des besoins :** Une analyse exploratoire au sein du laboratoire de chimie du CRMEF Derb Ghallef a été menée. Elle a permis de cerner les défis réels liés à l'organisation spatiale, au suivi quantitatif des produits instables ou réglementés, et d'identifier le besoin d'une interface simple et non contraignante pour les utilisateurs quotidiens.
2. **Recherche technologique et choix de l'architecture :** Face aux contraintes habituelles (budget, hébergement, facilité de mise à jour), une architecture moderne a été sélectionnée. Contrairement à des approches basées sur des CMS lourds, le choix s'est porté sur une architecture "Single Page Application" performante utilisant **React.js** et **Vite** pour le front-end, et la plateforme **Supabase** (basée sur PostgreSQL) pour le back-end, afin de garantir le temps réel, la sécurité des données via le concept de liste blanche, et une évolutivité sans faille.

*[INSÉRER IMAGE ICI]*
**Figure 1 : Schéma de l'architecture logicielle de la plateforme (React / Supabase)**

3. **Conception du modèle de données et développement :** Élaboration de la structure relationnelle liant les entités fondamentales : Utilisateurs (et Rôles), Produits, Matériels, Séances de TP, Alertes et Réclamations. Le développement de l'interface utilisateur s'est concentré sur l'ergonomie, la mise en évidence des dangers (codes couleurs) et la compatibilité mobile (Responsive Design).
4. **Intégration technologique (QR et FDS) :** Implémentation des bibliothèques de génération de codes QR et du système de stockage des fiches FDS au format PDF.
5. **Déploiement et tests :** Validation fonctionnelle des accès selon les rôles, test des workflows de traitement des besoins des enseignants, et vérification des processus de génération de rapports.

---

\newpage

# PARTIE II : CADRE THÉORIQUE ET CONTEXTE CONCEPTUEL

### II.1 Contexte des laboratoires scolaires

#### II.1.1 Définition de laboratoire scolaire

Un laboratoire scolaire est un endroit très important dans une école ou un lycée. Ce n'est pas juste une salle classique avec des tables et des chaises, ni un simple magasin où on entasse des produits chimiques dans des placards. C'est un vrai environnement pédagogique spécialement créé pour réaliser des expériences scientifiques, surtout en physique et en chimie. À l'intérieur, on trouve beaucoup de choses différentes qu'on ne trouve nulle part ailleurs dans le lycée : des grandes tables spéciales qu'on appelle des paillasses, qui résistent à la chaleur et aux acides, de la verrerie (comme des béchers, des éprouvettes graduées, des pipettes, des fioles jaugées), des appareils électroniques (comme des générateurs électriques, des oscilloscopes, des balances de précision), et bien sûr une très grande quantité de produits chimiques, de poudres et de liquides.

Dans le système éducatif au Maroc, le laboratoire est vraiment au cœur de la matière Physique-Chimie. On ne peut pas juste apprendre la chimie en lisant un livre ou en regardant le tableau. Il faut toucher, mélanger, voir les couleurs changer, voir les gaz se dégager. C'est grâce à cette pratique (les Travaux Pratiques, ou TP) que les élèves arrivent à comprendre la théorie qu'ils voient en cours. Quand un élève fait lui-même une expérience de dosage ou de précipitation, il retient beaucoup mieux la leçon. Le laboratoire aide aussi l'élève à réfléchir avec une vraie méthode scientifique : il observe, il fait ses hypothèses, il fait son expérience, il note les résultats, puis il tire une conclusion. Ça lui apprend aussi à être soigneux, propre et à faire très attention à sa sécurité et à celle des autres.

Mais pour que ce laboratoire soit utile, il faut qu'il soit parfaitement bien rangé et géré. Si le bureau est un vrai champ de bataille, si les bouteilles n'ont plus d'étiquette, ou si on ne trouve pas l'appareil dont on a besoin, le professeur va perdre beaucoup de temps avec ses élèves, et surtout, cela peut devenir très dangereux. C'est pour toutes ces raisons qu'une bonne gestion logique et moderne du labo est obligatoire.

#### II.1.2 Le rôle de préparateur de laboratoire scolaire

La personne qui s'occupe de faire tourner le labo tous les matins et tous les soirs, c'est le préparateur (ou l'agent de laboratoire). Son travail n'est pas toujours facile et il est extrêmement important. Sans le préparateur, le professeur serait très en difficulté pour organiser ses séances pratiques avec toutes les classes. Le métier de préparateur est très organisé par la loi, avec des notes importantes du ministère, surtout la note 129x18 qui explique tout ce qu'il doit faire.

Ses journées sont très chargées et ses missions sont très variées :
* **L'aide directe au professeur :** Chaque semaine, le préparateur regarde un cahier spécial (le cahier de texte ou de liaison) où le professeur écrit l'expérience qu'il veut faire. Ensuite, le préparateur doit chercher tout le matériel nécessaire dans les placards, amener les bons produits, et préparer chaque paillasse pour les groupes d'élèves. Parfois il doit faire des réglages compliqués. Pendant que le professeur fait son cours avec les élèves, le préparateur n'est jamais loin. S'il manque un fil électrique ou si un verre se casse, il intervient tout de suite. À la fin de la séance, quand la cloche sonne, les élèves sortent, mais le travail du préparateur continue. Il doit tout ramasser, laver les tubes à essai avec soin, utiliser parfois des acides pour nettoyer les résidus collés au fond de la verrerie, sécher le matériel et tout remettre à sa place exacte.
* **La gestion logistique, la chimie et la sécurité :** C'est souvent le préparateur qui fait le travail le plus risqué en "coulisses". Les élèves utilisent des solutions prêtes. C'est le préparateur qui doit manipuler des acides purs très concentrés pour fabriquer ces solutions (en les diluant avec de l'eau distillée). Il prépare aussi des mélanges de gaz ou autres. Il a la lourde tâche de vérifier régulièrement si un appareil est cassé. Si un générateur a un fil dénudé, il doit mettre un scotch rouge "Hors Service" pour que personne ne s'électrocute, et si possible le réparer avec ses petits outils. Il doit s'assurer chaque jour que la salle est bien aérée, que le sol n'est pas glissant, et que l'extincteur est bien là.
* **L'administration et la \"paperasse\" :** C'est le côté le plus ennuyeux et fatigant de son métier. À la fin de l'année scolaire (et souvent au début aussi), le préparateur doit compter tout ce qui existe dans les armoires, un par un, flacon par flacon, tube par tube. On appelle cela faire l'inventaire. C'est une tâche difficile qui prend des jours entiers à faire et à écrire à la main dans de très grands registres. Il s'occupe aussi de classer les fiches de sécurité des produits, de garder les factures d'achat et de faire les listes de tout ce qu'il faut racheter pour le directeur et l'intendant.

#### II.1.3 Les notes ministérielles encadrant le laboratoire scolaire

Pour que tous les lycées et collèges du Maroc travaillent de la même bonne manière sans faire n'importe quoi, le Ministère de l'Éducation Nationale a donné un ensemble de règles qu'on appelle les notes cadres ou notes ministérielles. Ce sont un peu les lois du laboratoire. Elles sont nombreuses et elles obligent le surveillant général, le directeur, le professeur et le préparateur à suivre une méthode de travail précise.

**Tableau 1 : Tableau récapitulatif des notes ministérielles encadrant les laboratoires scolaires au Maroc**

| Note Ministérielle | Description de la directive |
|--------------------|-----------------------------|
| **Note 126x18** | Elle explique très calmement comment le matériel pédagogique doit être géré pour ne pas être abîmé et pour qu'il soit utilisé par tous. |
| **Note 127x18** | Elle donne les méthodes pour faire les inventaires dont j'ai parlé avant. Elle montre comment bien stocker les liquides pour qu'ils soient faciles à trouver. |
| **Note 128x18** | Elle montre les étapes qu'il faut suivre quand on manque de matériel et qu'on doit identifier nos besoins pour les nouvelles leçons. |
| **Note 129x18** | C'est la plus célèbre. Elle parle de ce que chacun doit faire exactement dans son poste, comment le labo doit être fait physiquement et les règles de base de la sécurité pour ne pas avoir d'accidents. |
| **Note 130x18** | Elle dit comment de nouvelles commandes de matériel qui arrivent au lycée doivent être testées (par quelqu'un qui s'y connaît) avant d'être acceptées, pour ne pas prendre du matériel de mauvaise qualité. |
| **Note 132x18** | C'est très important. Elle explique comment on doit se débarrasser des mauvais déchets chimiques à la fin de l'année. On ne doit jamais jeter de l'acide dans le lavabo à cause de la pollution. |
| **Note 133x18** | Si un lycée manque d'un oscilloscope et qu'un autre lycée en a beaucoup, cette note organise la façon légale de se prêter ce matériel entre les écoles amies. |
| **Document 147** | C'est un grand cahier de procédure (sorte de guide complet) qui résume toutes les bonnes manières de gérer ce grand stock de matériel. |

Le grand problème qu'on voit chaque jour sur le terrain, c'est que ces règles sont belles sur le papier, mais très compliquées à appliquer dans la vraie vie parce qu'on n'a pas les bons outils, on fait encore tout avec de vieux dossiers papiers et on oublie souvent beaucoup de choses, c'est pourquoi on a eu cette idée de ChimioLab.

#### II.1.4 Les documents de gestion de laboratoire scolaire

Actuellement, dans un lycée classique qui n'est pas encore numérisé, tout le travail administratif se fait avec un stylo sur des très grands cahiers qu'on appelle "registres". Le projet ChimioLab qu'on propose veut justement enlever tous ces registres lourds pour les transformer en menus clignotants sur un ordinateur ou un smartphone. Voici à quoi ressemblent ces fameux cahiers aujourd'hui :

* **a) Le Cahier d'inventaire :** 
C'est le cahier le plus gros et le plus important du labo. C'est un document officiel qui a souvent le tampon du lycée, où l'on écrit la liste de tout ce qui a été acheté depuis des années pour le labo : l'ampèremètre numéro 5, le bécher de 100mL, la bouteille de permanganate de potassium, etc. Ce grand cahier permet au préparateur de chercher ce qu'il a en magasin. Mais le problème, c'est qu'avec les années, on rature, on efface avec du blanc, la page se déchire, et finalement on ne sait plus vraiment ce qui est vide, ce qui est plein, ce qui est volé ou ce qui est cassé. Et surtout pour la sécurité, on risque de laisser traîner un produit depuis 20 ans sans jamais s'en approcher, et ça devient dangereux ! Avec notre idée du numérique, l'inventaire devient une liste sur la plateforme qu'on modifie en faisant un seul clic.

*[INSÉRER IMAGE ICI]*
**Figure 2 : Extrait d'un cahier d'inventaire physique traditionnel (avant numérisation)**

* **b) Le Cahier journal (ou cahier de liaison) :** 
C'est un autre cahier, qu'on laisse généralement sur le petit bureau du préparateur. Le professeur vient avec son cahier de texte et il écrit ce dont il aura besoin pour le lundi prochain devant les élèves : par exemple "J'ai besoin de 5 montages pour voir la loi d'Ohm". Le problème c'est que parfois l'enseignant vient écrire à la dernière minute, ou alors son écriture n'est pas lisible. Des fois il demande une solution à une concentration bizarre, et le préparateur ne comprend pas vraiment sans lui poser la question (sauf que le professeur est déjà rentré chez lui !). Dans ChimioLab, on a créé un module génial de "Sessions de TP" où le prof clique, sélectionne le vrai matériel en stock, et envoie sa demande clairement qui sera reçue comme une notification.

* **c) Le Cahier de maintenance et de réparation :** 
Ce cahier est là pour noter la vie de l'appareil. Dès qu'un outil tombe en panne, le préparateur écrit la date de la casse, et plus tard, le jour où c'est réparé par le technicien. Ça assure que l'appareil peut être réutilisé par un élève sans le mettre en danger (par exemple, un fil électrique dénudé qui a été réparé). Malheureusement souvent, faute de temps, le préparateur n'écrit plus rien dans ce cahier, et beaucoup de matériels empoussiérés restent au fond de l'armoire sans qu'on sache vraiment pourquoi.

---

### II.2 La gestion des produits chimiques et sécurité

#### II.2.1 Le système d'étiquetage des produits chimiques (SGH/CLP)

Les produits chimiques qu'on manipule dans un laboratoire scolaire, même s'ils sont parfois moins concentrés que dans l'industrie, restent potentiellement très dangereux si on ne fait pas attention. Une goutte d'un acide fort dans un œil, ou bien respirer des vapeurs toxiques sans masque, et c'est le drame au milieu du cours. C'est pour ça que la gestion numérique de notre plateforme ChimioLab s'appuie totalement sur les lois et les standards internationaux qu'on trouve partout aujourd'hui.

L'idée de base, c'est que tout le monde, qu'on soit élève, professeur ou même pompier en cas d'incendie, puisse comprendre très vite de quel danger il s'agit, juste en regardant un dessin simple. Au niveau international, les pays se sont mis d'accord sur un règlement unique pour bien étiqueter les flacons, qu'on appelle "SGH" (Système Général Harmonisé), et au niveau de l'Europe ça s'appelle le "CLP" (Classification, Labelling and Packaging).

*[INSÉRER IMAGE ICI]*
**Figure 3 : Exemple d'étiquette CLP normalisée avec pictogrammes, mentions H et conseils P**

Quand on regarde une bonne étiquette de nos jours, ou bien en consultant la fiche d'un produit dans la plateforme ChimioLab, on doit être capable de lire plusieurs éléments obligatoires :
1. **Le nom scientifique du produit :** Ce n'est pas juste un nom facile, c'est une liste avec des noms compliqués de chimiste (IUPAC), sa formule avec des lettres et numéros (comme un code chimique pour repérer de quel produit on parle) et un numéro unique qu'on appelle CAS.
2. **Le nom de l'entreprise :** C'est le fournisseur de la bouteille chimique, pour savoir d'où elle vient.
3. **Les fameux pictogrammes de danger :** Ce sont les symboles. Avant dans les vieux lycées, c'étaient des petits carrés orange avec des dessins noirs. Maintenant c'est devenu très clair : ce sont toujours des losanges avec un contour très rouge, avec le fond blanc. Dès qu'on voit un feu ou une tête de mort, on s'attarde et on fait attention.
4. **Le grand mot d'alerte :** Si le risque est mortel ou très fort, ce sera le mot "DANGER". S'il y a un risque moins embêtant, par exemple un produit qui donne un peu la rougeur sur la peau, on marque "ATTENTION".
5. **Les Mentions de danger (Phrases H) :** Ce sont des petites phrases très courtes qui expliquent le problème, comme par exemple la fameuse phrase "H225 : Liquide très inflammable" ou "H314 : Provoque de graves brûlures". Le "H" vient du mot anglais pour danger, Hazard.
6. **Les Conseils de prudence (Phrases P) :** Ça, c'est encore plus précieux ! C'est ce qu'il faut faire pour se protéger et pour éviter l'explosion. Comme "P210 : Tenir loin des étincelles et du feu", ou "P280 : Porter des gants obligatoires".

Toujours derrière ces informations, il y a un document très grand (parfois 15 pages !) qu'on appelle la Fiche de Données de Sécurité (la grande FDS). Dans nos vieux modèles de lycées, cette FDS est cachée dans un tiroir. ChimioLab permettra de l'avoir en version PDF d'un seul glissement de doigt sur le menu de l'application.

#### II.2.2 Les équipements de protection au sein du laboratoire

Savoir qu'un produit est très dangereux ne suffit pas, il faut ensuite s'en protéger activement en utilisant ce qu'on appelle les Équipements de Protection. Même si on a un petit TP facile, il y a deux manières de se protéger, en portant des EPI ou grâce aux EPC.

* **Les Équipements de Protection Individuelle (EPI) :** C'est simplement tout ce que l'élève, ou le préparateur, ou l'enseignant va porter sur lui-même comme un vêtement. Ce qui est totalement obligatoire en chimie, c'est la blouse. Mais pas n'importe laquelle, c'est très important qu'elle soit faite à 100% en coton. Si c'est en matière synthétique, en cas d'accident avec du feu, le tissu va fondre sur la peau de l'étudiant et ce serait très grave. La blouse doit être longue pour protéger le pantalon et être boutonnée. Ensuite, l'accident le plus commun en classe de sciences ce sont des petites gouttes qui sautent lors du chauffage et qui partent dans les yeux. Il faut donc porter des lunettes de protection avec des plastiques sur les côtés. Et enfin, pour manipuler l'acide et la soude pure, le préparateur utilise des gants. Il y a des gants en nitrile, d'autres en latex, ils changent selon la matière chimique pour ne pas que le produit traverse.
* **Les Équipements de Protection Collective (EPC) :** C'est le matériel installé par l'état dans la salle pour protéger toute la classe entière. La pièce maîtresse est la hotte aspirante (souvent appelée "sorbonne"). C'est comme une vitrine fermée en verre, avec un gros tuyau aspirateur par le haut. Si on va chauffer un produit qui lâche du gaz toxique qui pique la gorge, on le fait à l'intérieur en fermant la vitre, et le vent de l'aspirateur va jeter cette mauvaise fumée dehors en haut du toit du lycée. Bien sûr, le labo possède des extincteurs contre les flammes, et du matériel plus spécialisé : un endroit avec de l'eau qu'on appelle Lave-Oeil (utile si un élève reçoit un acide au visage) et parfois une grosse douche au plafond en cas de feu sur quelqu'un ou de versement sévère sur la peau pour rincer très vite avant que les brûlures graves ne s'échappent.

Le gros point positif pour ChimioLab, c'est de créer l'intelligence sur la plateforme. Quand un professeur décide d'utiliser tel produit chimique comme l'acide formique, la plateforme va lancer automatiquement un signal clignotant : "Attention, vous avez choisi l'acide, n'oubliez pas les gants obligatoires et la ventillation". 

#### II.2.3 Les grandes classes de danger

Pour que les chimistes puissent classer tous les dangers, le règlement SGH n'a pas fait qu'une seule famille, parce que les problèmes ne sont pas tous pareils. Ils ont partagé tout ça en sous-catégories selon si ça tape au physique ou à la santé humaine. On trouve au total 33 types de problèmes, divisés dans trois familles principales :

**Tableau 2 : Classification détaillée des dangers selon le règlement officiel**

| Groupe de Catégorie | Ce que ça veut dire et les sous-classes |
|-----------|---------------------------------|
| **Les Dangers Physiques (17 domaines)** | Ce sont les produits qui risquent de détruire le labo de manière physique ou violente. Par exemple les produits très inflammables, ceux qui explosent tout seul avec la chaleur, ou encore de simples bouteilles de gaz qui sont gardées sous trop de pression et qui peuvent éclater. |
| **Les Dangers pour la Santé (11 domaines)** | Ce sont les problèmes liés de façon très intime avec le corps humain (intoxication, poison, brûlures chimiques). C'est ceux qui font des irritations sur la peau, une forte toux si on respire, qui attaquent les yeux. Une chose que les gens redoutent beaucoup c'est les produits cancérigènes. |
| **Les Dangers pour l'Environnement (4 domaines)** | Ici le produit n'est pas trop toxique pour la main, mais si le préparateur le jette bêtement dans le lavabo avec l'eau, il ira à la nappe d'eau ou la rivière et il empoisonnera totalement les poissons. C'est pour ça qu'on utilise des poubelles spéciales appelées bacs de récupération. |

---

### II.3 La technologie et l'outil numérique dans l'environnement scolaire actuel

#### II.3.1 Les difficultés chroniques de gestion dans les établissements marocains

Actuellement dans nos classes, au Maroc et dans beaucoup d'autres pays, la réalité est parfois loin de l'idéal. Certains laboratoires sont devenus très vieux. Mais le plus grand mal caché, c'est le problème de "l'accumulation". Les étagères sont remplies de centaines de pots de produits, mal étiquetés ou même complètement périmés, achetés plusieurs décennies en arrière. Personne ne sait plus vraiment s'ils gardent leurs propriétés, certains produits sont devenus mystérieux : leur étiquette initiale en papier s'est jaunie avec le soleil ou s'est effacée.

Gérer ces vieux produits sans se brûler devient le quotidien normal mais difficile des gens du laboratoire :
- Que faire avec un flacon très ancien qui peut réagir bizarrement ? L'achat de nouvelles armoires ventilées coûte très cher, l'administration fait donc avec les moyens du bord.
- Ensuite vient la pression du peu de temps et du fait qu'il manque de personnel : bien souvent un seul préparateur doit desservir un étage entier, pour plusieurs professeurs qui demandent des choses différentes en même temps. Le pauvre technicien est surchargé, il finit par perdre le suivi, ne peut plus tenir le grand registre d'inventaire sur les cahiers, en laissant des erreurs. 
- Lorsque quelqu'un part à la retraite et qu'un jeune arrive : le jeune stagiaire trouve des centaines de produits rangés sans méthode, avec des vieux livrets... et doit tout réapprendre seul. 

C'est là qu'une plateforme Web comme ChimioLab intervient, stockant tout sur Internet pour ne jamais rien perdre !

#### II.3.2 L'importance d'adopter le numérique dans l'Éducation Nationale

L'école marocaine évolue. L'état a donné aux élèves et enseignants des ordinateurs, des tableaux blancs et des programmes comme le plan GENIE. Pourtant, en coulisse, la réserve de produits chimiques est restée à l'âge du stylo bic et du bout de carton.

Amener un téléphone, un ordinateur et un outil pensé tel que "ChimioLab", c'est soulager le personnel des corvées ennuyeuses et répétitives mais risquées :
* Fini les dossiers raturés pour gérer les flacons. 
* En un clic en fin d'année, le préparateur lance un bilan et voit exactement ce qu'il a consommé et ce qu'il faut racheter pour le directeur.
* Le prof peut faire ses demandes depuis son téléphone le soir dans son salon, et le lendemain le préparateur voit la liste affichée sur son écran de travail. Cette "collaboration" moderne donne beaucoup d'énergie aux enseignants pour se concentrer sur ce qu'ils font de mieux : bien enseigner aux élèves.

---

### II.4 La technologie QR comme outil innovant

#### II.4.1 Pourquoi amener ce QR code au laboratoire ?

Devant la montagne de règles de sécurité dont on a parlé, le format "étiquette papier" qu'on doit coller sur un petit flacon montre depuis des années qu'il pose problème. Ça vieillit mal, ça s'efface vite et il n'y a de place que pour deux petites phrases.  
C'est ici qu'intervient le QR code. Le projet ChimioLab l'utilise comme un pont rapide ou une passerelle magique entre notre réalité à l'école et la quantité énorme de données qu'on peut cacher dans le "cloud" d'internet. 

Aujourd'hui, tous les élèves ont l'habitude d'utiliser leur téléphone pour scanner un logo au café pour voir le menu. Alors pourquoi ne pas faire pareil au cœur de l'école pour s'informer sur les dangers d'une manière moderne et cool ? 

#### II.4.2 C'est quoi un code QR exactement ?

On l'appelle "Quick Response Code" qui veut dire le Code à Réponse Rapide (QR code). C'est un code-barre en forme de carré (on dit bidimensionnel) qui a été créé au Japon en 1994, pour repérer vite les pièces de voitures dans une usine Toyota. 

*[INSÉRER IMAGE ICI]*
**Figure 4 : Comparaison entre un code-barres classique (1D) et un code QR matriciel (2D) utilisé par ChimioLab**

Plutôt qu'un vieux code à rayures, ce petit carré avec trois gros carrés dans les coins peut contenir beaucoup plus de données (des milliers de lettres ou un lien de site internet très long). Mais son meilleur atout, c'est que même s'il est un peu taché d'encre ou déchiré, l'appareil photo du téléphone arrive à le réparer et le comprendre. C'est idéal pour un laboratoire un peu sale et exigeant !

#### II.4.3 Les vrais avantages majeurs pour les professeurs et préparateurs 

L'intégration de tous ces carrés pixels imprimables à partir de l'ordinateur de ChimioLab apporte des vrais atouts imbattables :
* **Une vraie rapidité en cas d'urgence :** Face à un vieux flacon effacé, on scanne et hop ! On télécharge en deux secondes sa grande fiche FDS de 15 pages sur l'écran du mobile. Ça aide énormément s'il y a un accident pour vite voir la procédure de secourisme, on ne perd pas dix minutes à fouiller une vieille armoire d'archives pleines de poussière.
* **Gérer les stocks sur le terrain (in situ) :** C'est une révolution du confort pour le préparateur ! Plus la peine de noter au brouillon ce qu'il enlève de l'étagère. Il vient avec son téléphone, il scanne le flacon qu'il jette parce qu'il est vide, et c'est fini, tout se raye automatiquement de la base de données. 
* **Favoriser une dynamique d'apprentissage aux jeunes :** C'est le plus gros argument pédagogique. Les pauvres élèves sont souvent tentés d'être sur leurs mobiles qu'on essaie souvent d'interdire bêtement. Au contraire, ici on utilise ça pour l'apprendre. S'ils sont autorisés à lancer leur scan tout seuls sur les produits de la paillasse avant l'expérience, la leçon devient un jeu interactif dans un environnement vraiment moderne. Ils vérifieront de leurs propres yeux s'ils ont besoin de lunettes ou non, ce qui va beaucoup plus leur marquer la mémoire qu'une longue leçon ennuyeuse notée au tableau ! L'implication et l'intérêt des élèves grimpent en flèche avec ce genre de technologie éducative.
