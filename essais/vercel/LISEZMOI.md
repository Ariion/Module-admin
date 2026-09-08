# Test grandeur nature — variante statique (Vercel)

> **Pour un vrai test, préférez [`docs/MISE-EN-LIGNE.md`](../../docs/MISE-EN-LIGNE.md)**
> : hébergement PHP (o2switch, OVH), donc réécriture du HTML, téléversement des
> médias et création de pages. Cette page-ci reste utile pour juger l'éditeur
> en vingt minutes sans hébergement sous la main.

Deux tests complémentaires. Le premier suffit pour juger le module ; le second
couvre la seule chose que Vercel ne permet pas.

| | Test A — Vercel | Test B — local |
|---|---|---|
| Détection automatique du contenu | ✅ | ✅ |
| Connexion Firebase, édition, blocs répétables | ✅ | ✅ |
| Brouillon, publication, historique | ✅ | ✅ |
| **Réécriture du HTML à la publication** | ❌ impossible | ✅ |
| Durée | ~20 min | +5 min |

**Pourquoi Vercel ne peut pas réécrire le HTML :** après déploiement, ses
fichiers sont en lecture seule. Même une fonction serverless n'y écrit pas —
seul `/tmp` est accessible, et il disparaît à la fin de l'appel. Netlify a la
même contrainte. La réécriture demande un hébergement qui accepte d'écrire un
fichier : OVH, o2switch, tout mutualisé avec PHP.

---

# Test A — sur Vercel

## 1. Le projet Firebase (10 min)

Sur [console.firebase.google.com](https://console.firebase.google.com) :

**a. Créer le projet** — *Ajouter un projet*. Refusez Google Analytics.

**b. Récupérer les clés** — *Paramètres du projet* (roue dentée) ▸ *Vos
applications* ▸ icône `</>` ▸ enregistrer l'application. Copiez l'objet
`firebaseConfig` affiché.

**c. Activer la connexion** — *Authentication* ▸ *Commencer* ▸ activer
**E-mail/Mot de passe**. Puis *Users* ▸ *Ajouter un utilisateur* : une adresse
et un mot de passe. **Notez l'UID** affiché dans la liste.

**d. Créer la base** — *Firestore Database* ▸ *Créer une base de données* ▸
**mode production** ▸ région `eur3` ou `europe-west1`.

**e. Donner l'accès au compte** — dans Firestore, *Démarrer une collection* :

```
Collection      sites
ID du document  test-lamartine
```

Ce document peut rester vide. Ouvrez-le, *Démarrer une collection* :

```
Collection      members
ID du document  ← l'UID noté en (c)
Champ           role   (chaîne)   =  owner
```

**f. Publier les règles de sécurité** — *Firestore Database* ▸ onglet
*Règles* ▸ remplacez tout par le contenu de
[`firebase/firestore.rules`](../../firebase/firestore.rules) ▸ **Publier**.

> Sans cette étape la base est en accès libre. Ne la sautez pas.

## 2. La configuration (1 min)

Dans **`essais/vercel/admin-config.js`**, remplacez les 5 valeurs
« À REMPLIR » par celles de l'étape (b), puis committez.

## 3. Le déploiement (3 min)

Sur [vercel.com/new](https://vercel.com/new) : importez le dépôt
`Ariion/Module-admin`, branche `claude/admin-module-static-sites-rjidn2`.

- Framework Preset : **Other**
- Aucune commande de build, aucun dossier de sortie

Déployez. Votre site est à :

```
https://VOTRE-PROJET.vercel.app/essais/vercel/index.html
```

## 4. Autoriser le domaine dans Firebase (1 min) — étape oubliée neuf fois sur dix

Firebase Auth refuse toute connexion depuis un domaine inconnu.

*Authentication* ▸ *Settings* ▸ *Authorized domains* ▸ **Add domain** ▸
`VOTRE-PROJET.vercel.app`

## 5. Ce qu'il faut vérifier

Ouvrez l'URL **sans rien ajouter** :

- [ ] Le site s'affiche normalement, identique à l'original
- [ ] Console du navigateur : aucune erreur

Ajoutez **`?admin`** à l'URL :

- [ ] L'écran de connexion apparaît
- [ ] Connexion avec le compte de l'étape (c)
- [ ] L'éditeur s'ouvre : panneau de réglages à gauche, le site dans un aperçu
      à droite, le nom de la page en haut
- [ ] **Survol** d'un titre dans l'aperçu : contour bleu + étiquette « Texte »
- [ ] **Clic** sur ce titre : le panneau bascule sur ses réglages, et le
      curseur se place dans la page — tapez, `Échap` valide
- [ ] **Clic sur « Réserver »** (le bouton du menu) : champ *Adresse du lien*
      dans le panneau, changez-la
- [ ] **Survol d'une carte de gîte** : barre d'outils du bloc — dupliquez-en
      un, déplacez-le, supprimez-le
- [ ] **Clic sur « 43 »** (couchages) : c'est un champ à part, pas fusionné
      avec son libellé
- [ ] Onglet **Structure** : l'arborescence de la page, et *Ajouter une
      section* propose les modèles
- [ ] Onglet **Médias** : ajoutez une image par son adresse (`/images/…` ou une
      adresse complète) — elle apparaît dans la grille et devient choisissable
      depuis un réglage d'image
- [ ] Les trois formats d'écran (ordinateur, tablette, mobile), en haut à
      droite, changent la largeur de l'aperçu
- [ ] Le pied du panneau indique « Modifications non publiées », puis
      « Brouillon enregistré » après 2-3 secondes
- [ ] Rechargez la page avec `?admin` : **le brouillon est toujours là**
- [ ] **Aperçu** (icône œil) : les contours disparaissent, le site redevient
      normal
- [ ] **Publier** : le badge passe au vert « Contenu publié »
- [ ] Rechargez **sans** `?admin` : les modifications sont en ligne
- [ ] Ouvrez l'URL en **navigation privée** : les modifications sont visibles
      sans être connecté
- [ ] **Historique** (icône horloge) : la publication est listée, *Restaurer*
      la recharge dans la page
- [ ] **Quitter** (icône ✕) : l'éditeur se ferme, le site retrouve sa mise en
      page
- [ ] Depuis un **téléphone** : le site occupe tout l'écran, une barre « Admin »
      en bas la déplie, un appui sur un élément ouvre ses réglages

Contrôle de robustesse, dans l'onglet *Network* des outils développeur :
passez en mode **Offline** et rechargez. Le site doit s'afficher normalement,
sans erreur — avec le contenu publié s'il est en cache, sinon avec le contenu
du code.

## 6. Le test qui compte vraiment : la republication du code

C'est le point sur lequel un module de ce type casse d'habitude.

1. Modifiez `essais/vercel/index.html` **à la main**, comme si vous faisiez
   évoluer le site : ajoutez une entrée au menu, insérez une section entière
   avant les hébergements, ajoutez une classe sur un paragraphe, reformulez un
   texte que vous n'aviez **pas** modifié dans l'admin.
2. Committez, poussez — Vercel redéploie tout seul.
3. Rechargez.

Attendu :

- [ ] Vos modifications de code sont bien en ligne
- [ ] **Le contenu saisi dans l'admin est toujours à sa place**
- [ ] Le paragraphe que vous avez reformulé dans le code affiche votre
      nouvelle version — le code reste maître de ce que le client n'a pas
      touché
- [ ] Avec `?admin`, la barre n'indique aucun contenu « non retrouvé »

---

# Test B — la réécriture du HTML, en local

Ce que Vercel ne peut pas faire. Nécessite **PHP** (préinstallé sur macOS ;
`sudo apt install php-cli` sur Ubuntu).

```bash
git pull
npm run essai-local
```

Le script réutilise les clés Firebase saisies au test A, monte un site complet
dans `.essai-local/` et lance un serveur PHP.

1. Ouvrez `http://localhost:8080/?admin`
2. Connectez-vous, modifiez un titre, **Publier**
3. La barre doit afficher « Publié et intégré au fichier HTML du site »
4. Ouvrez **`.essai-local/index.html`** dans un éditeur de texte :

- [ ] Votre modification s'y trouve **en clair, dans le HTML**
- [ ] Un fichier `.essai-local/index.src.html` est apparu : c'est la copie du
      code d'origine, qui contient encore l'ancien texte
- [ ] `index.html` contient `<meta name="admin-baked" …>`

5. **Le test final** : supprimez le dossier `.essai-local/admin`, puis
   rechargez `http://localhost:8080/`

- [ ] Le site s'affiche avec **toutes** les modifications
- [ ] Aucune erreur dans la console
- [ ] `window.Admin` est `undefined` : le module n'est plus là

---

# Si quelque chose ne marche pas

`debug: true` est déjà actif dans la configuration : la console du navigateur
trace le nombre d'éléments détectés et chaque application de contenu.

| Symptôme | Cause la plus probable |
|---|---|
| « Connexion impossible » alors que le mot de passe est bon | domaine non autorisé dans Firebase Auth (étape 4) |
| Connecté, puis « Ce compte n'a pas accès à ce site » | document `sites/test-lamartine/members/<UID>` absent, ou `role` ≠ `owner` |
| `Missing or insufficient permissions` en console | règles de sécurité non publiées (étape 1f) |
| Le contenu publié ne s'affiche pas pour un visiteur | `pages/{pageId}` doit être en lecture publique — vérifiez que vous avez bien collé le fichier de règles fourni |
| Rien ne se passe avec `?admin` | `siteId` ou `projectId` erroné : la console le dit |
| L'historique reste vide | Firestore réclame un index : le lien pour le créer en un clic est dans la console |
| Test B : « Le serveur a répondu 401 » | Apache/CGI supprime l'en-tête `Authorization`. Sur un vrai hébergement, ajoutez au `.htaccess` : `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` |

---

# Et après

Si le test A vous convainc et que vous voulez la réécriture automatique **en
production**, deux voies :

- **Hébergement PHP** (OVH, o2switch) : déposez `tools/admin-endpoint.php`,
  ajoutez une ligne à la configuration. C'est décrit à l'étape C de
  [`docs/INSTALLATION.md`](../../docs/INSTALLATION.md).
- **Rester sur Vercel** : il faudrait un adaptateur qui écrive le HTML
  régénéré dans le dépôt Git via l'API GitHub, ce qui déclencherait un
  redéploiement automatique. Ce n'est pas écrit à ce jour.
