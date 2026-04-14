# Supabase Connection Skill

This guide provides instructions for AI agents to connect to and interact with the Supabase instance at `https://db.cdp.vn`.

## 1. Direct REST API Access
You can interact with the database tables through the PostgREST API using the Service Role Key.

**Base URL:** `https://db.cdp.vn/rest/v1`
**Headers:**
- `apikey`: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NDMyNzE0MCwiZXhwIjo0OTMwMDAwNzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.6qqm8ZjHqQRMJEH8ra-OKcKXkQq3S3oGxhftM9J687A`
- `Authorization`: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NDMyNzE0MCwiZXhwIjo0OTMwMDAwNzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.6qqm8ZjHqQRMJEH8ra-OKcKXkQq3S3oGxhftM9J687A`

> [!IMPORTANT]
> To discover all tables via the REST API, you **MUST** use a trailing slash in the URL: `https://db.cdp.vn/rest/v1/`.

**Example: Listing all tables**
```bash
curl -s -H "apikey: <SERVICE_ROLE_KEY>" -H "Authorization: Bearer <SERVICE_ROLE_KEY>" https://db.cdp.vn/rest/v1/ | jq '.paths | keys'
```

---

## 2. Discovered Tables (Schema Reference)
As of March 30, 2026, the following core tables are active in the `public` schema:
- `ai_insight_conversations`: Holds customer metadata, product interest, and summary.
- `ai_insight_messages`: **(New)** Stores granular chat history linked to `conversation_id`.
- `leads`: Primary CRM data source.

---

## 3. Connection Strategy (Firewall Survival)
> [!IMPORTANT]
> **DO NOT USE PORT 5432**. Direct TCP connection to `db.cdp.vn:5432` is firewalled and will reliably timeout.

### Strategy A: Data Operations (Fastest)
Use the **Supabase SDK** or **REST API (Port 443)** for standard CRUD:
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(URL, KEY)
const { data } = await supabase.from('ai_insight_messages').select('*')
```

### Strategy B: DDL & Admin Operations
Use the **MCP Bridge** (`https://db.cdp.vn/mcp`) for `CREATE TABLE`, `ALTER`, or complex SQL joins:
```bash
npx -y tsx -e '
// Use MCP SDK to call "execute_sql" tool
const query = "CREATE TABLE new_table (...)";
const res = await client.callTool({ name: "execute_sql", arguments: { query } });
'
```

---

## 4. MCP (Model Context Protocol) Connection
**MCP Endpoint:** `https://db.cdp.vn/mcp`

### Available Tools
- **`list_tables`**: Get all table names.
- **`describe_table`**: Get column definitions for a specific table.
- **`execute_sql`**: Run any SQL query (SELECT, INSERT, UPDATE, DELETE, DDL).

---

## 5. Key Security Note
> [!NOTE]
> Ensure your IP is in the Kong `ip-restriction` allow list if REST/MCP calls return 403 or timeout.

---

## 6. Edge Functions (Self-hosted)
To manage Edge Functions on `db.cdp.vn`, use the Supabase CLI.

**Project Configuration:**
- **Project URL:** `https://db.cdp.vn`
- **Project Ref:** `default`
- **Region:** `Self-hosted`

### A. Deploying a New Function
```bash
# 1. Initialize Supabase (if not done)
npx supabase init

# 2. Create a new function
npx supabase functions new my-test-function

# 3. Deploy to self-hosted instance
# Note: Ensure the API URL and Service Role Key are used
npx supabase functions deploy my-test-function \
  --project-ref default \
  --url https://db.cdp.vn \
  --service-role-key <SERVICE_ROLE_KEY> \
  --no-verify-jwt
```

### B. Managing Secrets
```bash
npx supabase secrets set MY_SECRET_KEY=my_secret_value \
  --project-ref default \
  --url https://db.cdp.vn \
  --service-role-key <SERVICE_ROLE_KEY>
```

---

## 7. Database Functions (via MCP)
If you cannot use the CLI, you can create database functions (SQL) via the MCP Bridge to serve as API endpoints (RPC). These can be called via `supabase.rpc()` or the REST API.

**Example: Creating a Test Echo function**
```bash
npx -y tsx -e '
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "mcp-remote", "https://db.cdp.vn/mcp"],
  });
  const client = new Client({ name: "agent", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  
  const sql = `
    CREATE OR REPLACE FUNCTION public.mcp_test_echo(input_text text)
    RETURNS json AS $$
    BEGIN
      RETURN json_build_object(
        $s$status$s$, $s$success$s$,
        $s$echo$s$, input_text,
        $s$bridge$s$, $s$https://db.cdp.vn/mcp$s$
      );
    END;
    $$ LANGUAGE plpgsql;
  `;
  const res = await client.callTool({ name: "execute_sql", arguments: { query: sql } });
  console.log("Result:", JSON.stringify(res));
  await client.close();
}
main();
'
```
