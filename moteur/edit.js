/**
 * Socle — éditer un site en cliquant dessus.
 *
 * Un seul attribut, trois valeurs possibles :
 *   data-edit="text"   <h1>, <p>, <span>… — le texte devient réécrivable sur place.
 *   data-edit="image"  <img> — un petit champ pour changer l'adresse de la photo.
 *   data-edit="link"   <a> — un petit champ pour changer où mène le lien.
 *
 * Rien d'autre à apprendre. Le développeur décide, dans son code, ce qui est
 * éditable en posant l'attribut — ou pas. La mise en page n'est jamais
 * accessible depuis ici : elle reste dans le code, écrite une fois pour
 * toutes.
 *
 * Cette version enregistre dans le navigateur (localStorage), le temps de
 * valider le geste. La sauvegarde réelle (Firebase, publication, historique)
 * viendra ensuite, sans changer cette interaction.
 */
(function () {
  const PREFIXE = 'socle:';

  /**
   * Sans data-edit-id, la clé est le chemin complet depuis <body> (index de
   * chaque ancêtre chez ses frères et sœurs). Un simple "tagName:index"
   * locale au parent suffisait à faire se chevaucher deux éléments sans
   * rapport placés au même endroit dans deux sections différentes.
   */
  function cle(el) {
    const id = el.getAttribute('data-edit-id');
    if (id) return id;
    const chemin = [];
    let n = el;
    while (n && n !== document.body && n.parentNode) {
      chemin.unshift(Array.from(n.parentNode.children).indexOf(n));
      n = n.parentNode;
    }
    return 'chemin:' + chemin.join('.');
  }

  function restaurer() {
    document.querySelectorAll('[data-edit]').forEach((el) => {
      const valeur = localStorage.getItem(PREFIXE + cle(el));
      if (valeur == null) return;
      const type = el.getAttribute('data-edit');
      if (type === 'text') el.textContent = valeur;
      if (type === 'image') el.src = valeur;
      if (type === 'link') el.setAttribute('href', valeur);
    });
  }

  function sauvegarder(el, valeur) {
    localStorage.setItem(PREFIXE + cle(el), valeur);
    temoin(el);
  }

  /** Un petit retour visuel bref, pour dire « c'est enregistré » sans bloquer. */
  function temoin(el) {
    el.classList.add('socle-enregistre');
    setTimeout(() => el.classList.remove('socle-enregistre'), 900);
  }

  function activerTexte(el) {
    el.setAttribute('contenteditable', 'true');
    el.focus();
    document.execCommand && window.getSelection().selectAllChildren(el);
    const fin = () => {
      el.removeAttribute('contenteditable');
      sauvegarder(el, el.textContent.trim());
      el.removeEventListener('blur', fin);
    };
    el.addEventListener('blur', fin);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') el.blur();
    });
  }

  function fermerPopovers() {
    document.querySelectorAll('.socle-pop').forEach((p) => p.remove());
  }

  function popover(el, champs) {
    fermerPopovers();
    const pop = document.createElement('div');
    pop.className = 'socle-pop';
    const rect = el.getBoundingClientRect();
    pop.style.top = (window.scrollY + rect.bottom + 8) + 'px';
    pop.style.left = (window.scrollX + rect.left) + 'px';
    pop.append(...champs);
    document.body.appendChild(pop);
    requestAnimationFrame(() => {
      const bord = pop.getBoundingClientRect();
      if (bord.right > window.innerWidth) pop.style.left = (window.scrollX + window.innerWidth - bord.width - 12) + 'px';
    });
    const dehors = (e) => {
      if (pop.contains(e.target) || e.target === el) return;
      pop.remove();
      document.removeEventListener('mousedown', dehors);
    };
    setTimeout(() => document.addEventListener('mousedown', dehors), 0);
    return pop;
  }

  function champEtBouton(valeurInitiale, placeholder, onValider) {
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.placeholder = placeholder;
    champ.value = valeurInitiale || '';
    champ.className = 'socle-pop__champ';
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = 'Changer';
    bouton.className = 'socle-pop__bouton';
    const valider = () => { onValider(champ.value.trim()); fermerPopovers(); };
    bouton.addEventListener('click', valider);
    champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); if (e.key === 'Escape') fermerPopovers(); });
    return [champ, bouton];
  }

  function activerImage(el) {
    const [champ, bouton] = champEtBouton(el.getAttribute('src'), 'Adresse de l’image', (v) => {
      if (!v) return;
      el.src = v;
      sauvegarder(el, v);
    });
    popover(el, [champ, bouton]);
    champ.focus();
    champ.select();
  }

  function activerLien(el) {
    const [champ, bouton] = champEtBouton(el.getAttribute('href'), 'https://…', (v) => {
      el.setAttribute('href', v);
      sauvegarder(el, v);
    });
    popover(el, [champ, bouton]);
    champ.focus();
    champ.select();
  }

  const ACTIONS = { text: activerTexte, image: activerImage, link: activerLien };

  function brancher() {
    document.querySelectorAll('[data-edit]').forEach((el) => {
      el.classList.add('socle-editable');
      el.addEventListener('click', (e) => {
        const action = ACTIONS[el.getAttribute('data-edit')];
        if (!action) return;
        e.preventDefault();
        action(el);
      });
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    .socle-editable { outline: 2px dashed transparent; outline-offset: 3px; cursor: pointer; transition: outline-color .15s, background-color .4s; border-radius: 2px; }
    .socle-editable:hover { outline-color: #4d8bf5; }
    .socle-editable[contenteditable="true"] { outline: 2px solid #4d8bf5; cursor: text; }
    .socle-enregistre { background-color: rgba(52, 211, 153, .25); }
    .socle-pop {
      position: absolute; z-index: 99999; display: flex; gap: 6px; align-items: center;
      background: #fff; border: 1px solid #e2e2e2; border-radius: 10px; padding: 8px;
      box-shadow: 0 12px 28px rgba(0,0,0,.16); font: 13px/1.3 -apple-system, sans-serif;
    }
    .socle-pop__champ { width: 240px; padding: 7px 9px; border: 1px solid #d7d7d7; border-radius: 6px; font: inherit; }
    .socle-pop__bouton { padding: 7px 14px; border: 0; border-radius: 6px; background: #111; color: #fff; font: inherit; cursor: pointer; white-space: nowrap; }
    .socle-pop__bouton:hover { background: #2a2a2a; }
  `;
  document.head.appendChild(style);

  restaurer();
  brancher();
})();
