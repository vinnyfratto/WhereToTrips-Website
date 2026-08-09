// ───────────────────────────────────────────────────────────────────
//  wt-track-submit.js — handles every marketing-site form submission
//  (contact, early access, beta signup, notify-launch). Intercepts the
//  native submit, posts straight to capture-submission (durable record +
//  branded Resend admin email), and shows an inline success/error state.
//  Web3Forms is no longer in the loop — this used to be a fire-and-forget
//  side channel that rode alongside a native POST to web3forms, but that
//  meant two notification emails per submission (one plain from web3forms,
//  one branded from Resend). Removed the web3forms leg entirely rather
//  than ask for dashboard access to mute it.
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

function showSuccess(form) {
  const note = document.createElement('p');
  note.className = 'form-success';
  note.textContent = "Thanks — we've got it.";
  form.replaceWith(note);
}

function showError(form, submitBtn, originalLabel) {
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
  let err = form.querySelector('.form-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'form-error';
    form.appendChild(err);
  }
  err.textContent = 'Something went wrong — please try again in a moment.';
}

async function handleSubmit(e) {
  const form = e.currentTarget;
  e.preventDefault();

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

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
  }

  if (!CAPTURE_FN) {
    showError(form, submitBtn, originalLabel);
    return;
  }

  try {
    const res = await fetch(CAPTURE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error('capture-submission failed');

    if (window.posthog) {
      window.posthog.capture('form_submitted', { intent, source_path: payload.source_path });
    }
    showSuccess(form);
  } catch {
    showError(form, submitBtn, originalLabel);
  }
}

document.querySelectorAll('form.contact-form, form.email-capture').forEach((form) => {
  form.addEventListener('submit', handleSubmit);
});
