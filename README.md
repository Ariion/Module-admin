# Module Admin

Interface d'édition visuelle pour sites statiques **codés à la main**.

Un client sans compétence technique se connecte, clique sur un texte, une image
ou un lien de son propre site, le modifie, et publie. Le site reste un site
statique : aucun serveur applicatif, aucun CMS, aucun build. Le module se
greffe sur du HTML existant sans qu'il faille le préparer.

```html
<!-- Les deux seules lignes à ajouter à une page -->
<script src="/admin-config.js"></script>
<script type="module" src="/admin/runtime.js"></script>
```

## Ce que ça fait

| | |
|---|---|
| **Détection automatique** | Le module analyse le DOM et repère seul les textes, images (y compris les fonds CSS), liens et blocs répétables. Rien à annoter dans le HTML. |
| **Guide pas à pas** | La vue qui s'ouvre en premier, et la seule dont on ait besoin quand on n'a jamais fait de site : la page **de haut en bas**, une étape par partie, dans chacune les champs à remplir nommés en français courant (« Le titre », « Où mène ce bouton ? ») avec une phrase d'explication. Une jauge dit ce qu'il reste. Le texte encore issu du modèle est signalé comme tel, donc rien ne part en ligne en affichant « Le titre de votre site ». |
| **Éditeur à panneau latéral** | Le site dans un aperçu, les réglages à gauche : guide, éléments, structure de la page, bibliothèque média. Aperçu ordinateur / tablette / mobile. **Entrer dans un champ met en évidence l'élément correspondant dans la page** et l'amène à l'écran : le panneau et l'aperçu sont un seul outil. |
| **Les outils, rangés** | Un bouton *Outils du site* ouvre la liste complète — écrire ma page, partir d'un modèle, changer l'ambiance, vendre des produits, pages légales, réglages — chacun avec une phrase disant à quoi il sert, groupés par moment. |
| **Édition en place** | Survol = contour, clic sur un texte = édition directe, clic sur une image = panneau d'upload, clic sur un lien = champ d'adresse. |
| **Sites de plusieurs pages** | Créer une page, la nommer (titre et description pour les moteurs), poser un menu pré-rempli avec les pages connues. Le module retient les pages ouvertes : une page toute neuve, que rien ne pointe encore, reste joignable. L'assistant se relance sur chaque page vierge. |
| **Pages du site** | Le nom de la page, en haut de l'aperçu, ouvre la liste des pages — déduite des liens du site. On y change de page, et on en crée une nouvelle, copiée sur une page existante (demande un hébergement inscriptible). |
| **« Je ne sais pas quoi mettre »** | Un questionnaire — nom, secteur, ville, prestations, coordonnées — et le module **écrit la page entière** : accroche, prestations, présentation, coordonnées, plan, photos, et une ambiance accordée au métier. Les phrases viennent d'un fonds écrit par secteur dans lequel les mots du client sont insérés : aucun réseau, aucune clé, aucun abonnement. Le guide signale ensuite ce qui vient du fonds et reste à relire. |
| **Rédaction par IA (facultative)** | Branchée, elle remplace **les phrases**, jamais le plan de la page ni les images. La clé vit dans le script PHP du client, invisible du navigateur ; à défaut, dans le `localStorage` de l'administrateur — **jamais** dans `admin-config.js`, qui est public. Si elle échoue, le fonds écrit reprend la main : la page se construit quand même. Voir [docs/IA.md](docs/IA.md). |
| **Modèles de page** | Sept trames complètes — accueil une page, page de vente, portfolio, contact, à propos. À ajouter à la suite ou à substituer à la page. |
| **Modèles de section** | Huit mises en page prêtes à l'emploi, proposées au moment de créer la section : trois colonnes, image et texte, appel à l'action, galerie… |
| **Mises en page composées** | Un **bandeau d'accueil** (image plein cadre, voile réglable, texte par-dessus, jusqu'au plein écran), des **cartes image** (le titre posé sur la photo, avec dégradé), des **colonnes en proportions** (un tiers / deux tiers…) et des **étiquettes** en capitales espacées. C'est ce qui permet de composer une page au lieu d'empiler des blocs dans une colonne centrée. |
| **Bibliothèque d'éléments** | Titre, texte, bouton, liste, image, vidéo, carte, colonnes, séparateur, espaceur — recherche, catégories, glisser-déposer dans l'aperçu. Le balisage émis est sémantique et sans classes : la feuille de style du site s'y applique d'elle-même. |
| **Sections de page** | Ajouter une section vide et la remplir d'éléments, ou copier une section existante du site. Retirer, réordonner, remettre. |
| **Ambiances** | Neuf thèmes complets — Sobre, Chaleureux, Élégant, Nuit, Naturel, Punchy, Pro, Magazine, Brut. Chacun décide d'un coup des polices, des couleurs, de la forme des boutons et du rythme vertical : sans cela, tous les modèles de page se ressemblent sur une page vierge, faute de style à hériter. Sur un site existant, l'ambiance ne s'applique par défaut **qu'aux parties ajoutées** — le code du client n'est pas repeint sans qu'on le demande. La feuille de style produite est écrite dans le HTML régénéré : le site garde son allure même sans le module. |
| **Images d'exemple** | Huit visuels dessinés en SVG à partir des couleurs de l'ambiance retenue. Aucun réseau, aucune clé d'API, aucune question de droits — de quoi voir à quoi ressemblera la page avant d'avoir ses propres photos. |
| **Habillage complet** | Police (48 familles Google Fonts rangées par nature, chargées à la demande), taille, graisse, casse, interlignage, espacement, couleurs, marges, contour et son style, angles, ombre, opacité — et du **CSS personnalisé** avec sélecteur, pour les états `:hover`. |
| **Placement libre, à la souris** | Chaque bloc porte une **poignée** : on l'attrape et on le pose où l'on veut dans sa section. Pendant le geste, des **repères d'alignement** apparaissent — centre de la section, bords des voisins — et le bloc s'y accroche ; les **distances aux blocs d'en face** s'affichent en pixels. Maj bloque un axe, Alt désactive l'aimant. Largeur, alignement, décalage et rotation restent réglables au pixel près. Le décalage est une transformée, pas une marge : le bloc bouge, la mise en page autour ne bronche pas. |
| **Images libres de droits** | Recherche **sans aucune clé** via Openverse, restreinte aux licences qui n'obligent à créditer personne. Une clé Pixabay gratuite, saisie depuis les réglages du module, donne accès à un catalogue plus large. Sur un hébergement PHP, l'image choisie est rapatriée dans le dossier du site plutôt que pointée à distance. Voir [docs/IMAGES.md](docs/IMAGES.md). |
| **Les clés se saisissent depuis le module** | Bouton *Réglages* : clé de la banque d'images, clé de rédaction. Aucun fichier à ouvrir. Les deux ne sont pas traitées pareil — celle de Pixabay est gratuite et rejoint les réglages du site ; celle de l'IA est facturée, part vers le script PHP de l'hébergement et **n'en revient jamais** (le module sait qu'une clé existe, pas laquelle). |
| **Prévisualisation** | Le panneau s'efface, le site prend tout l'écran, et une barre noire dit où l'on est : *Mode prévisualisation*, avec *Retourner à la modification* et *Aller sur le site*. Les liens sont cliquables — on parcourt le site page par page. Si des modifications ne sont pas publiées, la barre le signale. |
| **Effets et animations** | Une bibliothèque dans l'habillage de chaque bloc : **au survol** (s'élever, grandir, s'éclaircir, zoomer l'image à l'intérieur, souligner d'un trait qui se déploie…), **au clic** (s'enfoncer, éclair), et **à l'apparition au défilement** (fondu, monter, glisser…), avec quatre vitesses. Survol et clic sont du CSS pur : ils marchent même sans le module. L'apparition est conditionnée à une marque que seul le module pose — **sans JavaScript, le bloc reste simplement visible**. Tout respecte « animations réduites ». |
| **Blocs répétables** | Dupliquer, réordonner, supprimer une carte de la liste — dans le gabarit prévu par le développeur, sans pouvoir casser la mise en page. |
| **Brouillon puis publication** | Enregistrement automatique du brouillon, bouton « Publier », historique des versions et restauration. |
| **Tout recommencer** | Un outil rend au site son code d'origine — cette page seulement, ou le site entier avec l'ambiance et le catalogue. La fenêtre montre ce qui est effacé et ce qui ne l'est pas : le code du client, la bibliothèque média et l'historique restent intacts. L'opération publie un contenu vide au lieu de supprimer quoi que ce soit, donc **on peut revenir en arrière depuis l'historique**. |
| **Ne casse jamais le site** | Firebase injoignable, base vide, contenu illisible : la page s'affiche avec son HTML d'origine. Aucune exception ne remonte. |
| **Le module reste optionnel** | À chaque publication, le fichier `.html` de l'hébergement est **réécrit avec le contenu à l'intérieur**. Le client peut supprimer le module quand il veut : son site garde tout, sans aucune manipulation. |
| **Appels à l'action** | Un bouton peut ouvrir une fenêtre au lieu de quitter la page : au centre, à droite, à gauche, en bas, en plein écran. Six modèles de remplissage — réservation, contact, horaires, carte, vidéo, libre — posent un contenu déjà écrit, et la fenêtre accepte une image, des boutons et un contenu intégré (module de réservation, formulaire, plan). Le lien reste le repli si le module est retiré. |
| **En-tête et pied de page communs** | Ce qui est modifié dans un `<header>` ou un `<footer>` est enregistré à part et s'applique à **toutes les pages** : le client corrige son téléphone une fois, pas page par page. L'éditeur le signale au moment de la modification. |
| **Pages légales rédigées** | Mentions légales, politique de confidentialité, conditions générales de vente. Le client répond à un questionnaire — qui il est, ce qu'il collecte, ce qu'il vend — et chaque réponse décide des clauses écrites. Les pages sont créées et publiées ; la liste des hébergeurs courants évite l'erreur classique sur la mention d'hébergement. |
| **Copyright à jour** | Un élément Copyright affiche l'année en cours, recalculée à chaque affichage. `{{année}}` fonctionne aussi dans un titre ou un texte inséré. |
| **Boutique** | Un catalogue de produits — physiques (avec poids) ou virtuels — géré depuis le module : nom, description, prix, devise, image, catégorie. Le paiement est délégué : Stripe Payment Link, Gumroad, Lemon Squeezy, PayPal, ou n'importe quelle adresse de vente. Le bouton emmène l'acheteur chez le vendeur, rien n'est encaissé sur le site. Au choix, un panier Snipcart sur le site. Deux éléments : **Catalogue** (tous les produits, ou une catégorie) et **Produit** (une fiche seule). |
| **Bibliothèque média interne** | Onglet « Médias » : glisser-déposer des fichiers, ajout par adresse (une image du site, une vidéo YouTube, un MP3 hébergé ailleurs), recherche, filtres par famille — images, vidéos, audio, fichiers — copie de l'adresse et suppression. Elle alimente tous les réglages qui demandent un média. |
| **Images sans abonnement** | Firebase Storage, ou un simple dossier sur l'hébergement du client (script PHP fourni), ou une adresse saisie à la main. Le script PHP accepte aussi l'audio et la vidéo (48 Mo), servis depuis le domaine du site. |

## Vendre le module

```bash
npm run livraison
```

Fabrique `livraison/module-admin-<version>.zip` : le module, le script PHP,
les règles Firebase, une page vierge prête, la page d'installation guidée, la
démonstration, la documentation et la licence. Ni les essais internes ni le
code d'un site client ne s'y trouvent.

L'acquéreur extrait l'archive dans son dossier, sert celui-ci, et ouvre
`installation.html` : la page le mène de la création du projet Firebase
jusqu'à la vérification, en fabriquant son fichier de configuration au
passage. S'il part d'une page vide, un assistant lui pose deux questions et
construit la page. S'il a déjà un site, son code reste intact — le module s'y
accroche.

## Vérifier la saisie

```bash
npm i -D playwright && npx playwright install chromium
npm run essai-clavier -- http://localhost:8080/index.html
```

Tape tout l'alphabet — minuscules et majuscules —, les chiffres, les accents
et la ponctuation, dans les deux endroits où l'on écrit : le texte
directement dans l'aperçu, et le champ du panneau. Puis reprend les 62
touches une par une. Sert à répondre sans hésiter à « telle lettre ne
s'écrit pas » : le script dit exactement laquelle, et où.

## Mettre en ligne

```bash
npm run paquet -- --site=hotel-des-pins --projet=mon-projet-firebase
```

Fabrique le dossier `paquet/` à téléverser tel quel à la racine du site :
le module, le script PHP avec le projet déjà renseigné, la configuration à
compléter, le dossier des médias et la marche à suivre. Le guide complet, avec
la création du projet Firebase et la liste de vérification, est dans
[`docs/MISE-EN-LIGNE.md`](docs/MISE-EN-LIGNE.md).

## Essayer en trois minutes

```bash
npx http-server -p 8080 .
# puis http://localhost:8080/demo/index.html?admin
```

La démo tourne sur un back-end local (`localStorage`) : n'importe quel
identifiant ouvre la session, rien ne sort du navigateur. Modifiez un titre,
publiez, rechargez la page sans `?admin` — le contenu publié est là.

Pour la production, remplacez `backend: 'demo'` par vos clés Firebase :
[docs/INSTALLATION.md](docs/INSTALLATION.md).

## Arborescence

```
admin/                    le module (à copier tel quel sur un site)
├── runtime.js            chargé par les visiteurs — applique le contenu publié
├── core/
│   ├── config.js         valeurs par défaut et fusion de la configuration
│   ├── identity.js       identifiants stables sans toucher au HTML
│   ├── scanner.js        détection des éléments éditables
│   ├── collections.js    blocs répétables
│   ├── binder.js         écriture du contenu dans le DOM
│   ├── model.js          modèle de page (DOM ↔ contenu stocké)
│   ├── sanitize.js       assainissement HTML et URL
│   ├── dom.js util.js log.js
├── data/
│   ├── schema.js         chemins Firestore
│   ├── rest.js           lecture publique sans SDK
│   ├── firebase.js       back-end éditeur (SDK chargé à la demande)
│   └── memory.js         back-end de démonstration
├── core/bake.js          régénération du HTML avec le contenu publié
├── core/sections.js      ajout, retrait et ordre des sections de page
├── core/widgets.js       catalogue d'éléments et rendu
├── core/templates.js     modèles de section
├── core/boutique.js      produits, prix, bouton d'achat, panier
├── core/theme.js         ambiances : polices, couleurs, formes, rythme
├── core/brief.js         le questionnaire et ses fonds par métier
├── core/redacteur.js     du brief à la page écrite, sans réseau
├── core/ia.js            rédaction par IA, facultative
├── core/guide.js         le parcours pas à pas, déduit de la page
├── core/reset.js         rendre au site son code d'origine
├── core/reperes.js       repères d'alignement et distances (sans DOM)
├── core/effets.js        survol, clic, apparition au défilement
├── core/illustrations.js images d'exemple dessinées d'après l'ambiance
├── core/page-templates.js modèles de page entière
├── core/fonts.js         polices et chargement à la demande
├── core/pages.js         découverte des pages du site
├── core/style.js         schéma d'habillage et CSS personnalisé
├── core/frame.js         chargement d'une page dans une iframe
├── data/host.js          dialogue avec l'hébergement (copie source, écriture)
├── media/
│   ├── firebase-storage.js  Firebase Storage
│   ├── endpoint.js          dossier chez le client
│   ├── url.js               adresse saisie
│   ├── openverse.js         banque d'images sans clé
│   └── resize.js            recompression avant envoi
└── ui/                   éditeur (chargé uniquement pour les administrateurs)
    ├── shell.js          coque : panneau à gauche, aperçu à droite
    ├── guide-panel.js    le guide : la page de haut en bas
    ├── brief-panel.js    questionnaire « écrire ma page »
    ├── reglages-panel.js les clés, saisies depuis le module
    ├── outils-panel.js   les outils du site, groupés et nommés
    ├── apercu-page.js    miniature d'un modèle, aux couleurs du site
    ├── reset-panel.js    « tout recommencer » : ce qui part, ce qui reste
    ├── theme-panel.js    choix de l'ambiance
    ├── widgets-panel.js  bibliothèque d'éléments
    ├── inspector.js      réglages de l'élément choisi
    ├── navigator.js      structure de la page
    ├── boutique-panel.js gestion du catalogue de produits
    └── library.js        bibliothèque média (dépôt, ajout par adresse, filtres)

demo/                     site de démonstration complet
essais/domaine-lamartine/ test sur un site client réel (code brut + module)
firebase/                 règles de sécurité Firestore et Storage
tools/admin-endpoint.php  script serveur : médias + réécriture du HTML
tools/paquet.mjs          fabrique le dossier à téléverser chez le client
tools/livraison.mjs       fabrique l'archive vendue à l'acquéreur
distribution/             les fichiers destinés à l'acquéreur (licence, guides)
docs/                     architecture, installation, mise en ligne, IA, images
```

## Points d'architecture

Les deux décisions structurantes sont détaillées dans
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) :

1. **Les identifiants ne sont pas écrits dans le HTML.** Ils sont calculés à
   partir de la position et du contenu de chaque élément, et retrouvés par une
   cascade de quatre stratégies. Republier un HTML modifié (paragraphe ajouté,
   classe changée, section déplacée) ne perd pas le contenu.
2. **Le visiteur ne charge presque rien.** Le contenu publié est lu par une
   requête REST, sans SDK Firebase. L'éditeur — interface, authentification,
   stockage — n'est téléchargé que pour les personnes connectées.
3. **Le HTML est réécrit à chaque publication.** Le module recharge le code
   d'origine de la page dans une iframe cachée, lui applique le contenu publié
   et repose le fichier sur l'hébergement. Le site n'a donc jamais besoin du
   module pour afficher son contenu — le module ne sert qu'à le modifier.

## Licence

Non déterminée. Le code est écrit pour être réutilisé projet par projet et,
le cas échéant, distribué comme produit.
