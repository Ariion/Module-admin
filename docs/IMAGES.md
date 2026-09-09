# Les images

Le module propose trois façons d'illustrer une page. Deux fonctionnent sans
que l'acquéreur ait à ouvrir un compte nulle part.

## 1. Openverse — sans clé, par défaut

La recherche d'images libres marche **dès l'installation**. Openverse
(fondation WordPress) répond aux requêtes anonymes et envoie les en-têtes
CORS : l'éditeur l'interroge directement depuis le navigateur.

**Les licences sont filtrées.** Openverse indexe aussi des images en CC-BY,
qui obligent à créditer l'auteur — un client qui en pioche une sans le savoir
se met en tort. Le module ne demande donc que `cc0` et `pdm` (domaine
public) : aucune obligation de mention, aucun piège. Il y a moins de
résultats ; c'est le prix de la tranquillité.

Le catalogue reste plus petit et plus inégal que celui de Pixabay. Pour une
page vitrine ordinaire, il fait le travail.

## 2. Pixabay — avec une clé gratuite

Plus grand catalogue, meilleure qualité moyenne. La clé est gratuite et
personnelle : compte sur pixabay.com, puis la page `pixabay.com/api/docs/`.

Elle se saisit **depuis le module** — bouton *Réglages*, section *Banque
d'images*. Rien à modifier dans le code. Dès qu'elle est en place, c'est
Pixabay qui répond ; videz le champ pour revenir à Openverse.

Cette clé est rangée avec les réglages du site, donc **lisible par qui
inspecte le site**. C'est sans conséquence — elle est gratuite et limitée par
un quota — et le panneau le dit. Ne confondez pas avec une clé d'IA, qui est
facturée et suit un tout autre chemin (voir `IA.md`).

`media.pixabay` dans `admin-config.js` fonctionne toujours et sert de valeur
de départ ; la clé saisie depuis le module l'emporte.

## 3. Les visuels dessinés — toujours disponibles

Huit motifs en SVG, composés avec les couleurs de l'ambiance retenue. Aucun
réseau, aucune clé, aucune question de droits. Ils servent de repli quand la
banque ne répond pas, et de point de départ tant que le client n'a pas ses
propres photos.

## Rapatriement sur l'hébergement

Sur un hébergement PHP, l'image choisie est **téléchargée dans le dossier du
site** au lieu d'être pointée à distance. C'est meilleur pour la performance,
pour la pérennité du site, et c'est ce que demandent les conditions de
Pixabay.

La liste des domaines autorisés se trouve dans `admin-endpoint.php`
(`$IMPORT_HOSTS`). Openverse ne sert pas les fichiers lui-même : il renvoie
vers les sites d'origine (Wikimedia, Flickr, Rawpixel…), qui sont donc listés
aussi. Si une image refuse de se rapatrier, c'est que son domaine n'y est
pas : ajoutez-le, ou gardez l'adresse distante.

## Peut-on livrer une clé avec le module ?

Non — voir `IA.md`, section « Peut-on livrer une clé avec le module ? ». Les
clés sont personnelles, le quota est partagé, et une clé livrée est
extractible du site de chaque acquéreur. C'est la raison d'être d'Openverse
comme source par défaut.
