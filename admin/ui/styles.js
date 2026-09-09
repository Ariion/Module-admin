/**
 * Styles de l'éditeur.
 *
 * Tout est injecté dans un shadow DOM : aucune règle du site ne peut casser
 * l'interface, et l'interface ne peut pas déteindre sur le site. Le site
 * lui-même vit dans une iframe, donc les deux mondes ne se touchent jamais.
 * @module ui/styles
 */

export const SHADOW_CSS = `
:host {
  /* Neutres très légèrement bleutés : un gris pur à côté d'un accent bleu
     paraît sale. Ceux-ci sont choisis, pas hérités. */
  --bg:        #131519;
  --bg-soft:   #1a1d23;
  --bg-raise:  #22262e;
  --bg-sunk:   #0d0f13;
  --line:      #2a2f38;
  --line-soft: #202530;
  --text:      #e9edf4;
  --muted:     #939cab;
  --faint:     #67707e;

  /* Deux accents qui portent une information : ce qui touche au CONTENU est
     bleu, ce qui touche à la STRUCTURE est violet. */
  --accent:     #4d8bf5;
  --accent-dim: rgba(77, 139, 245, .15);
  --accent-hi:  #7aa9ff;
  --sect:       #a97ae8;
  --sect-dim:   rgba(169, 122, 232, .14);

  --ok:     #34d399;
  --warn:   #fbbf24;
  --danger: #f87171;

  --radius:    10px;
  --radius-sm: 8px;
  --radius-xs: 6px;
  --panel:  344px;
  --topbar: 48px;
  --grab:   54px;
  --shadow:    0 12px 34px rgba(0, 0, 0, .42);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, .28);

  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
* { box-sizing: border-box; }
/* Une règle de composant ne doit jamais rendre visible un élément masqué. */
[hidden] { display: none !important; }
button, input, textarea, select { font: inherit; color: inherit; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: #2f353f; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #3b424e; }
::-webkit-scrollbar-track { background: transparent; }

/* ================= Structure générale ================= */
.shell {
  position: absolute; inset: 0; display: grid;
  grid-template-columns: var(--panel) 1fr;
  background: var(--bg-sunk);
}

/* ================= Panneau de gauche ================= */
.panel {
  position: relative; display: flex; flex-direction: column; min-height: 0;
  background: var(--bg); border-right: 1px solid var(--line);
}

/* Poignée du panneau en mode feuille (mobile) : masquée sur grand écran. */
.panel__grab { display: none; }

.panel__head {
  display: flex; align-items: center; gap: 9px; padding: 0 16px;
  height: var(--topbar); border-bottom: 1px solid var(--line); flex: none;
}
.panel__dot {
  width: 7px; height: 7px; border-radius: 50%; flex: none;
  background: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim);
}
.panel__name { font-weight: 600; letter-spacing: -.1px; }
.panel__site {
  margin-left: auto; color: var(--muted); font-size: 11.5px;
  padding: 3px 9px; border-radius: 999px; border: 1px solid var(--line-soft);
  background: var(--bg-soft); max-width: 46%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Onglets : contrôle segmenté, plus proche d'un vrai produit qu'un
   soulignement, et directement utilisable au doigt. */
.tabs {
  display: flex; flex: none; gap: 2px; margin: 12px 14px 4px; padding: 3px;
  background: var(--bg-sunk); border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
}
.tab {
  flex: 1; height: 32px; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: none; border: 0; border-radius: var(--radius-xs);
  color: var(--muted); cursor: pointer; font-size: 12px; font-weight: 500;
  transition: color .14s, background .14s;
}
.tab svg { opacity: .85; }
.tab:hover { color: var(--text); }
.tab[aria-selected="true"] { background: var(--bg-raise); color: var(--text); box-shadow: var(--shadow-sm); }
.tab[aria-selected="true"] svg { color: var(--accent); opacity: 1; }
.tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

.views { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.view { display: none; padding: 14px 16px 24px; }
.view--on { display: block; }

.panel__foot {
  flex: none; border-top: 1px solid var(--line); padding: 11px 14px 13px;
  background: var(--bg);
}
.panel__state {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
  font-size: 11.5px; color: var(--muted); min-width: 0;
}
.panel__state > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel__actions { display: flex; gap: 6px; }
.panel__actions .btn--primary { flex: 1; justify-content: center; }

/* ================= Scène ================= */
.stage { display: flex; flex-direction: column; min-width: 0; }
.stage__bar {
  height: var(--topbar); flex: none; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; background: var(--bg); border-bottom: 1px solid var(--line);
}
.stage__page {
  display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
  height: 32px; padding: 0 12px; cursor: pointer;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: 999px;
  color: var(--muted); font-size: 12px; text-align: left;
  transition: background .14s, border-color .14s, color .14s;
}
.stage__page:hover { background: var(--bg-raise); border-color: var(--line); color: var(--text); }
.stage__page > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage__page svg { flex: none; color: var(--accent); }
.stage__frame {
  flex: 1; min-height: 0; display: flex; justify-content: center;
  background:
    radial-gradient(120% 90% at 50% 0%, #14171d 0%, var(--bg-sunk) 62%);
  padding: 0;
}
.stage__frame--constrained { padding: 20px 20px 24px; }
.viewport {
  width: 100%; height: 100%; border: 0; background: #fff;
  transition: width .2s ease;
}
.stage__frame--constrained .viewport {
  box-shadow: 0 18px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.07);
  border-radius: 10px;
}
.devices {
  display: flex; gap: 2px; padding: 3px; background: var(--bg-sunk);
  border: 1px solid var(--line-soft); border-radius: var(--radius-sm);
}
.device {
  height: 26px; padding: 0 10px; background: none; border: 0; border-radius: var(--radius-xs);
  color: var(--faint); cursor: pointer; font-size: 12px;
}
.device:hover { color: var(--text); }
.device[aria-pressed="true"] { background: var(--bg-raise); color: var(--text); }

/* ================= Boutons et champs ================= */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; padding: 0 12px;
  background: var(--bg-raise); border: 1px solid var(--line); border-radius: var(--radius-sm);
  cursor: pointer; white-space: nowrap; font-size: 12.5px;
  transition: background .14s, border-color .14s, color .14s, transform .08s;
}
.btn:hover { background: #2a2f38; border-color: #38404c; }
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: .42; cursor: default; }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.btn--primary {
  background: var(--accent); border-color: transparent; color: #fff; font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,.3);
}
.btn--primary:hover { background: #5f9af9; border-color: transparent; }
.btn--sect { background: var(--sect-dim); border-color: rgba(169,122,232,.34); color: #e3d0fb; }
.btn--sect:hover { background: rgba(169,122,232,.22); border-color: rgba(169,122,232,.5); }
.btn--ghost { background: transparent; border-color: transparent; color: var(--muted); }
.btn--ghost:hover { background: var(--bg-soft); border-color: transparent; color: var(--text); }
.btn--danger { color: #fca5a5; border-color: rgba(248,113,113,.3); }
.btn--danger:hover { background: rgba(248,113,113,.12); border-color: rgba(248,113,113,.45); }
.btn--sm { height: 27px; padding: 0 9px; font-size: 12px; }
.btn--icon { width: 32px; padding: 0; }
.btn--sm.btn--icon { width: 27px; }
.btn--wide { width: 100%; }

.pill {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px;
  background: var(--bg-soft); border: 1px solid var(--line-soft); font-size: 11px;
}
.pill--warn { color: var(--warn); border-color: rgba(251,191,36,.3); }
.pill--ok { color: var(--ok); border-color: rgba(52,211,153,.3); }

.field { margin-bottom: 13px; }
.field__label {
  display: block; margin-bottom: 6px; color: var(--muted);
  font-size: 11.5px; font-weight: 500;
}
.input, .textarea {
  width: 100%; height: 34px; padding: 0 10px; background: var(--bg-sunk); color: var(--text);
  border: 1px solid var(--line); border-radius: var(--radius-sm); outline: none;
  transition: border-color .14s, box-shadow .14s;
}
.input::placeholder, .textarea::placeholder { color: var(--faint); }
.input:focus, .textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.textarea { height: auto; min-height: 72px; padding: 8px 10px; resize: vertical; line-height: 1.5; }
.textarea.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px; min-height: 112px;
}
.check { display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 12px; }
.hint { color: var(--muted); font-size: 12px; margin: 7px 0 0; line-height: 1.5; }
.row { display: flex; gap: 7px; }
.row > * { flex: 1; }
/* Quatre boutons ne tiennent pas sur un rang de 344 px. */
.row--wrap { flex-wrap: wrap; }
.row--wrap > * { flex: 1 1 44%; }

/* En-tête de sélection de l'inspecteur : ce qu'on est en train de régler */
.sel {
  display: flex; align-items: center; gap: 11px; margin-bottom: 12px; padding: 10px 12px;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
}
.sel__icon {
  width: 30px; height: 30px; flex: none; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); background: var(--accent-dim); color: var(--accent-hi);
}
.sel__main { flex: 1; min-width: 0; }
.sel__title { font-weight: 600; line-height: 1.3; }
.sel__meta {
  color: var(--faint); font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Zone commune : ce qui se modifie ici vaut pour toutes les pages. */
.sel--commun { border-color: rgba(251,191,36,.4); background: rgba(251,191,36,.07); }
.sel--commun .sel__icon { background: rgba(251,191,36,.16); color: var(--warn); }
.commun {
  display: flex; align-items: flex-start; gap: 9px; margin: -4px 0 12px; padding: 10px 12px;
  background: rgba(251,191,36,.09); border: 1px solid rgba(251,191,36,.28);
  border-radius: var(--radius); color: #f5d78e; font-size: 11.5px; line-height: 1.45;
}
.commun svg { flex: none; margin-top: 1px; color: var(--warn); }

/* Actions du pied : le bouton Publier domine, le reste s'efface. */
.panel__actions .btn--icon {
  background: transparent; border-color: var(--line-soft); color: var(--muted);
}
.panel__actions .btn--icon:hover { background: var(--bg-soft); border-color: var(--line); color: var(--text); }

/* Sections repliables de l'inspecteur, présentées en cartes */
.group {
  background: var(--bg-soft); border: 1px solid var(--line-soft);
  border-radius: var(--radius); margin-bottom: 9px; overflow: hidden;
}
.group__head {
  width: 100%; display: flex; align-items: center; gap: 9px; padding: 11px 13px;
  background: none; border: 0; color: var(--text); cursor: pointer; text-align: left;
  font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
}
.group__head:hover { background: var(--bg-raise); }
.group__head span { flex: 1; }
.group__head > svg:first-child { color: var(--accent); }
.group__head > svg:last-child { color: var(--faint); transition: transform .16s; }
.group[data-open="false"] .group__head > svg:last-child { transform: rotate(-90deg); }
.group__body { padding: 4px 13px 14px; }
.group[data-open="false"] .group__body { display: none; }
.group--sect .group__head > svg:first-child { color: var(--sect); }

/* Groupe de boutons segmenté (alignement) */
.seg {
  display: flex; gap: 2px; padding: 3px; background: var(--bg-sunk);
  border: 1px solid var(--line-soft); border-radius: var(--radius-sm);
}
.seg__btn {
  flex: 1; height: 27px; border: 0; border-radius: var(--radius-xs); cursor: pointer;
  background: none; color: var(--muted); font-size: 11.5px;
  transition: background .14s, color .14s;
}
.seg__btn:hover { color: var(--text); background: var(--bg-soft); }
.seg__btn[aria-pressed="true"] { background: var(--accent); color: #fff; }
select.input { appearance: none; cursor: pointer; }

/* Sélecteur de couleur */
.color { display: flex; align-items: center; gap: 8px; }
.color__swatch {
  width: 34px; height: 34px; padding: 0; flex: none; cursor: pointer;
  border: 1px solid var(--line); border-radius: var(--radius-sm); background: none;
}
.color__swatch::-webkit-color-swatch-wrapper { padding: 3px; }
.color__swatch::-webkit-color-swatch { border: 0; border-radius: 5px; }
.color .input { flex: 1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }

/* Aperçu d'image */
.preview {
  display: flex; align-items: center; justify-content: center; min-height: 124px; margin-bottom: 11px;
  background: repeating-conic-gradient(#1b1f26 0 25%, #16191f 0 50%) 0 0/16px 16px;
  border: 1px solid var(--line-soft); border-radius: var(--radius); overflow: hidden;
}
.preview img { max-width: 100%; max-height: 200px; display: block; }
.preview--drop { border-color: var(--accent); background: var(--accent-dim); }
.progress { height: 3px; background: var(--line); border-radius: 2px; overflow: hidden; margin-top: 8px; }
.progress > i { display: block; height: 100%; background: var(--accent); width: 0; transition: width .2s; }

/* ================= Structure de la page ================= */
.tree { list-style: none; margin: 0; padding: 0; }
.tree ul { list-style: none; margin: 0; padding: 0 0 0 13px; border-left: 1px solid var(--line-soft); }
.node {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 9px;
  background: none; border: 0; border-radius: var(--radius-xs); color: var(--text);
  cursor: pointer; text-align: left; font-size: 12px;
}
.node:hover { background: var(--bg-soft); }
.node[aria-current="true"] { background: var(--accent-dim); color: #d3e2ff; }
.node svg { color: var(--faint); flex: none; }
.node[aria-current="true"] svg { color: var(--accent); }
.node__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node__count { color: var(--faint); font-size: 11px; }

/* ================= Bibliothèque ================= */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(94px, 1fr)); gap: 9px; }
.tile {
  position: relative;
  border: 1px solid var(--line-soft); border-radius: var(--radius); overflow: hidden;
  background: var(--bg-soft); padding: 0;
  transition: border-color .14s;
}
.tile:hover { border-color: var(--accent); }
.tile__pick {
  display: block; width: 100%; padding: 0; border: 0; background: none;
  cursor: pointer; text-align: left; color: inherit;
}
.tile img { width: 100%; height: 70px; object-fit: cover; display: block; background: var(--bg-sunk); }
.tile__icon {
  height: 70px; display: flex; align-items: center; justify-content: center;
  color: var(--faint); background: var(--bg-sunk);
}
.tile__name {
  padding: 6px 8px; font-size: 11px; color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tile__acts { position: absolute; top: 5px; right: 5px; display: none; gap: 3px; }
.tile:hover .tile__acts, .tile:focus-within .tile__acts { display: flex; }
.tile__acts .btn { background: rgba(13,15,19,.9); backdrop-filter: blur(3px); }

/* Bibliothèque : barre de dépôt, filtres, ajout par adresse */
.ml-filters { flex-wrap: wrap; margin-bottom: 10px; }
.ml-filters .seg__btn { flex: 1 0 auto; padding: 0 10px; }
.ml-drop {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
  min-height: 66px; margin-bottom: 10px; padding: 12px;
  border: 1px dashed var(--line); border-radius: var(--radius);
  background: var(--bg-sunk); color: var(--muted); font-size: 12px;
  cursor: pointer; text-align: center; transition: border-color .14s, color .14s, background .14s;
}
.ml-drop svg { color: var(--faint); }
.ml-drop:hover { border-color: var(--accent); color: var(--text); background: var(--bg-soft); }
.ml-drop--over { border: 2px dashed var(--accent); background: var(--accent-dim); color: var(--accent-hi); }
.ml-add { flex: none; }
.ml-pick {
  display: flex; align-items: center; gap: 9px; margin-bottom: 10px;
  padding: 9px 10px 9px 13px; border-radius: var(--radius);
  background: var(--accent-dim); border: 1px solid rgba(77,139,245,.35);
  color: #d3e2ff; font-size: 12px;
}
.ml-pick span { flex: 1; }

/* ================= Listes ================= */
.list { list-style: none; margin: 0; padding: 0; }
.list li {
  display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid var(--line-soft);
}
.list li:last-child { border-bottom: 0; }
.list__main { flex: 1; min-width: 0; }
.list__meta { color: var(--faint); font-size: 11px; }
.empty { color: var(--muted); text-align: center; padding: 28px 14px; font-size: 12px; }

/* ================= Surcouche sur l'iframe ================= */
.layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.hl {
  position: absolute; border: 1px solid var(--accent); border-radius: 3px;
  background: var(--accent-dim); pointer-events: none;
}
.hl--active { border-color: var(--ok); background: rgba(52,211,153,.10); }
.hl__tag {
  position: absolute; top: -20px; left: -1px; height: 19px; padding: 0 7px;
  display: inline-flex; align-items: center; gap: 4px; border-radius: 4px 4px 0 0;
  background: var(--accent); color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap;
}
.itembar {
  position: absolute; display: flex; gap: 2px; padding: 4px; pointer-events: auto;
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}
.rtb {
  position: absolute; display: flex; gap: 2px; padding: 4px; pointer-events: auto;
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}

/* ================= Bibliothèque de widgets ================= */
.search {
  display: flex; align-items: center; gap: 8px; padding: 0 11px; margin-bottom: 14px;
  background: var(--bg-sunk); border: 1px solid var(--line); border-radius: var(--radius-sm);
  color: var(--faint); transition: border-color .14s, box-shadow .14s;
}
.search__input { border: 0; background: none; padding: 0; height: 34px; flex: 1; }
.search__input:focus { border: 0; outline: none; box-shadow: none; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }

.wcat { margin-bottom: 4px; }
.wcat__head {
  width: 100%; display: flex; align-items: center; gap: 8px; padding: 10px 2px;
  background: none; border: 0; color: var(--faint); cursor: pointer; text-align: left;
  font-size: 10px; font-weight: 700; letter-spacing: .11em; text-transform: uppercase;
}
.wcat__head:hover { color: var(--text); }
.wcat__head span { flex: 1; }
.wcat__head svg { transition: transform .16s; }
.wcat[data-open="false"] .wcat__head svg { transform: rotate(-90deg); }
.wcat[data-open="false"] .wgrid, .wcat[data-open="false"] .tpls { display: none; }

.wgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding-bottom: 10px; }
.wtile {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 14px 8px; min-height: 78px; cursor: grab;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  color: var(--muted); text-align: center;
  transition: background .14s, border-color .14s, color .14s, transform .08s;
}
.wtile:hover { background: var(--bg-raise); border-color: var(--line); color: var(--text); }
.wtile:active { cursor: grabbing; transform: scale(.97); }
.wtile:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.wtile__icon {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: var(--radius-sm);
  background: var(--accent-dim); color: var(--accent-hi);
  transition: background .14s;
}
.wtile:hover .wtile__icon { background: rgba(77,139,245,.24); }
.wtile__label { font-size: 11.5px; line-height: 1.25; }

/* ---- Modèles de section ---- */
.tpls { display: grid; gap: 7px; padding-bottom: 10px; }
.tpl {
  display: flex; align-items: center; gap: 11px; padding: 9px 11px; width: 100%;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  cursor: pointer; text-align: left; color: var(--text);
  transition: border-color .14s, background .14s;
}
.tpl:hover { border-color: rgba(169,122,232,.5); background: var(--bg-raise); }
.tpl__preview {
  width: 42px; height: 30px; flex: none; padding: 4px; display: flex; flex-direction: column; gap: 3px;
  background: var(--bg-sunk); border: 1px solid var(--line-soft); border-radius: 5px;
}
.tpl__bar { height: 4px; border-radius: 2px; background: var(--sect); opacity: .55; }
.tpl__cols { flex: 1; display: flex; gap: 3px; }
.tpl__col { flex: 1; border-radius: 2px; background: var(--line); }
.tpl:hover .tpl__bar { opacity: .85; }
.tpl:hover .tpl__col { background: #39404d; }
.tpl__label { font-size: 12px; line-height: 1.3; }

/* ---- Modèles de page entière ---- */
.pagetpls { display: grid; gap: 9px; }
.pagetpl {
  display: flex; align-items: center; gap: 13px; padding: 12px 13px;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  transition: border-color .14s;
}
.pagetpl:hover { border-color: rgba(169,122,232,.5); }
.pagetpl__preview {
  width: 52px; flex: none; display: flex; flex-direction: column; gap: 3px; padding: 5px;
  background: var(--bg-sunk); border: 1px solid var(--line-soft); border-radius: 5px;
}
.pagetpl__band { height: 6px; border-radius: 2px; background: var(--sect); opacity: .6; }
.pagetpl__row { display: flex; gap: 3px; }
.pagetpl__cell { flex: 1; height: 10px; border-radius: 2px; background: var(--line); }
.pagetpl__main { flex: 1; min-width: 0; }
.pagetpl__title { font-weight: 600; }
.pagetpl__meta { color: var(--faint); font-size: 11.5px; }
.pagetpl__actions { display: flex; gap: 6px; flex: none; }
@media (max-width: 620px) {
  .pagetpl { flex-wrap: wrap; }
  .pagetpl__actions { width: 100%; }
  .pagetpl__actions .btn { flex: 1; }
}

/* ---- Assistant de démarrage ---- */
.assist__q { margin-top: 18px; }
.assist__titre { font-weight: 600; margin-bottom: 10px; }
.assist__cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.assist__carte {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 14px 15px; text-align: left; cursor: pointer;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  color: var(--text); transition: border-color .14s, background .14s;
}
.assist__carte:hover { border-color: var(--line); background: var(--bg-raise); }
.assist__carte[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-dim); }
.assist__carte svg { color: var(--accent); margin-bottom: 3px; }
.assist__carteTitre { font-weight: 600; }
.assist__carteAide { color: var(--muted); font-size: 11.5px; line-height: 1.4; }

.assist__coches { display: grid; gap: 7px; }
.assist__coche {
  display: flex; align-items: flex-start; gap: 11px; padding: 11px 13px; cursor: pointer;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  transition: border-color .14s, background .14s;
}
.assist__coche:hover { border-color: var(--line); background: var(--bg-raise); }
.assist__coche:has(input:checked) { border-color: var(--accent); background: var(--accent-dim); }
.assist__coche input { width: 16px; height: 16px; margin-top: 2px; flex: none; accent-color: var(--accent); }
.assist__coche > span { display: flex; flex-direction: column; gap: 2px; }
.assist__cocheTitre { font-weight: 550; }
.assist__cocheAide { color: var(--muted); font-size: 11.5px; line-height: 1.4; }

.assist__props { display: grid; gap: 9px; }
.assist__prop {
  display: flex; align-items: center; gap: 13px; padding: 13px 14px; width: 100%;
  text-align: left; cursor: pointer; color: var(--text);
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  transition: border-color .14s, background .14s;
}
.assist__prop:hover { border-color: var(--line); background: var(--bg-raise); }
.assist__prop[aria-pressed="true"] { border-color: var(--sect); background: var(--sect-dim); }
.assist__prop > svg:last-child { color: var(--sect); flex: none; }
.assist__propMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.assist__propTitre { font-weight: 600; }
.assist__propMeta { color: var(--muted); font-size: 11.5px; }

.assist__note {
  display: flex; align-items: flex-start; gap: 9px; margin: 14px 0 0; padding: 11px 13px;
  background: var(--bg-sunk); border: 1px solid var(--line-soft); border-radius: var(--radius);
  color: var(--muted); font-size: 12px; line-height: 1.5;
}
.assist__note svg { color: var(--sect); flex: none; margin-top: 2px; }
.assist__pied { display: flex; width: 100%; align-items: center; gap: 8px; }

@media (max-width: 860px) {
  .assist__cartes { grid-template-columns: 1fr; }
}

/* ---- Questionnaire des pages légales ---- */
.legal__champs { display: grid; gap: 11px; margin-bottom: 12px; }
.legal__champ { display: block; }
.legal__requis { color: var(--warn); font-style: normal; font-size: 10.5px; }
.input--manque { border-color: rgba(251,191,36,.55); }

/* ---- Questionnaire des pages légales ---- */
.legal__champs { display: grid; gap: 11px; margin-bottom: 12px; }
.legal__champ { display: block; }
.legal__requis { color: var(--warn); font-style: normal; font-size: 10.5px; }
.input--manque { border-color: rgba(251,191,36,.55); }

/* ---- Zones de dépôt dans l'aperçu ---- */
.drop {
  position: absolute; pointer-events: none;
  border: 2px dashed var(--accent); border-radius: var(--radius);
  background: var(--accent-dim);
  display: flex; align-items: center; justify-content: center; gap: 9px;
  color: var(--accent-hi); font-size: 12.5px; font-weight: 550;
}
.drop--empty { pointer-events: auto; cursor: pointer; }
.drop--over { background: rgba(77,139,245,.26); border-style: solid; }
.dropline {
  position: absolute; height: 3px; border-radius: 2px; pointer-events: none;
  background: var(--accent); box-shadow: 0 0 10px rgba(77,139,245,.8);
}

/* ---- Widget sélectionné dans l'aperçu ---- */
.wsel { position: absolute; pointer-events: none; border: 1px solid var(--accent); border-radius: 3px; }
.wtools {
  position: absolute; display: flex; align-items: center; gap: 2px; padding: 3px;
  pointer-events: auto; background: var(--accent); border-radius: 7px 7px 0 0;
  box-shadow: var(--shadow);
}
.wtools__name {
  padding: 0 8px 0 6px; font-size: 11px; font-weight: 650; color: #fff;
  max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wtools .btn {
  height: 23px; width: 23px; padding: 0; border-radius: 5px;
  background: rgba(255,255,255,.18); border-color: transparent; color: #fff;
}
.wtools .btn:hover { background: rgba(255,255,255,.34); border-color: transparent; }

/* ---- Structure : sections ----
   Le violet distingue la structure du contenu, qui reste bleu. Deux natures
   d'objet, deux couleurs : le client sait ce qu'il manipule. */
.sect {
  position: absolute; pointer-events: none; border: 1px dashed var(--sect);
  background: var(--sect-dim); border-radius: 4px;
}
.secttools {
  position: absolute; display: flex; align-items: center; gap: 2px; padding: 4px;
  pointer-events: auto; background: var(--bg); border: 1px solid rgba(169,122,232,.4);
  border-radius: 999px; box-shadow: var(--shadow); transform: translateX(-50%);
}
.secttools__name {
  padding: 0 9px 0 8px; font-size: 11.5px; font-weight: 600; color: #e3d0fb;
  max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.secttools .btn {
  height: 26px; width: 26px; padding: 0;
  border-radius: 50%; background: transparent; border-color: transparent; color: var(--muted);
}
.secttools .btn:hover { background: var(--sect-dim); color: #e3d0fb; border-color: transparent; }
.secttools .btn--danger:hover { background: rgba(248,113,113,.16); color: #fca5a5; }

/* Point d'insertion entre deux sections */
.addhere {
  position: absolute; display: flex; align-items: center; justify-content: center;
  pointer-events: auto; height: 30px; transform: translateY(-50%);
}
.addhere::before {
  content: ""; position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--sect), transparent);
  opacity: .5;
}
.addhere button {
  position: relative; height: 28px; padding: 0 14px; border-radius: 999px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--sect); border: 0; color: #22103a; font-weight: 650; font-size: 11.5px;
  box-shadow: 0 3px 12px rgba(169,122,232,.42);
}
.addhere button:hover { background: #bd94f2; }

/* Vignettes de la bibliothèque de sections */
.sections { display: grid; gap: 8px; }
.sectcard {
  display: flex; align-items: center; gap: 11px; padding: 11px 12px; width: 100%;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  cursor: pointer; text-align: left; color: var(--text); transition: border-color .14s, background .14s;
}
.sectcard:hover { border-color: rgba(169,122,232,.5); background: var(--bg-raise); }
.sectcard__icon {
  width: 32px; height: 32px; flex: none; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); background: var(--sect-dim); color: var(--sect);
}
.sectcard__main { flex: 1; min-width: 0; }
.sectcard__title {
  display: block; font-weight: 550; line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sectcard__meta { display: block; color: var(--faint); font-size: 11px; }
.sectcard > svg:last-child { flex: none; color: var(--faint); }
.sectcard:hover > svg:last-child { color: var(--sect); }
.sectcard--hidden { opacity: .5; }

/* Chargement de l'aperçu */
.loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  gap: 10px; color: var(--muted); background: var(--bg-sunk); font-size: 12px; z-index: 5;
}
.spinner {
  width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--line);
  border-top-color: var(--accent); animation: tourne .7s linear infinite;
}
@keyframes tourne { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }

/* ================= Fenêtres modales ================= */
.backdrop {
  position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center;
  background: rgba(6,8,12,.7); padding: 20px; backdrop-filter: blur(2px);
}
.modal {
  width: 100%; max-width: 560px; max-height: 84vh; display: flex; flex-direction: column;
  background: var(--bg); border: 1px solid var(--line); border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,.6);
}
.modal--sm { max-width: 360px; }
.modal__head {
  padding: 15px 18px; border-bottom: 1px solid var(--line);
  font-weight: 600; display: flex; gap: 9px; align-items: center;
}
.modal__body { padding: 18px; overflow: auto; }
.modal__foot { padding: 13px 18px; border-top: 1px solid var(--line); display: flex; gap: 8px; justify-content: flex-end; }
.error { color: #fca5a5; font-size: 12px; margin-top: 9px; min-height: 15px; }
.ok { color: #86efac; font-size: 12px; margin-top: 9px; }

/* ================= Notification ================= */
.toast {
  position: fixed; left: calc(var(--panel) + (100% - var(--panel)) / 2); bottom: 24px;
  transform: translate(-50%, 12px);
  padding: 10px 17px; border-radius: 999px; z-index: 40; opacity: 0; max-width: 60vw;
  background: var(--bg); border: 1px solid var(--line); box-shadow: var(--shadow);
  transition: opacity .18s, transform .18s; pointer-events: none;
}
.toast--show { opacity: 1; transform: translate(-50%, 0); }
.toast--error { border-color: rgba(248,113,113,.5); color: #fca5a5; }

@media (prefers-reduced-motion: reduce) {
  .viewport, .toast, .btn, .tab, .panel { transition: none; }
}

/* ================= Écrans intermédiaires ================= */
@media (max-width: 1180px) {
  :host { --panel: 312px; }
}

/* ================= Mobile : le panneau devient une feuille =================
   Sur un téléphone, deux colonnes ne tiennent pas : le panneau glisse
   depuis le bas, par-dessus l'aperçu, et se replie sur sa poignée. */
@media (max-width: 860px) {
  :host { font-size: 14px; --topbar: 46px; }

  .shell { grid-template-columns: 1fr; grid-template-rows: 1fr; }
  .stage { grid-area: 1 / 1; min-height: 0; }
  .stage__frame { padding-bottom: var(--grab); }
  .stage__frame--constrained { padding: 12px 12px calc(var(--grab) + 12px); }

  .panel {
    grid-area: 1 / 1; align-self: end; z-index: 25;
    width: 100%; height: min(68vh, 620px);
    border-right: 0; border-top: 1px solid var(--line);
    border-radius: 18px 18px 0 0;
    box-shadow: 0 -14px 40px rgba(0,0,0,.5);
    transition: transform .26s cubic-bezier(.32,.72,0,1);
  }
  .panel[data-sheet="closed"] { transform: translateY(calc(100% - var(--grab))); }

  /* Poignée : c'est elle qui ouvre et referme la feuille. */
  .panel__grab {
    display: flex; align-items: center; gap: 10px; flex: none;
    height: var(--grab); padding: 0 16px;
    background: none; border: 0; border-radius: 18px 18px 0 0;
    color: var(--text); cursor: pointer; text-align: left;
  }
  .panel__grab::before {
    content: ""; position: absolute; top: 7px; left: 50%; transform: translateX(-50%);
    width: 38px; height: 4px; border-radius: 2px; background: var(--line);
  }
  .panel__grab-label { flex: 1; font-weight: 600; font-size: 13.5px; }
  .panel__grab-hint { color: var(--faint); font-size: 11.5px; }
  .panel__grab svg { color: var(--muted); transition: transform .22s; }
  .panel[data-sheet="closed"] .panel__grab svg { transform: rotate(180deg); }


  .panel__head { display: none; }
  .tabs { margin: 2px 12px 4px; }
  .tab { height: 36px; }
  .view { padding: 12px 14px 20px; }
  .panel__foot { padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px)); }

  /* Cibles tactiles : rien en dessous de 34 px de haut. */
  .btn { height: 36px; }
  .btn--sm { height: 30px; }
  .btn--icon { width: 36px; }
  .btn--sm.btn--icon { width: 30px; }
  .input, .textarea, .search__input { height: 38px; font-size: 16px; }
  .textarea { height: auto; }
  .seg__btn { height: 30px; }
  .node { padding: 9px 9px; }
  .wgrid { gap: 8px; }
  .wtile { min-height: 84px; }

  .stage__bar { padding: 0 10px; gap: 6px; }
  .toast { left: 50%; bottom: calc(var(--grab) + 14px); max-width: 86vw; }
  .backdrop { padding: 14px; align-items: flex-end; }
  .modal { max-height: 88vh; }
}

/* ================= Prévisualisation =================
   Le panneau s'efface et le site prend tout l'écran : sans marque visible,
   on croirait l'éditeur fermé. D'où cette barre, noire et pleine largeur,
   qui dit où l'on est et par où sortir. */
.previs {
  display: none; align-items: center; gap: 10px; flex: none;
  height: var(--topbar); padding: 0 14px;
  background: #000; color: #fff; border-bottom: 1px solid #000;
}
.shell[data-previsu="on"] .previs { display: flex; }
.shell[data-previsu="on"] { grid-template-columns: 1fr; }
.shell[data-previsu="on"] .panel,
.shell[data-previsu="on"] .stage__bar { display: none; }
.shell[data-previsu="on"] .stage__frame { padding: 0; }

.previs__pastille {
  width: 8px; height: 8px; border-radius: 999px; background: #34d399; flex: none;
}
.previs__titre { font-weight: 600; letter-spacing: .01em; }
.previs__note {
  color: #fbbf24; font-size: 12px; border: 1px solid rgba(251,191,36,.4);
  border-radius: 999px; padding: 2px 10px; white-space: nowrap;
}
.previs__btn {
  display: inline-flex; align-items: center; gap: 7px; flex: none;
  height: 30px; padding: 0 14px; cursor: pointer;
  background: transparent; color: #fff; font-size: 12.5px; font-weight: 500;
  border: 1px solid rgba(255,255,255,.32); border-radius: 999px;
  transition: background .14s, border-color .14s;
}
.previs__btn:hover { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.6); }
.previs__btn--fort { background: #fff; color: #000; border-color: #fff; }
.previs__btn--fort:hover { background: #e6e6e6; border-color: #e6e6e6; }
.previs__court { display: none; }

@media (max-width: 700px) {
  .previs { gap: 7px; padding: 0 10px; }
  .previs__pastille { display: none; }
  .previs__titre {
    font-size: 12.5px; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .previs__note { display: none; }
  .previs__btn { padding: 0 11px; font-size: 12px; gap: 5px; }
  .previs__long { display: none; }
  .previs__court { display: inline; }
}

.reglages__titre {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 4px; font-size: 13.5px; font-weight: 600;
}
.reglages__trait { border: 0; border-top: 1px solid var(--line-soft); margin: 22px 0 18px; }

/* ------------------------------------------- Questionnaire de rédaction */
.metiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.metier {
  padding: 9px 8px; cursor: pointer; font-size: 12px; line-height: 1.3;
  border: 1px solid var(--line-soft); border-radius: var(--radius-sm);
  background: var(--bg-soft); color: var(--muted); text-align: center;
}
.metier:hover { color: var(--text); border-color: var(--line); }
.metier[aria-pressed="true"] {
  border-color: var(--accent); background: var(--accent-dim); color: var(--text);
}
.assist__coche--court { padding: 8px 10px; }
.assist__pas { color: var(--faint); font-size: 12px; margin-right: 10px; }
.assist__brief {
  display: flex; align-items: center; gap: 11px; width: 100%; margin-top: 18px;
  padding: 13px 14px; cursor: pointer; text-align: left; color: var(--text);
  border: 1px dashed var(--sect); border-radius: var(--radius);
  background: var(--sect-dim);
}
.assist__brief:hover { background: rgba(169,122,232,.22); border-style: solid; }
.assist__brief > span { flex: 1; min-width: 0; display: grid; gap: 2px; }

@media (max-width: 700px) {
  .metiers { grid-template-columns: repeat(2, 1fr); }
}

/* ------------------------------------------------------------------ Guide
   Le parcours pas à pas : une étape par section, de haut en bas. C'est la
   première chose que voit quelqu'un qui n'a jamais fait de site, donc tout y
   est plus grand et plus espacé qu'ailleurs dans le panneau. */
.guide__tete {
  position: sticky; top: 0; z-index: 2;
  background: var(--bg); padding-bottom: 10px; margin-bottom: 4px;
}
.guide__prog {
  height: 6px; border-radius: 999px; background: var(--bg-raise); overflow: hidden;
}
.guide__jauge {
  display: block; height: 100%; width: 0%; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--ok));
  transition: width .25s ease;
}
.guide__compte { color: var(--muted); font-size: 12px; margin-top: 6px; }
.guide__liste { display: grid; gap: 8px; }

.pas {
  border: 1px solid var(--line-soft); border-radius: var(--radius);
  background: var(--bg-soft); overflow: hidden;
}
.pas--on { border-color: var(--accent); background: var(--bg-raise); }
.pas__tete {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 12px 12px; background: none; border: 0; cursor: pointer;
  text-align: left; color: var(--text);
}
.pas__tete:hover { background: var(--bg-raise); }
.pas__num {
  flex: none; display: grid; place-items: center;
  width: 24px; height: 24px; border-radius: 999px;
  background: var(--bg-raise); border: 1px solid var(--line);
  font-size: 11.5px; font-weight: 600; color: var(--muted);
}
.pas--on .pas__num { border-color: var(--accent); color: var(--accent-hi); }
.pas__num--ok { background: var(--ok); border-color: var(--ok); color: #04231a; }
.pas__nom { flex: 1; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.pas__reste {
  flex: none; font-size: 11px; color: var(--warn);
  background: rgba(251,191,36,.12); border-radius: 999px; padding: 2px 8px;
}
.pas__corps { padding: 2px 12px 14px; display: grid; gap: 12px; }
.pas--fin .pas__corps { gap: 8px; }

.champ { display: grid; gap: 4px; }
.input--multi { min-height: 68px; resize: vertical; line-height: 1.5; }
.champ__nom { font-weight: 600; }
.champ__nom--sous { margin-top: 8px; }
.champ__aide { color: var(--faint); font-size: 11.5px; line-height: 1.45; }
.champ__exemple {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  color: var(--warn); font-size: 11.5px; margin-top: 2px;
}
.lien {
  background: none; border: 0; padding: 0; cursor: pointer;
  color: var(--accent-hi); text-decoration: underline;
}

.guide__image { display: grid; gap: 8px; }
.guide__vign {
  height: 96px; border-radius: var(--radius-sm); border: 1px solid var(--line);
  background-size: cover; background-position: center; background-color: var(--bg-sunk);
  display: grid; place-items: center; color: var(--faint); font-size: 11.5px;
}
.guide__vign--vide { border-style: dashed; }
.guide__imageActions { display: flex; gap: 7px; }
.guide__imageActions > * { flex: 1; }
.guide__exemples {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 2px;
}
.guide__exemple {
  height: 44px; border-radius: var(--radius-xs); border: 1px solid var(--line);
  background-size: cover; background-position: center; cursor: pointer;
}
.guide__exemple:hover { border-color: var(--accent); }
.guide__dest { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.puce {
  border: 1px solid var(--line); background: var(--bg-soft); color: var(--muted);
  border-radius: 999px; padding: 3px 10px; font-size: 11.5px; cursor: pointer;
}
.puce:hover { color: var(--text); border-color: var(--accent); }
.guide__fait {
  display: flex; align-items: center; gap: 8px;
  color: var(--muted); cursor: pointer; user-select: none;
}

/* ------------------------------------------------------------------ Thèmes */
.themes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.theme {
  display: grid; gap: 6px; padding: 6px; cursor: pointer;
  border: 1px solid var(--line-soft); border-radius: var(--radius-sm);
  background: var(--bg-soft); color: var(--text); text-align: center;
}
.theme:hover { border-color: var(--line); }
.theme[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-dim); }
.theme__vue {
  position: relative; display: block; height: 74px; overflow: hidden;
  border-radius: var(--radius-xs); padding: 9px 9px 0;
}
.theme__titre { display: block; font-size: 17px; line-height: 1.1; }
.theme__ligne { display: block; height: 3px; border-radius: 2px; opacity: .45; margin-top: 6px; }
.theme__ligne--court { width: 62%; }
.theme__btn { display: block; width: 42px; height: 13px; margin-top: 8px; }
.theme__bande { position: absolute; left: 0; right: 0; bottom: 0; height: 12px; }
.theme__nom { font-size: 11.5px; color: var(--muted); }
.theme[aria-pressed="true"] .theme__nom { color: var(--text); }
.theme__portee { margin-top: 12px; }

@media (max-width: 700px) {
  .themes { grid-template-columns: repeat(2, 1fr); }
  .guide__exemples { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 700px) {
  /* Choisir un format d'écran n'a pas de sens sur un téléphone. */
  .devices { display: none; }
}
`;

/**
 * Règles posées dans le document du site. Réduites au strict minimum : la
 * page originale est masquée pendant l'édition, puisqu'elle est réaffichée
 * dans l'iframe. Tout est retiré à la fermeture.
 */
export const DOCUMENT_CSS = `
html[data-admin-shell] { overflow: hidden !important; }
html[data-admin-shell] body { overflow: hidden !important; margin: 0 !important; }
html[data-admin-shell] body > *:not([data-admin-ui]) { display: none !important; }
`;

/** Règles injectées DANS l'iframe d'aperçu, autour de l'élément en édition. */
export const FRAME_CSS = `
[data-admin-editing] {
  outline: 2px solid #22c55e !important; outline-offset: 2px;
  border-radius: 2px; cursor: text; min-height: 1em;
}
html[data-admin-editable] * { cursor: default; }
html[data-admin-editable] a, html[data-admin-editable] button { cursor: pointer; }
`;
