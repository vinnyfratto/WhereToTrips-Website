// The tab strips under the admin header. A page names its strip and its tab in
// its front matter:
//
//   subnav: partner         (a key below)
//   subnavActive: details   (a tab key in that strip)
//
// The header's drop-down menus live in assets/js/wt-admin-nav.js (a plain
// script, so it cannot read this file). Keep the labels and paths in the two
// places the same.
module.exports = {
  partner: {
    label: 'Partner Admin',
    tabs: [
      { key: 'overview', label: 'Overview', href: '/admin-affiliates/' },
      { key: 'details', label: 'Partner Details', href: '/admin-partners/' },
      { key: 'review', label: 'Review Queue', href: '/admin-review/', badge: 'review' },
      { key: 'revenue', label: 'Revenue Received', href: '/admin-revenue-received/' },
      { key: 'payments', label: 'Payment History', href: '/admin-payment-history/' },
    ],
  },
  crm: {
    label: 'CRM',
    tabs: [
      { key: 'applications', label: 'Applications', href: '/admin-crm-applications/' },
      { key: 'invites', label: 'Invites', href: '/admin-crm-invites/' },
      { key: 'legacy', label: 'Partner CRM (legacy)', href: '/admin-crm/' },
    ],
  },
  finance: {
    label: 'Financial Tracking',
    tabs: [
      { key: 'reconciliation', label: 'Nuitee Booking Reconciliation', href: '/admin-financial/nuitee-reconciliation/' },
      { key: 'received', label: 'Nuitee Booking Payments Received', href: '/admin-financial/nuitee-payments-received/' },
      { key: 'ach', label: 'Partner Payment Processing (ACH)', href: '/admin-financial/partner-ach/' },
      { key: 'tax', label: 'Partner 1099 Processing', href: '/admin-financial/partner-1099/' },
    ],
  },
};
