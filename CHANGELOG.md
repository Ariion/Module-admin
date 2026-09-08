# Journal des versions

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
