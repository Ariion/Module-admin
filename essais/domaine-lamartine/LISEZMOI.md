# Test sur un site réel — Domaine de Lamartine

Deux entités strictement séparées, comme demandé.

```
source-client/index.html   le code livré, intact — référence
site/index.html            le même fichier + 3 lignes  ← le site en production
site-v2/index.html         simulation d'une republication du code par le dev
admin-config.js            la configuration du module pour ce site
../../admin/               le module, ailleurs dans l'arborescence
```

## La seule modification du code client

```console
$ diff source-client/index.html site/index.html
958a959,962
> <!-- == Module d'administration : seule modification du fichier client ====== -->
> <script src="../admin-config.js"></script>
> <script type="module" src="../../../admin/runtime.js"></script>
>
```

960 lignes de HTML, **3 lignes ajoutées**, zéro attribut, zéro classe, zéro
`id` touché. Le reste du fichier est identique octet pour octet.

## Essayer

```bash
npx http-server -p 8080 -c-1 .        # depuis la racine du dépôt
```

- Le site : <http://localhost:8080/essais/domaine-lamartine/site/index.html>
- L'admin : ajouter `?admin` à la même adresse

Back-end de démonstration : n'importe quel e-mail et mot de passe ouvrent la
session, tout reste dans le navigateur.

## Ce que le module a détecté, sans aucun réglage

**56 éléments éditables** (41 textes, 15 liens) et **6 blocs répétables** :

| Bloc répétable | Blocs | Champs par bloc |
|---|---|---|
| `div.card` — gîtes et chambres | 4 | 3 |
| `div.vie-item` — la vie sur place | 4 | 2 |
| `div.ecrin` — écrins de réception | 2 | 2 |
| `div.activite` — loisirs | 4 | 2 |
| `div.alentour-row` — à découvrir | 8 | 2 (libellé + durée) |
| `div.pratique-item` — infos pratiques | 4 | 2 |

Correctement **écartés** : le SVG décoratif du hero, les `<style>`, et les
éléments de structure sans contenu propre.

Correctement **séparés** : `<span class="num">43</span>` et
`<span class="lbl">Couchages sur le domaine</span>` sont deux champs
distincts, pas un seul bloc « 43Couchages ». Idem pour les lignes
« Gorges de l'Ardèche » / « 15 min ».

La **nav sticky** du site est automatiquement décalée de 48 px sous la barre
d'administration, puis remise en place à la sortie. Aucun style résiduel.

## Le scénario joué

Le propriétaire se connecte et, en mode édition :

1. réécrit le `<h1>` au clavier, directement dans la page ;
2. réécrit le chapô du hero ;
3. change l'adresse **et** le libellé du bouton « Réserver » de la nav ;
4. corrige le nombre de couchages, 43 → 47 ;
5. renomme un gîte **à l'intérieur d'un bloc répétable** ;
6. **duplique** une activité ;
7. **supprime** une ligne de la liste « à découvrir » ;
8. clique sur **Publier**.

Vue visiteur après rechargement — les 7 modifications sont en ligne, la barre
d'administration est absente, 5 activités, 7 lignes « alentours ».

## Le vrai test : le développeur republie un code modifié

`site-v2/` simule une évolution réaliste du site, faite *après* la publication
du client :

- une entrée « Tarifs » ajoutée au menu ;
- une classe ajoutée sur le chapô du hero : `lede` → `lede lede--hero` ;
- **une section entière insérée** avant les hébergements ;
- une cinquième activité ajoutée dans le code ;
- un paragraphe reformulé par le développeur, que le client n'avait pas touché.

Résultat sur ce nouveau code :

| Contenu | État |
|---|---|
| Titre du hero | conservé |
| Chapô (dont la classe a changé) | conservé |
| Lien « Réserver » (adresse + libellé) | conservé |
| 47 couchages | conservé |
| Nom du gîte dans le bloc répétable | conservé |
| Ligne « alentours » supprimée | toujours supprimée |
| **Orphelins** | **aucun** |
| **Erreurs JavaScript** | **aucune** |

Deux comportements à connaître, tous deux visibles dans ce test :

**Le code reste maître de ce que le client n'a pas touché.** Le paragraphe
reformulé par le développeur s'affiche dans sa nouvelle version : il n'existe
pas en base, donc le HTML fait foi. C'est voulu — corriger une faute dans le
code se voit en ligne.

**Une liste touchée par le client lui appartient.** Le client avait dupliqué
« Moto » ; le développeur a ajouté « Canoë » dans le code. C'est la liste du
client qui s'affiche, « Canoë » n'apparaît pas. Le bouton *« revenir aux blocs
du code »*, dans la barre d'outils du bloc, rend la main au développeur.

## Une limite rencontrée sur ce code

La frise « Histoire » alterne `<div class="date">` et `<div class="entry">`.
Les huit cellules sont bien éditables une par une, mais l'ensemble n'est pas
reconnu comme liste répétable : la détection cherche des frères **consécutifs
de même signature**, or ici les signatures alternent. Le client peut donc
modifier chaque date et chaque texte, mais pas ajouter une entrée à la frise.

Pour rendre la frise extensible, il suffirait de regrouper chaque paire :

```html
<div class="ledger-row">
  <div class="date">1824 – 1830</div>
  <div class="entry">L'architecture actuelle du château…</div>
</div>
```
