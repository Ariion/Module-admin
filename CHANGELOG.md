# Journal des versions

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
