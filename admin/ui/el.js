/**
 * Micro-constructeur d'éléments, pour écrire l'interface sans template ni
 * innerHTML (donc sans risque d'injection depuis le contenu du site).
 * @module ui/el
 */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') node.innerHTML = value;
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children.flat(4)) {
    if (child == null || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Vide un élément. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Icônes SVG inline (aucune police ni fichier externe). */
export function icon(name, size = 14) {
  const paths = {
    check: 'M20 6 9 17l-5-5',
    close: 'M18 6 6 18M6 6l12 12',
    image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
    link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    copy: 'M8 8h12v12H8zM4 16V4h12',
    up: 'M12 19V5M5 12l7-7 7 7',
    down: 'M12 5v14M5 12l7 7 7-7',
    trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13',
    history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    pencil: 'M4 20h4L20 8l-4-4L4 16z',
    upload: 'M12 16V4M6 10l6-6 6 6M4 20h16',
    bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
    italic: 'M14 5h-4M14 19h-4M14 5l-4 14',
    download: 'M12 4v12M6 10l6 6 6-6M4 20h16',
    folder: 'M3 6h6l2 2h10v10H3z',
    warn: 'M12 4 2 20h20zM12 10v4M12 17h.01',
  };
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', paths[name] || paths.check);
  svg.appendChild(path);
  return svg;
}
