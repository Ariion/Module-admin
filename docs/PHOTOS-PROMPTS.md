# Les 36 photos d'exemple : direction artistique et prompts

Ce fichier sert à produire les photos d'exemple de la bibliothèque de
modèles, avec **n'importe quel générateur d'images**. Il n'est pas livré au
client : c'est un outil de fabrication.

Les illustrations dessinées (`admin/core/illustrations.js`) restent le repli.
Une photo n'est posée que là où elle existe ; un métier sans photo garde ses
scènes dessinées, donc on peut n'en faire que trois ou quatre et compléter
plus tard sans que rien ne soit bancal.

---

## La règle qui tient tout

**Ce sont des images d'EXEMPLE, pas des images de marque.** Elles doivent
être belles mais neutres : le client les remplacera par les siennes, et
celles-ci ne doivent pas lui manquer. D'où trois interdits, à ne jamais
lever :

- **Aucune personne visible.** Un visage date l'image, impose une origine,
  un âge, une époque — et il faudrait un droit à l'image.
- **Aucun texte, aucun logo, aucune enseigne.** Un générateur écrit des mots
  approximatifs qui sautent aux yeux sur une vignette.
- **Aucune marque reconnaissable** sur un produit, un véhicule, un vêtement.

---

## Le préambule, à coller devant chaque prompt

> Photographie éditoriale naturelle. Lumière naturelle douce. Aucune
> personne visible, aucun texte, aucun logo, aucune marque. Profondeur de
> champ légère, tons chauds et neutres, qualité professionnelle, cadrage
> horizontal large.

**Format : 3:2 horizontal**, 1600 px de large au minimum. C'est la
proportion des bandeaux du module ; une image carrée s'y recadre mal.

Si votre générateur accepte un négatif : `personnes, visages, mains, texte,
lettres, logos, filigrane, cadre, collage, illustration, rendu 3D`.

---

## Les 36 prompts

Trois par métier. Elles se lisent comme une petite série : **la vue
d'ensemble**, **le détail**, **la lumière** — c'est ce qui donne à une page
l'air d'un reportage plutôt que d'un catalogue.

### restaurant

1. Intérieur d'un petit restaurant de quartier chaleureux en fin d'après-midi, tables en bois dressées avec nappes claires et verres à vin, suspensions en laiton, grande fenêtre sur la gauche, quelques plantes vertes.
2. Gros plan en légère plongée sur une table dressée : assiettes blanches, couverts, verres, une carafe d'eau, une petite branche d'herbes fraîches, nappe de lin froissée.
3. Salle de restaurant vide vue depuis le fond, lumière rasante traversant deux fenêtres, chaises en bois, comptoir en arrière-plan, ambiance calme d'avant-service.

### alimentaire

1. Intérieur d'une boulangerie artisanale, étagères en bois chargées de pains de campagne et de miches, vitrine en verre, lumière naturelle du matin.
2. Gros plan sur un plan de travail en bois fariné avec des pains croustillants, un torchon de lin, un couteau à pain.
3. Étal de produits frais sous une verrière, cagettes en bois, légumes et fruits de saison rangés avec soin, lumière douce du matin.

### beaute

1. Intérieur d'un salon de coiffure contemporain, grand miroir rond, fauteuil en cuir, plantes suspendues, sol en terrazzo clair, lumière naturelle.
2. Gros plan sur une étagère d'institut : flacons en verre ambré, serviettes blanches roulées, une bougie, une branche d'eucalyptus.
3. Cabine de soin sereine, table de massage avec draps blancs, galets, lumière tamisée venant d'une fenêtre voilée.

### batiment

1. Chantier de rénovation d'une maison ancienne en pierre, échafaudage métallique propre sur une façade partiellement restaurée, toiture en cours de reprise, tuiles empilées avec soin.
2. Gros plan sur un établi d'artisan : outils à main en bois et acier rangés, copeaux, mètre pliant, lumière d'atelier venant d'une fenêtre haute.
3. Intérieur d'une maison en cours de rénovation, murs fraîchement enduits, fenêtre nue laissant entrer la lumière, bâche de protection au sol, escabeau.

### sante

1. Salle d'attente de cabinet paramédical apaisante, fauteuils en bois clair, grande plante verte, lumière naturelle douce, murs neutres.
2. Gros plan sur un bureau de praticien : carnet, stylo, verre d'eau, petite plante, lumière latérale tamisée.
3. Cabinet de soin lumineux et vide, table d'examen aux draps blancs, étagère ordonnée, fenêtre voilée.

### conseil

1. Salle de réunion claire et vide, grande table en bois, chaises alignées, tableau blanc effacé, baie vitrée donnant sur la ville floue.
2. Gros plan sur un bureau de travail : carnet ouvert aux pages vierges, stylo, tasse de café, lunettes, lumière de fenêtre.
3. Bureau d'angle avec vue, fauteuil, plante, étagère de livres sans titres lisibles, lumière de fin de journée.

### boutique

1. Intérieur d'une petite boutique de vêtements indépendante, portant en bois et métal avec quelques pièces espacées, étagère murale d'objets choisis, miroir ancien, parquet clair.
2. Gros plan sur une étagère de boutique : objets en céramique, textiles pliés, un vase, lumière latérale douce.
3. Vitrine d'une boutique vue de l'intérieur, lumière du jour entrant largement, silhouettes de mannequins sans visage floues, sol en parquet.

### creatif

1. Atelier de création lumineux, grande table de travail en bois, nuancier de couleurs, carnets, lumière de verrière.
2. Gros plan sur un plan de travail d'artiste : pinceaux dans un pot, tubes de peinture, palette, chiffon taché.
3. Mur d'atelier avec des feuilles vierges épinglées, étagère d'outils de dessin, lumière rasante.

### hebergement

1. Extérieur d'une maison d'hôtes à la campagne en fin de journée, façade claire à volets de bois, banc, pots de fleurs, jardin au premier plan, collines douces floues.
2. Chambre d'hôtes paisible, lit fait avec du linge blanc, fenêtre ouverte sur la verdure, table de chevet en bois, lumière du matin.
3. Terrasse ombragée d'une maison de campagne, table et chaises en bois, pergola de vigne, vue sur la vallée.

### association

1. Salle polyvalente lumineuse préparée pour une rencontre, chaises disposées en cercle, grandes fenêtres, parquet.
2. Gros plan sur une table d'accueil : carnets, gobelets, une plante, une corbeille de pommes, nappe simple.
3. Jardin partagé en milieu de journée, bacs de culture en bois, outils rangés, cabane de jardin, lumière généreuse.

### sport

1. Salle de sport claire et vide, sol en bois, haltères rangés sur un support, grandes fenêtres, murs neutres.
2. Gros plan sur une piste d'athlétisme, couloirs peints, texture du revêtement, lumière rasante du matin.
3. Gymnase vide vu de côté, lignes de terrain peintes au sol, paniers relevés, lumière zénithale.

### autre

1. Espace de travail neutre et lumineux, table en bois, chaise, plante, mur clair, lumière de fenêtre.
2. Détail de matières naturelles : bois, lin, céramique, posés ensemble sur une surface claire, lumière latérale.
3. Façade claire d'un petit local commercial sans enseigne, store, trottoir, lumière de fin de journée.

---

## Comment me les transmettre

Nommez les fichiers avec **l'identifiant du métier et le rang de la scène** :

```
restaurant-1.jpg   restaurant-2.jpg   restaurant-3.jpg
boutique-1.jpg     batiment-1.jpg     hebergement-1.jpg
...
```

Les douze identifiants, à reprendre exactement :

```
restaurant  alimentaire  beaute     batiment
sante       conseil      boutique   creatif
hebergement association  sport      autre
```

Déposez-les dans un dossier **`photos-source/`** à la racine du dépôt, en
JPEG brut et non retouché. La conversion en WebP, les quatre largeurs et le
`srcset` sont faits ensuite par le module — ne les préparez pas à la main.

---

## Avant de produire les 36

Le module est **revendu**, et ces images partent dedans. Ce n'est pas le cas
le plus permissif : c'est le plus restrictif. Vérifiez, dans les conditions
du générateur que vous employez, la clause d'**usage commercial** ET celle de
**redistribution au sein d'un produit**. Les deux ne vont pas toujours
ensemble, et c'est la seconde qui compte ici.

Une image purement générée n'a pas d'ayant droit tiers : personne à créditer,
personne pour réclamer. En contrepartie, elle n'est probablement protégée par
aucun droit d'auteur en France, donc rien n'empêche un tiers de réutiliser les
mêmes. Pour des images d'exemple destinées à être remplacées, c'est sans
conséquence — mais autant le savoir avant, pas après.
