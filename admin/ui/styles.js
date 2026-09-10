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
     paraît sale. L'écart entre deux surfaces voisines est volontairement
     net — trois gris à 3 % l'un de l'autre donnent une interface plate. */
  --bg:        #101318;
  --bg-soft:   #171b22;
  --bg-raise:  #20252e;
  --bg-high:   #29303a;
  --bg-sunk:   #0a0c10;
  --line:      #2d3440;
  --line-soft: #1e2430;
  --text:      #eef2f8;
  --muted:     #9aa4b4;
  --faint:     #6b7482;

  /* Deux accents qui portent une information : ce qui touche au CONTENU est
     bleu, ce qui touche à la STRUCTURE est violet. */
  --accent:     #4d8bf5;
  --accent-dim: rgba(77, 139, 245, .15);
  --accent-hi:  #7aa9ff;
  --accent-glow: rgba(77, 139, 245, .38);
  --sect:       #a97ae8;
  --sect-dim:   rgba(169, 122, 232, .14);

  --ok:     #34d399;
  --warn:   #fbbf24;
  --danger: #f87171;

  --radius:    11px;
  --radius-sm: 8px;
  --radius-xs: 6px;
  --panel:  348px;
  --topbar: 48px;
  --grab:   54px;
  --shadow:    0 18px 44px rgba(0, 0, 0, .5);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, .3);
  --shadow-lift: 0 6px 18px rgba(0, 0, 0, .38);

  /* Une seule courbe, un seul jeu de durées. C'est ce qui donne à une
     interface l'impression d'être d'un seul tenant plutôt qu'assemblée. */
  --ease:      cubic-bezier(.32, .72, 0, 1);
  --ease-out:  cubic-bezier(.16, 1, .3, 1);
  --vite:      .12s;
  --moyen:     .22s;
  --lent:      .38s;

  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

/* Une échelle typographique, au lieu de tout écrire à 13 px : c'est ce qui
   fait qu'un titre se lit comme un titre sans avoir à le mettre en gras. */
.t-titre  { font-size: 15px; font-weight: 650; letter-spacing: -.15px; }
.t-corps  { font-size: 13px; }
.t-petit  { font-size: 12px; }
.t-fin    { font-size: 11.5px; color: var(--faint); line-height: 1.45; }

/* Personne n'a demandé qu'on l'étourdisse. */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
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
  border-right: 1px solid var(--line);
  /* Une lumière qui vient d'en haut : sans elle, le panneau est un aplat,
     et un aplat n'a pas de relief à donner à ce qu'il contient. */
  background:
    radial-gradient(120% 55% at 50% -10%, rgba(77,139,245,.09), transparent 70%),
    var(--bg);
}

/* Poignée du panneau en mode feuille (mobile) : masquée sur grand écran. */
.panel__grab { display: none; }

.panel__head {
  display: flex; align-items: center; gap: 9px; padding: 0 16px;
  height: var(--topbar); border-bottom: 1px solid var(--line-soft); flex: none;
}
.panel__dot {
  width: 7px; height: 7px; border-radius: 50%; flex: none;
  background: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim);
  animation: respire 3.6s var(--ease) infinite;
}
/* Un signe discret que le module est vivant, pas une capture d'écran. */
@keyframes respire {
  0%, 100% { box-shadow: 0 0 0 3px var(--accent-dim); }
  50%      { box-shadow: 0 0 0 5px rgba(77,139,245,.07); }
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
  position: relative; isolation: isolate; flex: 1; height: 32px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: none; border: 0; border-radius: var(--radius-xs);
  color: var(--muted); cursor: pointer; font-size: 12px; font-weight: 500;
  transition: color var(--vite) var(--ease);
}
/* Le fond de l'onglet actif est un calque à part : il peut alors grandir
   depuis rien plutôt que d'apparaître d'un coup. */
.tab::before {
  content: ''; position: absolute; inset: 0; border-radius: var(--radius-xs);
  background: var(--bg-raise); box-shadow: var(--shadow-sm);
  opacity: 0; transform: scale(.88); z-index: -1;
  transition: opacity var(--moyen) var(--ease), transform var(--moyen) var(--ease-out);
}
.tab svg { opacity: .85; }
.tab:hover { color: var(--text); }
.tab[aria-selected="true"] { color: var(--text); }
.tab[aria-selected="true"]::before { opacity: 1; transform: none; }
.tab[aria-selected="true"] svg { color: var(--accent); opacity: 1; }
.tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

.views { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.view { display: none; padding: 14px 16px 26px; }
.view--on { display: block; animation: vueEntre var(--moyen) var(--ease-out) both; }
@keyframes vueEntre {
  from { opacity: 0; transform: translateY(7px); }
  to   { opacity: 1; transform: none; }
}

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
  height: 33px; padding: 0 13px;
  background: var(--bg-raise); border: 1px solid var(--line); border-radius: var(--radius-sm);
  cursor: pointer; white-space: nowrap; font-size: 12.5px; font-weight: 500;
  transition: background var(--vite) var(--ease), border-color var(--vite) var(--ease),
              color var(--vite) var(--ease), transform var(--vite) var(--ease),
              box-shadow var(--vite) var(--ease);
}
.btn:hover {
  background: var(--bg-high); border-color: #3c4553;
  transform: translateY(-1px); box-shadow: var(--shadow-sm);
}
/* Le bouton s'enfonce sous le doigt : c'est le seul retour tactile qu'on
   puisse donner, et son absence est ce qui fait « mou ». */
.btn:active { transform: translateY(1px) scale(.985); box-shadow: none; }
.btn:disabled { opacity: .42; cursor: default; }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.btn--primary {
  background: linear-gradient(180deg, #5c96f7, var(--accent));
  border-color: transparent; color: #fff; font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.16);
}
.btn--primary:hover {
  background: linear-gradient(180deg, #6ba2f9, #5590f6); border-color: transparent;
  box-shadow: 0 6px 18px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.2);
}
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
.pagetpls { display: grid; gap: 10px; }
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

/* ------------------------------------------------- Miniature de modèle
   Une vraie petite page — photo, cartes, colonnes — plutôt qu'un schéma de
   barres grises. C'est ce qui permet de se projeter avant de cliquer. */
.mini {
  width: 108px; flex: none; display: flex; flex-direction: column;
  border: 1px solid var(--line-soft); border-radius: 6px; overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.mini__hero {
  position: relative; display: block; background-size: cover; background-position: center;
}
.mini__voile { position: absolute; inset: 0; background: rgba(0,0,0,.42); }
.mini__heroTexte {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px;
}
.mini__pastille { display: block; width: 20px; height: 6px; border-radius: 999px; margin-top: 2px; }
.mini__trait { display: block; border-radius: 2px; }
.mini__bloc { display: flex; flex-direction: column; gap: 3px; padding: 7px 8px; }
.mini__centre { align-items: center; }
.mini__duo { display: grid; gap: 6px; align-items: center; }
.mini__col { display: flex; flex-direction: column; gap: 3px; }
.mini__rang { display: flex; gap: 4px; margin-top: 2px; }
.mini__carte {
  position: relative; flex: 1; display: block; border-radius: 3px; overflow: hidden;
}
.mini__photo {
  display: block; width: 100%; border-radius: 3px;
  background-size: cover; background-position: center;
}
.mini__carteTexte {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 4px;
  background: linear-gradient(transparent, rgba(0,0,0,.7));
  display: flex; flex-direction: column;
}
.mini__bande { display: flex; flex-direction: column; gap: 3px; padding: 9px 8px; }

/* ------------------------------------------------- Tout recommencer */
.outil--danger .outil__icone { background: rgba(248,113,113,.12); color: #fca5a5; }
.outil--danger:hover { background: rgba(248,113,113,.08); border-color: rgba(248,113,113,.28); }
.outil--danger .outil__nom { color: #fca5a5; }

.raz__choix { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin: 16px 0 18px; }
.raz__carte { text-align: left; }
.raz__bilan { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.raz__colonne {
  border: 1px solid var(--line-soft); border-radius: var(--radius-sm);
  padding: 11px 12px; background: var(--bg-soft);
}
.raz__colonne--part { border-color: rgba(248,113,113,.24); background: rgba(248,113,113,.05); }
.raz__colonne--reste { border-color: rgba(52,211,153,.22); background: rgba(52,211,153,.05); }
.raz__entete {
  display: flex; align-items: center; gap: 7px; margin-bottom: 7px;
  font-size: 11px; font-weight: 650; letter-spacing: .05em; text-transform: uppercase;
}
.raz__colonne--part .raz__entete { color: #fca5a5; }
.raz__colonne--reste .raz__entete { color: var(--ok); }
.raz__colonne ul { margin: 0; padding-left: 16px; }
.raz__colonne li { font-size: 12px; color: var(--muted); line-height: 1.45; margin-bottom: 4px; }
.raz__filet {
  display: flex; gap: 9px; margin: 14px 0 0; padding: 11px 12px;
  border: 1px solid var(--line-soft); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--muted); font-size: 12px; line-height: 1.5;
}
.raz__filet svg { flex: none; margin-top: 2px; color: var(--accent-hi); }
.raz__coche { margin-top: 14px; border-color: rgba(248,113,113,.3); }
.btn--fort { font-weight: 650; }
.btn--danger.btn--fort { background: rgba(248,113,113,.14); }
.btn--danger.btn--fort:hover { background: rgba(248,113,113,.22); }

@media (max-width: 700px) {
  .raz__choix, .raz__bilan { grid-template-columns: 1fr; }
}

/* ------------------------------------------------------------- Outils
   Une ligne par outil, avec ce qu'il fait écrit à côté. Six boutons de même
   taille dans un pied de panneau ne se lisent pas ; six lignes nommées, si. */
.btn--outils {
  justify-content: space-between; height: 38px;
  background: var(--bg-soft); border-color: var(--line-soft); color: var(--muted);
  font-weight: 600;
}
.btn--outils:hover { color: var(--text); background: var(--bg-raise); }

.outils { display: grid; gap: 3px; }
.outils__groupe {
  font-size: 11px; font-weight: 650; letter-spacing: .07em; text-transform: uppercase;
  color: var(--faint); margin: 15px 2px 6px;
}
.outils__groupe:first-child { margin-top: 2px; }
.outil {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 12px; cursor: pointer; text-align: left; color: var(--text);
  background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm);
  transition: background var(--vite) var(--ease), border-color var(--vite) var(--ease),
              transform var(--vite) var(--ease);
}
.outil:hover { background: var(--bg-soft); border-color: var(--line-soft); transform: translateX(2px); }
.outil:active { transform: translateX(2px) scale(.99); }
.outil__icone {
  flex: none; display: grid; place-items: center; width: 32px; height: 32px;
  border-radius: var(--radius-xs); background: var(--bg-raise); color: var(--muted);
  transition: all var(--vite) var(--ease);
}
.outil:hover .outil__icone { background: var(--bg-high); color: var(--text); }
.outil--fort .outil__icone {
  background: var(--sect-dim); color: #cbb0f4; box-shadow: 0 0 0 1px rgba(169,122,232,.24);
}
.outil__texte { flex: 1; min-width: 0; display: grid; gap: 1px; }
.outil__nom { font-weight: 600; font-size: 13px; }
.outil__aide { color: var(--faint); font-size: 11.5px; line-height: 1.4; }
.outil > svg:last-child { color: var(--faint); flex: none; }

/* ----------------------------------------- Repères d'alignement
   Les lignes qui apparaissent pendant qu'on déplace un bloc. Fines, vives,
   et sans ombre : un repère doit se voir sans peser sur ce qu'on regarde. */
.guide {
  position: absolute; z-index: 5; pointer-events: none;
  background: var(--sect);
}
.guide--v { width: 1px; }
.guide--h { height: 1px; }
/* Le centre se distingue d'un simple bord aligné : c'est l'accroche qu'on
   cherche le plus souvent, elle mérite d'être reconnaissable. */
.guide--centre { background: #ff5db1; box-shadow: 0 0 6px rgba(255,93,177,.6); }

.cote {
  position: absolute; z-index: 5; pointer-events: none;
  width: 1px; background: repeating-linear-gradient(
    to bottom, var(--accent-hi) 0 3px, transparent 3px 6px);
}
.cote--h {
  height: 1px; width: auto;
  background: repeating-linear-gradient(
    to right, var(--accent-hi) 0 3px, transparent 3px 6px);
}
.cote__n {
  position: absolute; z-index: 6; pointer-events: none;
  padding: 1px 6px; border-radius: 4px;
  background: var(--accent); color: #fff;
  font-size: 10.5px; font-weight: 650; font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* --------------------------------------------- Poignée de déplacement
   On attrape le bloc et on le pose où on veut dans sa section. Le curseur
   dit ce qui va se passer avant même qu'on clique — c'est ce qui fait la
   différence entre « on peut » et « on ose ». */
.wtools__grab { cursor: grab; touch-action: none; }
.wtools__grab:hover { background: var(--sect-dim); border-color: rgba(169,122,232,.5); color: #cbb0f4; }
.wtools__grab--on { cursor: grabbing; background: var(--sect); color: #fff; border-color: var(--sect); }
.dragnum {
  position: absolute; z-index: 6; pointer-events: none;
  padding: 3px 9px; border-radius: 999px;
  background: var(--sect); color: #fff;
  font-size: 11px; font-weight: 650; font-variant-numeric: tabular-nums;
  box-shadow: var(--shadow-sm); white-space: nowrap;
}

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
   Le parcours pas à pas. Ce n'est pas une liste de blocs : c'est un chemin,
   du haut de la page vers le bas. Un rail relie les étapes, les faites sont
   éteintes, celle qu'on remplit est allumée. Sans cela, sept rectangles
   identiques ne disent rien de l'ordre dans lequel les prendre. */
.guide__tete {
  position: sticky; top: 0; z-index: 3;
  background: linear-gradient(var(--bg) 72%, transparent);
  padding: 2px 0 14px; margin-bottom: 2px;
}
.guide__prog {
  height: 5px; border-radius: 999px; background: var(--bg-sunk);
  box-shadow: inset 0 1px 2px rgba(0,0,0,.5); overflow: hidden;
}
.guide__jauge {
  display: block; height: 100%; width: 0%; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--ok));
  box-shadow: 0 0 12px var(--accent-glow);
  transition: width var(--lent) var(--ease-out);
}
.guide__compte { color: var(--muted); font-size: 12px; margin-top: 7px; }

/* Le rail : un trait continu derrière les pastilles. */
.guide__liste { position: relative; display: grid; gap: 6px; }
.guide__liste::before {
  content: ''; position: absolute; left: 24px; top: 22px; bottom: 22px; width: 2px;
  background: linear-gradient(var(--line-soft), var(--line-soft));
  border-radius: 2px;
}

.pas {
  position: relative; z-index: 1;
  border: 1px solid transparent; border-radius: var(--radius);
  background: transparent;
  transition: background var(--moyen) var(--ease), border-color var(--moyen) var(--ease),
              box-shadow var(--moyen) var(--ease);
}
.pas:hover:not(.pas--on) { background: var(--bg-soft); }
.pas--on {
  border-color: var(--line); background: var(--bg-soft);
  box-shadow: var(--shadow-lift);
}
.pas__tete {
  display: flex; align-items: center; gap: 11px; width: 100%;
  padding: 11px 12px; background: none; border: 0; cursor: pointer;
  text-align: left; color: var(--text);
}
.pas__num {
  flex: none; display: grid; place-items: center;
  width: 26px; height: 26px; border-radius: 999px;
  background: var(--bg); border: 2px solid var(--line);
  font-size: 11.5px; font-weight: 650; color: var(--faint);
  transition: all var(--moyen) var(--ease);
}
/* L'étape ouverte est la seule allumée : l'œil sait où il en est. */
.pas--on .pas__num {
  border-color: var(--accent); color: var(--accent-hi);
  box-shadow: 0 0 0 4px var(--accent-dim), 0 0 14px var(--accent-glow);
}
.pas__num--ok {
  background: var(--ok); border-color: var(--ok); color: #05261c;
  box-shadow: 0 0 0 4px rgba(52,211,153,.13);
}
.pas--on .pas__num--ok { border-color: var(--ok); color: #05261c; }
.pas__nom {
  flex: 1; min-width: 0; font-weight: 600; font-size: 13px; overflow-wrap: anywhere;
  transition: color var(--vite) var(--ease);
}
/* Ce qui est fait s'efface : il reste ce qu'il y a à faire. */
.pas__num--ok ~ .pas__nom { color: var(--muted); font-weight: 500; }
.pas__reste {
  flex: none; font-size: 11px; color: var(--warn);
  background: rgba(251,191,36,.12); border: 1px solid rgba(251,191,36,.22);
  border-radius: 999px; padding: 2px 9px; white-space: nowrap;
}
.pas__tete svg:last-child { color: var(--faint); transition: transform var(--moyen) var(--ease); }
.pas--on .pas__tete svg:last-child { color: var(--muted); }

.pas__corps {
  padding: 2px 13px 15px 49px; display: grid; gap: 14px;
  animation: pasOuvre var(--moyen) var(--ease-out) both;
}
@keyframes pasOuvre {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: none; }
}
.pas--fin .pas__corps { gap: 7px; }

/* Le nom d'une colonne de la page, au-dessus de ses champs. */
.champ__groupe {
  display: flex; align-items: center; gap: 9px;
  margin: 6px 0 -4px; font-size: 11px; font-weight: 650;
  letter-spacing: .06em; text-transform: uppercase; color: var(--faint);
}
.champ__groupe::after {
  content: ''; flex: 1; height: 1px; background: var(--line-soft);
}
.champ { display: grid; gap: 5px; }
.champ__nom { display: block; font-weight: 600; font-size: 12.5px; }
.champ__aide { display: block; }
.champ__nom--sous { margin-top: 10px; }
.champ__aide { color: var(--faint); font-size: 11.5px; line-height: 1.45; }
.input--multi { min-height: 70px; resize: vertical; line-height: 1.55; }
.champ__exemple {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  color: var(--warn); font-size: 11.5px; margin-top: 1px;
  animation: vueEntre var(--moyen) var(--ease-out) both;
}
.lien {
  background: none; border: 0; padding: 0; cursor: pointer;
  color: var(--accent-hi); text-decoration: underline; text-underline-offset: 2px;
}
.lien:hover { color: #9dc0ff; }

.guide__image { display: grid; gap: 9px; }
.guide__vign {
  height: 104px; border-radius: var(--radius-sm); border: 1px solid var(--line);
  background-size: cover; background-position: center; background-color: var(--bg-sunk);
  display: grid; place-items: center; color: var(--faint); font-size: 11.5px;
  transition: border-color var(--vite) var(--ease);
}
.guide__vign--vide { border-style: dashed; }
.guide__imageActions { display: flex; gap: 7px; }
.guide__imageActions > * { flex: 1; }
.guide__exemples {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 1px;
  animation: vueEntre var(--moyen) var(--ease-out) both;
}
.guide__exemple {
  height: 46px; border-radius: var(--radius-xs); border: 1px solid var(--line);
  background-size: cover; background-position: center; cursor: pointer;
  transition: transform var(--vite) var(--ease), border-color var(--vite) var(--ease),
              box-shadow var(--vite) var(--ease);
}
.guide__exemple:hover {
  border-color: var(--accent); transform: translateY(-2px) scale(1.03);
  box-shadow: var(--shadow-sm);
}
.guide__dest { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.puce {
  border: 1px solid var(--line); background: var(--bg-soft); color: var(--muted);
  border-radius: 999px; padding: 4px 11px; font-size: 11.5px; cursor: pointer;
  transition: all var(--vite) var(--ease);
}
.puce:hover { color: var(--text); border-color: var(--accent); background: var(--accent-dim); }
.guide__fait {
  display: flex; align-items: center; gap: 9px; padding: 9px 11px;
  border: 1px solid var(--line-soft); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--muted); cursor: pointer; user-select: none;
  transition: all var(--vite) var(--ease);
}
.guide__fait:hover { border-color: var(--line); color: var(--text); }

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
