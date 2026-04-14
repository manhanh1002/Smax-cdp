# SQL Migration for Supabase Cloud

To restore the accurate revenue attribution (matching the VPS version) and ensure all "Orphaned" transactions are included in your dashboard, please run the following SQL script in your Supabase Cloud SQL Editor:

```sql
-- 1. Create or Replace the Unified Customer Profiles View
-- This version uses FULL OUTER JOIN to include transactions that don't yet have a biz_plan
CREATE OR REPLACE VIEW public.customer_profiles AS
WITH biz_data AS (
    SELECT 
        b_1.external_id,
        b_1.biz_name,
        b_1.phone,
        b_1.email,
        b_1.alias_url,
        b_1.current_plan,
        b_1.status AS biz_status,
        split_part(b_1.alias_url, 'smax.ai'::text, 2) AS ga4_path_key,
        b_1.conversion_date,
        b_1.trial_expiry
    FROM biz_plans b_1
), marketing_data AS (
    SELECT 
        m_1.phone,
        max(m_1.source) AS source,
        max(m_1.campaign) AS campaign,
        min(m_1.created_at) AS lead_created_at
    FROM marketing_leads m_1
    WHERE ((m_1.phone IS NOT NULL) AND (m_1.phone <> ''::text))
    GROUP BY m_1.phone
), purchased_data AS (
    SELECT 
        p_1.alias_url,
        MAX(p_1.biz_name) AS biz_name,
        sum(p_1.amount_usd) AS total_usd,
        sum(p_1.amount_vnd) AS total_vnd,
        max(p_1.expiry_date) AS last_expiry_date,
        count(p_1.id) AS transaction_count,
        CASE 
            WHEN bool_or(UPPER(p_1.package_name) = 'PRO') THEN 'PRO'
            ELSE 'FREE'
        END AS calculated_plan,
        COALESCE(jsonb_agg(jsonb_build_object(
            'package_name', p_1.package_name, 
            'amount_usd', p_1.amount_usd, 
            'amount_vnd', p_1.amount_vnd, 
            'date', p_1.purchase_date,
            'expiry_date', p_1.expiry_date,
            'days_remaining', GREATEST(0, (p_1.expiry_date::date - CURRENT_DATE))
        )) FILTER (WHERE (p_1.id IS NOT NULL)), '[]'::jsonb) AS transactions
    FROM purchased_plans p_1
    WHERE p_1.alias_url IS NOT NULL AND p_1.alias_url <> ''::text
    GROUP BY p_1.alias_url
), ga4_data AS (
    SELECT 
        substring(grouped_metrics.page_path, '^(/bizs/[^/?#]+)'::text) AS base_path,
        sum(grouped_metrics.users_sum) AS total_users_all_time,
        sum(grouped_metrics.events_sum) AS event_count_all_time,
        COALESCE(jsonb_agg(jsonb_build_object(
            'title', grouped_metrics.page_title, 
            'path_suffix', replace(grouped_metrics.page_path, substring(grouped_metrics.page_path, '^(/bizs/[^/?#]+)'::text), ''::text), 
            'users', grouped_metrics.users_sum, 
            'events', grouped_metrics.events_sum
        )) FILTER (WHERE (grouped_metrics.page_title IS NOT NULL)), '[]'::jsonb) AS module_usage
    FROM ( 
        SELECT 
            ga4_page_metrics.page_path,
            max(ga4_page_metrics.page_title) AS page_title,
            sum(ga4_page_metrics.total_users) AS users_sum,
            sum(ga4_page_metrics.event_count) AS events_sum
        FROM ga4_page_metrics
        GROUP BY ga4_page_metrics.page_path
    ) grouped_metrics
    GROUP BY (substring(grouped_metrics.page_path, '^(/bizs/[^/?#]+)'::text))
    HAVING (substring(grouped_metrics.page_path, '^(/bizs/[^/?#]+)'::text) IS NOT NULL)
)
SELECT 
    COALESCE(b.external_id, ('orphaned_'::text || p.alias_url)) AS external_id,
    COALESCE(b.biz_name, p.biz_name, p.alias_url) AS biz_name,
    b.phone,
    b.email,
    COALESCE(b.alias_url, p.alias_url) AS alias_url,
    COALESCE(p.calculated_plan, 'FREE'::text) AS current_plan,
    COALESCE(b.biz_status, 'Legacy'::text) AS biz_status,
    b.conversion_date,
    m.source AS marketing_source,
    m.campaign AS marketing_campaign,
    COALESCE(p.total_usd, (0)::numeric) AS total_revenue_usd,
    COALESCE(p.total_vnd, (0)::numeric) AS total_revenue_vnd,
    COALESCE(p.transaction_count, (0)::bigint) AS transaction_count,
    COALESCE(p.transactions, '[]'::jsonb) AS transactions,
    p.last_expiry_date,
    COALESCE(g.total_users_all_time, (0)::numeric) AS total_visitors_all_time,
    COALESCE(g.event_count_all_time, (0)::numeric) AS total_events_all_time,
    COALESCE(g.module_usage, '[]'::jsonb) AS module_usage,
    b.trial_expiry AS trial_expiry_date
FROM biz_data b
FULL OUTER JOIN purchased_data p ON (b.alias_url = p.alias_url AND b.alias_url <> '')
LEFT JOIN marketing_data m ON (b.phone = m.phone AND b.phone <> '')
LEFT JOIN ga4_data g ON (g.base_path = COALESCE(b.ga4_path_key, split_part(p.alias_url, 'smax.ai'::text, 2)) AND COALESCE(b.ga4_path_key, split_part(p.alias_url, 'smax.ai'::text, 2)) <> '');

-- 2. Create the Secondary View for Filters
CREATE OR REPLACE VIEW public.unique_ga4_modules AS
SELECT DISTINCT page_title
FROM ga4_page_metrics
WHERE ((page_title IS NOT NULL) AND (page_title <> ''::text))
ORDER BY page_title;

-- 3. Cleanup and Setup Automated Cron for Days Remaining
-- First, reset any dirty data in days_remaining column
UPDATE public.purchased_plans 
SET days_remaining = GREATEST(0, (expiry_date::date - CURRENT_DATE));

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a daily job to update days_remaining at midnight
-- Note: Requires 'cron' to be in 'shared_preload_libraries' in your project settings (Enabled by default on most Cloud projects)
SELECT cron.schedule(
    'update-days-remaining',
    '0 0 * * *',
    'UPDATE public.purchased_plans SET days_remaining = GREATEST(0, (expiry_date::date - CURRENT_DATE))'
);
```
