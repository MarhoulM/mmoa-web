/**
 * Example shapes for Sestava web config.
 * Public default is config.js (fail-closed).
 * Local staging override: config.local.example.js → config.local.js
 *
 * Browser: public publishable/anon key only.
 */
window.SESTAVA_WEB_CONFIG = {
  environment: "disabled", // or "staging" locally — never invent production values
  productionEnabled: false,
  deletionEnabled: false,
  supabaseUrl: "",
  supabasePublishableKey: "",
  expectedProjectRef: "",
};
