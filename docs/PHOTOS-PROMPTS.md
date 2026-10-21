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

## Ce sont des fonds de bandeau, pas des photos à regarder

C'est l'erreur commise à la première série, et elle vaut d'être écrite. Un
titre et une accroche se posent PAR-DESSUS ces images. Quatre photos denses
de bord en bord, magnifiques seules, donnent un bandeau où le titre tombe au
milieu du décor.

Chaque prompt doit donc demander **une zone calme sur un tiers de l'image** :
un mur clair, un ciel, une surface unie, un fond flou. Sans elle, l'image
n'est pas utilisable là où elle est destinée à servir.

## Le préambule, à coller devant chaque prompt

> Photographie éditoriale naturelle. Aucune personne visible, aucun texte,
> aucun logo, aucune marque. Profondeur de champ légère, qualité
> professionnelle, cadrage horizontal large. Composition aérée : garder un
> tiers de l'image en zone calme et peu contrastée, qui pourra accueillir un
> titre.

**Format : 3:2 horizontal**, 1600 px de large au minimum. C'est la
proportion des bandeaux du module, une image carrée s'y recadre mal.

Si votre générateur accepte un négatif : `personnes, visages, mains, texte,
lettres, logos, filigrane, cadre, collage, illustration, rendu 3D`.

## La lumière se choisit par métier, pas une fois pour toutes

Deuxième correction de la première série : tout avait été demandé en tons
chauds, et les quatre images se ressemblaient comme un même filtre plutôt
que comme une collection. La cohérence vient du TRAITEMENT (lumière
naturelle, personne, profondeur, aération), pas de la température.

| Lumière | Métiers |
|---|---|
| Chaude, fin de journée | restaurant, hebergement, alimentaire |
| Neutre, plein jour diffus | batiment, boutique, sport, association |
| Claire et froide, matin | sante, conseil |
| Contrastée, latérale | beaute, creatif, autre |

Ajoutez la mention correspondante à la fin du prompt. Et pour le bâtiment,
évitez le plein soleil et le ciel bleu franc : ils cassent la série.

---

## Les 36 prompts

Trois par métier. Elles se lisent comme une petite série : **la vue
d'ensemble**, **le détail**, **la lumière**. C'est ce qui donne à une page
l'air d'un reportage plutôt que d'un catalogue.

Chacune dit **où se place la zone calme**. Ne la retirez pas : c'est elle qui
rend l'image utilisable en bandeau. Ajoutez la lumière du métier d'après le
tableau plus haut.

### restaurant — lumière chaude, fin de journée

1. Intérieur d'un petit restaurant de quartier, tables en bois dressées avec nappes claires et verres, suspensions en laiton. **Tiers gauche : un mur clair et nu, sans objet.**
2. Table dressée vue en légère plongée : assiettes blanches, couverts, verres, carafe d'eau, branche d'herbes fraîches. **Tiers supérieur : la nappe de lin vide, unie.**
3. Salle vide vue depuis le fond, chaises en bois, comptoir en arrière-plan, ambiance d'avant-service. **Tiers droit : un pan de mur dans l'ombre douce.**

### alimentaire — lumière chaude, fin de journée

1. Intérieur d'une boulangerie artisanale, étagères en bois chargées de pains de campagne, vitrine en verre. **Tiers droit : un mur clair au-dessus du comptoir.**
2. Plan de travail en bois fariné avec des pains croustillants, un torchon de lin, un couteau. **Tiers gauche : le bois nu et fariné.**
3. Étal de produits frais sous une verrière, cagettes en bois, légumes de saison rangés avec soin. **Tiers supérieur : la verrière claire et floue.**

### beaute — lumière contrastée, latérale

1. Salon de coiffure contemporain, grand miroir rond, fauteuil, plantes suspendues, sol en terrazzo. **Tiers gauche : un mur uni traversé d'une ombre douce.**
2. Étagère d'institut : flacons en verre ambré, serviettes blanches roulées, une bougie, une branche d'eucalyptus. **Tiers supérieur : le mur au-dessus de l'étagère.**
3. Cabine de soin sereine, table de massage aux draps blancs, galets, fenêtre voilée. **Tiers droit : le voilage lumineux et uni.**

### batiment — lumière neutre, plein jour diffus, ciel couvert

1. Rénovation d'une maison ancienne en pierre, échafaudage propre sur une façade partiellement restaurée, tuiles empilées. **Tiers supérieur : un ciel blanc et uni, sans bleu franc.**
2. Établi d'artisan : outils à main en bois et acier rangés, copeaux, mètre pliant. **Tiers droit : le plan de travail vide.**
3. Intérieur en cours de rénovation, murs fraîchement enduits, fenêtre nue, bâche au sol, escabeau. **Tiers gauche : un mur enduit, lisse et nu.**

### sante — lumière claire et froide, matin

1. Salle d'attente apaisante, fauteuils en bois clair, grande plante verte, murs neutres. **Tiers droit : un mur clair sans décoration.**
2. Bureau de praticien : carnet, stylo, verre d'eau, petite plante. **Tiers supérieur : le plan de bureau vide.**
3. Cabinet de soin lumineux et vide, table d'examen aux draps blancs, étagère ordonnée, fenêtre voilée. **Tiers gauche : le mur et le voilage.**

### conseil — lumière claire et froide, matin

1. Salle de réunion claire et vide, grande table en bois, chaises alignées, baie vitrée sur une ville floue. **Tiers gauche : un mur clair et nu.**
2. Bureau de travail : carnet ouvert aux pages vierges, stylo, tasse, lunettes. **Tiers droit : la surface du bureau, vide.**
3. Bureau d'angle avec vue, fauteuil, plante, étagère de livres sans titres lisibles. **Tiers supérieur : le ciel pâle derrière la vitre.**

### boutique — lumière neutre, plein jour diffus

1. Petite boutique de vêtements indépendante, portant en bois et métal avec quelques pièces espacées, miroir ancien, parquet clair. **Tiers gauche : un mur clair et nu.**
2. Étagère de boutique : objets en céramique, textiles pliés, un vase. **Tiers supérieur : le mur au-dessus.**
3. Vitrine vue de l'intérieur, lumière du jour entrant largement, parquet. **Tiers droit : la lumière diffuse de la vitrine, sans détail.**

### creatif — lumière contrastée, latérale

1. Atelier de création lumineux, grande table de travail en bois, nuancier, carnets, verrière. **Tiers droit : le mur d'atelier, nu.**
2. Plan de travail d'artiste : pinceaux dans un pot, tubes de peinture, palette, chiffon taché. **Tiers gauche : la table vide.**
3. Mur d'atelier avec des feuilles vierges épinglées, étagère d'outils de dessin. **Tiers supérieur : le mur, au-dessus des feuilles.**

### hebergement — lumière chaude, fin de journée

1. Maison d'hôtes à la campagne, façade claire à volets de bois, banc, pots de fleurs, jardin au premier plan, collines floues. **Tiers gauche : le ciel et les collines, sans détail.**
2. Chambre d'hôtes paisible, lit fait de linge blanc, fenêtre ouverte sur la verdure, table de chevet en bois. **Tiers droit : le mur clair près de la fenêtre.**
3. Terrasse ombragée, table et chaises en bois, pergola de vigne, vue sur la vallée. **Tiers supérieur : la vallée en lumière, floue.**

### association — lumière neutre, plein jour diffus

1. Salle polyvalente lumineuse préparée pour une rencontre, chaises en cercle, grandes fenêtres, parquet. **Tiers gauche : un mur clair.**
2. Table d'accueil : carnets, gobelets, une plante, une corbeille de pommes, nappe simple. **Tiers supérieur : la nappe vide.**
3. Jardin partagé, bacs de culture en bois, outils rangés, cabane de jardin. **Tiers supérieur : le ciel pâle et uni.**

### sport — lumière neutre, plein jour diffus

1. Salle de sport claire et vide, sol en bois, haltères sur un support, grandes fenêtres, murs neutres. **Tiers droit : un mur nu.**
2. Piste d'athlétisme, couloirs peints, texture du revêtement. **Tiers supérieur : la piste vide, hors des lignes.**
3. Gymnase vide vu de côté, lignes de terrain peintes au sol, paniers relevés. **Tiers gauche : le mur du fond, uni.**

### autre — lumière contrastée, latérale

1. Espace de travail neutre et lumineux, table en bois, chaise, plante, mur clair. **Tiers gauche : le mur, nu.**
2. Matières naturelles posées ensemble sur une surface claire : bois, lin, céramique. **Tiers supérieur : la surface vide.**
3. Façade claire d'un petit local commercial sans enseigne, store, trottoir. **Tiers droit : la façade, sans ouverture.**

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
