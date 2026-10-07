# SCSA Membership Journey Tracker

Staff-only tracker for RCCG Salvation Center San Antonio: each person's discipleship stage (Connect → Lead) and their follow-up, at **https://scsatracker.org**.

- **Site:** static HTML/JS at the top level of the repo, hosted on Netlify. No build step.
- **Data and sign-in:** Supabase (Postgres; sign in with email + password, or an emailed link).
- **Access:** only emails on the Staff list can sign in. Pastor = everything, including pastor's notes, permanent delete and the Staff list. Leader = add and edit members and follow-up. Viewer = read only. Enforced by database row-level security, not just the page.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page layout and styles |
| `app.js` | Page logic |
| `config.js` | Supabase URL and publishable key (public by design) |
| `supabase.js` | Supabase browser library v2.117.2 |
| `schema.sql` | Database setup: tables, access rules, staff-only sign-up guard, live updates (never served by the site) |
| `netlify.toml` | Security headers; blocks setup files from being served |
| `robots.txt` | Keeps search engines out |

Every file sits at the top level of the repo, so GitHub's "Upload files" works without folders.

Member data is **never** in this repo. The one-time data load (`seed-members.sql`) is kept separately and blocked by `.gitignore`.

## One-time setup

### 1. Supabase
1. Project: `stzprlbkdibngnuvocsd` (https://stzprlbkdibngnuvocsd.supabase.co).
2. **SQL Editor → New query:** paste all of `schema.sql` → **Run**.
3. **SQL Editor → New query:** paste all of `seed-members.sql` (sent separately, not in this repo) → **Run**. It should end with `members_loaded = 190`. The pastor login is pastor@rccgsanantonio.org.
4. **Authentication → URL Configuration:**
   - Site URL: `https://scsatracker.org`
   - Redirect URLs: `https://scsatracker.org/**`, `https://www.scsatracker.org/**`, and your Netlify address, e.g. `https://scsa-tracker.netlify.app/**`
5. **Authentication → Sign In / Providers → Email:** enabled, with "Allow new users to sign up" **on**. (The staff-only guard in the database blocks anyone not on the Staff list.)
6. **Custom email sending (required).** Supabase's built-in email only delivers to your own Supabase team, so staff would never get their sign-in links. Use Resend:
   - In Resend, add the domain `scsatracker.org` and add the DNS records it lists.
   - Create a Resend API key.
   - Supabase → **Authentication → Emails → SMTP Settings:** host `smtp.resend.com`, port `465`, user `resend`, password = the API key, sender `signin@scsatracker.org`, name `Salvation Center Tracker`.
7. Optional: **Authentication → Emails → Templates → Magic Link:** set the subject to `Your Salvation Center sign-in link`.
8. **Project Settings → API:** copy the **Project URL** and the **publishable** key into `config.js`. Never use the `service_role` key.

### 2. GitHub
Repository: https://github.com/rccgscsa03/membership-journey-tracker (branch `main`). Easiest without git: open the repo → **Add file → Upload files** → select all eight files (index.html, app.js, config.js, supabase.js, netlify.toml, robots.txt, schema.sql, README.md) → **Commit changes**.

### 3. Netlify
1. **Add new site → Import an existing project → GitHub** → pick the repo.
2. Leave build command blank. Leave the publish directory blank too.
3. Deploy. Every push to `main` redeploys automatically.

### 4. scsatracker.org
In Netlify: **Domain management → Add a domain → scsatracker.org.** Then either:
- **Use Netlify DNS (simplest):** change the domain's nameservers at your registrar to the four Netlify gives you, or
- **Keep your registrar's DNS:** add `A  @  75.2.60.5` and `CNAME  www  <your-site>.netlify.app`.

HTTPS is issued automatically once DNS resolves (minutes to a few hours).

## Day to day
- **Add staff:** sign in as pastor → **Staff** → enter email, name and role. They can sign in right away.
- **Remove staff:** **Staff → Remove**. Their next sign-in is refused.
- **Backups:** Supabase keeps daily backups on paid plans. **Download CSV** gives a spreadsheet copy at any time.

## Daily email (weekdays, 6 a.m. Central)
`daily-digest-index.ts` is a Supabase Edge Function. Each weekday it emails every staff member whose follow-ups are due (matched by **Owner = their Staff name**, titles like "Pastor" ignored). Pastors also get the people waiting on a final call and a church-wide summary. Sent from `notifications@scsatracker.org` through Resend. Pastor's notes are never included.

1. **Edge Functions → Deploy a new function → Via Editor.** Name it `daily-digest`, paste `daily-digest-index.ts`, deploy. In the function's **Details**, turn **Verify JWT** off (the function checks its own secret).
2. **Edge Functions → Secrets:** `RESEND_API_KEY`, `CRON_SECRET`, `SITE_URL`, and optionally `DIGEST_COPY_TO` (a bcc for the pastor's copy).
3. **SQL Editor:** run `digest-schedule.sql` (kept private; it holds the secret).
