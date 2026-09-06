# Architecture

## Le problème à résoudre

Donner à un client non technique la main sur le contenu d'un site codé à la
main, sans CMS, sans serveur, et sans que le module devienne un point de
dépendance dont on ne peut plus sortir.

Trois contraintes en découlent :

1. Le module doit se greffer sur du HTML **existant**, non préparé.
2. Le site doit rester lisible et fonctionnel **sans** le module.
3. Le contenu enregistré doit survivre à une **republication du code**.

---

## 1. Identifier un élément sans toucher au HTML

### Pourquoi pas d'attributs injectés

L'approche courante consiste à poser un `data-id="..."` sur chaque élément
éditable, via un outil de scan lancé une fois. C'est robuste, mais ça a un
coût : le module modifie le code source du site, il faut re-lancer l'outil à
chaque évolution, et le HTML se remplit d'attributs qui n'ont de sens que pour
lui. Le module cesse d'être un module.

Ici, **rien n'est écrit dans le HTML**. L'identifiant est calculé.

### Ce qui compose une empreinte

Pour chaque élément détecté, le module calcule quatre signaux :

| Signal | Exemple | Rôle |
|---|---|---|
| `anchor` | `#chambres` | repère stable le plus proche : un `id` unique, sinon un `<main>`/`<header>`/`<footer>`, sinon `body` |
| `path` | `#chambres\|div[1]>h3[1]` | chemin depuis l'ancre, en `nth-of-type` |
| `sig` | `h3.room-title` | balise + classes stables (les classes d'état — `is-`, `active`, `swiper-`… — et les classes hachées d'un build sont écartées) |
| `ch` | hash du texte d'origine | permet de retrouver un élément qui a bougé |

L'identifiant stocké est `e_` + hash de (ancre + chemin + rôle + signature).

Ancrer le chemin sur le `#id` le plus proche est ce qui rend le système
tolérant : tout ce qui change **ailleurs** dans la page n'a aucun effet sur le
chemin d'un élément.

### La cascade de résolution

Au chargement, chaque enregistrement est rebranché par ordre de confiance
décroissante. Les correspondances sûres sont traitées en premier, pour qu'un
appariement approximatif ne vole pas l'élément d'un autre.

```
1. empreinte identique                  → confiance 1.0   cas nominal
2. même chemin, même rôle               → confiance 0.9   une classe a changé
3. même hash de contenu                 → confiance 0.8   l'élément a été déplacé
4. même signature + texte proche (≥0.6) → confiance 0.5   dernier recours
   sinon                                → orphelin, signalé dans l'éditeur
```

Rien n'est perdu silencieusement : ce qui n'est pas rebranché est compté dans
la barre d'administration.

### Ce que ça encaisse, vérifié

Scénario testé : contenu publié sur une page, puis republication d'un HTML
modifié — paragraphe ajouté avant un titre, classe ajoutée sur un paragraphe,
entrée de menu supplémentaire, quatrième carte ajoutée à une liste,
reformulation d'un texte non édité. Résultat : **tout le contenu retrouve sa
place, zéro orphelin.**

Vérifié aussi sur un site client réel de 960 lignes (voir
[`essais/domaine-lamartine/`](../essais/domaine-lamartine/LISEZMOI.md)) : 56
éléments et 6 listes répétables détectés sans configuration, puis section
entière insérée, classe modifiée, entrée de menu et bloc ajoutés dans le code
— **aucun orphelin, aucune erreur**.

Ce qui casse quand même : renommer l'`id` qui sert d'ancre à une section,
ou déplacer un élément dans une autre section **et** en changer le texte au
même moment. Dans les deux cas l'élément devient orphelin — visible, jamais
silencieux.

### Une porte de sortie pour le développeur

Un `data-admin-id="hero-titre"` posé à la main est prioritaire sur tout le
reste. À réserver aux éléments critiques d'une page qu'on sait devoir
restructurer. C'est optionnel ; ce n'est jamais nécessaire pour démarrer.

Attributs reconnus :

| Attribut | Effet |
|---|---|
| `data-admin-id` | fige l'identifiant d'un élément |
| `data-admin-anchor` | déclare un point d'ancrage stable pour toute une zone |
| `data-admin-ignore` | exclut un élément et ses descendants |
| `data-admin-no-repeat` | interdit la détection de blocs répétables sur un conteneur |

---

## 2. Détecter ce qui est éditable

Le scanner parcourt le DOM et classe chaque élément :

- **texte** — élément dont tous les enfants sont du texte ou des balises inline
  (`<strong>`, `<em>`, `<br>`…). Le module ne descend pas plus bas : le
  paragraphe entier est le champ. Exception : une enveloppe sans texte propre
  et à plusieurs enfants est éclatée en autant de champs — sinon
  `<div><span class="num">43</span><span class="lbl">Couchages</span></div>`
  se présenterait au client comme un seul bloc « 43Couchages ».
- **lien** — `<a href>`. L'adresse et le libellé sont éditables ensemble.
- **image** — `<img src>`, avec le texte alternatif.
- **fond** — image de fond CSS, dès que l'élément dépasse une aire minimale.
  Indispensable : sur un site écrit à la main, le visuel du hero est presque
  toujours un `background-image`.

Sont exclus d'office : `<script>`, `<style>`, `<svg>`, les éléments non
affichés, et tout ce que la configuration met dans `scan.exclude`.

### Blocs répétables

Un conteneur dont plusieurs enfants **consécutifs** partagent la même
signature est une collection. Trois garde-fous évitent les faux positifs :

- au moins deux blocs,
- chaque bloc a des enfants (un `<p>` seul n'est pas un composant),
- les blocs portent une classe.

Sans le dernier critère, les deux paragraphes d'un pied de page se retrouvent
avec des boutons « dupliquer » — bruit inutile et source d'erreurs pour le
client. Un développeur nomme ses composants (`.room`, `.review`) ; il ne nomme
pas ses lignes de texte.

Le gabarit d'un bloc **n'est pas stocké en base** : il est relu dans la page à
chaque chargement. Si le design du bloc évolue, tous les blocs héritent du
nouveau design en conservant leur contenu.

Le contenu stocké est une liste :

```json
{ "items": [
  { "key": "i0", "src": 0, "fields": { "f_13bywtl": { "text": "Chambre Cabane" } } },
  { "key": "i1", "src": 1, "fields": {} },
  { "key": "ix9k", "src": 1, "fields": { "f_13bywtl": { "text": "Chambre Source (bis)" } } }
] }
```

`src` désigne le bloc du HTML qui sert de gabarit ; `fields` ne contient que
ce qui a été modifié. Tant que la liste correspond exactement à celle du code,
les nœuds d'origine sont conservés — les scripts du site (carrousel, lightbox)
restent accrochés. La reconstruction n'a lieu que si la structure change.

**Limite assumée :** dès que le client touche à la liste, elle lui appartient.
Un bloc ajouté ensuite dans le code n'apparaîtra pas. Le bouton « revenir aux
blocs du code » dans la barre d'outils du bloc rend la main au développeur.

### Sections et éléments

Le client ajoute une section vide, puis y dépose des éléments : titre, texte,
bouton, liste, image, vidéo, carte, colonnes, séparateur, espaceur. La
bibliothèque, la recherche, les catégories et le glisser-déposer reprennent ce
que fait Elementor.

**Comment un élément générique s'intègre à un site écrit à la main.** C'est le
problème de fond : un widget qui apporte son propre style jure avec tout. La
réponse tient dans le balisage — les éléments émettent du HTML **sémantique et
sans classes** : un `<h2>`, un `<p>`, un `<img>`. La feuille de style du site
s'y applique donc d'elle-même, et un titre inséré prend sa police, sa couleur
et ses marges. Seuls les conteneurs portent quelques styles en ligne, pour la
mise en grille. *Vérifié :* un titre inséré dans le site du Domaine de
Lamartine hérite bien de sa police `Fraunces`.

Un élément n'est jamais inséré dans le balisage du développeur : il vit dans
une section ajoutée. La mise en page du site reste intacte.

Deuxième façon d'ajouter une section : **copier une section existante** de la
page, quand on veut reprendre une mise en page déjà écrite. Le rendu est alors
exactement celui du développeur.

Trois opérations : ajouter (copie d'une section), retirer, réordonner. Elles
sont stockées à part du contenu :

```json
{ "sections": {
  "add":  [
    { "kind": "copy",    "key": "s1", "from": "e_utvrr0", "after": "e_181fezc", "fields": {} },
    { "kind": "widgets", "key": "s2", "after": "e_9ka22p",
      "tree": { "type": "section", "children": [ { "type": "heading", "props": { "text": "…" } } ] } }
  ],
  "hide": [ { "ref": "e_9ka22p", "label": "Loisirs" } ],
  "order": []
} }
```

Elles sont appliquées **après** le contenu, et c'est essentiel : les
empreintes sont calculées sur la page d'origine, donc insérer ou retirer une
section ne décale l'identité d'aucun élément. Ce qui vit à l'intérieur d'une
section ajoutée n'existe pas dans le code du site : ces éléments sont adressés
par `fields`, relativement à la section, exactement comme les blocs
répétables.

Une section retirée reste listée dans l'onglet Structure avec son titre, pour
pouvoir la remettre — sans cela le client n'aurait aucun moyen de revenir en
arrière.

### Pages du site

Un site statique n'a pas d'index de ses pages. Le module en **déduit** la
liste à partir des liens de la page affichée — menu et pied de page pointent
en pratique vers toutes les pages. C'est une découverte, pas une vérité : une
page liée nulle part n'apparaîtra pas.

Changer de page recharge l'aperçu et son brouillon. **Créer** une page copie le
code d'origine d'une page existante, côté serveur : la nouvelle hérite de
l'en-tête, du pied de page et du style, sans reprendre le contenu déjà saisi.
Cela demande donc l'hébergement inscriptible ; sans lui, le panneau le dit au
lieu de proposer un bouton qui échouerait.

### Références de section

Une section est identifiée par son empreinte, qui repose sur son rang parmi
ses frères. Dès qu'une section est retirée ou ajoutée, les rangs suivants se
décalent : une référence calculée sur le DOM **modifié** ne retrouve plus rien
sur le DOM d'origine, où tout est réappliqué. Chaque section porte donc sa
référence d'origine, posée avant toute modification.

Sans cela, la deuxième suppression d'une section sans `id` était bien
enregistrée mais restait sans effet — le défaut était invisible sur une
première suppression, et sur toute section portant un `id`, dont l'empreinte
ne dépend pas de ses frères.

### Modèles de page et de section

Cinq **trames de page** — accueil une page, page de vente, portfolio, contact,
à propos — posées depuis le pied du panneau, à ajouter à la suite ou à
substituer à la page. Les sections du site sont alors retirées, pas
supprimées : elles restent récupérables depuis l'onglet Structure.

### Modèles de section

Huit mises en page prêtes à l'emploi — trois colonnes, image et texte, appel à
l'action, galerie, contact… Ce sont de simples arbres de widgets : un modèle
inséré n'apporte que la **structure**, jamais un style qui jurerait avec le
site. La typographie et les couleurs viennent de la feuille du site.

### Polices

Seize familles Google Fonts, réglables par élément. Seules celles réellement
employées dans la page produisent une balise `<link>`, écrite au moment de
l'application et conservée à la régénération du HTML : le site garde ses
polices une fois le module retiré — vérifié.

### Habillage

Un schéma unique (`core/style.js`) décrit ce qui est réglable, et sert à la
fois à construire le panneau et à écrire les styles : couleurs, typographie
(taille, graisse, casse, interlignage, espacement des lettres), espacements,
largeur maximale, bordure et ombre. Le même code sert aux éléments du site et
aux widgets ; seules les fonctions de lecture et d'écriture changent.

Tout est appliqué en **style en ligne** : les valeurs suivent donc l'élément
jusque dans le fichier HTML régénéré, sans dépendre d'une feuille séparée.
Chaque valeur est vérifiée contre son type avant d'entrer dans `style` — une
couleur doit être une couleur, un nombre un nombre.

Le **CSS personnalisé** fait exception, parce qu'une règle a besoin d'un
sélecteur (un `:hover`, par exemple). Il produit une classe `admin-c-…` sur
l'élément et une règle dans une feuille unique ; le mot `selector` y désigne
l'élément, comme dans Elementor. Classe et feuille sont conservées à la
régénération du HTML — vérifié.

Les surcharges d'habillage des éléments du site sont stockées comme le reste
du contenu, avec le rôle `style`, et retrouvées par le chemin de l'élément :
le scanner ne remonte pas les conteneurs, un résolveur direct par chemin prend
le relais. Celles des widgets vivent dans leur arbre.

---

## 3. Deux chemins de chargement

C'est ce qui permet de greffer le module sans dégrader le site.

### Visiteur — `admin/runtime.js`

- Aucun SDK. Le contenu publié est lu par une requête REST Firestore
  (les pages publiées sont en lecture publique).
- Le contenu déjà connu est appliqué depuis le `localStorage` dès
  `DOMContentLoaded`, avant même la réponse du réseau.
- Si la page n'a jamais été modifiée, **le DOM n'est même pas parcouru**.
- Toute erreur est absorbée : le HTML d'origine reste affiché.

### Administrateur — `admin/ui/editor.js`

Chargé par `import()` dynamique uniquement quand `?admin` est présent ou
qu'une session d'édition est en cours. Il embarque le SDK Firebase (Auth,
Firestore, Storage), l'interface et les panneaux.

Le site s'affiche **dans une iframe**, à côté du panneau de réglages. Ce n'est
pas qu'une question d'aspect : plus d'en-tête collant à décaler ni de marge
posée sur le corps du site, aucune règle CSS du site ne peut atteindre les
panneaux, et l'aperçu par format d'écran devient une simple largeur d'iframe.
Le client peut aussi naviguer dans son site : une page ouverte dans l'aperçu
est rechargée dans l'éditeur, brouillon compris.

L'interface elle-même vit dans un **shadow DOM**. Les contours de survol sont
des boîtes dessinées par-dessus l'aperçu — aucun style n'est posé sur les
éléments du site. Sortir de l'édition ne laisse aucune trace.

Deux accents portent une information plutôt qu'une décoration : ce qui touche
au **contenu** est bleu, ce qui touche à la **structure** est violet. Le client
sait ce qu'il manipule.

**Savoir quand l'aperçu est prêt** a demandé une mesure. Une feuille de style
distante qui ne répond pas bloque le PREMIER RENDU, pas seulement l'analyse :
l'aperçu restait blanc alors que son document était complet. Il attend donc la
peinture et, passé deux secondes, se passe des feuilles tierces bloquantes —
jamais de celles du site, jamais dans le fichier régénéré.

---

## 4. Modèle de données Firestore

```
sites/{siteId}                     méta du site
sites/{siteId}/pages/{pageId}      contenu PUBLIÉ      lecture publique
sites/{siteId}/drafts/{pageId}     brouillon           éditeurs du site
sites/{siteId}/revisions/{revId}   historique          éditeurs du site
sites/{siteId}/media/{mediaId}     bibliothèque média  éditeurs du site
sites/{siteId}/members/{uid}       accès client        { role: owner|editor }
superadmins/{uid}                  accès global du prestataire
```

Une page publiée :

```json
{
  "v": 1,
  "content": {
    "e_3jxid7": {
      "role": "text",
      "anchor": "<body", "path": "<body|div[2]>div[1]>h1[1]",
      "sig": "h1", "ch": "1a2b3c", "sample": "Une parenthèse au bord…",
      "value": { "text": "Le calme, à vingt minutes de la mer" }
    }
  },
  "collections": { "c_9f2k1": { "path": "…", "itemSig": "article.room", "items": [ … ] } },
  "publishedAt": 1757030400000,
  "updatedBy": "client@exemple.fr"
}
```

Une page entière tient dans un document (limite Firestore : 1 Mo), donc
**une seule lecture** par page côté visiteur.

Seul ce que le client a modifié est stocké. Un texte laissé tel quel n'existe
pas en base : il continue d'être piloté par le HTML. Corollaire utile — quand
le développeur corrige une faute dans le code, la correction est visible en
ligne, sauf si le client avait déjà réécrit ce texte lui-même.

### Un siteId dans tous les chemins

Le même code fonctionne avec un projet Firebase dédié par client (un seul
`siteId`) et avec un projet mutualisé (plusieurs `siteId` cloisonnés par les
règles). Les règles refusent tout accès croisé : un client ne peut ni lire ni
écrire chez un autre, même en partageant le projet.

Le prestataire se donne un accès global en créant `superadmins/{sonUid}` à la
main dans la console. Ce document ne peut être créé par personne d'autre —
aucune règle n'autorise son écriture.

---

## 5. Brouillon, publication, historique

Le fonctionnement d'Elementor, sans son poids :

1. Chaque modification est appliquée immédiatement à l'écran et écrite dans le
   brouillon (`drafts/{pageId}`) après 2,5 s d'inactivité. Le site public ne
   bouge pas.
2. « Publier » écrit `pages/{pageId}`, archive une révision et supprime le
   brouillon — le tout dans un `writeBatch`, donc jamais d'historique
   incohérent. Le cache local est mis à jour dans la foulée.
3. L'historique liste les publications. Restaurer une version la charge comme
   brouillon : le client voit le résultat dans la page et décide ensuite de
   publier. Aucun écrasement immédiat.

---

## 6. Images : trois stockages, une interface

Le stockage des images est un point d'extension (`media/`). Chaque adaptateur
expose `upload(file)` et, s'il le peut, `list()`.

| Adaptateur | Où vont les images | Coût |
|---|---|---|
| `firebase` | Firebase Storage | plan Blaze (carte bancaire, quota gratuit) |
| `endpoint` | dossier `/medias` sur l'hébergement du client | aucun |
| `url` | nulle part : adresse saisie à la main | aucun |

L'adaptateur `endpoint` est celui qui évite au client tout abonnement
supplémentaire : les images restent chez lui, servies par son propre domaine,
consultables en FTP. Le script PHP fourni (`tools/admin-media.php`) vérifie la
**signature** du jeton Firebase contre les certificats publics de Google avant
d'écrire quoi que ce soit — il ne se contente pas de le décoder.

Dans tous les cas, l'image est redimensionnée et recompressée dans le
navigateur avant l'envoi (WebP quand il est supporté). Une photo de téléphone
de 6 Mo ne part pas telle quelle.

---

## 7. Sécurité

- **Double assainissement.** Le contenu est nettoyé à l'enregistrement *et* à
  l'affichage. Un compte client compromis ne permet pas d'injecter du script
  dans le site public.
- **Liste blanche stricte.** Balises inline uniquement, attributs `on*`
  systématiquement retirés, `javascript:` / `data:text/html` / `vbscript:`
  neutralisés y compris sous forme obfusquée (espaces, tabulations, caractères
  invisibles insérés dans le schéma).
- **Collage en texte brut.** Un copier-coller depuis Word n'injecte pas ses
  balises de mise en forme.
- **Cloisonnement par les règles**, pas par le code client. Le module ne
  décide de rien : c'est Firestore qui refuse.

---

## 8. Réversibilité

Le module ne doit jamais devenir un point de blocage. Le contenu ne doit donc
pas vivre uniquement dans Firebase : il doit finir **dans le fichier HTML**.

### Réécriture automatique à la publication

À chaque clic sur « Publier », après l'écriture dans Firestore :

1. le module demande à l'hébergement l'URL du **code d'origine** de la page
   (`page.src.html`, copie conservée à l'installation) ;
2. il charge cette source dans une **iframe cachée**, rendue hors écran — pas
   `display:none`, la mise en page doit être calculée pour que les images de
   fond CSS soient détectables ;
3. il y applique l'instantané publié avec le même moteur qu'en édition ;
4. il sérialise le résultat et le repose sur l'hébergement à la place du
   fichier publié.

Le site n'a alors plus besoin du module pour afficher son contenu. Supprimer
le dossier `admin/` ne fait rien perdre : le HTML porte tout.

**Pourquoi repartir de la source et non du DOM affiché.** Le DOM courant a
déjà subi une application de contenu, et parfois les scripts du site. Le
sérialiser reviendrait à photographier un état dérivé, et chaque publication
empilerait sa dérive sur la précédente. En repartant du code du développeur à
chaque fois, la chaîne reste courte : **code d'origine + contenu publié**.

**Le code reste maître.** Le fichier régénéré porte un
`<meta name="admin-baked">`. Quand le développeur redéploie sa page, le
fichier en ligne n'a plus ce marqueur : l'hébergement le détecte et remplace
la copie de référence par la nouvelle version. Le design et la structure
reviennent donc du code, le contenu de Firebase.

### Savoir quand analyser

Point délicat, et source d'un défaut corrigé après mesure. Attendre
`readyState` n'est pas tenable : un `<script src>` classique bloque
l'analyseur tant qu'une feuille de style distante n'a pas répondu. Sur un site
chargeant Google Fonts depuis un réseau lent, la publication prenait **13
secondes**. Mais régénérer un document analysé à moitié écraserait le fichier
du site par une page tronquée — inacceptable.

La source est donc récupérée en parallèle par `fetch` et sert de référence :
dès que l'iframe contient tout le **contenu** annoncé, on analyse. La fin
éventuellement manquante — des `<script>` restés derrière le blocage — est
recollée telle quelle à la sérialisation, ce qui préserve les balises du
module et donc la capacité du client à continuer d'éditer. Les feuilles de
style du site (même origine) sont attendues ; celles des CDN tiers ne bloquent
pas. Mesure après correction : **0,3 seconde**.

### Sans hébergement inscriptible

La réécriture demande un hébergement capable d'écrire un fichier — donc PHP
(OVH, o2switch, tout mutualisé). Sur un statique pur comme Netlify, elle est
inopérante : le module fonctionne normalement, mais le contenu reste servi au
chargement. Le bouton d'export manuel reste alors la porte de sortie, et
produit le même fichier autonome.

### Export manuel

Le bouton d'export produit à la demande le HTML de la page courante avec le
contenu intégré, plus une sauvegarde JSON du contenu. Vérifié sur un site
client réel : le fichier produit ne contient plus une seule occurrence du mot
« admin », aucune balise `<script>` du module, aucun attribut `data-admin-*`,
et rend leur position d'origine aux éléments fixes que l'éditeur avait
décalés.

*Nuance :* l'export manuel est une re-sérialisation du DOM au moment du clic.
Le contenu est fidèle, l'indentation d'origine ne l'est pas.

## Limites connues

| Limite | Détail |
|---|---|
| Éléments : dans les sections ajoutées | On dépose un élément dans une section qu'on a ajoutée, jamais dans le balisage du développeur. C'est ce qui garantit que la mise en page du site reste intacte. |
| Vidéo et carte | Seuls YouTube, Vimeo et Google Maps sont acceptés, en URL d'intégration vérifiée. |
| CSS personnalisé : déclarations et règles | Le mot `selector` désigne l'élément. Les `@import` et les sélecteurs contenant `<` ou `@` sont refusés. |
| Contenu masqué au scan | Un menu mobile invisible sur grand écran n'est pas détecté depuis un grand écran. Passer `scan.visibleOnly: false` ou éditer depuis la largeur concernée. |
| Listes appropriées par le client | Voir §2. Le bouton « revenir aux blocs du code » rend la main. |
| Listes alternées | Une frise `date / texte / date / texte` n'est pas vue comme répétable : la détection cherche des frères consécutifs de **même** signature. Chaque cellule reste éditable ; envelopper chaque paire dans un `<div>` rend la liste extensible. |
| Contenu généré par JavaScript | Ce que les scripts du site injectent après le scan n'est pas éditable. |
| Une page = un document | Au-delà de ~1 Mo de contenu modifié sur une seule page, il faudrait découper. Très au-delà d'un site vitrine. |
| Bref clignotement | Sans réécriture du HTML, le texte d'origine peut apparaître un instant avant le contenu publié sur une page jamais visitée. Le cache local supprime l'effet dès la deuxième visite ; la réécriture le supprime définitivement. |
| Réécriture et hébergement | La réécriture automatique demande PHP. Sur un statique pur (Netlify), seul l'export manuel est disponible. |
| Copie de référence publique | `page.src.html` est lisible par quiconque connaît l'URL. Elle ne contient que le code du site, déjà public — mais aussi le contenu d'avant les modifications du client. |
