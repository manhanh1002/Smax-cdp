-- 1. Table for "List biz free -> Pro"
CREATE TABLE IF NOT EXISTS public.biz_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biz_name TEXT,
  email TEXT,
  previous_plan TEXT,
  current_plan TEXT,
  conversion_date TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  external_id TEXT UNIQUE -- To prevent duplicates from Sheets
);

-- 2. Table for "Database gói cước vừa mua"
CREATE TABLE IF NOT EXISTS public.purchased_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT,
  package_name TEXT,
  amount DECIMAL(12, 2),
  purchase_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_id TEXT UNIQUE -- To prevent duplicates from Sheets
);

-- 3. Table for "Leads marketing"
CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name TEXT,
  email TEXT,
  source TEXT,
  campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  external_id TEXT UNIQUE -- To prevent duplicates from Sheets
);

-- 4. Table for Google Analytics 4 (GA4) Metrics
CREATE TABLE IF NOT EXISTS public.ga4_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 4),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date) -- One entry per day
);

-- Enable RLS
ALTER TABLE public.biz_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchased_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga4_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view data
CREATE POLICY "Allow authenticated readers" ON public.biz_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated readers" ON public.purchased_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated readers" ON public.marketing_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated readers" ON public.ga4_metrics FOR SELECT TO authenticated USING (true);
