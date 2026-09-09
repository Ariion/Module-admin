# Module Admin

Une interface d'édition visuelle pour les sites codés à la main. Le client
modifie ses textes, ses images et ses liens lui-même ; le développeur garde
la main sur le code.

- **Aucune modification du HTML.** Vous copiez un dossier, vous ajoutez deux
  lignes avant `</body>`. Le module analyse la page et trouve seul ce qui est
  éditable — rien à annoter, aucune classe à ajouter.
- **Aucune compilation.** Des modules ES natifs, servis tels quels. Pas de
  `npm install`, pas de build, pas d'étape de déploiement.
- **Aucun serveur applicatif.** Le site reste statique. Les données vivent
  dans Firebase (plan gratuit suffisant pour un site vitrine).
- **Le site ne casse jamais.** Firebase injoignable, base vide, contenu
  illisible : la page s'affiche avec son HTML d'origine.

---

## Ce que contient ce dossier

```
installation.html       la page qui vous guide, à ouvrir en premier
index.html              une page vierge, prête, si vous partez de zéro
admin/                  le module (à copier tel quel à la racine du site)
admin-config.js         la configuration livrée (mode local, pour essayer)
admin-config.exemple.js le modèle commenté, pour un vrai site
admin-endpoint.php      script serveur : bibliothèque média + réécriture du HTML
firebase/               règles de sécurité Firestore et Storage à publier
demo/                   site de démonstration, à ouvrir pour prendre en main
docs/                   installation, mise en ligne, architecture
LICENCE.txt             conditions d'utilisation
CHANGELOG.md            journal des versions
```

## Deux façons de partir

### Vous avez déjà un site

Copiez `admin/` à sa racine, ajoutez deux lignes avant `</body>`, et c'est
tout : **votre code n'est pas touché**. Le module l'analyse, y trouve seul les
textes, images et liens, et s'y accroche. Voir *Installer sur un site*
ci-dessous.

### Vous partez de zéro

Le dossier contient déjà une page `index.html` vierge, prête. Servez ce
dossier :

```bash
npx http-server -p 8080 .
# ou : python3 -m http.server 8080
```

Ouvrez **`http://localhost:8080/index.html?admin`** : un **assistant** vous
pose trois questions — une page ou plusieurs, à quoi elle sert, et quelle
allure vous voulez lui donner — puis propose des mises en page. Vous en
choisissez une, et la page est construite.

Si vous ne savez pas du tout quoi écrire, l'assistant propose
**« Je ne sais pas du tout quoi mettre »** : une dizaine de questions sur
votre activité — nom, secteur, ville, ce que vous proposez, comment on vous
joint — et la page est **écrite en entier**, photos comprises. Les phrases
sont composées par le module, sans internet ni abonnement ; celles qui ne
viennent pas de vos mots sont ensuite signalées « à relire ».

Une rédaction par IA peut être branchée par-dessus, mais elle n'est pas
nécessaire : voir `docs/IA.md`.

Vous arrivez ensuite sur le **Guide** : la page reprise de haut en bas, une
étape par partie, et dans chacune les champs à remplir avec, sous chaque
champ, une phrase qui dit quoi y mettre. Une jauge en haut indique ce qu'il
reste. Vous descendez, et quand vous arrivez en bas, la page est finie.

Le texte livré dans les modèles est signalé comme texte d'exemple tant que
vous ne l'avez pas remplacé : impossible de mettre en ligne une page qui
affiche encore « Le titre de votre site » sans l'avoir vu.

L'assistant ne se déclenche que sur une page vierge. Sur un site existant, il
ne s'ouvre jamais — mais le Guide, lui, reprend vos propres textes et images
et vous les fait modifier de la même façon.

### Pour voir ce que ça donne sur un vrai site

**`http://localhost:8080/demo/index.html?admin`** — un site de démonstration
complet. Dans les deux cas, n'importe quelle adresse et n'importe quel mot de
passe ouvrent l'éditeur : tout reste dans votre navigateur, aucun compte à
créer.

## Installer sur un site

Ouvrez **`installation.html`** dans votre navigateur : la page vous guide de
bout en bout, fabrique votre fichier de configuration, et vérifie que Firebase
répond. Le détail écrit est dans
[`docs/INSTALLATION.md`](docs/INSTALLATION.md). En résumé :

1. Copiez `admin/` à la racine du site.
2. Créez `admin-config.js` à partir de `admin-config.exemple.js`.
3. Ajoutez deux lignes avant `</body>`, sur chaque page :

```html
<script src="/admin-config.js"></script>
<script type="module" src="/admin/runtime.js"></script>
```

4. Créez le projet Firebase, publiez les règles fournies, créez le compte du
   client.

Comptez 30 minutes pour le premier site, 5 pour les suivants.

## Les deux points à comprendre avant de vendre un site avec

**1. Les identifiants ne sont pas écrits dans le HTML.** Ils sont recalculés à
chaque chargement, à partir de la position de l'élément, de ses classes
stables et d'une empreinte de son contenu. C'est ce qui permet de republier
une version modifiée du code sans perdre le contenu saisi par le client. La
résolution suit quatre pistes successives — identifiant exact, même chemin,
même contenu, signature et texte proches — et ce qui n'est plus retrouvé est
signalé dans l'éditeur au lieu d'être perdu en silence.

**2. Le module est optionnel.** Sur un hébergement PHP, chaque publication
réécrit le fichier `.html` du site avec le contenu à l'intérieur. Le client
peut supprimer le module quand il veut : son site garde tout, sans aucune
manipulation. Sur un hébergement statique (Netlify, Vercel, Cloudflare
Pages), cette réécriture est impossible — l'éditeur propose alors un export
manuel de la page figée.

Le détail de ces deux mécanismes est dans
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Ce dont le client a besoin

- Un navigateur à jour.
- Une adresse e-mail et un mot de passe, que vous créez pour lui dans la
  console Firebase.
- Rien d'autre. Pas de compte à souscrire, pas d'abonnement, pas de
  connaissance technique.

## Coût de fonctionnement

- **Firebase** : le plan gratuit (Spark) couvre largement un site vitrine —
  Firestore et Authentication sont inclus. Seul Firebase Storage demande le
  plan payant ; le module l'évite en stockant les médias dans un dossier du
  site.
- **Hébergement** : celui du site, inchangé.

---

Licence : voir [`LICENCE.txt`](LICENCE.txt).
