-- SCSA daily digest schedule. Run once in Supabase → SQL Editor, AFTER the daily-digest function is deployed.
-- Fires at 11:00 and 12:00 UTC on weekdays; the function only sends at the one that is 6 a.m. in San Antonio
-- (so it stays at 6 a.m. through daylight-saving changes).
-- The secret below must match the CRON_SECRET you add in Edge Functions → Secrets. Keep this file private.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove earlier copies if you run this again
select cron.unschedule(jobname) from cron.job where jobname in ('scsa-digest-cdt', 'scsa-digest-cst');

select cron.schedule('scsa-digest-cdt', '0 11 * * 1-5', $$
  select net.http_post(
    url := 'https://stzprlbkdibngnuvocsd.supabase.co/functions/v1/daily-digest',
    headers := '{"Content-Type":"application/json","x-cron-secret":"9288ce5281fdbd89cdd6f7d80d7706ce99de4dfb759f93da"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);

select cron.schedule('scsa-digest-cst', '0 12 * * 1-5', $$
  select net.http_post(
    url := 'https://stzprlbkdibngnuvocsd.supabase.co/functions/v1/daily-digest',
    headers := '{"Content-Type":"application/json","x-cron-secret":"9288ce5281fdbd89cdd6f7d80d7706ce99de4dfb759f93da"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);

-- Check: should list both jobs
select jobname, schedule, active from cron.job where jobname like 'scsa-digest%';

-- Owner check: people you own must say "Koye Sanni" in Owner. This lists owner spellings in use:
select owner, count(*) from members where coalesce(owner,'') <> '' group by owner order by 2 desc;

-- TEST NOW (sends only to you, any day or hour). Run this line alone, then check your inbox in a minute:
-- select net.http_post(url := 'https://stzprlbkdibngnuvocsd.supabase.co/functions/v1/daily-digest?force=1&only=pastor@rccgsanantonio.org', headers := '{"Content-Type":"application/json","x-cron-secret":"9288ce5281fdbd89cdd6f7d80d7706ce99de4dfb759f93da"}'::jsonb, body := '{}'::jsonb);
-- Then see the result:  select status_code, content from net._http_response order by id desc limit 1;
