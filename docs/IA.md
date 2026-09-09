# Rédaction assistée

Le module écrit déjà la page tout seul. Ce document explique comment
brancher une IA **par-dessus**, et surtout où mettre la clé.

## Ce qui marche sans rien brancher

Le questionnaire « Écrire pour moi » pose une dizaine de questions — nom,
secteur, ville, prestations, coordonnées — et compose la page complète :
accroche, prestations, présentation, coordonnées, plan, images, et une
ambiance accordée au métier.

Les phrases viennent d'un fonds écrit à l'avance, un par secteur, dans
lequel les mots du client sont insérés. Ce n'est pas de la génération de
texte : c'est un assemblage. Aucun réseau, aucune clé, aucun abonnement,
et le résultat est une page cohérente et relisable.

Le guide distingue ensuite les deux origines : les phrases venues du fonds
sont signalées « à relire », celles écrites par le client ne le sont pas.

**Un module vendu sans clé d'API reste entièrement fonctionnel.** Tout ce
qui suit est facultatif.

## Ce que l'IA change, et ce qu'elle ne change pas

Elle remplace **les phrases**, et rien d'autre. Le plan de la page, le
choix des sections, les images et l'ambiance restent décidés par le
module. Conséquences directes :

- une clé absente, un quota dépassé, une réponse illisible, une coupure
  réseau : la page se construit quand même, avec le fonds écrit ;
- l'IA ne peut pas produire une page cassée : sa réponse est lue champ par
  champ, et tout ce qui déborde des longueurs prévues est ignoré ;
- les titres de prestations saisis par le client ne sont jamais réécrits.

## Où mettre la clé

### 1. Sur l'hébergement (recommandé)

La clé vit dans `admin-endpoint.php`, sur le serveur du client. Le
navigateur ne la voit jamais.

Dans `admin-endpoint.php` :

```php
$IA_CLE         = 'sk-...';        // votre clé
$IA_FOURNISSEUR = 'anthropic';     // 'anthropic' | 'openai' | 'mistral'
$IA_MODELE      = '';              // vide = modèle par défaut
$IA_MAX_JOUR    = 60;              // appels par jour et par compte
```

Dans `admin-config.js`, côté site :

```js
ia: { endpoint: '/admin-endpoint.php' },
```

Le script vérifie le jeton Firebase avant d'appeler le fournisseur : seul
un compte du projet peut déclencher un appel, et le quota journalier borne
la dépense si un compte est compromis.

Demande un hébergement PHP (OVH, o2switch, Infomaniak, IONOS…). Sur un
hébergement statique (Netlify, Vercel, GitHub Pages), ce chemin n'existe
pas.

La clé se saisit **depuis le module** : bouton *Réglages*, section
*Rédaction assistée*. Elle part vers le script, qui l'écrit dans
`admin-ia-cle.php` à côté de lui, et **elle n'en revient jamais** — l'éditeur
sait seulement qu'une clé est en place, pas laquelle.

Le fichier produit est du PHP. Demandé par HTTP, il est exécuté et ne renvoie
rien : la clé n'est pas téléchargeable, même en visant le fichier
directement. (Vérifié : `GET /admin-ia-cle.php` répond 200 avec un corps
vide.)

Renseigner `$IA_CLE` à la main dans `admin-endpoint.php` reste possible et
revient au même ; la valeur saisie depuis le module a la priorité.

### 2. Sur la machine de l'administrateur (repli)

Sans PHP, la clé peut être saisie dans l'éditeur. Elle est rangée dans le
`localStorage` de **ce navigateur-là** : elle ne part ni dans Firestore, ni
dans `admin-config.js`, ni dans le HTML publié. Un visiteur du site ne peut
pas la lire.

Elle reste toutefois lisible par quiconque a la main sur l'ordinateur du
client, et elle doit être ressaisie sur chaque machine. À réserver aux cas
où l'on ne peut pas faire autrement.

### Ce qu'il ne faut jamais faire

**Ne mettez jamais de clé d'API dans `admin-config.js`.** Ce fichier est
servi à tous les visiteurs du site : la clé serait publique, et facturée à
qui la trouve. Le module n'offre volontairement aucun réglage pour le
faire.

La clé Pixabay, elle, y est bien dans `admin-config.js` : elle est
gratuite, limitée par un quota, et ne peut rien coûter. Ce n'est pas le
même sujet.

## Peut-on livrer une clé avec le module ?

Non. Trois raisons, et aucune n'est contournable :

1. **Les conditions l'interdisent.** Les clés d'API — Pixabay comme les
   fournisseurs d'IA — sont personnelles et ne se redistribuent pas. Une clé
   partagée finit révoquée.
2. **Le quota est par clé.** Cent acquéreurs sur une seule clé, ce sont cent
   acquéreurs qui se gênent, et le premier gros utilisateur bloque tous les
   autres.
3. **Elle serait extractible.** Une clé livrée dans le module se retrouve
   forcément dans un fichier servi par le site de chaque acquéreur. N'importe
   qui peut la lire, et s'en servir à vos frais.

C'est précisément pour cela qu'Openverse est la source d'images par défaut :
elle ne demande **aucune clé**, donc le module est complet dès l'extraction
du ZIP, sans que vous ayez à prêter quoi que ce soit. Qui veut le catalogue
de Pixabay renseigne sa propre clé, gratuite, depuis les réglages.

## Ce que l'invite demande

L'invite est visible dans `admin/core/ia.js` (`construireInvite`). Elle
donne les faits du questionnaire et impose : français, première personne
du pluriel, phrases courtes, pas de superlatif, pas d'emoji, et surtout
**n'inventer aucun fait** — ni prix, ni date, ni récompense, ni chiffre qui
ne figure pas dans le brief.

Cette dernière consigne est la plus importante et la moins garantie : un
modèle peut passer outre. Les textes produits sont à relire avant
publication, comme ceux du fonds. Le module ne publie rien tout seul.

## Coût

Une page écrite = un appel, autour de 1 500 jetons en entrée et 1 200 en
sortie. Sur les modèles courants d'entrée de gamme, cela se compte en
fractions de centime. Le quota par défaut (60 appels par jour et par
compte) est un garde-fou, pas une limite d'usage normal : écrire une page
deux ou trois fois pour comparer reste très en deçà.
