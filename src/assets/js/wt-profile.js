// ───────────────────────────────────────────────────────────────────
//  wt-profile.js — shared profile editor (Step 2 + Step 4).
//  initProfileForm(supabase, user, opts) loads the profile into the form,
//  wires Save + Logout. Used by both /account/profile (wt-auth.js) and the
//  affiliate /dashboard (wt-dashboard.js) so there's ONE editor, ONE client.
//  Assumes the standard field ids: wt-first/last/phone/photo/marketing/email
//  + flight prefs (wt-airport/seat/airlines/stops/budgetflex/dateflex).
// ───────────────────────────────────────────────────────────────────

function alertEl(id) { return document.getElementById(id); }
function showAlert(id, type, msg) {
  const el = alertEl(id); if (!el) return;
  el.className = 'alert show alert-' + type; el.textContent = msg;
}
function hideAlert(id) { const el = alertEl(id); if (el) el.className = 'alert'; }
function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Saving…'; }
  else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
}

export async function initProfileForm(supabase, user, opts = {}) {
  const alertId  = opts.alertId  || 'wt-alert';
  const formId   = opts.formId   || 'wt-profile-form';
  const logoutId = opts.logoutId || 'wt-logout';

  const emailEl = document.getElementById('wt-email');
  if (emailEl) emailEl.value = user.email || '';

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('first_name,last_name,phone,profile_photo,marketing_opt_in,flight_prefs')
    .eq('id', user.id)
    .single();

  if (error) showAlert(alertId, 'error', 'Could not load your profile. ' + error.message);

  const fp = (profile && profile.flight_prefs) || {};
  const setVal = (id, v) => { const el = document.getElementById(id); if (el != null && v != null) el.value = v; };
  setVal('wt-first', profile?.first_name);
  setVal('wt-last', profile?.last_name);
  setVal('wt-phone', profile?.phone);
  setVal('wt-photo', profile?.profile_photo);
  const mk = document.getElementById('wt-marketing');
  if (mk) mk.checked = !!profile?.marketing_opt_in;
  setVal('wt-airport', fp.nearestAirport);
  setVal('wt-seat', fp.seatClass);
  setVal('wt-airlines', Array.isArray(fp.preferredAirlines) ? fp.preferredAirlines.join(', ') : '');
  setVal('wt-stops', fp.stopCount);
  setVal('wt-budgetflex', fp.budgetFlexibility);
  setVal('wt-dateflex', fp.dateFlex);

  const form = document.getElementById(formId);
  if (form) {
    const btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(alertId);
      const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
      const airlines = val('wt-airlines')
        ? val('wt-airlines').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : [];
      const flight_prefs = {
        nearestAirport: val('wt-airport') || undefined,
        seatClass: val('wt-seat') || undefined,
        preferredAirlines: airlines.length ? airlines : undefined,
        stopCount: val('wt-stops') || undefined,
        budgetFlexibility: val('wt-budgetflex') || undefined,
        dateFlex: val('wt-dateflex') || undefined,
      };
      busy(btn, true, 'Saving…');
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          first_name: val('wt-first'),
          last_name: val('wt-last'),
          phone: val('wt-phone') || null,
          profile_photo: val('wt-photo') || null,
          marketing_opt_in: document.getElementById('wt-marketing').checked,
          flight_prefs,
        })
        .eq('id', user.id);
      busy(btn, false);
      if (upErr) { showAlert(alertId, 'error', 'Save failed: ' + upErr.message); return; }
      showAlert(alertId, 'success', 'Profile saved.');
    });
  }

  const out = document.getElementById(logoutId);
  if (out) {
    out.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = '/account/login/';
    });
  }
}
