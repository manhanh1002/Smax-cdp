# Smax Analytics CDP - Architecture & Data Flow

This document serves as the technical single source of truth for AI agents and developers working on the Smax Analytics Customer Data Platform (CDP).

## 1. High-Level Architecture
The project is built around a modern, serverless Next.js stack heavily relying on Supabase for data integration and Postgres-level aggregation.
- **Frontend Framework**: Next.js 14+ (App Router)
- **Styling & UI**: Tailwind CSS, Shadcn UI (Customized for premium aesthetics), Lucide React.
- **Backend & Database**: Supabase (PostgreSQL, Edge Functions, pg_cron).

## 2. The CDP Data Model 
The core philosophy of this project is to ingest fragmented data from Google Sheets (Sales/Marketing) and GA4 (Product Usage), and unify them into a **360-degree Customer Profile View** directly at the Database layer.

### Raw Data Tables
These tables are purely synchronization targets. You should rarely write to them manually from the App.

#### 1. `biz_plans`
Stores core Business profiles synced from Google Sheets.
- `external_id` (PK): Composite ID linking to Sheet row.
- `biz_name`, `email`, `phone`: Core contact info.
- `alias_url`, `website`: Business domain identifiers.
- `current_plan`, `previous_plan`: Subscription tier.
- `status`: Trial/Active status (e.g., "Sắp hết trial").
- `conversion_date`, `trial_expiry`: Key lifecycle dates.
- `sales_rep`, `company_size`, `expected_revenue`: Sales meta-data.

#### 2. `purchased_plans`
Stores all transactional orders.
- `order_id` (PK): Unique transaction identifier.
- `biz_name`, `alias_url`: Links back to the business.
- `package_name`: The module/package bought.
- `amount_usd`, `amount_vnd`: Normalized pricing (from `parseVnNumber`).
- `purchase_date`, `expiry_date`, `days_remaining`: Plan duration logic.
- `is_first_purchase`: Boolean tracking new revenue vs expansions.

#### 3. `marketing_leads`
Stores marketing touchpoints and ads attribution.
- `external_id` (PK): Tied to FB Lead / timestamp.
- `lead_name`, `email`, `phone`: Contact info for matching (`phone` is primary join key).
- `source`: The ad network or referrer (e.g., "FB Ads / Value Optimization").
- `campaign`: The specific campaign targeted.
- `created_at`: Lead capture date.

#### 4. `ga4_page_metrics`
Stores product usage parsed from Google Analytics 4 URLs.
- `id` (PK): Auto-generated UUID.
- `date`: Sync date for incremental batches.
- `page_path`: The raw URL (e.g., `/app/module/123`), matched against `alias_url`.
- `page_title`: Human-readable module name.
- `views`, `active_users`, `new_users`, `sessions`, `bounces`, `event_count`: Engagement telemetry.

#### 5. `dynamic_segments`
Stores user-defined dynamic queries.
- `id` (PK): UUID.
- `name`, `description`: Human-readable segment info.
- `rules` (JSONB): Array of rules (e.g., `[{"field": "total_revenue_vnd", "operator": ">=", "value": 1000000}]`).
- `match_type`: Logical grouping (`AND` or `OR`).

### The Unified Engine: `customer_profiles` (SQL View)
Instead of doing heavy Javascript processing, we use a powerful PostgreSQL View called `customer_profiles`.
- **Core Fields Engine**: Exposes `biz_name`, `phone`, `email`, `alias_url`, `current_plan`, `biz_status`.
- **Calculated Rollups**: `total_revenue_vnd`, `transaction_count`, `total_visitors_30d`, `total_events_30d`.
- **Attribution**: `marketing_source` & `marketing_campaign` (MAX aggregated via phone match).
- **JSONB Arrays**: `transactions` (array of `purchased_plans`), `module_usage` (array of top GA4 titles).
- `dynamic_segments`: A table storing user-defined rules (`jsonb` format) creating complex "AND/OR" conditional logic to filter the `customer_profiles` view dynamically in the Segment Builder UI.

## 3. Background Syncs (Supabase Edge Functions)
Data is kept fresh via automated Edge Functions located in `supabase/functions/`.
- **`sync-google-sheets`**: Connects to the designated Google Sheet using a Service Account. Crucial logic here includes `parseVnNumber()` which correctly converts Vietnamese currency strings formatted like `191.523,74` (dots for thousands, commas for decimal) into numeric floats to prevent DB pollution. Also correctly maps `Leads marketing` sources and campaigns up to column J.
- **`sync-ga4`**: Queries the GA4 Data API. Implements historical backfill logic and incremental daily syncs by tracking the most recent `date` in the DB.

## 4. Key UI/UX Patterns
- **Directory**: The core CDP logic lives around `app/dashboard/customers` and `components/customers/`.
- **Server Components Pagination**: Data tables should use Supabase `range()` combined with URL searchParams for Server-Side pagination to handle large datasets effectively (as seen in `CustomerTable.tsx`).
- **Premium Aesthetics**: The project emphasizes visually stunning analytics dashboards. Always prefer vibrant Emerald/Blue themes, rounded-2xl cards, subtle backgrounds (`bg-zinc-50`), and micro-animations over default "boring" admin tables.
- **CustomerSheet (360 Dialog)**: Instead of directing users to a new page, clicking a customer opens a rich, wide (900px) sliding Side Sheet displaying Timeline transactions and All-Time GA4 usages.

## 5. Agent Instructions for Future Development
- **Modifying Data Mapping**: If external Google Sheets columns change, update `sync-google-sheets/index.ts` and ensure to re-deploy via MCP Supabase server (`mcp_supabase_deploy_edge_function`).
- **Adding to CDP**: To add new attributes to users, add columns to the respective raw table, then strictly update the `customer_profiles` SQL View using `CREATE OR REPLACE VIEW...` to expose it to the Next.js frontend.
- **Tailwind Setup**: Do not use ad-hoc vanilla CSS. Adhere strictly to the tailwind ecosystem in place. 
