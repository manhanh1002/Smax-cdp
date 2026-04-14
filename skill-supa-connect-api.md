# Supabase Connection Skill (Self-hosted API)

This guide provides technical instructions for AI agents to interact with the Smax Analytics self-hosted Supabase instance on VPS.

## 1. Environment & Credentials

**Host:** `https://crm-db.cdp.vn`

| Key Type | Variable Name | Value |
| :--- | :--- | :--- |
| **API URL** | `NEXT_PUBLIC_SUPABASE_URL` | `https://crm-db.cdp.vn` |
| **Anon Key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NTk3NTU4MCwiZXhwIjoyMDkxMzQwMDMwLCJyb2xlIjoiYW5vbiJ9.t7aN49iJvUudmnHB4gxskcWN3Tm8Dy5dqcg2Ct-2-Ys` |
| **Service Role** | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NTk3NTU4MCwiZXhwIjo0OTMxNjQ5MTgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.KKG-VOKT2JhQArAv8Cqx9dEzQaltUz8A9XhVTlWC3VY` |
| **JWT Secret** | `JWT_SECRET` | `9oqnp0xoneb8lSCXulUnuL3Sd6CD5Z3o` |

---

## 2. Advanced Database Access (SQL Bridge)

Since direct SSH/TCP access is restricted, use the `exec_sql` RPC bridge for DDL (CREATE/ALTER) and complex joins.

### Execute Arbitrary SQL
**Endpoint:** `POST https://crm-db.cdp.vn/rest/v1/rpc/exec_sql`
**Payload:** `{"query": "YOUR_SQL_HERE"}`

> [!NOTE]
> This bridge returns `{"status": "success"}` on successful execution but does not return result rows by default in current implementation. Use standard REST endpoints for data retrieval.

---

## 3. Data Retrieval & Volume Handling

### High-Volume Querying (Pagination)
For tables like `ga4_page_metrics` (>400k rows), always use `.range()` or the `Range` header to avoid timeouts. The default Supabase limit is **1000**.

**Example (Node.js):**
```javascript
const { data } = await supabase
  .from('ga4_page_metrics')
  .select('*')
  .range(0, 999)
  .order('id', { ascending: true });
```

---

## 4. Admin Auth Operations

To manage users without manual UI interaction, use the Admin Auth API (GoTrue Admin).

### Create/Reset User
**Endpoint:** `POST https://crm-db.cdp.vn/auth/v1/admin/users`
**Headers:** Use `service_role` key.
**Actions:**
- Create: `POST` with `email`, `password`, `email_confirm: true`.
- Reset: `PUT` to `/auth/v1/admin/users/{user_id}` with new `password`.

---

## 5. Core Schema Reference

### Essential Views
- **`customer_profiles`**: Core CDP view joining biz, marketing, and GA4 data.
- **`unique_ga4_modules`**: List of unique page titles from GA4.

### Maintenance Tables
- **`supabase_functions.secrets`**: Stores Edge Function environment variables.
- **`cron` schema**: Used by `pg_cron` for scheduled syncing.
