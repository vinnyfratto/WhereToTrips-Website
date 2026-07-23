// ───────────────────────────────────────────────────────────────────
//  wt-track-submit.js — records a durable copy of every form submission
//  (early access + contact) and mirrors it into PostHog. This is a
//  fire-and-forget side channel: it does NOT preventDefault, so the
//  existing web3forms submission (which sends the email notification)
//  proceeds exactly as before even if this call fails.
// ───────────────────────────────────────────────────────────────────
const cfg = window.WT_SUPABASE || {};
const CAPTURE_FN = cfg.url ? cfg.url + '/functions/v1/capture-submission' : null;

function utmParams() {
  const q = new URLSearchParams(window.location.search);
  const out = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
    const v = q.get(k);
    if (v) out[k] = v;
  });
  return out;
}

function track(form) {
  const fd = new FormData(form);
  const intent = (fd.get('intent') || '').toString();
  if (!intent) return;

  const payload = {
    intent,
    name: fd.get('name') || null,
    email: fd.get('email') || null,
    company: fd.get('company') || null,
    message: fd.get('message') || null,
    subject: fd.get('subject') || null,
    hp: fd.get('hp_field') || null,
    source_path: window.location.pathname,
    referrer: document.referrer || null,
    ...utmParams(),
  };

  if (CAPTURE_FN) {
    fetch(CAPTURE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  if (window.posthog) {
    window.posthog.capture('form_submitted', { intent, source_path: payload.source_path });
  }
}

document.querySelectorAll('form.contact-form, form.email-capture').forEach((form) => {
  form.addEventListener('submit', () => track(form));
});
