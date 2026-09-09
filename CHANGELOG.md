# Journal des versions

## 1.5.0

**« Je ne sais pas quoi mettre » — le module écrit la page**
- Nouveau questionnaire : nom de l'activité, secteur, ville, ce qu'on
  propose, ce qui est vrai chez soi (cases à cocher), coordonnées, ton.
- À la fin, la page entière est écrite : accroche, prestations,
  présentation, coordonnées, plan, photos, et une ambiance accordée au
  métier. Le client arrive sur le guide avec une page remplie.
- Les phrases viennent d'un fonds écrit par secteur — douze métiers — dans
  lequel les mots du client sont insérés. Aucun réseau, aucune clé, aucun
  abonnement : c'est le mode par défaut, et il est complet.
- Le guide distingue les deux origines : ce qui vient du fonds est signalé
  « à relire », ce que le client a écrit ne l'est pas.
- Les photos viennent de la banque libre de droits quand une clé Pixabay est
  configurée (et sont rapatriées sur l'hébergement), sinon des visuels
  dessinés d'après l'ambiance. La page est illustrée dans tous les cas.
- Accessible depuis l'assistant de démarrage, depuis le pied du panneau, et
  depuis la dernière étape du guide.

**Rédaction par IA — facultative**
- Branchée, elle remplace **les phrases**, jamais le plan de la page, les
  sections ni les images. Si elle échoue — clé absente, quota, réponse
  illisible, réseau — le fonds écrit reprend la main et la page se construit
  quand même.
- La réponse est lue champ par champ : ce qui déborde des longueurs prévues
  est ignoré, un titre de prestation saisi par le client n'est jamais
  réécrit.
- La clé se met dans `admin-endpoint.php`, sur l'hébergement du client :
  le navigateur ne la voit jamais, le script vérifie le jeton Firebase, et
  un quota journalier par compte borne la dépense. À défaut, une clé rangée
  dans le `localStorage` de l'administrateur.
- **Jamais dans `admin-config.js`**, qui est servi à tous les visiteurs. Le
  module n'offre aucun réglage pour le faire.
- Anthropic, OpenAI et Mistral. Voir `docs/IA.md`.

## 1.4.1

**Prévisualisation**
- Le bouton d'aperçu ouvre désormais une vraie prévisualisation : le panneau
  s'efface, le site occupe tout l'écran. Auparavant il ne faisait que couper
  la surcouche de sélection, ce qui ne montrait rien de plus.
- Une barre noire en haut dit « Mode prévisualisation », et porte à droite
  deux boutons : *Retourner à la modification* et *Aller sur le site*.
- Les liens sont cliquables : on parcourt le site page par page, et la
  prévisualisation tient bon d'une page à l'autre. Échap en sort.
- Quand des modifications ne sont pas publiées, la barre le signale : ce qui
  s'ouvrira avec *Aller sur le site* ne les contiendra pas.

**Correction importante**
- La régénération du HTML pouvait perdre la fin de la page — donc la balise
  `<script>` du module. Le site restait juste, mais **le client ne pouvait
  plus l'éditer** : rouvrir la page avec `?admin` ne chargeait plus rien.
  Le recollage de fin de page se fiait au nombre de blocs présents ; ajouter
  une section en bas de page décalait ce compte d'exactement ce qui manquait,
  et le recollage n'avait plus lieu. Ce nombre est désormais relevé avant
  toute modification.

## 1.4.0

**Le Guide : la page de haut en bas**
- Nouvelle vue, ouverte en premier : la page reprise partie par partie, dans
  l'ordre où on la lit, et dans chacune les champs à remplir — nommés en
  français courant, avec sous chaque champ une phrase qui dit quoi y mettre.
- Une jauge indique ce qu'il reste. Chaque partie porte le nombre de champs
  encore vides, et se coche quand elle est finie.
- Le texte livré dans les modèles est marqué comme exemple tant qu'il n'a pas
  été remplacé : une page ne peut plus partir en ligne en affichant
  « Le titre de votre site » sans qu'on l'ait vu.
- Le Guide marche aussi sur un site existant : il reprend les textes, images
  et liens détectés dans le code du client.

**Ambiances**
- Neuf thèmes complets — Sobre, Chaleureux, Élégant, Nuit, Naturel, Punchy,
  Pro, Magazine, Brut. Chacun décide d'un coup des polices, des couleurs, de
  la forme des boutons et du rythme vertical.
- C'est ce qui manquait : les modèles de page n'apportent que la structure,
  donc sur une page vierge — où il n'y a aucun style à hériter — ils rendaient
  tous exactement la même chose.
- L'assistant pose la question au moment de construire la page, une seule fois
  pour tout le site.
- Sur un site existant, l'ambiance ne s'applique par défaut **qu'aux parties
  ajoutées** : le code du client n'est pas repeint sans qu'on le demande. Le
  choix « sur tout le site » reste possible.
- La feuille de style produite est écrite dans le HTML régénéré : le site garde
  son allure même une fois le module retiré.

**Images d'exemple**
- Huit visuels dessinés en SVG à partir des couleurs de l'ambiance retenue,
  proposés sous chaque champ image. Aucun réseau, aucune clé d'API, aucune
  question de droits.

**Corrections**
- Les colonnes gardaient leur nombre de pistes sur téléphone : trois colonnes
  restaient trois colonnes, larges de rien. Elles se replient désormais.

## 1.3.0

**Boutique**
- Catalogue de produits dans le module : nom, description, prix, devise,
  image, catégorie, disponibilité.
- Produits **physiques** (avec poids) et produits **virtuels**.
- Deux façons d'encaisser :
  - **page de paiement externe** — Stripe Payment Link, Gumroad,
    Lemon Squeezy, PayPal, ou n'importe quelle adresse : le bouton emmène
    l'acheteur chez le vendeur, rien n'est encaissé sur le site ;
  - **panier sur le site** — Snipcart, ajouté à la page à la demande.
- Deux éléments dans la bibliothèque : **Catalogue** (tous les produits, ou
  une catégorie) et **Produit** (une fiche seule).

**Corrections**
- Sur un site déjà régénéré, les sections ajoutées par le module
  apparaissaient **en double** pour le visiteur : la régénération effaçait le
  marqueur de section, et le module ne reconnaissait plus ce qu'il avait
  lui-même écrit. Le marqueur est désormais conservé, et une section déjà
  présente est remplacée sur place au lieu d'être ajoutée à la suite.

## 1.2.1

**Construire un site de plusieurs pages depuis une page blanche**
- L'assistant se propose aussi après un changement de page : une page qu'on
  vient de créer est vierge, et c'est là qu'on a le plus besoin d'aide.
- Le module se souvient des pages ouvertes : une page créée à l'instant, que
  rien ne pointe encore, reste joignable depuis la liste.
- Élément **Menu** : une ligne par entrée, pré-rempli avec les pages connues.
- **Nom et description de la page**, modifiables depuis la liste des pages.
  Ils s'écrivent dans le `<title>` et la balise description, et sont donc
  repris à la régénération du HTML.

**Corrections**
- Créer une page ne vidait pas la sauvegarde en attente : ce qui venait
  d'être saisi était perdu au rechargement.

## 1.2.0

**En-tête et pied de page**
- Ce qui est modifié dans un `<header>` ou un `<footer>` est enregistré dans
  un document commun au site et appliqué à toutes les pages.
- L'éditeur signale la portée au moment de la modification.

**Pages légales**
- Questionnaire en trois écrans : documents voulus, identité de l'éditeur,
  puis ce que fait le site (formulaire, réservations, paiement, expédition,
  audience, contenus intégrés…).
- Rédige les mentions légales, la politique de confidentialité et les
  conditions générales de vente. Les clauses non concernées ne sont pas
  écrites du tout.
- Liste d'hébergeurs courants avec la mention légale exacte.
- Sur un hébergement inscriptible, chaque document devient une page créée et
  publiée ; sinon il est ajouté à la page ouverte.

**Copyright**
- Élément Copyright : année en cours recalculée à chaque affichage, période
  « 2018–2026 » si une année de création est renseignée.
- Jeton `{{année}}` utilisable dans les titres et textes insérés.

**Correction importante**
- La régénération du fichier `.html` visait toujours la page par laquelle on
  était entré dans l'éditeur : publier depuis une autre page écrasait
  l'accueil avec le contenu de celle-ci.

## 1.1.0

**Appels à l'action**
- Un bouton ou un lien peut ouvrir une fenêtre au lieu de quitter la page :
  au centre, à droite, à gauche, en bas, en plein écran.
- Six modèles de remplissage — réservation, contact, horaires, carte, vidéo,
  libre — posent un titre, un texte et des boutons déjà écrits.
- La fenêtre accepte une image, jusqu'à quatre boutons, une largeur, et un
  contenu intégré : module de réservation, formulaire, plan, vidéo.
- Le `href` reste renseigné : sans le module, le clic repart vers l'adresse.

**Habillage**
- 48 familles de polices, rangées par nature dans le panneau.
- Style de contour, opacité.
- Placement libre : largeur du bloc, alignement dans la section, décalage
  horizontal et vertical, rotation.

**Médias**
- Banque d'images libres de droits (Pixabay, clé d'API gratuite). Sur un
  hébergement PHP, l'image est rapatriée dans le dossier du site.

## 1.0.0

Première version publiée.

**Édition**
- Détection automatique des textes, images (y compris les fonds CSS), liens et
  blocs répétables. Aucune annotation à écrire dans le HTML.
- Identifiants calculés à partir de la structure du document : ils survivent à
  une republication du code, y compris après ajout de sections, changement de
  classes ou reformulation de textes.
- Édition en place : survol, clic, saisie directe dans la page.
- Éditeur à panneau latéral, site affiché dans un aperçu isolé, formats
  ordinateur / tablette / mobile.
- Panneau adapté au téléphone : le panneau devient une feuille qui se replie.

**Construction de pages**
- Sections : ajout d'une section vide, copie d'une section existante, huit
  modèles de mise en page, retrait, réordonnancement.
- Éléments : titre, texte, bouton, liste, image, vidéo, audio, carte,
  colonnes, séparateur, espaceur — recherche, catégories, glisser-déposer.
  Le balisage émis est sémantique et sans classes : la feuille de style du
  site s'y applique d'elle-même.
- Cinq modèles de page entière.
- Habillage complet : polices (16 familles Google Fonts chargées à la
  demande), typographie, couleurs, espacements, bordures, ombres, et CSS
  personnalisé avec sélecteur.
- Création de pages depuis l'éditeur (hébergement inscriptible requis).

**Médias**
- Bibliothèque interne : glisser-déposer de fichiers, ajout par adresse,
  recherche, filtres par famille, copie d'adresse, suppression.
- Trois stockages au choix : dossier du site (script PHP fourni), Firebase
  Storage, ou adresse saisie à la main.
- Images recompressées dans le navigateur avant envoi.

**Données et sécurité**
- Firebase Auth (e-mail / mot de passe), un accès par site.
- Brouillon enregistré automatiquement, publication, historique des versions
  et restauration.
- Règles Firestore et Storage fournies.
- Contenu assaini à l'enregistrement et à l'application.
- Le script PHP vérifie la signature du jeton Firebase contre les certificats
  publics de Google avant toute écriture.

**Réversibilité**
- À chaque publication, le fichier `.html` de l'hébergement est réécrit avec
  le contenu à l'intérieur : le module peut être retiré, le site garde tout.
  (Demande un hébergement PHP.)
- Export manuel de la page figée, et export du contenu en JSON.
- Si Firebase est injoignable ou la base vide, la page s'affiche avec son
  HTML d'origine. Aucune exception ne remonte au site.
