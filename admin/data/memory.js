/**
 * Back-end de démonstration : tout est stocké dans le localStorage du
 * navigateur. Aucune donnée ne sort de la machine.
 *
 * Sert à essayer le module sans créer de projet Firebase, et à développer
 * hors ligne. À n'utiliser JAMAIS en production : n'importe qui peut se
 * connecter, et le contenu n'est visible que sur le poste qui l'a saisi.
 * @module data/memory
 */
import { uid } from '../core/util.js';

const PREFIX = 'admin-demo:';

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* quota dépassé : on ignore */ }
}

export class MemoryBackend {
  constructor(config) {
    this.config = config;
    this.siteId = config.siteId || 'demo';
    this.demo = true;
    this.user = null;
    this.access = { role: null, superadmin: false };
  }

  async init() { return this; }

  onUser(callback) {
    const session = read(this.key('session'));
    if (session) {
      this.user = session;
      this.access = { role: 'owner', superadmin: true, allowed: true, name: session.email };
    }
    setTimeout(() => callback(this.user, this.access), 0);
    this.callback = callback;
    return () => { this.callback = null; };
  }

  async signIn(email) {
    this.user = { uid: 'demo', email: email || 'demo@exemple.fr' };
    this.access = { role: 'owner', superadmin: true, allowed: true, name: this.user.email };
    write(this.key('session'), this.user);
    if (this.callback) this.callback(this.user, this.access);
    return { user: this.user };
  }

  async signOut() {
    this.user = null;
    this.access = { role: null, superadmin: false };
    write(this.key('session'), null);
    if (this.callback) this.callback(null, this.access);
  }

  async resetPassword() { /* sans objet en démo */ }
  async idToken() { return null; }

  key(name) { return this.siteId + ':' + name; }

  async loadPublished(pageId) { return read(this.key('page:' + pageId)); }
  async loadDraft(pageId) { return read(this.key('draft:' + pageId)); }

  async saveDraft(pageId, snapshot) {
    write(this.key('draft:' + pageId), { ...snapshot, updatedAt: Date.now(), updatedBy: 'démo' });
  }

  async discardDraft(pageId) { write(this.key('draft:' + pageId), null); }

  async publish(pageId, snapshot, label = '') {
    const now = Date.now();
    const payload = { ...snapshot, updatedAt: now, publishedAt: now, updatedBy: 'démo' };
    write(this.key('page:' + pageId), payload);
    const revisions = read(this.key('revisions'), []);
    revisions.unshift({
      id: uid('r'), pageId, label, publishedAt: now, publishedBy: 'démo',
      snapshot: JSON.stringify(snapshot),
    });
    write(this.key('revisions'), revisions.slice(0, 25));
    write(this.key('draft:' + pageId), null);
    return payload;
  }

  async listRevisions(pageId) {
    return read(this.key('revisions'), []).filter((r) => r.pageId === pageId);
  }

  async listMedia() { return read(this.key('media'), []); }

  async addMedia(item) {
    const media = read(this.key('media'), []);
    const entry = { id: uid('m'), createdAt: Date.now(), ...item };
    media.unshift(entry);
    write(this.key('media'), media.slice(0, 100));
    return entry;
  }

  async deleteMedia(id) {
    write(this.key('media'), read(this.key('media'), []).filter((m) => m.id !== id));
  }

  /**
   * Boîte de réception de démonstration. Le formulaire de la page, lui, écrit
   * toujours dans Firestore : en démonstration il n'a aucune destination et
   * affiche donc son message d'échec. On peut quand même éprouver l'écran en
   * déposant un message à la main depuis la console.
   */
  async listMessages() {
    return read(this.key('messages'), []).sort((a, b) => (b.envoye || 0) - (a.envoye || 0));
  }

  async addMessage(message) {
    const boite = read(this.key('messages'), []);
    boite.unshift({ id: uid('msg'), lu: false, envoye: Date.now(), ...message });
    write(this.key('messages'), boite.slice(0, 200));
  }

  async markMessage(id, lu) {
    write(this.key('messages'), read(this.key('messages'), [])
      .map((m) => (m.id === id ? { ...m, lu: !!lu } : m)));
  }

  async deleteMessage(id) {
    write(this.key('messages'), read(this.key('messages'), []).filter((m) => m.id !== id));
  }
}
