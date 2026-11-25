/**
 * Historique d'édition : revenir en arrière, et revenir en avant.
 *
 * Photoshop a habitué tout le monde au Ctrl+Z. Quelqu'un qui écrit un article
 * a besoin de la même certitude : ce qu'il vient de faire est réversible,
 * donc il peut essayer. Sans ce filet, on n'ose plus rien déplacer.
 *
 * On ne garde pas des opérations, mais des états — des instantanés complets
 * de la page. C'est plus lourd en mémoire, et beaucoup plus sûr : le module
 * n'a pas à savoir inverser chacune de ses modifications, et un retour en
 * arrière ne peut donc pas laisser la page à moitié défaite. Ajouter une
 * commande à l'éditeur, demain, ne demandera rien de plus ici.
 *
 * Les états sont figés en texte : deux états identiques se reconnaissent
 * d'un coup, et rien de ce qui est empilé ne peut plus bouger dans le dos de
 * l'historique.
 * @module core/historique
 */

/** Au-delà, on oublie le plus ancien : un historique n'est pas une archive. */
const LIMITE = 40;

export function creerHistorique({ limite = LIMITE } = {}) {
  let pile = [];
  let position = -1;

  return {
    /**
     * Enregistre l'état courant.
     *
     * Ce qui avait été défait est oublié : on ne refait pas un avenir qu'on
     * vient de remplacer. C'est la règle partout, et elle évite un historique
     * en arbre que personne ne saurait lire.
     *
     * @returns {boolean} vrai si une étape a bien été ajoutée.
     */
    poser(instantane) {
      const gel = JSON.stringify(instantane ?? null);
      if (position >= 0 && pile[position] === gel) return false;
      pile = pile.slice(0, position + 1);
      pile.push(gel);
      if (pile.length > limite) pile.shift();
      position = pile.length - 1;
      return true;
    },

    // L'état le plus ancien est un point d'arrivée, pas une étape à défaire :
    // on peut y revenir, on ne peut pas aller avant.
    peutDefaire: () => position > 0,
    peutRefaire: () => position >= 0 && position < pile.length - 1,

    /** L'état d'avant, ou null s'il n'y en a pas. */
    defaire() {
      if (position <= 0) return null;
      position--;
      return JSON.parse(pile[position]);
    },

    /** L'état d'après, ou null s'il n'y en a pas. */
    refaire() {
      if (position < 0 || position >= pile.length - 1) return null;
      position++;
      return JSON.parse(pile[position]);
    },

    /** Repartir de zéro — on a changé de page. */
    vider() { pile = []; position = -1; },

    /** Pour les essais : où l'on en est. */
    etat: () => ({ taille: pile.length, position }),
  };
}
