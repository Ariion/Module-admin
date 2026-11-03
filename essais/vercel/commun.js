/**
 * La barre et le pied de page, posés par le script.
 *
 * Recopier une barre de navigation dans quatre fichiers garantit qu'elle
 * divergera : on ajoute une entrée quelque part, on oublie les trois autres,
 * et le site a trois menus différents sans que personne le remarque.
 *
 * Posée par script, elle est absente pour un visiteur sans JavaScript — ce
 * qui est acceptable ICI et nulle part ailleurs : ces pages-là sont la
 * vitrine commerciale du module, pas un site de client. Les pages produites
 * POUR un client, elles, sont du HTML statique complet : c'est tout l'objet
 * de `core/bake.js`.
 */
const PAGES = [
  ['/', 'Présentation'],
  ['/modeles', 'Modèles'],
  ['/boutique', 'Démo boutique'],
  ['/tarifs', 'Tarifs'],
  ['/distribution/installation.html', 'Installation'],
];

const ici = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';

const barre = document.createElement('header');
barre.className = 'barre-site';
barre.innerHTML = `<div class="barre-site__dedans">
  <a class="marque" href="/">Cal<b>q</b>o</a>
  <nav class="nav">${PAGES.map(([url, nom]) => {
    const courant = url.replace(/\/$/, '') === ici || (url === '/' && ici === '/');
    const classe = url === '/tarifs' ? ' class="cta"' : '';
    return `<a href="${url}"${classe}${courant ? ' aria-current="page"' : ''}>${nom}</a>`;
  }).join('')}</nav>
</div>`;
document.body.prepend(barre);

const pied = document.createElement('footer');
pied.className = 'pied';
pied.innerHTML = `<div class="pied__cols">
  <div class="pied__col">
    <h3>01 — Le produit</h3>
    <ul>
      <li><a href="/modeles">Les modèles de page</a></li>
      <li><a href="/boutique">La démonstration boutique</a></li>
      <li><a href="/tarifs">Les formules</a></li>
    </ul>
  </div>
  <div class="pied__col">
    <h3>02 — Le poser</h3>
    <ul>
      <li><a href="/distribution/installation.html">Guide d’installation</a></li>
      <li><a href="/vierge">Page vierge d’essai</a></li>
    </ul>
  </div>
  <div class="pied__col">
    <h3>03 — Ce qui ne change pas</h3>
    <ul>
      <li>Pas d’abonnement</li>
      <li>Pas de commission</li>
      <li>Le site reste au client</li>
    </ul>
  </div>
</div>
<p class="pied__bas">Calqo — site de démonstration</p>`;
document.body.appendChild(pied);
