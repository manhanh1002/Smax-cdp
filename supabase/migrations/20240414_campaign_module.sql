-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment_id UUID REFERENCES public.dynamic_segments(id) ON DELETE CASCADE,
  trigger_mode TEXT NOT NULL CHECK (trigger_mode IN ('bulk', 'realtime')),
  action_type TEXT NOT NULL CHECK (action_type IN ('n8n', 'googlesheet')),
  action_config JSONB NOT NULL DEFAULT '{}',
  batch_size INTEGER NOT NULL DEFAULT 100, -- Default batch size for pagination
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused', 'completed')),
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_logs table
CREATE TABLE IF NOT EXISTS public.campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- business phone or equivalent ID in view
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated full access to campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to logs" ON public.campaign_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
