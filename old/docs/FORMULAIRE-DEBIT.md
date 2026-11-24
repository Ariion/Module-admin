# Protéger le formulaire de contact du nombre d'envois

À lire par le propriétaire du site, ou par la personne qui lui a installé le
module. Aucune ligne de code à écrire.

## Le problème, en une page

Le formulaire de contact dépose ses messages dans votre base Firebase. Ce qui
protège cette base, ce sont des **règles** : elles vérifient qu'un message est
bien un message, que chacun de ses champs est du texte, qu'il n'est pas trop
long, qu'il n'arrive pas déjà marqué « lu ». Elles ont été éprouvées, une par
une, contre un vrai Firestore.

Ce qu'elles ne savent **pas** faire, c'est compter. Il n'existe aucune règle
Firebase qui dise « pas plus de dix messages par heure ». Autrement dit :

> Quelqu'un qui ouvre le code de votre page de contact y lit l'adresse de votre
> base. Rien ne l'empêche d'y déposer des milliers de messages parfaitement
> conformes. Votre boîte devient illisible, votre quota Firebase se consomme,
> et si votre projet a une carte bancaire attachée, cela finit par se payer.

Ce n'est pas une faille : c'est une limite, connue, et elle se traite. Trois
choses à faire, par ordre d'importance. **La première prend dix minutes et
protège votre porte-monnaie. Faites-la, même si vous ne faites rien d'autre.**

---

## 1. Le plafond de dépense (à faire dans tous les cas)

C'est la seule mesure qui garantisse qu'une attaque ne devienne pas une
facture. Elle ne réduit pas le nombre de messages : elle borne ce que l'affaire
peut coûter.

1. Ouvrez la [console Google Cloud](https://console.cloud.google.com/billing)
   avec le compte Google qui a créé le projet Firebase.
2. Menu **Facturation**, puis **Budgets et alertes**.
3. **Créer un budget**. Nommez-le « Site de <votre nom> ».
4. Portée : cochez uniquement votre projet Firebase.
5. Montant : mettez ce que vous acceptez de payer dans le mois. Pour un site
   vitrine, **5 €** est déjà généreux — l'offre gratuite de Firebase suffit
   largement à un formulaire de contact.
6. Alertes : laissez 50 %, 90 %, 100 %. Cochez **M'envoyer un e-mail**.

Vous serez prévenu par courriel bien avant que cela ne devienne un problème.

**Une précision honnête** : un budget Google Cloud *alerte*, il ne coupe rien
tout seul. Si vous voulez qu'il ne puisse rien se passer du tout, restez sur le
**plan Spark** de Firebase (gratuit, sans carte bancaire) : au-delà du quota
gratuit, la base refuse les écritures et votre formulaire affiche son message
d'échec. C'est désagréable une journée ; ce n'est jamais une facture.

Faites aussi le tour des quotas : console Firebase → **Utilisation et
facturation** → onglet **Détails**. Vous y voyez combien d'écritures votre site
consomme réellement. Un site vitrine ordinaire en fait quelques dizaines par
jour.

---

## 2. Faire compter les envois par votre hébergement (si vous avez PHP)

C'est la seule façon de **limiter réellement le nombre** de messages. Le
principe : au lieu d'aller droit dans la base, les envois passent par un petit
fichier posé sur votre hébergement, qui les compte et refuse les envois de
trop. Une fois en place :

- trois messages par heure et dix par jour depuis la même adresse ;
- cent cinquante messages par jour pour le site entier, quoi qu'il arrive ;
- et le chemin direct vers la base est **fermé**, donc rien ne contourne le
  comptage.

**Il faut un hébergement qui exécute PHP** : OVH, o2switch, Ionos, Hostinger,
tout mutualisé classique. Sur un hébergement statique pur (Netlify, Vercel,
GitHub Pages), ce n'est pas possible — passez à l'étape 3.

Les chiffres se changent dans le fichier, en haut, en français, et sans rien
comprendre au reste.

### L'ORDRE COMPTE

Ne posez pas le dernier verrou en premier : entre le moment où vous fermez le
chemin direct et celui où vos pages passent par le nouveau, les messages de vos
visiteurs seraient refusés. Suivez donc les étapes dans l'ordre.

#### a. Créer le compte qui déposera les messages

Console Firebase → **Authentication** → onglet **Users** → **Ajouter un
utilisateur**.

- Adresse : quelque chose comme `facteur@votre-domaine.fr` — elle n'a pas
  besoin de recevoir du courrier, elle sert d'identifiant.
- Mot de passe : faites-en un long, au hasard, et gardez-le sous la main pour
  l'étape c.

Ce compte ne pourra **rien** faire d'autre que déposer un message : ni lire
votre boîte, ni toucher au site. C'est voulu — son mot de passe va vivre dans
un fichier sur votre hébergement.

#### b. Lui donner son rôle sur le site

Console Firebase → **Firestore Database** → parcourez jusqu'à
`sites` → votre site → `members`.

**Ajouter un document** :

- Identifiant du document : l'**UID** du compte créé à l'étape a. Vous le
  copiez depuis la page *Authentication* (colonne *User UID*).
- Un champ : nom `role`, type `string`, valeur **`facteur`**.

Écrivez `facteur` exactement, en minuscules, sans accent.

#### c. Renseigner le fichier de votre hébergement

Ouvrez `admin-endpoint.php` — le fichier que vous avez déposé à la racine de
votre site. Cherchez le paragraphe **« Formulaire de contact : les envois
comptés »**, vers le haut. Remplissez-le :

```php
$CONTACT_ACTIF   = true;                     // au lieu de false
$CONTACT_SITE_ID = 'mon-site';               // le même siteId qu'admin-config.js
$CONTACT_CLE_API = 'AIza...';                // la même apiKey qu'admin-config.js
$CONTACT_FACTEUR = 'facteur@votre-domaine.fr';
$CONTACT_MOT_DE_PASSE = 'le mot de passe de l’étape a';
```

Reposez le fichier sur l'hébergement, à la place de l'ancien.

Pour vérifier que vous avez atteint le bon fichier, ouvrez dans votre
navigateur `https://votre-site.fr/admin-endpoint.php?action=message` : la page
doit afficher une ligne parlant d'un envoi refusé. Si elle affiche du code PHP,
votre hébergement n'exécute pas PHP et cette étape n'est pas pour vous.

#### d. Dire au module de passer par là

Dans `admin-config.js`, à côté du site, ajoutez :

```js
formulaire: { relais: '/admin-endpoint.php?action=message' },
```

#### e. Republier vos pages

Ouvrez chaque page qui porte un formulaire dans l'éditeur, et cliquez
**Publier**. C'est ce qui remplace, dans le HTML publié, l'adresse de la base
par celle de votre hébergement.

Vérifiez ensuite qu'un message part vraiment : remplissez votre propre
formulaire, et regardez qu'il arrive dans la rubrique **Messages**.

#### f. Et seulement maintenant : fermer le chemin direct

Console Firebase → **Firestore Database** → `sites` → votre site → **Démarrer
une collection** nommée `reglages`.

Dans cette collection, **ajoutez un document** dont l'identifiant est
exactement `relais`. Son contenu n'a aucune importance ; un champ `pose` de
type `number` avec la valeur `1` fait l'affaire. C'est sa **présence** qui est
le signal.

À partir de cet instant, les règles refusent tout dépôt qui ne vient pas de
votre hébergement. Refaites l'essai du point e : le message doit toujours
arriver. S'il n'arrive plus, une des étapes b, c ou d n'est pas en place —
supprimez le document `relais`, le formulaire remarche aussitôt, et reprenez.

**Pour tout défaire** : supprimez le document `relais`, retirez la ligne
`formulaire:` d'`admin-config.js`, republiez. Le formulaire revient à l'envoi
direct. Rien n'est perdu, et les messages déjà reçus restent.

---

## 3. Ce qui est déjà en place, et ce que cela vaut

Sans rien faire de votre côté, le formulaire embarque deux mesures. Elles sont
gratuites, elles n'ont aucun effet de bord, et il faut savoir exactement ce
qu'elles valent.

| Mesure | Ce qu'elle écarte | Ce qu'elle n'écarte pas |
|---|---|---|
| Un champ invisible, dit « appât » | Les robots qui remplissent tout ce qu'ils trouvent sur une page. Il y en a beaucoup. | Un envoi fabriqué sans ouvrir la page. |
| Un repos de vingt secondes après un envoi réussi | Le double clic, et une boucle posée sur le bouton. | La même chose. |

**Pourquoi elles ne peuvent pas faire mieux.** Ces deux mesures vivent dans la
page. Or l'attaque qui coûte cher ne charge pas la page : elle parle
directement à la base, avec un outil en ligne de commande. Tout ce qu'on
ajouterait dans la page — un délai minimal de remplissage, un jeton à usage
unique, une question posée au visiteur — serait contourné en ne passant pas par
la page. C'est pour cela que l'étape 2 fait passer les envois par un endroit
que l'attaquant ne peut pas éviter, et que l'étape 1 borne ce que l'affaire
peut coûter dans tous les cas.

---

## Ce qui n'a pas été retenu, et pourquoi

Pour qui se demande si on n'a pas oublié plus simple.

**App Check (reCAPTCHA).** C'est la réponse que propose Firebase. Elle
n'est pas praticable ici, et pas pour une raison de difficulté : App Check
s'active **pour tout Cloud Firestore**, pas pour une collection. Or le module
fait lire le contenu publié de vos pages par le navigateur de chaque visiteur,
directement à la base et sans compte — c'est ce qui permet de ne pas
télécharger cent kilo-octets de bibliothèque Firebase à chaque visite. Activer
App Check couperait donc **l'affichage du contenu de tout le site**, et le
back-office avec. Il faudrait que chaque page attende une réponse de
`google.com/recaptcha` avant de montrer son texte : le jour où ce service
répond mal, le site est vide. Le module promet l'inverse — quoi qu'il arrive,
la page reste celle que le développeur a écrite.

**Compter dans les règles Firebase.** Il existe une construction rusée qui
paraît y arriver : écrire le message et un jeton daté à la minute dans la même
opération, la règle refusant de réécrire un jeton déjà posé. Elle marche, et
elle est pire que le mal — n'importe qui pourrait alors poser le jeton de la
minute en cours, une fois par minute, et **personne ne pourrait plus jamais
vous écrire**. On échangerait une boîte noyée contre un formulaire mort. C'est
non.

**Un service de formulaire tiers.** Ils existent, ils font très bien ce
travail, et ils supposent un abonnement de plus, un compte de plus, et vos
messages chez quelqu'un d'autre. Le module a été vendu sur la promesse
contraire. Si vous en voulez un, votre formulaire n'a pas besoin de ce
module : le développeur de votre site le branchera en dix minutes.
