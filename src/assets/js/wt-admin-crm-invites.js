// CRM → Invites. The form and list are wt-admin-invites.js (moved, not rewritten).
import { boot, callAdmin, notify, $ } from './wt-padmin-core.js';
import { renderInvites } from './wt-admin-invites.js';

boot(async () => {
  await renderInvites($('#pa-host'), { call: callAdmin, notify, site: window.location.origin });
});
