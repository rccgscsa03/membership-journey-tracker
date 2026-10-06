// Supabase connection for scsatracker.org.
// The anon (publishable) key is meant to be public: the database's row-level security
// rules decide what each signed-in staff member can see. Never put the service_role key here.
window.SCSA_CONFIG = {
  supabaseUrl: 'https://stzprlbkdibngnuvocsd.supabase.co',
  supabaseAnonKey: 'sb_publishable_t986mqszZ8eku-PnBRuJgQ_y11Skf1C'
};
