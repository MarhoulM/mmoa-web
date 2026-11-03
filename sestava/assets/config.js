/**
 * Public / fail-closed browser config for Sestava web.
 *
 * Default: deletion backend DISABLED (safe for accidental GitHub Pages publish).
 * Local staging: copy config.local.example.js → config.local.js (gitignored)
 * and load it after this file on delete-account pages only.
 *
 * Browser configs may only use the public publishable/anon key — never a privileged server key.
 * Never set productionEnabled without separate approval.
 */
window.SESTAVA_WEB_CONFIG = {
  environment: "disabled",
  /** Must stay false until production is explicitly approved elsewhere. */
  productionEnabled: false,
  /** Gate for live Auth / RPC / Edge from the browser. */
  deletionEnabled: false,
  supabaseUrl: "",
  supabasePublishableKey: "",
  expectedProjectRef: "",
};
