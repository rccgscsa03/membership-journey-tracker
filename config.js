// Supabase connection for scsatracker.org.
// The anon (publishable) key is meant to be public: the database's row-level security
// rules decide what each signed-in staff member can see. Never put the service_role key here.
window.SCSA_CONFIG = {
  supabaseUrl: 'https://stzprlbkdibngnuvocsd.supabase.co',
  supabaseAnonKey: ''   // PASTE HERE: Supabase → Project Settings → API Keys → anon / publishable key
};
