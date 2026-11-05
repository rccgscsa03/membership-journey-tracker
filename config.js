// Supabase connection for scsatracker.org.
// The anon (publishable) key is meant to be public: the database's row-level security
// rules decide what each signed-in staff member can see. Never put the service_role key here.
window.SCSA_CONFIG = {
  // Public names shown on the sign-in page and at the top of the app.
  // Edit these two lines (and pageTitle for the browser tab) to rename the site.
  orgName: 'RCCG Salvation Center San Antonio',
  siteName: 'Membership Journey',
  pageTitle: 'Membership Journey Tracker',

  supabaseUrl: 'https://stzprlbkdibngnuvocsd.supabase.co',
  supabaseAnonKey: 'sb_publishable_t986mqszZ8eku-PnBRuJgQ_y11Skf1C'
};
