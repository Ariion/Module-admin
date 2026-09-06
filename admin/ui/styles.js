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
  /* Neutres légèrement bleutés : un gris pur à côté d'un accent bleu paraît
     sale. Ceux-ci sont choisis, pas hérités. */
  --bg:        #15181e;
  --bg-soft:   #1c2028;
  --bg-raise:  #222731;
  --bg-sunk:   #0f1116;
  --line:      #2c323d;
  --line-soft: #232830;
  --text:      #eaeef5;
  --muted:     #8b95a5;
  --faint:     #5f6877;

  /* Deux accents qui portent une information : ce qui touche au CONTENU est
     bleu, ce qui touche à la STRUCTURE est violet. */
  --accent:     #4d8bf5;
  --accent-dim: rgba(77, 139, 245, .16);
  --accent-hi:  #6ba0ff;
  --sect:       #b06ef0;
  --sect-dim:   rgba(176, 110, 240, .14);

  --ok:     #34d399;
  --warn:   #fbbf24;
  --danger: #f87171;

  --radius: 8px;
  --radius-sm: 6px;
  --panel: 348px;
  --topbar: 46px;
  --shadow: 0 10px 30px rgba(0, 0, 0, .38);

  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
/* Une règle de composant ne doit jamais rendre visible un élément masqué. */
[hidden] { display: none !important; }
button, input, textarea, select { font: inherit; color: inherit; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-thumb { background: #333942; border-radius: 5px; }
::-webkit-scrollbar-track { background: transparent; }

/* ================= Structure générale ================= */
.shell {
  position: absolute; inset: 0; display: grid;
  grid-template-columns: var(--panel) 1fr;
  background: var(--bg-sunk);
}

/* ================= Panneau de gauche ================= */
.panel {
  display: flex; flex-direction: column; min-height: 0;
  background: var(--bg); border-right: 1px solid var(--line);
}
.panel__head {
  display: flex; align-items: center; gap: 10px; padding: 0 16px;
  height: var(--topbar); border-bottom: 1px solid var(--line); flex: none;
  background: linear-gradient(180deg, var(--bg-soft), var(--bg));
}
.panel__dot {
  width: 9px; height: 9px; border-radius: 50%; flex: none;
  background: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim);
}
.panel__name { font-weight: 650; letter-spacing: .2px; }
.panel__site {
  color: var(--muted); font-size: 11.5px; padding: 2px 7px; border-radius: 4px;
  background: var(--bg-raise); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.tabs { display: flex; flex: none; border-bottom: 1px solid var(--line); }
.tab {
  flex: 1; height: 42px; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: none; border: 0; border-bottom: 2px solid transparent;
  color: var(--muted); cursor: pointer; font-size: 12px; font-weight: 500;
  transition: color .14s, border-color .14s, background .14s;
}
.tab:hover { color: var(--text); background: var(--bg-soft); }
.tab[aria-selected="true"] { color: var(--accent-hi); border-bottom-color: var(--accent); }
.tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

.views { flex: 1; min-height: 0; overflow: auto; }
.view { display: none; padding: 15px 16px 22px; }
.view--on { display: block; }

.panel__foot {
  flex: none; border-top: 1px solid var(--line); padding: 10px 16px 12px;
  background: linear-gradient(0deg, var(--bg-soft), var(--bg));
}
.panel__state {
  display: flex; align-items: center; gap: 8px; margin-bottom: 11px;
  font-size: 11.5px; color: var(--muted); min-width: 0;
}
.panel__state > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel__actions { display: flex; gap: 7px; }
.panel__actions .btn--primary { flex: 1; justify-content: center; }

/* ================= Scène ================= */
.stage { display: flex; flex-direction: column; min-width: 0; }
.stage__bar {
  height: var(--topbar); flex: none; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; background: var(--bg); border-bottom: 1px solid var(--line);
}
.stage__page {
  display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
  height: 30px; padding: 0 11px; cursor: pointer;
  background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius-sm);
  color: var(--muted); font-size: 12px; text-align: left;
  transition: background .14s, border-color .14s, color .14s;
}
.stage__page:hover { background: var(--bg-raise); border-color: var(--accent); color: var(--text); }
.stage__page > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage__page svg { flex: none; color: var(--accent); }
.stage__frame {
  flex: 1; min-height: 0; display: flex; justify-content: center;
  background: var(--bg-sunk); padding: 0;
}
.stage__frame--constrained { padding: 18px; }
.viewport {
  width: 100%; height: 100%; border: 0; background: #fff;
  transition: width .2s ease;
}
.stage__frame--constrained .viewport {
  box-shadow: 0 10px 40px rgba(0,0,0,.45); border-radius: 4px;
}
.devices { display: flex; gap: 2px; padding: 2px; background: var(--bg-soft); border-radius: var(--radius); }
.device {
  height: 26px; padding: 0 10px; background: none; border: 0; border-radius: 5px;
  color: var(--muted); cursor: pointer; font-size: 12px;
}
.device:hover { color: var(--text); }
.device[aria-pressed="true"] { background: var(--line); color: var(--text); }

/* ================= Boutons et champs ================= */
.btn {
  display: inline-flex; align-items: center; gap: 6px; height: 31px; padding: 0 12px;
  background: var(--bg-raise); border: 1px solid var(--line); border-radius: var(--radius-sm);
  cursor: pointer; white-space: nowrap; font-size: 12.5px;
  transition: background .14s, border-color .14s, transform .1s;
}
.btn:hover { background: #2b313c; border-color: #39414e; }
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: .42; cursor: default; }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.btn--primary {
  background: linear-gradient(180deg, var(--accent-hi), var(--accent));
  border-color: #3b78dd; color: #fff; font-weight: 600;
  box-shadow: 0 1px 0 rgba(255,255,255,.14) inset, 0 2px 8px rgba(77,139,245,.28);
}
.btn--primary:hover { background: linear-gradient(180deg, #7cadff, #5793f7); }
.btn--sect { background: var(--sect-dim); border-color: rgba(176,110,240,.4); color: #e5cfff; }
.btn--sect:hover { background: rgba(176,110,240,.24); }
.btn--ghost { background: transparent; border-color: transparent; }
.btn--ghost:hover { background: var(--bg-soft); }
.btn--danger { color: #fecaca; border-color: rgba(239,68,68,.38); }
.btn--danger:hover { background: rgba(239,68,68,.14); }
.btn--sm { height: 26px; padding: 0 9px; font-size: 12px; }
.btn--icon { width: 30px; padding: 0; justify-content: center; }
.btn--sm.btn--icon { width: 26px; }
.btn--wide { width: 100%; justify-content: center; }

.pill {
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px;
  background: var(--bg-soft); border: 1px solid var(--line); font-size: 11px;
}
.pill--warn { color: var(--warn); border-color: rgba(245,158,11,.32); }
.pill--ok { color: var(--ok); border-color: rgba(34,197,94,.32); }

.field { margin-bottom: 13px; }
.field__label { display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px; }
.input, .textarea {
  width: 100%; padding: 7px 9px; background: var(--bg-sunk); color: var(--text);
  border: 1px solid var(--line); border-radius: 6px; outline: none;
}
.input:focus, .textarea:focus { border-color: var(--accent); }
.textarea { min-height: 68px; resize: vertical; }
.textarea.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px; line-height: 1.5; min-height: 110px;
}
.check { display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 12px; }
.hint { color: var(--muted); font-size: 12px; margin: 6px 0 0; }
.row { display: flex; gap: 7px; }
.row > * { flex: 1; }

/* Sections repliables de l'inspecteur, présentées en cartes */
.group {
  background: var(--bg-soft); border: 1px solid var(--line-soft);
  border-radius: var(--radius); margin-bottom: 10px; overflow: hidden;
}
.group__head {
  width: 100%; display: flex; align-items: center; gap: 9px; padding: 11px 13px;
  background: none; border: 0; color: var(--text); cursor: pointer; text-align: left;
  font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
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
.seg { display: flex; gap: 2px; padding: 2px; background: var(--bg-sunk); border: 1px solid var(--line); border-radius: var(--radius-sm); }
.seg__btn {
  flex: 1; height: 26px; border: 0; border-radius: 4px; cursor: pointer;
  background: none; color: var(--muted); font-size: 11.5px;
}
.seg__btn:hover { color: var(--text); }
.seg__btn[aria-pressed="true"] { background: var(--accent); color: #fff; }
select.input { appearance: none; cursor: pointer; }

/* Sélecteur de couleur */
.color { display: flex; align-items: center; gap: 8px; }
.color__swatch {
  width: 30px; height: 30px; padding: 0; flex: none; cursor: pointer;
  border: 1px solid var(--line); border-radius: 6px; background: none;
}
.color__swatch::-webkit-color-swatch-wrapper { padding: 3px; }
.color__swatch::-webkit-color-swatch { border: 0; border-radius: 4px; }
.color .input { flex: 1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }

/* Aperçu d'image */
.preview {
  display: flex; align-items: center; justify-content: center; min-height: 120px; margin-bottom: 11px;
  background: repeating-conic-gradient(#1e232a 0 25%, #171b21 0 50%) 0 0/16px 16px;
  border: 1px dashed var(--line); border-radius: var(--radius); overflow: hidden;
}
.preview img { max-width: 100%; max-height: 200px; display: block; }
.preview--drop { border-color: var(--accent); background: var(--accent-dim); }
.progress { height: 3px; background: var(--line); border-radius: 2px; overflow: hidden; margin-top: 8px; }
.progress > i { display: block; height: 100%; background: var(--accent); width: 0; transition: width .2s; }

/* ================= Structure de la page ================= */
.tree { list-style: none; margin: 0; padding: 0; }
.tree ul { list-style: none; margin: 0; padding: 0 0 0 13px; border-left: 1px solid var(--line-soft); }
.node {
  display: flex; align-items: center; gap: 7px; width: 100%; padding: 6px 8px;
  background: none; border: 0; border-radius: 5px; color: var(--text);
  cursor: pointer; text-align: left; font-size: 12px;
}
.node:hover { background: var(--bg-soft); }
.node[aria-current="true"] { background: var(--accent-dim); color: #cfe0ff; }
.node svg { color: var(--muted); flex: none; }
.node[aria-current="true"] svg { color: var(--accent); }
.node__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node__count { color: var(--muted); font-size: 11px; }

/* ================= Bibliothèque ================= */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 9px; }
.tile {
  position: relative;
  border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden;
  background: var(--bg-sunk); padding: 0;
}
.tile:hover { border-color: var(--accent); }
.tile__pick {
  display: block; width: 100%; padding: 0; border: 0; background: none;
  cursor: pointer; text-align: left; color: inherit;
}
.tile img { width: 100%; height: 68px; object-fit: cover; display: block; }
.tile__icon {
  height: 68px; display: flex; align-items: center; justify-content: center;
  color: var(--muted); background: var(--bg-soft);
}
.tile__name {
  padding: 5px 6px; font-size: 11px; color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tile__acts {
  position: absolute; top: 4px; right: 4px; display: none; gap: 3px;
}
.tile:hover .tile__acts, .tile:focus-within .tile__acts { display: flex; }
.tile__acts .btn { background: rgba(16,19,24,.86); backdrop-filter: blur(2px); }

/* Bibliothèque : barre de dépôt, filtres, ajout par adresse */
.ml-filters { flex-wrap: wrap; margin-bottom: 9px; }
.ml-filters .seg__btn { flex: 1 0 auto; padding: 0 9px; }
.ml-drop {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
  min-height: 62px; margin-bottom: 9px; padding: 10px 12px;
  border: 1px dashed var(--line); border-radius: var(--radius);
  background: var(--bg-sunk); color: var(--muted); font-size: 12px;
  cursor: pointer; text-align: center;
}
.ml-drop:hover { border-color: var(--accent); color: var(--text); }
.ml-drop--over { border: 2px dashed var(--accent); background: var(--accent-dim); color: var(--accent-hi); }
.ml-add { flex: none; }
.ml-pick {
  display: flex; align-items: center; gap: 9px; margin-bottom: 9px;
  padding: 8px 10px; border-radius: var(--radius);
  background: var(--accent-dim); border: 1px solid rgba(77,139,245,.4);
  color: #cfe0ff; font-size: 12px;
}
.ml-pick span { flex: 1; }

/* ================= Listes ================= */
.list { list-style: none; margin: 0; padding: 0; }
.list li {
  display: flex; align-items: center; gap: 9px; padding: 9px 0;
  border-bottom: 1px solid var(--line-soft);
}
.list li:last-child { border-bottom: 0; }
.list__main { flex: 1; min-width: 0; }
.list__meta { color: var(--muted); font-size: 11px; }
.empty { color: var(--muted); text-align: center; padding: 26px 14px; font-size: 12px; }

/* ================= Surcouche sur l'iframe ================= */
.layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.hl {
  position: absolute; border: 1px solid var(--accent); border-radius: 2px;
  background: var(--accent-dim); pointer-events: none;
}
.hl--active { border-color: var(--ok); background: rgba(34,197,94,.10); }
.hl__tag {
  position: absolute; top: -19px; left: -1px; height: 18px; padding: 0 6px;
  display: inline-flex; align-items: center; gap: 4px; border-radius: 3px 3px 0 0;
  background: var(--accent); color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap;
}
.itembar {
  position: absolute; display: flex; gap: 2px; padding: 3px; pointer-events: auto;
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: 0 4px 14px rgba(0,0,0,.4);
}
.rtb {
  position: absolute; display: flex; gap: 2px; padding: 3px; pointer-events: auto;
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}

/* ================= Bibliothèque de widgets ================= */
.search {
  display: flex; align-items: center; gap: 8px; padding: 0 10px; margin-bottom: 14px;
  background: var(--bg-sunk); border: 1px solid var(--line); border-radius: var(--radius-sm);
  color: var(--faint);
}
.search__input {
  border: 0; background: none; padding: 9px 0; flex: 1;
}
.search__input:focus { border: 0; outline: none; }
.search:focus-within { border-color: var(--accent); }

.wcat { margin-bottom: 6px; }
.wcat__head {
  width: 100%; display: flex; align-items: center; padding: 9px 2px;
  background: none; border: 0; color: var(--muted); cursor: pointer; text-align: left;
  font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
}
.wcat__head:hover { color: var(--text); }
.wcat__head span { flex: 1; }
.wcat__head svg { transition: transform .16s; }
.wcat[data-open="false"] .wcat__head svg { transform: rotate(-90deg); }
.wcat[data-open="false"] .wgrid { display: none; }

.wgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-bottom: 8px; }
.wtile {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 9px; padding: 18px 8px; min-height: 92px; cursor: grab;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  color: var(--muted); text-align: center;
  transition: background .14s, border-color .14s, color .14s, transform .1s;
}
.wtile:hover { background: var(--bg-raise); border-color: var(--accent); color: var(--text); }
.wtile:active { cursor: grabbing; transform: scale(.97); }
.wtile:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.wtile__icon { color: var(--accent); display: flex; }
.wtile:hover .wtile__icon { color: var(--accent-hi); }
.wtile__label { font-size: 11.5px; line-height: 1.25; }

/* ---- Modèles de section ---- */
.tpls { display: grid; gap: 8px; padding-bottom: 8px; }
.tpl {
  display: flex; align-items: center; gap: 11px; padding: 9px 11px; width: 100%;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  cursor: pointer; text-align: left; color: var(--text);
  transition: border-color .14s, background .14s;
}
.tpl:hover { border-color: var(--sect); background: var(--bg-raise); }
.tpl__preview {
  width: 46px; height: 34px; flex: none; padding: 4px; display: flex; flex-direction: column; gap: 3px;
  background: var(--bg-sunk); border: 1px solid var(--line); border-radius: 4px;
}
.tpl__bar { height: 5px; border-radius: 2px; background: var(--sect); opacity: .75; }
.tpl__cols { flex: 1; display: flex; gap: 3px; }
.tpl__col { flex: 1; border-radius: 2px; background: var(--line); }
.tpl:hover .tpl__col { background: #3b4351; }
.tpl__label { font-size: 12px; line-height: 1.3; }

/* ---- Modèles de page entière ---- */
.pagetpls { display: grid; gap: 10px; }
.pagetpl {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
}
.pagetpl:hover { border-color: var(--sect); }
.pagetpl__preview {
  width: 58px; flex: none; display: flex; flex-direction: column; gap: 3px; padding: 5px;
  background: var(--bg-sunk); border: 1px solid var(--line); border-radius: 4px;
}
.pagetpl__band { height: 7px; border-radius: 2px; background: var(--sect); opacity: .8; }
.pagetpl__row { display: flex; gap: 3px; }
.pagetpl__cell { flex: 1; height: 11px; border-radius: 2px; background: var(--line); }
.pagetpl__main { flex: 1; min-width: 0; }
.pagetpl__title { font-weight: 600; }
.pagetpl__meta { color: var(--faint); font-size: 11.5px; }
.pagetpl__actions { display: flex; gap: 6px; flex: none; }
@media (max-width: 620px) {
  .pagetpl { flex-wrap: wrap; }
  .pagetpl__actions { width: 100%; }
  .pagetpl__actions .btn { flex: 1; justify-content: center; }
}

/* ---- Zones de dépôt dans l'aperçu ---- */
.drop {
  position: absolute; pointer-events: none;
  border: 2px dashed var(--accent); border-radius: var(--radius);
  background: var(--accent-dim);
  display: flex; align-items: center; justify-content: center; gap: 9px;
  color: var(--accent-hi); font-size: 12.5px; font-weight: 550;
}
.drop--empty { pointer-events: auto; cursor: pointer; }
.drop--over { background: rgba(77,139,245,.28); border-style: solid; }
.dropline {
  position: absolute; height: 3px; border-radius: 2px; pointer-events: none;
  background: var(--accent); box-shadow: 0 0 10px rgba(77,139,245,.8);
}

/* ---- Widget sélectionné dans l'aperçu ---- */
.wsel { position: absolute; pointer-events: none; border: 1px solid var(--accent); border-radius: 2px; }
.wtools {
  position: absolute; display: flex; align-items: center; gap: 2px; padding: 3px;
  pointer-events: auto; background: var(--accent); border-radius: 6px 6px 0 0;
  box-shadow: var(--shadow);
}
.wtools__name {
  padding: 0 8px 0 5px; font-size: 11px; font-weight: 650; color: #fff;
  max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wtools .btn {
  height: 22px; width: 22px; padding: 0; justify-content: center; border-radius: 4px;
  background: rgba(255,255,255,.16); border-color: transparent; color: #fff;
}
.wtools .btn:hover { background: rgba(255,255,255,.32); border-color: transparent; }

/* ---- Structure : sections ----
   Le violet distingue la structure du contenu, qui reste bleu. Deux natures
   d'objet, deux couleurs : le client sait ce qu'il manipule. */
.sect {
  position: absolute; pointer-events: none; border: 1px dashed var(--sect);
  background: var(--sect-dim); border-radius: 3px;
}
.secttools {
  position: absolute; display: flex; align-items: center; gap: 3px; padding: 4px;
  pointer-events: auto; background: var(--bg); border: 1px solid rgba(176,110,240,.45);
  border-radius: 999px; box-shadow: var(--shadow); transform: translateX(-50%);
}
.secttools__name {
  padding: 0 9px 0 7px; font-size: 11.5px; font-weight: 600; color: #e5cfff;
  max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.secttools .btn {
  height: 25px; width: 25px; padding: 0; justify-content: center;
  border-radius: 50%; background: transparent; border-color: transparent; color: var(--muted);
}
.secttools .btn:hover { background: var(--sect-dim); color: #e5cfff; border-color: transparent; }
.secttools .btn--danger:hover { background: rgba(248,113,113,.16); color: #fecaca; }

/* Point d'insertion entre deux sections */
.addhere {
  position: absolute; display: flex; align-items: center; justify-content: center;
  pointer-events: auto; height: 30px; transform: translateY(-50%);
}
.addhere::before {
  content: ""; position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--sect), transparent);
  opacity: .55;
}
.addhere button {
  position: relative; height: 28px; padding: 0 14px; border-radius: 999px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--sect); border: 0; color: #1b0d29; font-weight: 650; font-size: 11.5px;
  box-shadow: 0 3px 12px rgba(176,110,240,.45);
}
.addhere button:hover { background: #c188f5; }

/* Vignettes de la bibliothèque de sections */
.sections { display: grid; gap: 9px; }
.sectcard {
  display: flex; align-items: center; gap: 11px; padding: 11px 12px; width: 100%;
  background: var(--bg-soft); border: 1px solid var(--line-soft); border-radius: var(--radius);
  cursor: pointer; text-align: left; color: var(--text); transition: border-color .14s, background .14s;
}
.sectcard:hover { border-color: var(--sect); background: var(--bg-raise); }
.sectcard__icon {
  width: 34px; height: 34px; flex: none; display: flex; align-items: center; justify-content: center;
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
  background: rgba(6,8,12,.66); padding: 20px;
}
.modal {
  width: 100%; max-width: 560px; max-height: 82vh; display: flex; flex-direction: column;
  background: var(--bg); border: 1px solid var(--line); border-radius: 11px;
  box-shadow: 0 20px 60px rgba(0,0,0,.55);
}
.modal--sm { max-width: 350px; }
.modal__head { padding: 15px 17px; border-bottom: 1px solid var(--line); font-weight: 600; display: flex; gap: 8px; align-items: center; }
.modal__body { padding: 17px; overflow: auto; }
.modal__foot { padding: 13px 17px; border-top: 1px solid var(--line); display: flex; gap: 8px; justify-content: flex-end; }
.error { color: #fca5a5; font-size: 12px; margin-top: 9px; min-height: 15px; }
.ok { color: #86efac; font-size: 12px; margin-top: 9px; }

/* ================= Notification ================= */
.toast {
  position: fixed; left: calc(var(--panel) + 50%); bottom: 22px; transform: translate(-50%, 12px);
  padding: 9px 16px; border-radius: 999px; z-index: 40; opacity: 0; max-width: 60vw;
  background: var(--bg); border: 1px solid var(--line); box-shadow: 0 8px 26px rgba(0,0,0,.45);
  transition: opacity .18s, transform .18s; pointer-events: none;
}
.toast--show { opacity: 1; transform: translate(-50%, 0); }
.toast--error { border-color: rgba(239,68,68,.5); color: #fecaca; }

@media (prefers-reduced-motion: reduce) {
  .viewport, .toast, .btn, .tab { transition: none; }
}
@media (max-width: 900px) {
  .shell { grid-template-columns: 280px 1fr; }
  :host { --panel: 280px; }
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
