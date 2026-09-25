import { lienVers } from './types.js';

/**
 * Créer un contenu : la carte de la galerie, et la page qui va avec.
 *
 * Un contenu — un article, un portrait — est deux choses à la fois : un
 * fichier .html copié d'un modèle, et une carte dans la galerie qui y mène.
 * La page est facile ; la carte est tout le travail, parce qu'elle est
 * faite du code du client, dont on ne sait rien.
 *
 * On duplique donc la première carte de la galerie et on la vide de ce qui
 * appartenait à sa voisine. Sans ce nettoyage, le nouvel article arrive
 * avec l'image, le résumé et la catégorie d'un autre : on croit à un
 * doublon plutôt qu'à un article à remplir.
 *
 * Ce module est partagé par l'éditeur en direct et par le back-office :
 * créer un article doit donner exactement le même résultat des deux côtés.
 * @module core/contenus
 */

export function poserCarte(model, { type, sousType, titre, chemin, resume }) {
  const trouverCollection = () => model.collections.find((c) => {
    if (!type.collection) return false;
    try { return c.container.matches(type.collection) || !!c.container.closest(type.collection); }
    catch { return false; }
  });

  const collection = trouverCollection();
  if (!collection) return false;
  if (!model.applyCollectionOp(collection.id, 'duplicate', 0)) return false;
  model.applyCollectionOp(collection.id, 'move', 1, 0);
  model.refresh();

  // Les champs d'un bloc répétable ne sont pas dans model.entries : ils
  // appartiennent à la collection, et se relisent sur l'élément lui-même.
  const apres = trouverCollection();
  const carte = apres && apres.items[0];
  if (!carte) return true;

  const champs = model.fieldsIn(carte);
  let titrePose = false;
  let resumePose = false;

  // Une carte dupliquée est le calque de sa voisine : sans ça, le nouvel
  // article arrive avec l'image, le résumé et la catégorie d'un autre — on
  // croit à un doublon plutôt qu'à un article à remplir.
  for (const [cle, entry] of champs) {
    if (entry.role === 'image') {
      // Une source vide est ignorée par le binder — c'est ce qui permet de
      // changer un texte alternatif sans effacer l'image. Sans couverture
      // déclarée, on garde donc celle de la carte copiée, que le client
      // remplacera : une image d'un autre article saute aux yeux, une
      // image cassée déroute.
      model.setCollectionField(
        apres.id, 0, cle,
        sousType.image ? { src: sousType.image, alt: titre } : { alt: titre },
        entry.el, 'image',
      );
    } else if (entry.role === 'text' && entry.el.tagName === 'SPAN') {
      // Les étiquettes de catégorie : elles annoncent la forme choisie.
      model.setCollectionField(apres.id, 0, cle, { text: sousType.nom }, entry.el, 'text');
    } else if (entry.role === 'text' && entry.el.tagName === 'P' && !resumePose) {
      model.setCollectionField(apres.id, 0, cle, { text: resume }, entry.el, 'text');
      resumePose = true;
    }
  }

  // Le titre d'une carte est souvent un lien posé dans un intertitre : on
  // le reconnaît à ça, et un champ de type lien porte aussi son texte.
  // Sinon, on retombe sur le premier intertitre venu, puis sur le premier
  // texte — la première zone de texte d'une carte étant fréquemment son
  // étiquette de catégorie, elle n'est essayée qu'en dernier recours.
  const lien = lienVers(chemin);
  const dansTitre = (el) => !!(el.closest && el.closest('h1,h2,h3,h4'));

  for (const [cle, entry] of champs) {
    if (entry.role !== 'link') continue;
    const estTitre = !titrePose && dansTitre(entry.el);
    model.setCollectionField(
      apres.id, 0, cle,
      estTitre ? { href: lien, text: titre } : { href: lien },
      entry.el, 'link',
    );
    if (estTitre) titrePose = true;
  }
  if (!titrePose) {
    for (const [cle, entry] of champs) {
      if (entry.role !== 'text') continue;
      if (!/^H[1-4]$/.test(entry.el.tagName)) continue;
      model.setCollectionField(apres.id, 0, cle, { text: titre }, entry.el, 'text');
      titrePose = true;
      break;
    }
  }
  if (!titrePose) {
    for (const [cle, entry] of champs) {
      if (entry.role !== 'text') continue;
      model.setCollectionField(apres.id, 0, cle, { text: titre }, entry.el, 'text');
      break;
    }
  }
  return true;
}

/**
 * Attend qu'une page fraîchement créée soit servie.
 *
 * Sur un hébergement qui reconstruit le site à chaque écriture — Vercel
 * quand le module committe dans le dépôt —, le fichier existe avant d'être
 * en ligne. L'ouvrir tout de suite afficherait une page introuvable, ce qui
 * ressemble à un échec alors que tout s'est bien passé.
 *
 * @returns {Promise<boolean>} vraie si la page répond avant la limite
 */
export async function attendrePage(url, limite = 150000) {
  const fin = Date.now() + limite;
  let attente = 1500;
  while (Date.now() < fin) {
    await new Promise((r) => setTimeout(r, attente));
    try {
      const reponse = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (reponse.ok) return true;
    } catch { /* hors ligne ou reconstruction en cours : on retente */ }
    attente = Math.min(attente * 1.4, 8000);
  }
  return false;
}
