-- 1. Enable needed extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule Google Sheets Sync (Marketing Leads) - Every 4 hours
-- Unschedule first to avoid duplicates
SELECT cron.unschedule('sync-google-sheets-job');
SELECT cron.schedule(
  'sync-google-sheets-job',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lyzoucjojcobxifbmfqp.supabase.co/functions/v1/sync-google-sheets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM supabase_functions.secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    )
  );
  $$
);

-- 3. Schedule GA4 Page Metrics Sync (Daily at 01:00 AM)
SELECT cron.unschedule('sync-ga4-daily-job');
SELECT cron.schedule(
  'sync-ga4-daily-job',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lyzoucjojcobxifbmfqp.supabase.co/functions/v1/sync-ga4',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM supabase_functions.secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    )
  );
  $$
);
