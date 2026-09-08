# Mettre le module en ligne pour un test grandeur nature

Le module ne se compile pas. « Mettre en ligne » revient à téléverser un
dossier, coller deux lignes dans les pages, et créer un projet Firebase.
Comptez **30 minutes** la première fois, 5 pour les sites suivants.

---

## Quel hébergement choisir pour le test

| | Hébergement PHP (o2switch, OVH, tout mutualisé) | Statique (Vercel, Netlify) |
|---|---|---|
| Édition, blocs répétables, sections, éléments | ✅ | ✅ |
| Brouillon, publication, historique | ✅ | ✅ |
| Bibliothèque média avec **téléversement** | ✅ dossier `/medias` du site | ❌ adresse uniquement |
| **Réécriture du `.html` à la publication** | ✅ | ❌ impossible |
| **Création de pages** depuis l'éditeur | ✅ | ❌ |
| Mise en route | 30 min | 20 min |

**Prenez l'hébergement PHP.** C'est celui de vos clients, et c'est le seul qui
exerce ce qui fait la valeur du module : le site garde son contenu même si le
module est retiré. Vercel ne peut pas réécrire un fichier — après déploiement
ses fichiers sont en lecture seule, et une fonction serverless n'écrit que
dans `/tmp`, effacé à la fin de l'appel.

Le reste de ce guide décrit la voie PHP. Pour un essai rapide sans hébergement
sous la main, [`essais/vercel/LISEZMOI.md`](../essais/vercel/LISEZMOI.md)
donne la variante statique.

---

## 1. Le projet Firebase (15 min)

Sur [console.firebase.google.com](https://console.firebase.google.com) :

**a. Créer le projet** — *Ajouter un projet*. Refusez Google Analytics.

**b. Récupérer les clés** — *Paramètres du projet* (roue dentée) ▸ *Vos
applications* ▸ icône `</>` ▸ enregistrer l'application. Gardez l'objet
`firebaseConfig` sous la main : c'est l'étape 3.

**c. Activer la connexion** — *Authentication* ▸ *Commencer* ▸ activer
**E-mail/Mot de passe**. Puis *Users* ▸ *Ajouter un utilisateur* : l'adresse et
le mot de passe que vous donnerez au client. **Notez l'UID** affiché dans la
liste.

**d. Créer la base** — *Firestore Database* ▸ *Créer une base de données* ▸
**mode production** ▸ région `eur3` ou `europe-west1`.

**e. Donner l'accès au compte** — dans Firestore, *Démarrer une collection* :

```
Collection      sites
ID du document  hotel-des-pins        ← votre siteId, au choix
```

Le document peut rester vide. Ouvrez-le, *Démarrer une collection* :

```
Collection      members
ID du document  ← l'UID noté en (c)
Champ           role   (chaîne)   =   owner
```

**f. Publier les règles** — *Firestore Database* ▸ onglet *Règles* ▸ remplacez
tout par [`firebase/firestore.rules`](../firebase/firestore.rules) ▸ **Publier**.

> Sans cette étape la base est en accès libre. Ne la sautez pas.

**g. Autoriser le domaine** — *Authentication* ▸ *Settings* ▸ *Authorized
domains* ▸ **Add domain** ▸ le domaine du site. Oubliée neuf fois sur dix :
sans elle, la connexion échoue même avec le bon mot de passe.

---

## 2. Fabriquer le paquet (1 min)

```bash
npm run paquet -- --site=hotel-des-pins --projet=mon-projet-firebase
```

`--site` est le `siteId` de l'étape (e), `--projet` le `projectId` Firebase.
Le dossier `paquet/` contient alors :

```
paquet/
├── admin/               le module, tel quel
├── admin-endpoint.php   projet Firebase déjà renseigné
├── admin-config.js      il reste les clés à coller
├── medias/              dossier de la bibliothèque
└── LISEZMOI.txt         la marche à suivre, résumée
```

Sur un hébergement statique : `npm run paquet -- --site=… --statique`
(pas de PHP, pas de dossier médias).

---

## 3. Téléverser (5 min)

En FTP, à la **racine du site**, à côté d'`index.html` :

```
monsite.fr/
├── index.html
├── contact.html
├── admin/               ← téléversé
├── admin-endpoint.php   ← téléversé
├── admin-config.js      ← téléversé
└── medias/              ← téléversé, en écriture (chmod 755, 775 si besoin)
```

Complétez `admin-config.js` avec les clés de l'étape (b).

Puis, sur **chaque page**, juste avant `</body>` :

```html
<script src="/admin-config.js"></script>
<script type="module" src="/admin/runtime.js"></script>
```

> **Apache en CGI/FastCGI** supprime l'en-tête `Authorization`, ce qui ferait
> échouer toute écriture. Dans le doute, ajoutez au `.htaccess` :
> `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1`

---

## 4. Vérifier (10 min)

### Le site, d'abord

- [ ] `https://monsite.fr/` s'affiche **exactement** comme avant
- [ ] Console du navigateur : aucune erreur rouge
- [ ] La console indique le nombre d'éléments détectés (`debug: true` est
      actif dans le paquet ; repassez-le à `false` une fois le test fini)

### L'éditeur

Ouvrez `https://monsite.fr/?admin` et connectez-vous.

- [ ] Panneau à gauche, le site dans un aperçu à droite
- [ ] **Survol** d'un texte : contour bleu ; **clic** : le panneau bascule sur
      ses réglages, et on peut écrire directement dans la page
- [ ] Onglet **Structure** : l'arborescence des sections, avec le bouton
      *Ajouter une section*
- [ ] Onglet **Médias** : déposez une image depuis votre ordinateur — elle doit
      apparaître dans la grille, et le fichier arriver dans `/medias` en FTP
- [ ] Survol d'une **carte répétée** (chambre, gîte, avis) : la barre d'outils
      du bloc permet de dupliquer, déplacer, supprimer
- [ ] Le pied du panneau passe à « Modifications non publiées », puis
      « Brouillon enregistré » deux secondes plus tard
- [ ] Rechargez avec `?admin` : **le brouillon est toujours là**
- [ ] **Publier** : le badge passe au vert
- [ ] Rechargez **sans** `?admin`, en navigation privée : les modifications
      sont en ligne pour tout le monde

### Ce qui fait la valeur du module

- [ ] En FTP, `index.html` contient vos modifications **en clair dans le HTML**
- [ ] Un `index.src.html` est apparu à côté : la copie du code d'origine, gardée
      comme référence pour les publications suivantes
- [ ] `index.html` contient `<meta name="admin-baked" …>`
- [ ] **Le test final** : renommez le dossier `admin/` en FTP, rechargez le
      site. Il s'affiche avec **toutes** les modifications, sans erreur, et
      `window.Admin` est `undefined`.

### Sur téléphone

- [ ] `https://monsite.fr/?admin` : le site occupe tout l'écran, une barre
      « Admin » en bas
- [ ] Un appui sur la barre déplie le panneau ; un appui sur un élément de la
      page l'ouvre sur ses réglages

### La republication du code — le point qui casse d'habitude

1. Modifiez le `.html` **à la main**, comme une évolution normale du site :
   une entrée de menu en plus, une section entière insérée, une classe
   ajoutée, un texte que le client n'avait **pas** modifié, reformulé.
2. Téléversez cette nouvelle version.
3. Rechargez.

- [ ] Vos modifications de code sont en ligne
- [ ] **Le contenu saisi par le client est toujours à sa place**
- [ ] Le texte reformulé dans le code affiche votre nouvelle version : le code
      reste maître de ce que le client n'a pas touché
- [ ] Avec `?admin`, aucun contenu signalé « non retrouvé »

---

## Si quelque chose ne marche pas

`debug: true` est actif dans le paquet : la console dit ce qui est détecté et
ce qui est appliqué.

| Symptôme | Cause la plus probable |
|---|---|
| « Connexion impossible » alors que le mot de passe est bon | domaine non autorisé dans Firebase Auth (étape 1g) |
| Connecté, puis « Ce compte n'a pas accès à ce site » | document `sites/<siteId>/members/<UID>` absent, ou `role` ≠ `owner` |
| `Missing or insufficient permissions` | règles de sécurité non publiées (étape 1f) |
| « Clés Firebase non renseignées » en console | il reste des « À REMPLIR » dans `admin-config.js` |
| Le contenu publié ne s'affiche pas pour un visiteur | règles non publiées : `pages/{pageId}` doit être en lecture publique |
| Rien ne se passe avec `?admin` | `siteId` ou `projectId` erroné — la console le dit |
| « Le serveur a répondu 401 » à la publication | en-tête `Authorization` supprimé par Apache : voir le `.htaccess` de l'étape 3 |
| « Écriture impossible » | droits du dossier : le site doit être inscriptible par PHP |
| Le téléversement d'une vidéo échoue | `upload_max_filesize` et `post_max_size` du `php.ini`, souvent à 2 Mo |
| L'historique reste vide | Firestore réclame un index : le lien pour le créer est dans la console |

---

## Un projet Firebase, ou un par client ?

Un seul projet suffit : chaque site a son `siteId`, et un compte ne voit que
les sites dont il est membre. Vous gardez la main sur tout depuis une seule
console. Le détail, et le cas où un projet par client se justifie, sont à la
fin de [`docs/INSTALLATION.md`](INSTALLATION.md).
