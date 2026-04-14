# PRD: Trang /analytics — Smax Analytics CDP
**Version**: 1.0  
**Scope**: Thiết kế nội dung & data spec cho toàn bộ tab trong trang `/analytics`  
**Data sources**: `customer_profiles` view, `purchased_plans`, `marketing_leads`, `ga4_page_metrics`, `biz_plans`

---

## Tổng quan triết lý thiết kế

Trang `/analytics` không phải dashboard "nhìn cho đẹp" — đây là **bộ chỉ huy ra quyết định** cho 3 đội: Sales, Marketing, và Product. Mỗi tab phải trả lời được một câu hỏi kinh doanh cốt lõi trong vòng 5 giây nhìn vào màn hình.

| Tab | Câu hỏi cốt lõi |
|---|---|
| **Overview** | Hôm nay business đang khỏe không? |
| **Revenue** | Tiền vào từ đâu, bao nhiêu, ai mang lại? |
| **Marketing** | Kênh nào sinh ra khách tốt nhất, tốn ít nhất? |
| **Product Adoption** | Khách đang dùng gì, dùng nhiều không, ai sắp churn? |
| **Customer Lifecycle** | Pipeline trial→paid đang ở đâu, kẹt ở bước nào? |

---

## Tab 1 — Overview (Pulse Dashboard)

> **Mục tiêu**: Snapshot toàn cảnh trong 30 giây. Dành cho founder, team lead mở đầu ngày làm việc.

### Scorecards (hàng ngang, 5 cards)

| Card | Metric | Tính từ | Highlight logic |
|---|---|---|---|
| 💰 MRR hiện tại | Tổng `amount_vnd` các plan còn hạn / tháng | `purchased_plans` where `expiry_date >= today` | So sánh MoM, badge tăng/giảm % |
| 🧑‍💼 Khách Active | Đếm `biz_plans` where `status = 'Active'` | `biz_plans` | So sánh tuần trước |
| ⏳ Trial sắp hết | Đếm trial có `trial_expiry` trong 7 ngày tới | `biz_plans` | Badge đỏ nếu > 5 |
| 📈 Conversion Rate | `Active / (Active + Trial)` × 100 | `biz_plans` | Trend arrow so MoM |
| 🔁 New vs Expansion | % `is_first_purchase = true` vs false tháng này | `purchased_plans` | Donut mini inline |

### Charts

**1. Revenue Trend (Line chart — 12 tháng)**  
- X: tháng, Y: tổng `amount_vnd`  
- Hai lines: *New Revenue* (`is_first_purchase=true`) vs *Expansion Revenue*  
- Source: `purchased_plans` GROUP BY `DATE_TRUNC('month', purchase_date)`

**2. Customer Status Breakdown (Donut — realtime)**  
- Segments: Active / Trial / Trial sắp hết (<7 ngày) / Expired  
- Source: `biz_plans.status` + `trial_expiry`  
- Click vào slice → drill-down sang tab Customer Lifecycle

**3. Top 5 Sales Reps (Horizontal Bar)**  
- X: tổng revenue tháng này, Y: `sales_rep`  
- Source: JOIN `biz_plans` + `purchased_plans` on `alias_url`

### Filters toàn trang (Global Filter Bar)

- 📅 **Date Range**: Preset (7D / 30D / 90D / This Quarter / Custom)
- 👤 **Sales Rep**: Multi-select từ `biz_plans.sales_rep`
- 📦 **Plan Type**: Multi-select từ `biz_plans.current_plan`

---

## Tab 2 — Revenue Intelligence

> **Mục tiêu**: Hiểu dòng tiền, cơ cấu doanh thu, khách hàng giá trị cao.

### Scorecards (6 cards)

| Card | Metric | Công thức |
|---|---|---|
| 💵 Total Revenue (kỳ) | SUM `amount_vnd` trong date range | `purchased_plans` |
| 🆕 New Revenue | SUM where `is_first_purchase = true` | `purchased_plans` |
| 🔄 Expansion Revenue | SUM where `is_first_purchase = false` | `purchased_plans` |
| 📦 Avg Deal Size | AVG `amount_vnd` per `order_id` | `purchased_plans` |
| 🏆 Top Package | Package có tổng revenue cao nhất | `purchased_plans` GROUP BY `package_name` |
| ⚠️ Expiring Revenue | Tổng `amount_vnd` của plans hết hạn trong 30 ngày | `purchased_plans` where `expiry_date <= today+30` |

### Charts

**1. Revenue Waterfall (Bar chart)**  
- So sánh New vs Expansion vs Churned Revenue mỗi tháng  
- Giúp thấy net revenue growth thực sự

**2. Package Revenue Mix (Stacked Bar — theo tháng)**  
- Mỗi bar = tổng revenue, màu = `package_name`  
- Insight: package nào đang tăng trưởng, package nào đang sụt

**3. Revenue Heatmap — Ngày trong tháng (Calendar Heatmap)**  
- Mỗi ô = 1 ngày, màu intensity = tổng `amount_vnd` ngày đó  
- Phát hiện pattern: cuối tháng hay đầu tháng khách pay nhiều hơn?

**4. Top 20 Customers by LTV (Table + Sparkline)**  
- Cột: `biz_name`, `total_revenue_vnd`, `transaction_count`, `current_plan`, sparkline revenue theo thời gian  
- Sortable, click → mở CustomerSheet 360°

**5. Cohort Revenue Retention (Cohort Matrix)**  
- Rows = tháng acquisition, Cols = tháng tiếp theo (M0, M1, M2...)  
- Value = % khách còn generate revenue  
- Source: `purchased_plans` joined với `biz_plans.conversion_date`

### Filters

- 📅 Date Range
- 📦 Package Name (multi-select từ `purchased_plans.package_name`)
- 💱 Currency view: VND / USD toggle
- 🆕 Purchase Type: New / Expansion / All
- 👤 Sales Rep

---

## Tab 3 — Marketing Attribution

> **Mục tiêu**: Đo hiệu quả từng kênh, từng campaign. Giúp marketing allocate budget đúng chỗ.

### Scorecards (5 cards)

| Card | Metric | Công thức |
|---|---|---|
| 📥 Total Leads (kỳ) | Đếm rows `marketing_leads` theo `created_at` | `marketing_leads` |
| ✅ Converted Leads | Leads có `phone` match trong `biz_plans` Active | JOIN by `phone` |
| 📊 Lead→Customer Rate | Converted / Total × 100 | Tính từ trên |
| 💰 Revenue per Lead | Total revenue từ converted leads / total leads | JOIN `purchased_plans` |
| 🏅 Best Channel | `source` có Lead→Customer Rate cao nhất | GROUP BY `source` |

### Charts

**1. Lead Volume by Source (Bar chart — theo tuần)**  
- X: tuần, Y: số leads, màu: `source`  
- Thấy ngay kênh nào đang scale, kênh nào đang chết

**2. Lead Funnel by Source (Funnel chart)**  
- Mỗi source = 1 funnel: Lead → Matched → Trial → Converted  
- Insight: FB Ads mang nhiều lead nhưng convert ít?

**3. Campaign Performance Matrix (Scatter plot)**  
- X: Volume leads, Y: Conversion Rate  
- Bubble size: Revenue generated  
- Mỗi bubble = 1 campaign  
- 4 quadrants: Star / Volume Play / Niche Gem / Cut It

**4. Attribution Timeline (Area chart)**  
- X: ngày lead capture → ngày conversion  
- Đo "time to convert" trung bình per source  
- Insight: lead từ Organic mất bao nhiêu ngày để thành khách?

**5. Source × Plan Cross-tab (Heatmap table)**  
- Rows: `marketing_source`, Cols: `current_plan`  
- Value: số khách, màu: intensity  
- Insight: FB Ads ra khách plan Starter hay Pro?

### Filters

- 📅 Date Range (lead capture date)
- 📣 Source: multi-select từ `marketing_leads.source`
- 🎯 Campaign: multi-select từ `marketing_leads.campaign`
- ✅ Status: All leads / Converted only / Not converted

---

## Tab 4 — Product Adoption

> **Mục tiêu**: Hiểu khách đang dùng module nào, mức độ engage, ai có nguy cơ churn vì không dùng sản phẩm.

### Scorecards (5 cards)

| Card | Metric | Công thức |
|---|---|---|
| 👁️ Total Sessions (30D) | SUM `sessions` toàn bộ | `ga4_page_metrics` last 30 days |
| 🔥 Most Used Module | `page_title` có views cao nhất | GROUP BY `page_title` |
| 😴 Zero-Usage Customers | Khách Active nhưng 0 GA4 sessions 30 ngày | LEFT JOIN `customer_profiles` |
| 📉 Bounce Rate Avg | AVG(`bounces` / `sessions`) | `ga4_page_metrics` |
| 🚀 Fastest Growing Module | Module có views tăng nhiều nhất WoW | So sánh 2 kỳ 7 ngày |

### Charts

**1. Module Usage Ranking (Horizontal Bar — Top 10)**  
- Y: `page_title`, X: tổng `views` + `active_users`  
- Dual axis: views (bar) + active users (dot)

**2. Adoption Heatmap — Khách × Module (Matrix)**  
- Rows: top 30 khách (by revenue), Cols: top 10 modules  
- Value: số sessions  
- Màu xanh = dùng nhiều, trắng = không dùng  
- Ngay lập tức thấy "adoption gap" — khách trả nhiều tiền nhưng không dùng feature

**3. Usage Trend by Module (Multi-line chart — 30 ngày)**  
- Mỗi line = 1 module  
- Phát hiện module nào đang tăng traction, module nào bị bỏ rơi

**4. Engagement Scatter (Bubble plot)**  
- X: `sessions`, Y: `event_count / sessions` (events per session = depth of engagement)  
- Bubble size: `active_users`  
- Mỗi bubble = 1 module  
- Quadrant: High-Usage-Deep / High-Usage-Shallow / Niche-Deep / Dead Weight

**5. Zero-Usage Customer Table (Risk Table)**  
- Danh sách khách Active, `days_remaining` còn lại, 0 usage 30 ngày  
- Sortable by days remaining  
- CTA button: "Trigger Outreach" (future)  
- Source: `customer_profiles` LEFT JOIN `ga4_page_metrics` on `alias_url`

### Filters

- 📅 Date Range
- 📱 Module: multi-select từ `ga4_page_metrics.page_title`
- 📦 Plan Type
- ⚠️ Risk filter: "Chỉ hiện zero-usage customers"

---

## Tab 5 — Customer Lifecycle

> **Mục tiêu**: Quản lý pipeline trial→conversion, phát hiện điểm rơi rớt, dự báo revenue sắp hết hạn.

### Scorecards (5 cards)

| Card | Metric | Công thức |
|---|---|---|
| 🆕 New Trials (kỳ) | Đếm `biz_plans` có `status` = Trial, `created_at` trong range | `biz_plans` |
| ⚡ Converted This Period | Trial → Active trong kỳ | compare `conversion_date` |
| ⏰ Avg Trial Duration | AVG(`conversion_date` - `created_at`) cho converted | `biz_plans` |
| 💀 Trials Expired (no convert) | Trial quá `trial_expiry` không có `conversion_date` | `biz_plans` |
| 🎯 Trial Conversion Rate | Converted / (Converted + Expired) × 100 | Tính từ trên |

### Charts

**1. Trial Pipeline Funnel (Funnel chart — realtime)**  
- Stage 1: Total Trials  
- Stage 2: Trial còn active (chưa hết hạn)  
- Stage 3: Trial đã dùng sản phẩm (có GA4 activity)  
- Stage 4: Converted to Paid  
- Hiện drop-off % tại mỗi bước

**2. Conversion Velocity (Line chart)**  
- X: ngày, Y: số trial-to-paid conversions  
- Rolling 7-day average overlay  
- Giúp thấy: mùa nào convert nhiều, chiến dịch nào đẩy spike

**3. Days-to-Convert Distribution (Histogram)**  
- X: số ngày từ trial start đến convert, Y: số khách  
- Phát hiện: phần lớn convert trong ngày 1-3 hay cần 2 tuần?

**4. Expiring Plan Calendar (30-day forward view)**  
- Heatmap calendar: mỗi ngày = số plan hết hạn  
- Màu đỏ = nhiều plan expire = cần sales/CS action ngay  
- Source: `purchased_plans.expiry_date`

**5. Lifecycle Stage Table (Master CRM table)**  
- Cột: `biz_name`, `sales_rep`, `current_plan`, `status`, `trial_expiry` / `days_remaining`, `total_revenue_vnd`, `last_activity` (GA4)  
- Badge màu: 🟢 Healthy / 🟡 At Risk / 🔴 Critical  
- Logic badge:
  - 🟢 Active + GA4 sessions trong 14 ngày + >30 days remaining
  - 🟡 Active + ít/không có GA4 session OR <14 days remaining
  - 🔴 Trial <7 ngày còn lại OR zero usage 30 ngày

### Filters

- 📅 Date Range
- 🏷️ Status: Trial / Active / Expired
- 👤 Sales Rep
- ⚠️ Risk Level: Healthy / At Risk / Critical
- 📦 Plan Type

---

## Shared UI/UX Specs

### Global Filter Bar
Tất cả tabs kế thừa 1 global filter bar ở trên cùng:
- Sticky khi scroll
- Filter state sync vào URL params (shareable link)
- "Reset filters" button

### Color System (theo Smax design language)
```
Positive/Growth  → Emerald-500 (#10b981)
Negative/Risk    → Rose-500 (#f43f5e)
Neutral/Info     → Blue-500 (#3b82f6)
Warning          → Amber-500 (#f59e0b)
Background cards → zinc-50 / white với border zinc-100
```

### Chart Library Recommendation
- **Recharts** (đã có trong stack Next.js) cho Line, Bar, Area, Funnel  
- **@tremor/react** hoặc custom SVG cho Heatmap, Scatter, Cohort matrix  
- Tất cả charts phải có: loading skeleton, empty state message, tooltip đầy đủ context

### Data Fetching Pattern
- Mỗi scorecard = 1 Supabase RPC hoặc View query riêng biệt (parallel fetch)
- Charts dùng Server Components với `searchParams` cho filter
- Sử dụng `Suspense` boundary per section để progressive loading
- Cache: `revalidate = 300` (5 phút) cho aggregated metrics

---

## Implementation Priority

| Priority | Tab | Effort | Impact |
|---|---|---|---|
| P0 | Overview | Medium | Mở đầu ngày, mọi người đều dùng |
| P0 | Customer Lifecycle | Medium | Trực tiếp ảnh hưởng sales action |
| P1 | Revenue Intelligence | High | Báo cáo cho management |
| P1 | Marketing Attribution | Medium | Budget allocation decisions |
| P2 | Product Adoption | High | Cần GA4 JOIN logic phức tạp |

---

*PRD này là living document — cập nhật khi data model `customer_profiles` view thay đổi.*
