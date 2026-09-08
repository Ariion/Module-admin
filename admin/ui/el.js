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
    right: 'M5 12h14M13 5l7 7-7 7',
    left: 'M19 12H5M11 19l-7-7 7-7',
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
    desktop: 'M3 5h18v11H3zM8 20h8M12 16v4',
    tablet: 'M6 3h12v18H6zM11 18h2',
    mobile: 'M8 2h8v20H8zM11 19h2',
    layers: 'M12 3 3 8l9 5 9-5zM3 14l9 5 9-5',
    sliders: 'M4 8h10M18 8h2M4 16h4M12 16h8M15 5v6M8 13v6',
    palette: 'M12 3a9 9 0 1 0 0 18h2a3 3 0 0 0 0-6h-1a2 2 0 0 1 0-4h2a4 4 0 0 0-3-8zM7 10h.01M10 6h.01M16 8h.01',
    plus: 'M12 5v14M5 12h14',
    text: 'M5 5h14M12 5v14M9 19h6',
    section: 'M3 4h18v6H3zM3 14h18v6H3',
    columns: 'M4 4h6v16H4zM14 4h6v16h-6z',
    heading: 'M6 4v16M18 4v16M6 12h12M4 4h4M16 4h4',
    button: 'M3 8h18v8H3zM8 12h8',
    list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
    divider: 'M3 12h18M7 8h10M7 16h10',
    spacer: 'M12 4v16M8 7l4-3 4 3M8 17l4 3 4-3',
    video: 'M3 5h18v14H3zM10 9l5 3-5 3z',
    map: 'M9 3 3 6v15l6-3 6 3 6-3V3l-6 3zM9 3v15M15 6v15',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    drag: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
    code: 'M8 6l-5 6 5 6M16 6l5 6-5 6',
    template: 'M4 4h16v4H4zM4 11h7v9H4zM14 11h6v9h-6z',
    music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    pages: 'M8 3h9l4 4v14H8zM8 7H4v14h9',
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
