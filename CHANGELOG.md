# Journal des versions

## 1.11.1

**L'aperçu et le panneau restent où on les a laissés**

Signalé : « quand je fais une modif quelconque depuis le panel gauche, ça me
remet à chaque fois tout en haut ». C'était deux défauts distincts, corrigés
tous les deux.

- **L'aperçu ne défile plus sans raison.** Le lien panneau → page, qui montre
  dans le site l'élément piloté par le champ où l'on entre, faisait défiler
  l'aperçu à chaque fois. Il ne le fait désormais que si l'élément n'est pas
  déjà à l'écran (au moins la moitié de sa hauteur, ou un tiers de l'écran).
  Un défilement reste forcé là où il est utile : une section qu'on vient de
  créer, de dupliquer ou de déplacer, et l'ouverture de la feuille sur
  téléphone.
- **Le panneau de gauche ne repart plus en haut.** Beaucoup de réglages se
  redessinent en entier quand on les change (un choix qui en fait apparaître
  un autre, une case cochée dans le guide, un filtre dans la liste des
  éléments, un thème essayé). Vider le conteneur remettait son défilement à
  zéro. La position est maintenant relevée avant et reposée après, dans
  l'inspecteur, le guide, la grille des thèmes et la liste des éléments.

**Détail**

L'inspecteur comparait l'ancienne et la nouvelle sélection par identité
d'objet ; l'éditeur en reconstruit un neuf à chaque réglage de widget, si
bien que le panneau se croyait toujours devant une nouvelle sélection. La
comparaison porte désormais sur ce qui est visé.

## 1.11.0

**Bibliothèque d'effets et d'animations**
- Nouveau groupe **Effets et animations** dans l'habillage de chaque bloc,
  avec trois familles et une vitesse.
- **Au survol** : s'élever avec une ombre, grandir, rétrécir, s'éclaircir,
  s'assombrir, faire apparaître un contour, pencher, zoomer l'image à
  l'intérieur, souligner d'un trait qui se déploie.
- **Au clic** : s'enfoncer, descendre et s'assombrir, éclair lumineux.
- **À l'apparition, au défilement** : fondu, monter, descendre, glisser
  depuis la gauche ou la droite, grandir en fondu.
- Quatre vitesses, de vive à lente.

**Ce que ça ne casse pas**
- Le survol et le clic sont du **CSS pur** : ils survivent à la régénération
  du HTML et continuent de fonctionner si le module est retiré du site.
- L'apparition est le seul effet qui demande le module. Son état masqué est
  conditionné à une marque que seul le module pose sur `<html>` : **sans
  JavaScript, sans le module, ou avec « animations réduites » activé, le
  bloc reste simplement visible**. Aucun contenu ne peut disparaître.
- Tout est enveloppé dans `prefers-reduced-motion`.
- En édition rien n'est masqué — un bloc qu'on modifie doit se voir. Les
  apparitions se jouent dans la **prévisualisation**, comme chez le visiteur.

**Corrections**
- Deux effets sur un même bloc écrasaient mutuellement leur `transition` :
  s'élever au survol puis s'enfoncer au clic donnait un survol à 90 ms. Les
  déclarations sont désormais rassemblées par sélecteur, et la transition du
  clic vit sur l'état enfoncé.
- L'observateur d'apparitions n'était installé qu'après une application de
  contenu. Sur une page régénérée — où les blocs sont déjà dans le HTML et où
  il n'y a rien à appliquer — les animations ne se déclenchaient jamais.

## 1.10.0

**Des repères pendant qu'on déplace un bloc**
- Une ligne apparaît dès qu'un bord ou un centre du bloc tombe sur celui de
  sa section ou d'un voisin, et le bloc s'y **accroche**. Le centre a sa
  propre couleur : c'est l'alignement qu'on cherche le plus souvent, il doit
  être reconnaissable d'un coup d'œil.
- Les **distances aux voisins d'en face** s'affichent en même temps, avec la
  valeur en pixels. Un voisin en diagonale n'est pas mesuré : il n'apprend
  rien et ne ferait que du bruit.
- **Alt** désactive l'aimant, pour poser le bloc exactement où l'on veut.
  **Maj** bloque toujours un seul axe.
- La géométrie vit dans `core/reperes.js`, sans DOM : elle se vérifie sans
  navigateur.
- Les voisins et la section sont mesurés une seule fois, au début du geste :
  relire la mise en page à chaque pixel serait le seul vrai coût du
  mécanisme, et il est évitable.

## 1.9.0

**Une poignée pour poser les blocs où on veut**
- Chaque bloc sélectionné porte une poignée : on l'attrape et on le pose où
  l'on veut dans sa section, à la souris. Une étiquette affiche le décalage
  pendant le geste ; Maj bloque un seul axe.
- Le déplacement est une **transformée**, pas une marge : le bloc bouge, la
  mise en page autour ne bronche pas, et le site ne peut pas se casser.
- Pendant le geste, l'aperçu est écrit directement — régénérer la section à
  chaque pixel serait saccadé. Le modèle n'est mis à jour qu'au relâchement,
  et rien n'est enregistré si le bloc n'a pas bougé.
- Le décalage se règle toujours au pixel près dans l'onglet Habillage : la
  poignée s'ajoute au réglage, elle ne le remplace pas.

**Des modèles qu'on reconnaît avant de cliquer**
- Les miniatures des modèles de page étaient des barres grises. Ce sont
  maintenant de vraies petites pages : bandeau photographique avec voile et
  bouton, rangées de cartes avec leur image et leur légende, colonnes
  déséquilibrées, bandes colorées.
- Elles prennent **les couleurs de l'ambiance choisie** et les visuels
  dessinés par le module : ce qu'on voit dans la fenêtre ressemble à ce
  qu'on obtiendra.
- Les sept modèles ont été redécrits avec ce vocabulaire.

## 1.8.1

**Correction : l'habillage d'un bouton ne se voyait pas**
- Un bouton est un lien seul dans un bloc ; c'est le LIEN qu'on voit à
  l'écran. L'habillage était appliqué au bloc qui le centre, donc changer
  la couleur, la forme ou la bordure d'un bouton n'avait aucun effet
  visible.
- Désormais, le placement du bloc dans sa section reste sur le bloc, et
  tout le reste — couleurs, typographie, bordures, arrondi — va sur le
  lien. Un bouton peut enfin devenir un cercle, un contour, un lien nu.

## 1.8.0

**Composer une page, et plus seulement l'empiler**

Le vocabulaire du module se résumait à « des blocs les uns sous les
autres, dans une colonne centrée ». Aucune des mises en page qu'on admire
sur Behance ou Pinterest n'est faite comme ça, et aucun réglage de couleur
n'y changeait rien : le manque était structurel.

- **Bandeau d'accueil** : une image plein cadre, un voile réglable, le
  texte posé dessus. Hauteur moyenne, grande ou plein écran. C'est ce par
  quoi commencent toutes les références. Une section ordinaire ne savait
  pas le faire : elle centre une boîte sur un fond uni.
- **Carte image** : le titre est POSÉ sur l'image, avec un dégradé qui le
  rend lisible. Empiler « image » puis « titre » donnait deux blocs qui se
  suivent, pas une carte.
- **Colonnes en proportions** : un tiers / deux tiers, trois quarts / un
  quart. Deux colonnes strictement égales sont ce qui donne l'air
  « gabarit ».
- **Étiquette** : trois mots en capitales espacées au-dessus d'un titre.
  C'est un détail, et c'est le détail qui sépare une page d'un document.
- Nouveau modèle de page **Éditorial**, construit avec ces quatre-là.
- **Le questionnaire s'en sert** : « Écrire ma page » produit désormais un
  bandeau plein cadre, des cartes pour les prestations et des colonnes
  déséquilibrées, au lieu d'une suite de blocs centrés.

**Corrections**
- Les listes déroulantes des réglages affichaient leur valeur brute
  (« moyenne », « 1-2 ») au lieu d'un libellé lisible.

## 1.7.0

**Tout recommencer**
- Nouvel outil, en dernier dans « Outils du site » et signalé comme tel : il
  rend au site son code d'origine — celui écrit par le développeur, ou la
  page livrée avec le module.
- Deux portées : **cette page seulement** (les autres pages, l'ambiance et les
  réglages ne bougent pas) ou **tout le site** (y compris l'ambiance, le
  catalogue, les réponses aux pages légales et l'en-tête commun).
- La fenêtre montre, côte à côte, ce qui est effacé et ce qui ne l'est pas.
  Ne sont pas touchés : le code du client, la bibliothèque média — ce sont
  ses fichiers, souvent introuvables ailleurs — et l'historique.
- **L'opération reste réversible** : elle publie un contenu vide au lieu de
  supprimer les documents, donc les versions précédentes restent dans
  l'historique, d'où l'on peut revenir en arrière.
- Sur un hébergement PHP, le fichier `.html` est rétabli à partir de la copie
  du code d'origine : la régénération est défaite, pas seulement le contenu.
- La portée « tout le site » demande une case cochée : c'est la seule qui
  emporte l'ambiance et le catalogue.

**Correction**
- Recharger une page la faisait mémoriser, ce qui suffisait à afficher
  « modifications non publiées » — juste après une remise à zéro, c'était
  trompeur. L'état repart désormais réellement propre.

## 1.6.1

**Refonte de l'interface — elle était plate, et elle l'était vraiment**
- Tout était écrit à 12-13 px sur trois gris à 3 % les uns des autres : rien
  ne guidait l'œil. Une échelle typographique, des surfaces réellement
  distinctes et une lumière venue du haut donnent enfin du relief.
- Rien ne bougeait. Une seule courbe d'accélération et un seul jeu de durées
  sont désormais appliqués partout : entrée des vues, ouverture d'une étape,
  survol et enfoncement des boutons, remplissage de la jauge. Le réglage
  système « animations réduites » est respecté.
- **Le guide devient un chemin** : un rail relie les étapes, celles qui sont
  faites s'éteignent, celle qu'on remplit s'allume. Sept rectangles
  identiques ne disaient pas dans quel ordre les prendre.
- **Le panneau et la page se parlent enfin.** Entrer dans un champ met en
  évidence, dans l'aperçu, l'élément qu'il pilote et l'amène à l'écran. On
  remplissait un formulaire d'un côté pendant que la page changeait de
  l'autre, sans savoir où.

**Le pied du panneau n'est plus un tiroir à bazar**
- Six boutons de même taille et de même couleur — Modèles, Écrire pour moi,
  Ambiance, Réglages, Pages légales, Boutique — sont remplacés par un seul
  bouton **Outils du site**, qui ouvre une liste où chacun a un intitulé et
  une phrase disant à quoi il sert, groupés par moment : construire, allure,
  contenu, module.

**Le guide se lit**
- Dans une section en colonnes, les champs étaient à plat : « Le titre,
  Titre 2, Le texte, Titre 3, Texte 2 ». Chaque colonne forme maintenant un
  groupe, nommé par son propre titre.
- La même phrase d'aide n'est plus répétée sous cinq champs : elle n'est
  écrite qu'une fois par genre et par étape.

**Corrections**
- L'onglet actif masquait son propre libellé : on ne lisait plus « Guide ».
- L'intitulé d'un lien de bouton et son explication se chevauchaient.

## 1.6.0

**Une banque d'images sans clé**
- Nouvelle source **Openverse** (fondation WordPress) : la recherche d'images
  libres fonctionne **dès l'installation**, sans compte ni clé d'API. C'est
  désormais la source par défaut.
- Restreinte aux licences `cc0` et domaine public : celles qui n'obligent à
  créditer personne. Openverse indexe aussi du CC-BY, qui piégerait un client
  ne sachant pas qu'il doit citer l'auteur.
- Pixabay reste disponible pour un catalogue plus large, avec une clé
  gratuite. Elle prend le relais dès qu'elle est renseignée.
- Le script PHP accepte le rapatriement depuis les domaines vers lesquels
  Openverse renvoie (Wikimedia, Flickr, Rawpixel…).

**Les clés se saisissent depuis le module**
- Nouveau panneau **Réglages** : clé de la banque d'images et clé de
  rédaction assistée. Plus aucun fichier à ouvrir.
- Les deux ne sont pas traitées pareil, et le panneau le dit :
  - la clé **Pixabay** est gratuite et limitée par un quota ; elle rejoint
    les réglages du site, donc lisible par qui inspecte le site — c'est écrit ;
  - la clé de **rédaction** est facturée ; elle part vers le script PHP de
    l'hébergement, qui l'écrit dans un fichier `.php` — demandé par HTTP, il
    est exécuté et ne renvoie rien. Elle ne revient jamais vers le
    navigateur : l'éditeur sait qu'une clé existe, pas laquelle.
  - sans hébergement PHP, la clé de rédaction reste dans le navigateur de
    l'administrateur, et le panneau explique ce que cela implique.
- L'état de l'hébergement est redemandé au moment où la réponse compte : un
  diagnostic raté au démarrage ne fait plus disparaître la rédaction assistée
  alors qu'une clé est en place.

**Documentation**
- `docs/IMAGES.md` : les trois sources d'images, les licences, le
  rapatriement.
- `docs/IA.md` : section « Peut-on livrer une clé avec le module ? » —
  non, et pourquoi.

## 1.5.0

**« Je ne sais pas quoi mettre » — le module écrit la page**
- Nouveau questionnaire : nom de l'activité, secteur, ville, ce qu'on
  propose, ce qui est vrai chez soi (cases à cocher), coordonnées, ton.
- À la fin, la page entière est écrite : accroche, prestations,
  présentation, coordonnées, plan, photos, et une ambiance accordée au
  métier. Le client arrive sur le guide avec une page remplie.
- Les phrases viennent d'un fonds écrit par secteur — douze métiers — dans
  lequel les mots du client sont insérés. Aucun réseau, aucune clé, aucun
  abonnement : c'est le mode par défaut, et il est complet.
- Le guide distingue les deux origines : ce qui vient du fonds est signalé
  « à relire », ce que le client a écrit ne l'est pas.
- Les photos viennent de la banque libre de droits quand une clé Pixabay est
  configurée (et sont rapatriées sur l'hébergement), sinon des visuels
  dessinés d'après l'ambiance. La page est illustrée dans tous les cas.
- Accessible depuis l'assistant de démarrage, depuis le pied du panneau, et
  depuis la dernière étape du guide.

**Rédaction par IA — facultative**
- Branchée, elle remplace **les phrases**, jamais le plan de la page, les
  sections ni les images. Si elle échoue — clé absente, quota, réponse
  illisible, réseau — le fonds écrit reprend la main et la page se construit
  quand même.
- La réponse est lue champ par champ : ce qui déborde des longueurs prévues
  est ignoré, un titre de prestation saisi par le client n'est jamais
  réécrit.
- La clé se met dans `admin-endpoint.php`, sur l'hébergement du client :
  le navigateur ne la voit jamais, le script vérifie le jeton Firebase, et
  un quota journalier par compte borne la dépense. À défaut, une clé rangée
  dans le `localStorage` de l'administrateur.
- **Jamais dans `admin-config.js`**, qui est servi à tous les visiteurs. Le
  module n'offre aucun réglage pour le faire.
- Anthropic, OpenAI et Mistral. Voir `docs/IA.md`.

## 1.4.1

**Prévisualisation**
- Le bouton d'aperçu ouvre désormais une vraie prévisualisation : le panneau
  s'efface, le site occupe tout l'écran. Auparavant il ne faisait que couper
  la surcouche de sélection, ce qui ne montrait rien de plus.
- Une barre noire en haut dit « Mode prévisualisation », et porte à droite
  deux boutons : *Retourner à la modification* et *Aller sur le site*.
- Les liens sont cliquables : on parcourt le site page par page, et la
  prévisualisation tient bon d'une page à l'autre. Échap en sort.
- Quand des modifications ne sont pas publiées, la barre le signale : ce qui
  s'ouvrira avec *Aller sur le site* ne les contiendra pas.

**Correction importante**
- La régénération du HTML pouvait perdre la fin de la page — donc la balise
  `<script>` du module. Le site restait juste, mais **le client ne pouvait
  plus l'éditer** : rouvrir la page avec `?admin` ne chargeait plus rien.
  Le recollage de fin de page se fiait au nombre de blocs présents ; ajouter
  une section en bas de page décalait ce compte d'exactement ce qui manquait,
  et le recollage n'avait plus lieu. Ce nombre est désormais relevé avant
  toute modification.

## 1.4.0

**Le Guide : la page de haut en bas**
- Nouvelle vue, ouverte en premier : la page reprise partie par partie, dans
  l'ordre où on la lit, et dans chacune les champs à remplir — nommés en
  français courant, avec sous chaque champ une phrase qui dit quoi y mettre.
- Une jauge indique ce qu'il reste. Chaque partie porte le nombre de champs
  encore vides, et se coche quand elle est finie.
- Le texte livré dans les modèles est marqué comme exemple tant qu'il n'a pas
  été remplacé : une page ne peut plus partir en ligne en affichant
  « Le titre de votre site » sans qu'on l'ait vu.
- Le Guide marche aussi sur un site existant : il reprend les textes, images
  et liens détectés dans le code du client.

**Ambiances**
- Neuf thèmes complets — Sobre, Chaleureux, Élégant, Nuit, Naturel, Punchy,
  Pro, Magazine, Brut. Chacun décide d'un coup des polices, des couleurs, de
  la forme des boutons et du rythme vertical.
- C'est ce qui manquait : les modèles de page n'apportent que la structure,
  donc sur une page vierge — où il n'y a aucun style à hériter — ils rendaient
  tous exactement la même chose.
- L'assistant pose la question au moment de construire la page, une seule fois
  pour tout le site.
- Sur un site existant, l'ambiance ne s'applique par défaut **qu'aux parties
  ajoutées** : le code du client n'est pas repeint sans qu'on le demande. Le
  choix « sur tout le site » reste possible.
- La feuille de style produite est écrite dans le HTML régénéré : le site garde
  son allure même une fois le module retiré.

**Images d'exemple**
- Huit visuels dessinés en SVG à partir des couleurs de l'ambiance retenue,
  proposés sous chaque champ image. Aucun réseau, aucune clé d'API, aucune
  question de droits.

**Corrections**
- Les colonnes gardaient leur nombre de pistes sur téléphone : trois colonnes
  restaient trois colonnes, larges de rien. Elles se replient désormais.

## 1.3.0

**Boutique**
- Catalogue de produits dans le module : nom, description, prix, devise,
  image, catégorie, disponibilité.
- Produits **physiques** (avec poids) et produits **virtuels**.
- Deux façons d'encaisser :
  - **page de paiement externe** — Stripe Payment Link, Gumroad,
    Lemon Squeezy, PayPal, ou n'importe quelle adresse : le bouton emmène
    l'acheteur chez le vendeur, rien n'est encaissé sur le site ;
  - **panier sur le site** — Snipcart, ajouté à la page à la demande.
- Deux éléments dans la bibliothèque : **Catalogue** (tous les produits, ou
  une catégorie) et **Produit** (une fiche seule).

**Corrections**
- Sur un site déjà régénéré, les sections ajoutées par le module
  apparaissaient **en double** pour le visiteur : la régénération effaçait le
  marqueur de section, et le module ne reconnaissait plus ce qu'il avait
  lui-même écrit. Le marqueur est désormais conservé, et une section déjà
  présente est remplacée sur place au lieu d'être ajoutée à la suite.

## 1.2.1

**Construire un site de plusieurs pages depuis une page blanche**
- L'assistant se propose aussi après un changement de page : une page qu'on
  vient de créer est vierge, et c'est là qu'on a le plus besoin d'aide.
- Le module se souvient des pages ouvertes : une page créée à l'instant, que
  rien ne pointe encore, reste joignable depuis la liste.
- Élément **Menu** : une ligne par entrée, pré-rempli avec les pages connues.
- **Nom et description de la page**, modifiables depuis la liste des pages.
  Ils s'écrivent dans le `<title>` et la balise description, et sont donc
  repris à la régénération du HTML.

**Corrections**
- Créer une page ne vidait pas la sauvegarde en attente : ce qui venait
  d'être saisi était perdu au rechargement.

## 1.2.0

**En-tête et pied de page**
- Ce qui est modifié dans un `<header>` ou un `<footer>` est enregistré dans
  un document commun au site et appliqué à toutes les pages.
- L'éditeur signale la portée au moment de la modification.

**Pages légales**
- Questionnaire en trois écrans : documents voulus, identité de l'éditeur,
  puis ce que fait le site (formulaire, réservations, paiement, expédition,
  audience, contenus intégrés…).
- Rédige les mentions légales, la politique de confidentialité et les
  conditions générales de vente. Les clauses non concernées ne sont pas
  écrites du tout.
- Liste d'hébergeurs courants avec la mention légale exacte.
- Sur un hébergement inscriptible, chaque document devient une page créée et
  publiée ; sinon il est ajouté à la page ouverte.

**Copyright**
- Élément Copyright : année en cours recalculée à chaque affichage, période
  « 2018–2026 » si une année de création est renseignée.
- Jeton `{{année}}` utilisable dans les titres et textes insérés.

**Correction importante**
- La régénération du fichier `.html` visait toujours la page par laquelle on
  était entré dans l'éditeur : publier depuis une autre page écrasait
  l'accueil avec le contenu de celle-ci.

## 1.1.0

**Appels à l'action**
- Un bouton ou un lien peut ouvrir une fenêtre au lieu de quitter la page :
  au centre, à droite, à gauche, en bas, en plein écran.
- Six modèles de remplissage — réservation, contact, horaires, carte, vidéo,
  libre — posent un titre, un texte et des boutons déjà écrits.
- La fenêtre accepte une image, jusqu'à quatre boutons, une largeur, et un
  contenu intégré : module de réservation, formulaire, plan, vidéo.
- Le `href` reste renseigné : sans le module, le clic repart vers l'adresse.

**Habillage**
- 48 familles de polices, rangées par nature dans le panneau.
- Style de contour, opacité.
- Placement libre : largeur du bloc, alignement dans la section, décalage
  horizontal et vertical, rotation.

**Médias**
- Banque d'images libres de droits (Pixabay, clé d'API gratuite). Sur un
  hébergement PHP, l'image est rapatriée dans le dossier du site.

## 1.0.0

Première version publiée.

**Édition**
- Détection automatique des textes, images (y compris les fonds CSS), liens et
  blocs répétables. Aucune annotation à écrire dans le HTML.
- Identifiants calculés à partir de la structure du document : ils survivent à
  une republication du code, y compris après ajout de sections, changement de
  classes ou reformulation de textes.
- Édition en place : survol, clic, saisie directe dans la page.
- Éditeur à panneau latéral, site affiché dans un aperçu isolé, formats
  ordinateur / tablette / mobile.
- Panneau adapté au téléphone : le panneau devient une feuille qui se replie.

**Construction de pages**
- Sections : ajout d'une section vide, copie d'une section existante, huit
  modèles de mise en page, retrait, réordonnancement.
- Éléments : titre, texte, bouton, liste, image, vidéo, audio, carte,
  colonnes, séparateur, espaceur — recherche, catégories, glisser-déposer.
  Le balisage émis est sémantique et sans classes : la feuille de style du
  site s'y applique d'elle-même.
- Cinq modèles de page entière.
- Habillage complet : polices (16 familles Google Fonts chargées à la
  demande), typographie, couleurs, espacements, bordures, ombres, et CSS
  personnalisé avec sélecteur.
- Création de pages depuis l'éditeur (hébergement inscriptible requis).

**Médias**
- Bibliothèque interne : glisser-déposer de fichiers, ajout par adresse,
  recherche, filtres par famille, copie d'adresse, suppression.
- Trois stockages au choix : dossier du site (script PHP fourni), Firebase
  Storage, ou adresse saisie à la main.
- Images recompressées dans le navigateur avant envoi.

**Données et sécurité**
- Firebase Auth (e-mail / mot de passe), un accès par site.
- Brouillon enregistré automatiquement, publication, historique des versions
  et restauration.
- Règles Firestore et Storage fournies.
- Contenu assaini à l'enregistrement et à l'application.
- Le script PHP vérifie la signature du jeton Firebase contre les certificats
  publics de Google avant toute écriture.

**Réversibilité**
- À chaque publication, le fichier `.html` de l'hébergement est réécrit avec
  le contenu à l'intérieur : le module peut être retiré, le site garde tout.
  (Demande un hébergement PHP.)
- Export manuel de la page figée, et export du contenu en JSON.
- Si Firebase est injoignable ou la base vide, la page s'affiche avec son
  HTML d'origine. Aucune exception ne remonte au site.
