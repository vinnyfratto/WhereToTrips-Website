// CRM → Applications. The list itself is wt-admin-applications.js (moved, not
// rewritten). "Invite" opens CRM → Invites with the applicant carried over.
import { boot, callAdmin, $ } from './wt-padmin-core.js';
import { renderApplications } from './wt-admin-applications.js';
import { HANDOFF_KEY } from './wt-admin-invites.js';

boot(async () => {
  await renderApplications($('#pa-host'), {
    call: callAdmin,
    onInvite: (app) => {
      try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ email: app.email, name: app.name })); } catch (_e) { /* the form just opens blank */ }
      location.href = '/admin-crm-invites/';
    },
  });
});
