/**
 * Styles de l'interface d'administration.
 *
 * Tout est injecté dans un shadow DOM : aucune règle du site ne peut casser
 * l'éditeur, et l'éditeur ne peut pas déteindre sur le site. Seules quelques
 * règles minimales (surlignage d'un élément en cours d'édition) sont posées
 * dans le document lui-même, et retirées à la fermeture.
 * @module ui/styles
 */

export const SHADOW_CSS = `
:host {
  --bg: #14161a;
  --bg-soft: #1d2026;
  --line: #2c313a;
  --text: #eef1f6;
  --muted: #9aa4b2;
  --accent: #3b82f6;
  --accent-soft: rgba(59, 130, 246, .15);
  --ok: #22c55e;
  --warn: #f59e0b;
  --danger: #ef4444;
  --radius: 8px;
  --bar-h: 48px;
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}
* { box-sizing: border-box; }
button, input, textarea, select { font: inherit; color: inherit; }

/* ---------- Barre supérieure ---------- */
.bar {
  position: fixed; inset: 0 0 auto 0; height: var(--bar-h);
  display: flex; align-items: center; gap: 12px; padding: 0 12px;
  background: var(--bg); border-bottom: 1px solid var(--line);
  z-index: 20; box-shadow: 0 1px 12px rgba(0,0,0,.25);
}
.bar__brand { display: flex; align-items: center; gap: 8px; font-weight: 600; letter-spacing: .2px; }
.bar__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.bar__site { color: var(--muted); font-weight: 400; }
.bar__status { flex: 1; color: var(--muted); display: flex; align-items: center; gap: 8px; min-width: 0; }
.bar__status span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar__actions { display: flex; align-items: center; gap: 6px; }

.pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px;
  background: var(--bg-soft); border: 1px solid var(--line); font-size: 12px; }
.pill--warn { color: var(--warn); border-color: rgba(245,158,11,.35); }
.pill--ok { color: var(--ok); border-color: rgba(34,197,94,.35); }

/* ---------- Boutons ---------- */
.btn {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius);
  cursor: pointer; white-space: nowrap; transition: background .12s, border-color .12s;
}
.btn:hover { background: #272b33; }
.btn:disabled { opacity: .45; cursor: default; }
.btn--primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
.btn--primary:hover { background: #2f6fd8; }
.btn--ghost { background: transparent; }
.btn--danger { color: #fecaca; border-color: rgba(239,68,68,.4); }
.btn--danger:hover { background: rgba(239,68,68,.15); }
.btn--sm { height: 26px; padding: 0 9px; font-size: 12px; }
.btn--icon { width: 28px; padding: 0; justify-content: center; }

/* ---------- Surlignage des éléments ---------- */
.layer { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
.hl {
  position: absolute; border: 1px solid var(--accent); border-radius: 3px;
  background: var(--accent-soft); pointer-events: none;
  transition: opacity .1s; box-shadow: 0 0 0 1px rgba(255,255,255,.25) inset;
}
.hl--active { border-color: var(--ok); background: rgba(34,197,94,.12); }
.hl--collection { border-style: dashed; border-color: var(--warn); background: rgba(245,158,11,.08); }
.hl__tag {
  position: absolute; top: -20px; left: -1px; height: 19px; padding: 0 7px;
  display: inline-flex; align-items: center; gap: 5px; border-radius: 4px 4px 0 0;
  background: var(--accent); color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap;
}
.hl--collection .hl__tag { background: var(--warn); color: #1a1400; }

/* Barre d'outils d'un bloc répétable */
.itembar {
  position: absolute; display: flex; gap: 2px; padding: 3px; z-index: 12;
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: 0 4px 14px rgba(0,0,0,.35); pointer-events: auto;
}

/* ---------- Panneau latéral ---------- */
.panel {
  position: fixed; top: var(--bar-h); right: 0; bottom: 0; width: 320px; z-index: 18;
  display: flex; flex-direction: column;
  background: var(--bg); border-left: 1px solid var(--line);
  box-shadow: -6px 0 24px rgba(0,0,0,.28);
  transform: translateX(100%); transition: transform .18s ease;
}
.panel--open { transform: none; }
.panel__head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.panel__title { font-weight: 600; flex: 1; }
.panel__body { padding: 14px; overflow: auto; flex: 1; }
.panel__foot { padding: 12px 14px; border-top: 1px solid var(--line); display: flex; gap: 8px; }

.field { margin-bottom: 14px; }
.field__label { display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px; }
.input, .textarea {
  width: 100%; padding: 7px 9px; background: #0e1013; color: var(--text);
  border: 1px solid var(--line); border-radius: 6px; outline: none;
}
.input:focus, .textarea:focus { border-color: var(--accent); }
.textarea { min-height: 70px; resize: vertical; }
.check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.hint { color: var(--muted); font-size: 12px; margin: 6px 0 0; }

.preview {
  display: flex; align-items: center; justify-content: center; min-height: 130px; margin-bottom: 12px;
  background: repeating-conic-gradient(#20242b 0 25%, #191c22 0 50%) 0 0/16px 16px;
  border: 1px dashed var(--line); border-radius: var(--radius); overflow: hidden;
}
.preview img { max-width: 100%; max-height: 220px; display: block; }
.preview--drop { border-color: var(--accent); background: var(--accent-soft); }

.progress { height: 3px; background: var(--line); border-radius: 2px; overflow: hidden; margin-top: 8px; }
.progress > i { display: block; height: 100%; background: var(--accent); width: 0; transition: width .2s; }

/* ---------- Fenêtres modales ---------- */
.backdrop {
  position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center;
  background: rgba(6,8,12,.62); backdrop-filter: blur(2px); padding: 20px;
}
.modal {
  width: 100%; max-width: 620px; max-height: 82vh; display: flex; flex-direction: column;
  background: var(--bg); border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
.modal--sm { max-width: 360px; }
.modal__head { padding: 16px 18px; border-bottom: 1px solid var(--line); font-weight: 600; display: flex; gap: 8px; align-items: center; }
.modal__body { padding: 18px; overflow: auto; }
.modal__foot { padding: 14px 18px; border-top: 1px solid var(--line); display: flex; gap: 8px; justify-content: flex-end; }
.error { color: #fca5a5; font-size: 12px; margin-top: 10px; min-height: 16px; }
.ok { color: #86efac; font-size: 12px; margin-top: 10px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.tile { border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; cursor: pointer; background: #0e1013; }
.tile:hover { border-color: var(--accent); }
.tile img { width: 100%; height: 84px; object-fit: cover; display: block; }
.tile__name { padding: 5px 7px; font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.list { list-style: none; margin: 0; padding: 0; }
.list li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); }
.list li:last-child { border-bottom: 0; }
.list__main { flex: 1; min-width: 0; }
.list__meta { color: var(--muted); font-size: 12px; }

/* ---------- Mini-barre du texte enrichi ---------- */
.rtb {
  position: absolute; z-index: 22; display: flex; gap: 2px; padding: 3px;
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: 0 6px 20px rgba(0,0,0,.4); pointer-events: auto;
}

/* ---------- Notification ---------- */
.toast {
  position: fixed; left: 50%; bottom: 22px; transform: translate(-50%, 12px);
  padding: 9px 16px; border-radius: 999px; z-index: 40; opacity: 0;
  background: var(--bg); border: 1px solid var(--line); box-shadow: 0 8px 26px rgba(0,0,0,.4);
  transition: opacity .18s, transform .18s; pointer-events: none;
}
.toast--show { opacity: 1; transform: translate(-50%, 0); }
.toast--error { border-color: rgba(239,68,68,.5); color: #fecaca; }

@media (max-width: 720px) {
  .panel { width: 100%; }
  .bar__brand .bar__site { display: none; }
}
`;

/**
 * Règles posées dans le document du site (et retirées à la fermeture).
 * On reste minimal : un contour sur l'élément en cours d'édition et le
 * décalage du contenu sous la barre.
 */
export const DOCUMENT_CSS = `
html[data-admin-active] body { margin-top: var(--admin-bar-h, 48px) !important; }
[data-admin-editing] {
  outline: 2px solid #22c55e !important; outline-offset: 2px;
  border-radius: 2px; cursor: text; min-height: 1em;
}
[data-admin-hover] { cursor: pointer !important; }
html[data-admin-active] * { -webkit-user-drag: none; }
`;
