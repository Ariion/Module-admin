/**
 * Back-end Firebase (chargé uniquement par l'éditeur).
 *
 * Le SDK est importé dynamiquement depuis le CDN Google : rien à installer,
 * rien à builder, et le visiteur du site ne le télécharge jamais.
 * @module data/firebase
 */
import { paths, canEdit } from './schema.js';
import { debug } from '../core/log.js';

const DEFAULT_SDK_VERSION = '10.12.5';
const CDN = 'https://www.gstatic.com/firebasejs';

async function loadSdk(version) {
  const base = `${CDN}/${version}`;
  const [app, auth, firestore] = await Promise.all([
    import(/* @vite-ignore */ `${base}/firebase-app.js`),
    import(/* @vite-ignore */ `${base}/firebase-auth.js`),
    import(/* @vite-ignore */ `${base}/firebase-firestore.js`),
  ]);
  return { app, auth, firestore };
}

export class FirebaseBackend {
  constructor(config) {
    this.config = config;
    this.siteId = config.siteId;
    this.sdkVersion = config.firebase?.sdkVersion || DEFAULT_SDK_VERSION;
    this.user = null;
    this.access = { role: null, superadmin: false };
  }

  async init() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const sdk = await loadSdk(this.sdkVersion);
      this.sdk = sdk;
      this.appInstance = sdk.app.getApps().length
        ? sdk.app.getApp()
        : sdk.app.initializeApp(this.config.firebase);
      this.authInstance = sdk.auth.getAuth(this.appInstance);
      this.db = sdk.firestore.getFirestore(this.appInstance);
      await sdk.auth.setPersistence(this.authInstance, sdk.auth.browserLocalPersistence).catch(() => {});
      debug('Firebase prêt', this.config.firebase?.projectId);
      return this;
    })();
    return this.ready;
  }

  /** Notifie à chaque changement d'état de connexion. */
  onUser(callback) {
    return this.sdk.auth.onAuthStateChanged(this.authInstance, async (user) => {
      this.user = user;
      this.access = user ? await this.loadAccess(user) : { role: null, superadmin: false };
      callback(user, this.access);
    });
  }

  /** Droits de la personne connectée sur CE site. */
  async loadAccess(user) {
    const { doc, getDoc } = this.sdk.firestore;
    const [member, superadmin] = await Promise.all([
      getDoc(doc(this.db, paths.member(this.siteId, user.uid))).catch(() => null),
      getDoc(doc(this.db, paths.superadmin(user.uid))).catch(() => null),
    ]);
    const isSuper = !!(superadmin && superadmin.exists());
    const role = member && member.exists() ? member.data().role : null;
    return {
      role: isSuper ? 'owner' : role,
      superadmin: isSuper,
      allowed: isSuper || canEdit(role),
      name: (member && member.exists() && member.data().name) || user.email,
    };
  }

  signIn(email, password) {
    return this.sdk.auth.signInWithEmailAndPassword(this.authInstance, email, password);
  }

  signOut() {
    return this.sdk.auth.signOut(this.authInstance);
  }

  resetPassword(email) {
    return this.sdk.auth.sendPasswordResetEmail(this.authInstance, email);
  }

  idToken() {
    return this.user ? this.user.getIdToken() : Promise.resolve(null);
  }

  async read(path) {
    const { doc, getDoc } = this.sdk.firestore;
    const snap = await getDoc(doc(this.db, path));
    return snap.exists() ? snap.data() : null;
  }

  async write(path, data) {
    const { doc, setDoc } = this.sdk.firestore;
    await setDoc(doc(this.db, path), data);
  }

  loadPublished(pageId) { return this.read(paths.page(this.siteId, pageId)); }
  loadDraft(pageId) { return this.read(paths.draft(this.siteId, pageId)); }

  saveDraft(pageId, snapshot) {
    return this.write(paths.draft(this.siteId, pageId), {
      ...snapshot,
      updatedAt: Date.now(),
      updatedBy: this.user?.email || 'inconnu',
    });
  }

  async discardDraft(pageId) {
    const { doc, deleteDoc } = this.sdk.firestore;
    await deleteDoc(doc(this.db, paths.draft(this.siteId, pageId)));
  }

  /**
   * Publie le brouillon : écrit la page publique ET archive une révision.
   * Les deux écritures sont groupées pour éviter un historique incohérent.
   */
  async publish(pageId, snapshot, label = '') {
    const { doc, writeBatch, collection } = this.sdk.firestore;
    const now = Date.now();
    const payload = {
      ...snapshot,
      updatedAt: now,
      updatedBy: this.user?.email || 'inconnu',
      publishedAt: now,
    };
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, paths.page(this.siteId, pageId)), payload);
    batch.set(doc(collection(this.db, paths.revisions(this.siteId))), {
      pageId,
      label,
      snapshot: JSON.stringify(snapshot),
      publishedAt: now,
      publishedBy: this.user?.email || 'inconnu',
    });
    batch.delete(doc(this.db, paths.draft(this.siteId, pageId)));
    await batch.commit();
    return payload;
  }

  /** Historique des publications d'une page, du plus récent au plus ancien. */
  async listRevisions(pageId, max = 25) {
    const { collection, query, where, orderBy, limit, getDocs } = this.sdk.firestore;
    const q = query(
      collection(this.db, paths.revisions(this.siteId)),
      where('pageId', '==', pageId),
      orderBy('publishedAt', 'desc'),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async listMedia(max = 200) {
    const { collection, query, orderBy, limit, getDocs } = this.sdk.firestore;
    const q = query(collection(this.db, paths.media(this.siteId)), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async addMedia(item) {
    const { collection, addDoc } = this.sdk.firestore;
    const ref = await addDoc(collection(this.db, paths.media(this.siteId)), {
      ...item,
      createdAt: Date.now(),
      createdBy: this.user?.email || 'inconnu',
    });
    return { id: ref.id, ...item };
  }

  async deleteMedia(id) {
    const { doc, deleteDoc } = this.sdk.firestore;
    await deleteDoc(doc(this.db, paths.mediaItem(this.siteId, id)));
  }

  /** Instance Storage, chargée à la demande (adaptateur média Firebase). */
  async storage() {
    if (!this.storageModule) {
      this.storageModule = await import(/* @vite-ignore */ `${CDN}/${this.sdkVersion}/firebase-storage.js`);
    }
    if (!this.storageInstance) {
      this.storageInstance = this.storageModule.getStorage(this.appInstance);
    }
    return { module: this.storageModule, instance: this.storageInstance };
  }
}
