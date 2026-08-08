// ───────────────────────────────────────────────────────────────────
//  wt-password-toggle.js — the "show password" eye button next to every
//  password field on the website (login, signup, reset, partner signup).
//  Wires any <button class="pw-toggle"> inside a `.pw-field` wrapper — see
//  account.css for the layout (.pw-field positions the button over its
//  sibling input). Safe to call more than once (idempotent per-button).
// ───────────────────────────────────────────────────────────────────
const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.2 13.2 0 0 1-3.1 3.9M6.6 6.6C3.7 8.4 1.5 12 1.5 12s3.5 7 10.5 7a10.4 10.4 0 0 0 4.2-.9"/><path d="M9.5 9.9a3.2 3.2 0 0 0 4.6 4.5"/></svg>';

export function initPasswordToggles(root = document) {
  root.querySelectorAll('.pw-toggle').forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';

    const input = btn.closest('.pw-field')?.querySelector('input');
    if (!input) return;

    btn.innerHTML = EYE;
    btn.setAttribute('aria-label', 'Show password');

    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? EYE : EYE_OFF;
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  });
}
