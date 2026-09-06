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
| **Éditeur à panneau latéral** | Le site dans un aperçu, les réglages à gauche : contenu, structure de la page, bibliothèque média. Aperçu ordinateur / tablette / mobile. |
| **Édition en place** | Survol = contour, clic sur un texte = édition directe, clic sur une image = panneau d'upload, clic sur un lien = champ d'adresse. |
| **Pages du site** | Le nom de la page, en haut de l'aperçu, ouvre la liste des pages — déduite des liens du site. On y change de page, et on en crée une nouvelle, copiée sur une page existante (demande un hébergement inscriptible). |
| **Modèles de page** | Cinq trames complètes — accueil une page, page de vente, portfolio, contact, à propos. À ajouter à la suite ou à substituer à la page. |
| **Modèles de section** | Huit mises en page prêtes à l'emploi, proposées au moment de créer la section : trois colonnes, image et texte, appel à l'action, galerie… |
| **Bibliothèque d'éléments** | Titre, texte, bouton, liste, image, vidéo, carte, colonnes, séparateur, espaceur — recherche, catégories, glisser-déposer dans l'aperçu. Le balisage émis est sémantique et sans classes : la feuille de style du site s'y applique d'elle-même. |
| **Sections de page** | Ajouter une section vide et la remplir d'éléments, ou copier une section existante du site. Retirer, réordonner, remettre. |
| **Habillage complet** | Police (16 familles Google Fonts chargées à la demande), taille, graisse, casse, interlignage, espacement, couleurs, marges, bordure, ombre — et du **CSS personnalisé** avec sélecteur, pour les états `:hover`. |
| **Blocs répétables** | Dupliquer, réordonner, supprimer une carte de la liste — dans le gabarit prévu par le développeur, sans pouvoir casser la mise en page. |
| **Brouillon puis publication** | Enregistrement automatique du brouillon, bouton « Publier », historique des versions et restauration. |
| **Ne casse jamais le site** | Firebase injoignable, base vide, contenu illisible : la page s'affiche avec son HTML d'origine. Aucune exception ne remonte. |
| **Le module reste optionnel** | À chaque publication, le fichier `.html` de l'hébergement est **réécrit avec le contenu à l'intérieur**. Le client peut supprimer le module quand il veut : son site garde tout, sans aucune manipulation. |
| **Images sans abonnement** | Firebase Storage, ou un simple dossier sur l'hébergement du client (script PHP fourni), ou une adresse saisie à la main. |

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
│   └── resize.js            recompression avant envoi
└── ui/                   éditeur (chargé uniquement pour les administrateurs)
    ├── shell.js          coque : panneau à gauche, aperçu à droite
    ├── widgets-panel.js  bibliothèque d'éléments
    ├── inspector.js      réglages de l'élément choisi
    ├── navigator.js      structure de la page
    └── library.js        bibliothèque média

demo/                     site de démonstration complet
essais/domaine-lamartine/ test sur un site client réel (code brut + module)
firebase/                 règles de sécurité Firestore et Storage
tools/admin-endpoint.php  script serveur : médias + réécriture du HTML
docs/                     architecture et installation
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
