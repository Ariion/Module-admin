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
  --bg:        #14161a;
  --bg-soft:   #1b1e24;
  --bg-sunk:   #0e1013;
  --line:      #2b3038;
  --line-soft: #22262d;
  --text:      #eef1f6;
  --muted:     #8f99a8;
  --accent:    #3b82f6;
  --accent-dim:rgba(59,130,246,.16);
  --ok:        #22c55e;
  --warn:      #f59e0b;
  --danger:    #ef4444;
  --radius: 7px;
  --panel: 340px;
  --topbar: 44px;
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}
* { box-sizing: border-box; }
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
  display: flex; align-items: center; gap: 9px; padding: 0 14px;
  height: var(--topbar); border-bottom: 1px solid var(--line); flex: none;
}
.panel__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex: none; }
.panel__name { font-weight: 600; letter-spacing: .2px; }
.panel__site { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tabs { display: flex; flex: none; border-bottom: 1px solid var(--line); }
.tab {
  flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: none; border: 0; border-bottom: 2px solid transparent;
  color: var(--muted); cursor: pointer; font-size: 12px; transition: color .12s, border-color .12s;
}
.tab:hover { color: var(--text); }
.tab[aria-selected="true"] { color: var(--text); border-bottom-color: var(--accent); }
.tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

.views { flex: 1; min-height: 0; overflow: auto; }
.view { display: none; padding: 14px; }
.view--on { display: block; }

.panel__foot { flex: none; border-top: 1px solid var(--line); padding: 11px 14px; }
.panel__state { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; font-size: 12px; color: var(--muted); }
.panel__actions { display: flex; gap: 7px; }
.panel__actions .btn--primary { flex: 1; justify-content: center; }

/* ================= Scène ================= */
.stage { display: flex; flex-direction: column; min-width: 0; }
.stage__bar {
  height: var(--topbar); flex: none; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; background: var(--bg); border-bottom: 1px solid var(--line);
}
.stage__page { color: var(--muted); font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius);
  cursor: pointer; white-space: nowrap; transition: background .12s, border-color .12s;
}
.btn:hover { background: #262b33; }
.btn:disabled { opacity: .42; cursor: default; }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.btn--primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
.btn--primary:hover { background: #2f6fd8; }
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
.check { display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 12px; }
.hint { color: var(--muted); font-size: 12px; margin: 6px 0 0; }
.row { display: flex; gap: 7px; }
.row > * { flex: 1; }

/* Sections repliables de l'inspecteur */
.group { border-bottom: 1px solid var(--line-soft); }
.group:last-child { border-bottom: 0; }
.group__head {
  width: 100%; display: flex; align-items: center; gap: 8px; padding: 11px 0;
  background: none; border: 0; color: var(--text); cursor: pointer; text-align: left;
  font-size: 12px; font-weight: 600; letter-spacing: .3px; text-transform: uppercase;
}
.group__head span { flex: 1; }
.group__head svg { color: var(--muted); transition: transform .15s; }
.group[data-open="false"] .group__head svg { transform: rotate(-90deg); }
.group__body { padding-bottom: 14px; }
.group[data-open="false"] .group__body { display: none; }

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
  border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden;
  cursor: pointer; background: var(--bg-sunk); padding: 0;
}
.tile:hover { border-color: var(--accent); }
.tile img { width: 100%; height: 68px; object-fit: cover; display: block; }
.tile__name {
  padding: 5px 6px; font-size: 11px; color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

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
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: 0 6px 20px rgba(0,0,0,.45);
}

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
