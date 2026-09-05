/**
 * Écran de connexion (Firebase Auth, e-mail + mot de passe).
 * @module ui/login
 */
import { h } from './el.js';
import { openModal } from './modal.js';

export function openLogin({ root, t, backend, onSuccess }) {
  const email = h('input', { class: 'input', type: 'email', autocomplete: 'username', required: true });
  const password = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', required: true });
  const message = h('p', { class: 'error' });
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, t('signInAction'));

  async function attempt(event) {
    event.preventDefault();
    message.className = 'error';
    message.textContent = '';
    submit.disabled = true;
    try {
      await backend.signIn(email.value.trim(), password.value);
      modal.close();
      onSuccess?.();
    } catch (err) {
      message.textContent = t('signInError');
      console.debug('[admin]', err?.code || err);
    } finally {
      submit.disabled = false;
    }
  }

  async function reset(event) {
    event.preventDefault();
    if (!email.value.trim()) { email.focus(); return; }
    try {
      await backend.resetPassword(email.value.trim());
      message.className = 'ok';
      message.textContent = t('resetSent');
    } catch {
      message.textContent = t('signInError');
    }
  }

  const form = h('form', { onsubmit: attempt },
    h('div', { class: 'field' }, h('label', { class: 'field__label' }, t('email')), email),
    h('div', { class: 'field' }, h('label', { class: 'field__label' }, t('password')), password),
    message,
    h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' } },
      submit,
      h('a', { href: '#', class: 'hint', style: { marginLeft: 'auto' }, onclick: reset }, t('forgot')),
    ),
  );

  const modal = openModal({ root, title: t('signIn'), body: form, size: 'sm' });
  setTimeout(() => email.focus(), 30);
  return modal;
}
