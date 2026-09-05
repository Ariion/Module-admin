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
| **Édition en place** | Survol = contour, clic sur un texte = édition directe, clic sur une image = panneau d'upload, clic sur un lien = champ d'adresse. |
| **Blocs répétables** | Dupliquer, réordonner, supprimer une carte de la liste — dans le gabarit prévu par le développeur, sans pouvoir casser la mise en page. |
| **Brouillon puis publication** | Enregistrement automatique du brouillon, bouton « Publier », historique des versions et restauration. |
| **Ne casse jamais le site** | Firebase injoignable, base vide, contenu illisible : la page s'affiche avec son HTML d'origine. Aucune exception ne remonte. |
| **Réversible** | Un bouton exporte la page avec le contenu publié intégré dans le HTML. Le module se retire sans rien emporter. |
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
├── media/
│   ├── firebase-storage.js  Firebase Storage
│   ├── endpoint.js          dossier chez le client
│   ├── url.js               adresse saisie
│   └── resize.js            recompression avant envoi
└── ui/                   éditeur (chargé uniquement pour les administrateurs)

demo/                     site de démonstration complet
firebase/                 règles de sécurité Firestore et Storage
tools/admin-media.php     dépôt d'images sur l'hébergement du client
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

## Licence

Non déterminée. Le code est écrit pour être réutilisé projet par projet et,
le cas échéant, distribué comme produit.
