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
