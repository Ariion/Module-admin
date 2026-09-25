/**
 * Habillage du back-office.
 *
 * L'éditeur en direct est sombre : il se pose PAR-DESSUS le site, et un
 * panneau clair au bord d'une page claire ne se distingue plus de ce qu'on
 * modifie. Le back-office, lui, occupe toute la fenêtre et ne montre aucun
 * site : il peut donc être clair, et il doit l'être. On y lit des listes et
 * on y remplit des formulaires pendant des heures.
 *
 * La barre latérale reste sombre. Ce n'est pas une coquetterie : c'est ce
 * qui sépare « où je suis » de « ce que je fais », et tous les back-offices
 * que le client a déjà vus fonctionnent ainsi.
 * @module ui/back/styles-back
 */
export const CSS_BACK = `
:root {
  --fond:       #f1f4f8;
  --surface:    #ffffff;
  --surface-2:  #f7f9fc;
  --trait:      #dde3ec;
  --trait-doux: #eaeff5;
  --encre:      #16202e;
  --doux:       #5a6779;
  --pale:       #8b97a8;

  --menu:       #16202e;
  --menu-haut:  #1d2a3b;
  --menu-texte: #c3ccd9;
  --menu-actif: #ffffff;

  --accent:     #2f6df6;
  --accent-sur: #ffffff;
  --accent-pale:#e8f0ff;
  --accent-fort:#1b52d0;

  --ok:     #12855f;
  --ok-pale:#e3f6ee;
  --warn:   #a66206;
  --warn-pale:#fdf2dc;
  --danger: #c4342b;
  --danger-pale:#fdeceb;

  --rayon:    10px;
  --rayon-sm: 7px;
  --ombre:    0 1px 2px rgba(22,32,46,.06), 0 4px 14px rgba(22,32,46,.05);
  --ombre-fort: 0 12px 40px rgba(22,32,46,.18);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font: 14px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--encre);
  background: var(--fond);
  -webkit-font-smoothing: antialiased;
}

/* ─── Charpente ──────────────────────────────────────────────────────── */
.bo {
  display: grid;
  grid-template-columns: 232px 1fr;
  grid-template-rows: 52px 1fr;
  grid-template-areas: "marque barre" "menu vue";
  min-height: 100vh;
}

.bo__marque {
  grid-area: marque; background: var(--menu-haut); color: #fff;
  display: flex; align-items: center; gap: 9px; padding: 0 18px;
  font-weight: 650; letter-spacing: -.01em;
}
.bo__marque small { font-weight: 400; opacity: .5; font-size: 11px; }

.bo__barre {
  grid-area: barre; background: var(--surface);
  border-bottom: 1px solid var(--trait);
  display: flex; align-items: center; gap: 10px; padding: 0 18px;
}
.bo__site { flex: 1; color: var(--doux); font-size: 13px; }
.bo__site strong { color: var(--encre); font-weight: 600; }

.bo__menu {
  grid-area: menu; background: var(--menu); padding: 12px 0 30px;
  display: flex; flex-direction: column; gap: 2px;
}
.bo__groupe {
  padding: 16px 18px 6px; font-size: 10.5px; letter-spacing: .09em;
  text-transform: uppercase; color: #64748b; font-weight: 700;
}
.bo__lien {
  display: flex; align-items: center; gap: 11px; width: 100%;
  padding: 9px 18px; border: 0; background: none; cursor: pointer;
  color: var(--menu-texte); font: inherit; font-size: 13.5px; text-align: left;
  border-left: 3px solid transparent;
}
.bo__lien:hover { background: rgba(255,255,255,.055); color: #fff; }
.bo__lien[aria-current="page"] {
  background: rgba(47,109,246,.16); color: var(--menu-actif);
  border-left-color: var(--accent); font-weight: 600;
}
.bo__lien svg { opacity: .8; flex: none; }
.bo__lien[aria-current="page"] svg { opacity: 1; }
.bo__compte {
  margin-left: auto; background: rgba(255,255,255,.1); color: #fff;
  border-radius: 999px; padding: 1px 7px; font-size: 11px; font-weight: 600;
}

.bo__vue { grid-area: vue; overflow: auto; }
.bo__page { padding: 26px 30px 60px; max-width: 1240px; }

/* ─── Titres d'écran ─────────────────────────────────────────────────── */
.bo__tete {
  display: flex; align-items: flex-start; gap: 16px; margin-bottom: 22px;
}
.bo__tete h1 { font-size: 23px; font-weight: 680; letter-spacing: -.02em; }
.bo__tete p { color: var(--doux); margin-top: 3px; max-width: 62ch; }
.bo__tete-actions { margin-left: auto; display: flex; gap: 8px; flex: none; }

/* ─── Boutons ────────────────────────────────────────────────────────── */
.b {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 8px 14px; border-radius: var(--rayon-sm); cursor: pointer;
  border: 1px solid var(--trait); background: var(--surface); color: var(--encre);
  font: inherit; font-size: 13.5px; font-weight: 550; white-space: nowrap;
}
.b:hover { background: var(--surface-2); border-color: #c9d2e0; }
.b:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.b[disabled] { opacity: .5; cursor: default; }
.b--fort { background: var(--accent); border-color: var(--accent); color: var(--accent-sur); }
.b--fort:hover { background: var(--accent-fort); border-color: var(--accent-fort); }
.b--danger { color: var(--danger); }
.b--danger:hover { background: var(--danger-pale); border-color: #f2c4c0; }
.b--nu { border-color: transparent; background: none; }
.b--nu:hover { background: var(--surface-2); border-color: transparent; }
.b--sm { padding: 5px 9px; font-size: 12.5px; }
.b--icone { padding: 7px; }

/* ─── Cartes ─────────────────────────────────────────────────────────── */
.carte {
  background: var(--surface); border: 1px solid var(--trait);
  border-radius: var(--rayon); box-shadow: var(--ombre);
}
.carte__tete {
  padding: 12px 16px; border-bottom: 1px solid var(--trait-doux);
  font-weight: 620; display: flex; align-items: center; gap: 9px;
}
.carte__tete .b { margin-left: auto; }
.carte__corps { padding: 16px; }

/* ─── Tableau de bord ────────────────────────────────────────────────── */
.chiffres {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(178px, 1fr));
  gap: 14px; margin-bottom: 22px;
}
.chiffre {
  background: var(--surface); border: 1px solid var(--trait);
  border-radius: var(--rayon); padding: 15px 17px; box-shadow: var(--ombre);
  display: block; width: 100%; text-align: left; cursor: pointer; font: inherit;
}
.chiffre:hover { border-color: #c2cede; box-shadow: var(--ombre-fort); }
.chiffre__haut { display: flex; align-items: center; gap: 8px; color: var(--doux); }
.chiffre__val {
  font-size: 30px; font-weight: 680; letter-spacing: -.03em; margin-top: 6px;
  line-height: 1;
}
.chiffre__note { color: var(--pale); font-size: 12.5px; margin-top: 5px; }

.colonnes { display: grid; grid-template-columns: 1.55fr 1fr; gap: 18px; align-items: start; }
@media (max-width: 1020px) { .colonnes { grid-template-columns: 1fr; } }

/* Le premier pas, quand le site est encore vide. */
.depart {
  background: linear-gradient(120deg, #2f6df6, #6d5ef0);
  color: #fff; border-radius: var(--rayon); padding: 24px 26px;
  margin-bottom: 22px; box-shadow: var(--ombre-fort);
}
.depart h2 { font-size: 19px; font-weight: 660; letter-spacing: -.01em; }
.depart p { opacity: .92; margin: 7px 0 15px; max-width: 58ch; }
.depart .b { background: #fff; border-color: #fff; color: var(--accent-fort); font-weight: 620; }

/* ─── Listes ─────────────────────────────────────────────────────────── */
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left; font-size: 11.5px; letter-spacing: .05em; text-transform: uppercase;
  color: var(--pale); font-weight: 700; padding: 10px 16px;
  border-bottom: 1px solid var(--trait);
}
.table td { padding: 12px 16px; border-bottom: 1px solid var(--trait-doux); vertical-align: middle; }
.table tr:last-child td { border-bottom: 0; }
.table tbody tr:hover { background: var(--surface-2); }
.table__nom { font-weight: 600; }
.table__nom button {
  border: 0; background: none; padding: 0; font: inherit; font-weight: 600;
  color: var(--accent); cursor: pointer; text-align: left;
}
.table__nom button:hover { text-decoration: underline; }
.table__meta { color: var(--pale); font-size: 12.5px; margin-top: 2px; }
.table__actions { text-align: right; white-space: nowrap; }
.table__actions .b { margin-left: 6px; }

.etat {
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px;
  border-radius: 999px; font-size: 12px; font-weight: 600;
}
.etat--publie { background: var(--ok-pale); color: var(--ok); }
.etat--brouillon { background: var(--warn-pale); color: var(--warn); }
.etat--neutre { background: var(--surface-2); color: var(--doux); }

.vide { padding: 46px 20px; text-align: center; color: var(--doux); }
.vide svg { opacity: .35; margin-bottom: 10px; }
.vide p { margin-bottom: 14px; }

/* ─── Structure d'une page ───────────────────────────────────────────── */
.pile { display: flex; flex-direction: column; }
.rang {
  display: flex; align-items: center; gap: 14px; padding: 12px 16px;
  border-bottom: 1px solid var(--trait-doux);
}
.rang:last-child { border-bottom: 0; }
.rang:hover { background: var(--surface-2); }
.rang__num {
  flex: none; width: 24px; height: 24px; border-radius: 50%;
  background: var(--surface-2); border: 1px solid var(--trait);
  display: grid; place-items: center; font-size: 11.5px; font-weight: 650; color: var(--doux);
}
.rang__apercu { flex: none; }
.rang__main { flex: 1; min-width: 0; }
.rang__nom { font-weight: 620; }
.rang__actions { flex: none; display: flex; gap: 5px; }
.retirees { display: flex; flex-wrap: wrap; gap: 7px; }

/* La vignette : trois traits suffisent à distinguer un bandeau d'une grille. */
.mini {
  display: flex; flex-direction: column; gap: 3px; justify-content: center;
  width: 62px; height: 42px; padding: 6px; border-radius: 5px;
  background: var(--surface-2); border: 1px solid var(--trait);
}
.mini__titre { display: block; height: 5px; width: 72%; border-radius: 2px; background: #9fb0c6; }
.mini__ligne { display: block; height: 3px; border-radius: 2px; background: #d3dbe6; }
.mini__ligne--court { width: 58%; }
.mini__image { display: block; flex: 1; border-radius: 3px; background: #c3cfdd; }
.mini__cols { display: flex; gap: 3px; flex: 1; }
.mini__col { flex: 1; border-radius: 3px; background: #c3cfdd; }

/* ─── Genres et rubriques ────────────────────────────────────────────── */
.genres { display: grid; grid-template-columns: repeat(auto-fit, minmax(214px, 1fr)); gap: 10px; }
.genre {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; cursor: pointer;
  border: 1px solid var(--trait); border-radius: var(--rayon-sm); background: var(--surface);
}
.genre:hover { border-color: var(--accent); }
.genre input { margin-top: 3px; flex: none; accent-color: var(--accent); width: 16px; height: 16px; }
.genre__main { min-width: 0; }
.genre__nom { display: block; font-weight: 620; }
.genre__aide { display: block; font-size: 12.5px; color: var(--doux); }
.genre:has(input:checked) { border-color: var(--accent); background: var(--accent-pale); }

/* Sur le bandeau bleu du tableau de bord, les cases gardent leur lisibilité. */
.genres--clair .genre { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.3); }
.genres--clair .genre:hover { border-color: #fff; }
.genres--clair .genre:has(input:checked) { background: rgba(255,255,255,.26); border-color: #fff; }
.genres--clair .genre__aide { color: rgba(255,255,255,.82); }

.rubrique {
  display: flex; align-items: center; gap: 11px; padding: 10px 2px; cursor: pointer;
  border-bottom: 1px solid var(--trait-doux);
}
.rubrique:last-child { border-bottom: 0; }
.rubrique input { flex: none; accent-color: var(--accent); width: 16px; height: 16px; }
.rubrique input:disabled { opacity: .5; }
.rubrique__icone { flex: none; color: var(--doux); display: grid; place-items: center; }
.rubrique__main { min-width: 0; }
.rubrique__nom { display: block; font-weight: 600; }
.rubrique__aide { display: block; font-size: 12.5px; color: var(--pale); }

/* ─── Contenus ───────────────────────────────────────────────────────── */
.onglets {
  display: flex; gap: 4px; margin-bottom: 18px;
  border-bottom: 1px solid var(--trait);
}
.onglet {
  border: 0; background: none; font: inherit; font-size: 13.5px; font-weight: 600;
  padding: 9px 14px; cursor: pointer; color: var(--doux);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.onglet:hover { color: var(--encre); }
.onglet[aria-selected="true"] { color: var(--accent); border-bottom-color: var(--accent); }

.formes {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 11px; margin-bottom: 20px;
}
.forme {
  display: flex; align-items: center; gap: 12px; text-align: left; font: inherit;
  padding: 13px 15px; cursor: pointer; background: var(--surface);
  border: 1px solid var(--trait); border-radius: var(--rayon); box-shadow: var(--ombre);
}
.forme:hover:not([disabled]) { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-pale); }
.forme[disabled] { opacity: .55; cursor: default; }
.forme__icone {
  flex: none; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center;
  background: var(--accent-pale); color: var(--accent);
}
.forme__main { flex: 1; min-width: 0; }
.forme__nom { display: block; font-weight: 620; }
.forme__plus { flex: none; color: var(--pale); }
.forme:hover:not([disabled]) .forme__plus { color: var(--accent); }
.forme__titre {
  font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--pale); font-weight: 700; margin-bottom: 9px;
}
.forme__aide { display: block; font-size: 12px; color: var(--pale); }

/* ─── Galerie d'ambiances ────────────────────────────────────────────── */
.demo-choix { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--doux); }
.themes-gal {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(256px, 1fr)); gap: 18px;
}
.theme-carte {
  background: var(--surface); border: 1px solid var(--trait); border-radius: var(--rayon);
  overflow: hidden; box-shadow: var(--ombre); display: flex; flex-direction: column;
}
.theme-carte:hover { border-color: #c2cede; box-shadow: var(--ombre-fort); }
.theme-carte--actif { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-pale); }
.theme-carte__vue {
  position: relative; height: 200px; overflow: hidden;
  border-bottom: 1px solid var(--trait-doux); background: var(--surface-2);
}
/* La vignette est une vraie page rendue à 1240 px, puis réduite. Le cadre
   ne reçoit aucun clic : la carte entière est la cible, pas l'intérieur du
   document. */
.theme-vignette {
  position: absolute; top: 0; left: 0; width: 1240px; height: 1000px; border: 0;
  transform: scale(.256); transform-origin: top left; pointer-events: none;
  background: #fff;
}
.theme-carte__pied { padding: 11px 13px 0; display: flex; align-items: center; gap: 8px; }
.theme-carte__main { flex: 1; min-width: 0; }
.theme-carte__nom { display: block; font-weight: 640; }
.theme-carte__police { display: block; font-size: 12px; color: var(--pale); }
.theme-carte__actions { padding: 10px 13px 13px; display: flex; gap: 7px; }
.theme-carte__actions .b { flex: 1; }

.voile--large { padding: 3vh 3vw; }
.voile__boite--large {
  width: 100%; max-width: 1180px; height: 94vh; max-height: none;
  display: flex; flex-direction: column; overflow: hidden;
}
.voile__boite--large .carte__tete { flex: none; }
.voile__boite--large .carte__tete .table__meta { margin-left: auto; margin-right: 10px; }
.demo-cadre { flex: 1; width: 100%; border: 0; background: #fff; }

/* ─── Produits ───────────────────────────────────────────────────────── */
.prod-ligne { display: flex; align-items: center; gap: 11px; }
.prod-ligne__vignette {
  flex: none; width: 40px; height: 40px; border-radius: 7px; object-fit: cover;
  background: var(--surface-2); border: 1px solid var(--trait);
}
.prod-ligne__vide { display: grid; place-items: center; color: var(--pale); }
.prod-photo {
  display: block; width: 100%; max-width: 380px; max-height: 240px;
  object-fit: cover; border-radius: var(--rayon-sm); border: 1px solid var(--trait);
}
.prod-photo--vide {
  height: 160px; display: grid; place-items: center;
  background: var(--surface-2); color: var(--pale);
}
.duo { display: grid; grid-template-columns: 1fr 140px; gap: 12px; }
@media (max-width: 620px) { .duo { grid-template-columns: 1fr; } }
.carte__corps > .champ:last-child { margin-bottom: 0; }

/* ─── Médiathèque ────────────────────────────────────────────────────── */
.barre-medias {
  display: flex; align-items: center; gap: 14px; margin-bottom: 16px; flex-wrap: wrap;
}
.barre-medias .saisie { width: auto; min-width: 220px; margin-left: auto; }
.onglets--plein { margin-bottom: 0; border-bottom: 0; }
.onglets--plein .onglet {
  border: 1px solid var(--trait); border-radius: 999px; padding: 6px 13px; margin: 0;
  background: var(--surface);
}
.onglets--plein .onglet[aria-selected="true"] {
  background: var(--accent); border-color: var(--accent); color: #fff;
}

.carte.depot { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-pale); }

.grille-medias {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 14px; padding: 16px;
}
.media {
  border: 1px solid var(--trait); border-radius: var(--rayon-sm);
  overflow: hidden; background: var(--surface);
}
.media:hover { border-color: #c2cede; }
.media__vue {
  height: 118px; display: grid; place-items: center; overflow: hidden;
  background: var(--surface-2); color: var(--pale);
}
.media__vue img { width: 100%; height: 100%; object-fit: cover; display: block; }
.media__pied { padding: 8px 10px; display: flex; align-items: center; gap: 6px; }
.media__nom {
  flex: 1; min-width: 0; font-size: 12px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.media__actions { flex: none; display: flex; gap: 3px; }

/* ─── Fenêtre de choix ───────────────────────────────────────────────── */
.voile {
  position: fixed; inset: 0; z-index: 60; display: grid; place-items: center;
  padding: 22px; background: rgba(16,22,32,.45); backdrop-filter: blur(2px);
}
.voile__boite {
  width: min(680px, 100%); max-height: 84vh; overflow: auto;
  background: var(--surface); border-radius: var(--rayon); box-shadow: var(--ombre-fort);
}
.voile__boite .carte__tete .b { margin-left: auto; }

.modeles { display: grid; grid-template-columns: repeat(auto-fill, minmax(146px, 1fr)); gap: 12px; }
.modele {
  border: 1px solid var(--trait); border-radius: var(--rayon-sm); background: var(--surface);
  padding: 10px; cursor: pointer; font: inherit; text-align: left;
}
.modele:hover { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-pale); }
.modele__forme {
  display: flex; flex-direction: column; gap: 5px; height: 64px; padding: 9px;
  border-radius: 5px; background: var(--surface-2); margin-bottom: 8px;
}
.modele__barre { display: block; height: 6px; width: 62%; border-radius: 3px; background: #9fb0c6; }
.modele__cols { display: flex; gap: 5px; flex: 1; }
.modele__col { flex: 1; border-radius: 3px; background: #c9d4e1; }
.modele__nom { font-size: 12.5px; font-weight: 600; }

/* ─── Connexion ──────────────────────────────────────────────────────── */
.entree {
  min-height: 100vh; display: grid; place-items: center; padding: 20px;
  background: radial-gradient(1100px 520px at 50% -8%, #dfe8fb, var(--fond));
}
.entree__boite {
  width: min(390px, 100%); background: var(--surface); padding: 28px;
  border: 1px solid var(--trait); border-radius: 14px; box-shadow: var(--ombre-fort);
}
.entree__marque { display: flex; align-items: center; gap: 9px; font-weight: 680; font-size: 17px; }
.entree__boite p { color: var(--doux); margin: 6px 0 20px; }
.champ { display: block; margin-bottom: 13px; }
.champ__nom { display: block; font-size: 12.5px; font-weight: 620; margin-bottom: 5px; }
.saisie {
  width: 100%; padding: 9px 11px; border: 1px solid var(--trait);
  border-radius: var(--rayon-sm); font: inherit; background: var(--surface);
  color: var(--encre);
}
.saisie:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-pale); }
.erreur { color: var(--danger); font-size: 13px; min-height: 19px; }

/* ─── Divers ─────────────────────────────────────────────────────────── */
.charge { padding: 60px; text-align: center; color: var(--pale); }
.note {
  display: flex; gap: 9px; padding: 11px 13px; border-radius: var(--rayon-sm);
  background: var(--warn-pale); color: var(--warn); font-size: 13px;
}
.note svg { flex: none; margin-top: 2px; }

@media (max-width: 860px) {
  .bo { grid-template-columns: 1fr; grid-template-rows: 52px auto 1fr;
        grid-template-areas: "marque" "menu" "vue"; }
  .bo__barre { display: none; }
  .bo__menu { flex-direction: row; overflow-x: auto; padding: 0; }
  .bo__groupe { display: none; }
  .bo__lien { width: auto; border-left: 0; border-bottom: 3px solid transparent; padding: 11px 14px; }
  .bo__lien[aria-current="page"] { border-left: 0; border-bottom-color: var(--accent); }
  .bo__page { padding: 18px 16px 50px; }
}
`;
