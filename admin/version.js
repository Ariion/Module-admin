/**
 * La version du module, en un seul endroit.
 *
 * Elle existe pour répondre à une question qu'on s'est posée trop tard : quel
 * module tourne sur ce site déjà en ligne ? Sans réponse lisible, on
 * rapatrie une version en avance sans le savoir, ou on écrase le travail fait
 * ailleurs. C'est arrivé.
 *
 * Le fichier est servi tel quel par l'hébergement, donc la réponse tient en
 * une commande, sans ouvrir le site ni se connecter :
 *
 *   curl https://exemple.fr/admin/version.js
 *
 * Elle doit rester égale à celle de `package.json` : `npm run sync` le
 * vérifie, et les scripts de paquet et de livraison refusent de fabriquer
 * quoi que ce soit si les deux ont divergé.
 * @module version
 */
export const VERSION = '1.25.1';
