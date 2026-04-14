# Campaign Module PRD (Product Requirements Document)

## 1. Overview
Hệ thống Campaign (Chiến dịch) cho phép người dùng tự động hóa việc đẩy dữ liệu khách hàng từ các **Segments** đã phân loại sang các nền tảng bên thứ ba (N8N, Google Sheets) để thực hiện các kịch bản chăm sóc khách hàng hoặc lưu trữ.

---

## 2. Triggers (Điều kiện kích hoạt)
Mỗi chiến dịch sẽ được gắn với một **Segment** duy nhất. Dữ liệu đầu vào của chiến dịch là danh sách khách hàng thuộc Segment đó.

- **Segment Linkage**: Chiến dịch sẽ sử dụng ID của `dynamic_segments` để xác định tập khách hàng mục tiêu.

---

## 3. Actions (Hành động xử lý)
Hệ thống hỗ trợ 2 loại kết nối (Connectors) chính:

### A. Webhook (N8N / Custom API)
- **Cấu hình**: Webhook URL.
- **Dữ liệu đẩy**: JSON object chứa thông tin khách hàng (phù hợp với cấu trúc `customer_profiles`).
- **Mục đích**: Kích hoạt workflow tự động trên N8N hoặc hệ thống nội bộ khác.

### B. Google Sheets
- **Cấu hình**: Spreadsheet ID, Sheet Name, OAuth Credentials (nếu cần).
- **Dữ liệu đẩy**: Các dòng (rows) dữ liệu khách hàng.
- **Mục đích**: Lưu trữ, báo cáo hoặc chia sẻ dữ liệu dễ dàng.

---

## 4. Execution Modes (Chế độ vận hành)

Hệ thống hỗ trợ 2 chế độ đẩy dữ liệu linh hoạt:

### Chế độ 1: Bulk Mode (Đẩy toàn bộ dữ liệu)
- **Mô tả**: Quét toàn bộ khách hàng hiện tại đang thuộc Segment và đẩy qua Action.
- **Kỹ thuật**: 
    - Sử dụng **Pagination API** để quét lần lượt (tránh quá tải/timeout).
    - Có trạng thái (Status) báo cáo tiến độ (ví dụ: "Đã xử lý 500/1200 khách hàng").

### Chế độ 2: Real-time Mode (Đẩy tự động khách mới)
- **Mô tả**: Tự động kích hoạt hành động ngay khi có khách hàng mới thỏa mãn điều kiện của Segment.
- **Kỹ thuật**: 
    - Database Trigger + Supabase Edge Functions.
    - Khi dữ liệu (như `biz_plans`, `purchased_plans`) thay đổi, Edge Function sẽ kiểm tra lại Segment Rules.
    - Nếu khách hàng "vào" Segment, tiến hành đẩy dữ liệu ngay lập tức.

---

## 5. Proposed Database Schema

### Table: `campaigns`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Khóa chính |
| `name` | text | Tên chiến dịch |
| `segment_id` | uuid | Tham chiếu đến `dynamic_segments` |
| `trigger_mode` | text | 'bulk' hoặc 'realtime' |
| `action_type` | text | 'n8n' hoặc 'googlesheet' |
| `action_config` | jsonb | Chứa URL, API Key, Sheet ID... |
| `status` | text | 'active', 'paused', 'completed' |
| `last_run` | timestamp | Thời gian chạy gần nhất |
| `created_at` | timestamp | Thời gian tạo |

### Table: `campaign_logs` (Theo dõi lịch sử đẩy dữ liệu)
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Khóa chính |
| `campaign_id` | uuid | Tham chiếu đến `campaigns` |
| `external_id` | text | ID khách hàng được xử lý |
| `status` | text | 'success' hoặc 'failed' |
| `error` | text | Nội dung lỗi nếu thất bại |
| `sent_at` | timestamp | Thời gian gửi |

---

## 6. UI/UX Workflow (Dự kiến)
1. **Bước 1 (Chọn Segment)**: Người dùng chọn 1 Segment đã tạo ở `/customers/segments`.
2. **Bước 2 (Chọn Action)**: Chọn N8N (Webhook) hoặc Google Sheet.
3. **Bước 3 (Cấu hình Chế độ)**: Chọn "Đẩy ngay toàn bộ" hoặc "Tự động đẩy khách mới".
4. **Bước 4 (Kích hoạt)**: Kiểm tra cấu hình và nhấn Activate.
5. **Bước 5 (Monitoring)**: Theo dõi số lượng khách hàng đã được đẩy qua màn hình Dashboard của Campaign.
