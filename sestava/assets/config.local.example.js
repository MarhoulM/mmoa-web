/**
 * LOCAL ONLY — copy to config.local.js (gitignored) for staging deletion UI.
 * Never commit config.local.js.
 * Use only the public publishable/anon key (never a privileged server key).
 *
 *   copy config.local.example.js config.local.js
 *   fill staging public URL + publishable key
 */
window.SESTAVA_WEB_CONFIG = {
  environment: "staging",
  productionEnabled: false,
  deletionEnabled: true,
  supabaseUrl: "https://YOUR_STAGING_REF.supabase.co",
  supabasePublishableKey: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  expectedProjectRef: "YOUR_STAGING_REF",
};
