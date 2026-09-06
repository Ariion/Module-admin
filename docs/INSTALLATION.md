# Installation sur un nouveau site

Compter 15 minutes pour le premier site, 5 pour les suivants.

---

## A. Brancher le module sur le site

### 1. Copier le module

Copiez le dossier `admin/` à la racine du site, tel quel. Aucune compilation,
aucun `npm install` : ce sont des modules ES natifs, servis directement.

```
monsite.fr/
├── index.html
├── contact.html
├── styles.css
├── admin/            ← copié tel quel
└── admin-config.js   ← créé à l'étape 2
```

### 2. Créer `admin-config.js`

C'est le **seul** fichier qui diffère d'un site à l'autre.

```js
window.ADMIN_CONFIG = {
  siteId: 'hotel-des-pins',

  firebase: {
    apiKey: 'AIza…',
    authDomain: 'mon-projet.firebaseapp.com',
    projectId: 'mon-projet',
    storageBucket: 'mon-projet.appspot.com',
    appId: '1:000000000000:web:0000000000000000000000',
  },

  lang: 'fr',
};
```

### 3. Ajouter deux lignes à chaque page

Juste avant `</body>` :

```html
<script src="/admin-config.js"></script>
<script type="module" src="/admin/runtime.js"></script>
```

C'est tout. Le site fonctionne déjà exactement comme avant.

> **Hébergement.** Les fichiers `.js` doivent être servis avec le type MIME
> `text/javascript`. C'est le cas par défaut chez OVH, o2switch et Netlify.

---

## B. Créer le projet Firebase

Une seule fois si vous mutualisez, une fois par client si vous préférez
isoler. Les deux fonctionnent avec le même code — voir la fin de ce document.

### 1. Le projet

[console.firebase.google.com](https://console.firebase.google.com) →
**Ajouter un projet**. Google Analytics est inutile ici.

### 2. Les clés

**Paramètres du projet** → *Vos applications* → icône `</>` (Web) →
enregistrer l'application. Copiez l'objet `firebaseConfig` affiché dans
`admin-config.js`.

Ces clés sont publiques par nature : elles identifient le projet, elles ne
donnent aucun droit. C'est le rôle des règles de sécurité (étape 5).

### 3. L'authentification

**Authentication** → *Commencer* → activer **E-mail/Mot de passe**.

Puis **Users** → *Ajouter un utilisateur* : l'adresse du client et un mot de
passe provisoire. Notez son **UID**.

### 4. La base

**Firestore Database** → *Créer une base de données* → **mode production** →
choisir une région européenne (`eur3` ou `europe-west1`).

Créez ensuite deux documents à la main :

**a. L'accès du client**

Collection `sites` → document `hotel-des-pins` (votre `siteId`) →
sous-collection `members` → document dont l'**ID est l'UID du client** :

```
role : "owner"        (chaîne)
name : "Marie Dupont" (chaîne, facultatif)
```

**b. Votre accès global** (recommandé)

Collection `superadmins` → document dont l'ID est **votre propre UID** :

```
label : "prestataire"  (chaîne)
```

Ce document vous donne accès à tous les sites du projet. Aucune règle
n'autorise sa création depuis le web : il ne peut être créé qu'ici.

### 5. Les règles de sécurité

**Firestore Database** → onglet *Règles* → coller le contenu de
[`firebase/firestore.rules`](../firebase/firestore.rules) → **Publier**.

Sans cette étape, la base est en accès libre. Ne la sautez pas.

Si vous utilisez Firebase Storage pour les images, faites de même avec
[`firebase/storage.rules`](../firebase/storage.rules).

### 6. L'index de l'historique

Le panneau *Historique* fait une requête triée. Firestore réclame un index à
la première ouverture, avec un lien direct pour le créer en un clic. Vous
pouvez aussi le déclarer d'avance :
[`firebase/firestore.indexes.json`](../firebase/firestore.indexes.json).

---

## C. Rendre le module optionnel (recommandé)

C'est l'étape qui fait que le client n'est jamais prisonnier : à chaque
publication, le fichier `.html` de son hébergement est réécrit avec le contenu
à l'intérieur. Il peut supprimer le module quand il veut, son site garde tout.

Demande un hébergement capable d'écrire un fichier — donc PHP. C'est le cas
d'OVH, o2switch et de tout hébergement mutualisé. Sur un statique pur
(Netlify), sautez cette étape : le module fonctionne normalement, mais le
contenu reste servi au chargement et seul l'export manuel est disponible.

1. Ouvrez `tools/admin-endpoint.php` et renseignez `$PROJECT_ID` avec
   l'identifiant de votre projet Firebase.
2. Déposez-le à la racine du site : `monsite.fr/admin-endpoint.php`.
3. Le dossier du site doit être accessible en écriture par PHP.
4. Dans la configuration :

```js
host: { endpoint: '/admin-endpoint.php' },
```

À la première publication, le script met de côté une copie intacte du code de
chaque page (`index.src.html` à côté de `index.html`). Chaque régénération
repart de cette copie, jamais du fichier déjà réécrit : aucune dérive ne
s'accumule.

> **Si vous redéployez la page**, le script s'en aperçoit — le fichier que vous
> venez d'envoyer ne porte pas la marque `admin-baked` — et prend votre
> nouvelle version comme référence. Votre code reste maître de la structure,
> Firebase du contenu.

> **Apache en CGI/FastCGI** supprime l'en-tête `Authorization`, ce qui ferait
> échouer l'authentification. Si c'est le cas, ajoutez au `.htaccess` :
> `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1`

> **À savoir :** `index.src.html` est accessible publiquement. Elle ne contient
> que le code du site, déjà public — mais dans sa version d'avant les
> modifications du client.

Pour vérifier que tout est en place, ouvrez la console avec `debug: true` :
la publication doit afficher « page réécrite » suivi d'une taille en octets.

> **Ce que cette étape débloque aussi :** la **création de pages** depuis
> l'éditeur. Le nom de la page, en haut de l'aperçu, ouvre la liste des pages
> du site ; on y crée une page en la copiant sur une existante. Sans
> hébergement inscriptible, la liste reste consultable mais la création est
> indisponible.

## D. Choisir le stockage des images

Trois modes, dans `admin-config.js`.

### `url` — aucun stockage (par défaut le plus simple)

```js
media: { adapter: 'url' }
```

Le client saisit l'adresse d'une image, ou choisit parmi celles déjà en ligne.
Il ne peut pas téléverser depuis son ordinateur.

### `endpoint` — un dossier chez le client (aucun abonnement)

Le mode recommandé sur un hébergement mutualisé avec PHP (OVH, o2switch).
C'est le **même fichier** qu'à l'étape C : rien de plus à déposer.

1. Créez un dossier `medias/` à la racine, accessible en écriture (`chmod 755`).
2. Dans la configuration :

```js
media: { adapter: 'endpoint', endpoint: '/admin-endpoint.php' }
```

Les images restent chez le client, servies par son propre domaine, visibles en
FTP. Le script refuse toute écriture sans un jeton Firebase **dont il vérifie
la signature** auprès de Google.

### `firebase` — Firebase Storage

```js
media: { adapter: 'firebase' }
```

Demande le passage au plan **Blaze** (carte bancaire ; le quota gratuit couvre
très largement un site vitrine). Activez Storage dans la console et publiez
`firebase/storage.rules`.

---

## E. Vérifier

1. Ouvrez `https://monsite.fr/` — le site doit s'afficher normalement.
2. Ouvrez `https://monsite.fr/?admin` — l'écran de connexion apparaît.
3. Connectez-vous avec le compte du client.
4. Survolez un titre : un contour bleu doit apparaître. Cliquez, modifiez.
5. **Publier**, puis rechargez sans `?admin` : la modification est en ligne.
6. Si vous avez fait l'étape C, ouvrez le fichier `index.html` en FTP : la
   modification doit s'y trouver, en clair, dans le HTML.

Rien ne se passe ? Ajoutez `debug: true` à la configuration et ouvrez la
console du navigateur : le module y trace le nombre d'éléments détectés et
chaque application de contenu.

---

## F. Affiner la détection

Par défaut, tout est analysé. Deux réglages suffisent en général.

```js
scan: {
  // Limiter l'analyse à une zone
  roots: ['main', 'footer'],

  // Exclure ce qui doit rester géré par le code
  exclude: ['.site-nav a', '.legal', '#cookie-banner'],

  // Ne pas proposer les images de fond CSS
  backgrounds: false,
}
```

Dans le HTML, quatre attributs sont reconnus :

```html
<div data-admin-ignore>       zone entièrement exclue
<h1 data-admin-id="hero">     identifiant figé pour cet élément
<section data-admin-anchor="services">  ancre stable pour toute la zone
<ul data-admin-no-repeat>     pas de duplication de blocs ici
```

Aucun n'est obligatoire.

---

## G. Ce qu'il faut expliquer au client

- **Survolez, cliquez, écrivez.** `Échap` annule, `Entrée` valide.
- Les modifications sont enregistrées en brouillon : **le site public ne change
  pas tant que vous n'avez pas cliqué sur « Publier »**.
- **Historique** permet de revenir à une version précédente.
- Le site garde son contenu même si le module est retiré un jour : il est
  réécrit dans les fichiers à chaque publication.
- **Aperçu** désactive l'édition pour voir la page comme un visiteur.

---

## H. Un projet Firebase, ou un par client ?

Le code est identique dans les deux cas — le `siteId` est toujours dans le
chemin des données.

**Un projet par client.** Isolation totale, facturation séparée, et le projet
est transférable au client s'il part. À privilégier pour un client important
ou qui héberge des données sensibles.

**Un projet mutualisé.** Un seul back-office pour tous vos sites, un
`superadmins/{votreUid}` unique. Les règles cloisonnent déjà chaque `siteId`.
À privilégier pour un parc de petits sites vitrine.

Passer de l'un à l'autre plus tard revient à recopier une branche
`sites/{siteId}` d'un projet à l'autre. Le module, lui, ne change pas.
