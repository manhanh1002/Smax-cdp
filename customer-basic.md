# Tài liệu Hệ thống Customer Intelligence (CDP) - Tiền khả thi

Tài liệu này mô tả các trường dữ liệu và tính năng hiện có của module Quản lý Khách hàng trong hệ thống Smax Analytics.

---

## 1. Trang danh sách khách hàng (`/customers`)

Trang này cung cấp một giao diện quản trị tập trung (Audience Dashboard), cho phép lọc và tìm kiếm khách hàng dựa trên dữ liệu tích hợp từ nhiều nguồn.

### A. Các trường dữ liệu trong bảng (Columns)
- **Business / Contact**: 
    - **Biz Name**: Tên doanh nghiệp/tên tài khoản smax.
    - **Contact Info**: Hiển thị SĐT, Email hoặc Alias URL (địa chỉ định danh trên hệ thống).
- **Status**: 
    - **Plan Badge**: Nhãn gói dịch vụ hiện tại (PRO - màu xanh, FREE - màu xám).
    - **Trial Status**: Tình trạng dùng thử (Hết trial - Đỏ, Sắp hết trial - Vàng, Trial - Xám).
- **LTV (VND)**: Lifetime Value - Tổng doanh thu lũy kế khách hàng đã thanh toán.
- **All Time Traffic**: Tổng lượng người dùng (Users) được ghi nhận từ Google Analytics 4 tính từ lúc bắt đầu đo lường.
- **Attribution**: Nguồn dẫn khách hàng tới hệ thống (Marketing Source), giúp xác định hiệu quả kênh quảng cáo.

### B. Các tính năng tương tác
- **Audience Overview Count**: Hiển thị tổng số hồ sơ khách hàng khớp với bộ lọc hiện tại.
- **Tìm kiếm (Search)**: Tìm kiếm theo từ khóa (Tên Biz, Phone, Email) với kết quả trả về tức thì.
- **Nút Tải CSV (Download CSV)**: 
    - Xuất toàn bộ danh sách khách hàng đang hiển thị (đã áp dụng filter).
    - Dữ liệu CSV bao gồm đầy đủ các cột chi tiết: LTV, Marketing Source/Campaign, danh sách Module sử dụng, và các mốc thời gian quan trọng.
- **Bộ lọc đa năng (Filter Bar)**:
    - **Segment**: Chọn các phân khúc khách hàng đã lưu. *Lưu ý: Khi chọn Segment, các bộ lọc khác sẽ được vô hiệu hóa để ưu tiên quy tắc của Segment.*
    - **Plan**: Lọc theo loại tài khoản (PRO, FREE).
    - **GA4 Status**: Lọc khách hàng có/không có dữ liệu hành vi.
    - **Package**: Lọc dựa trên việc khách hàng đã từng mua gói cụ thể nào (PRO, GEN_AI, ZALO_ZNS).
    - **Trial Status**: Lọc theo tình trạng hạn dùng thử.

---

## 2. Customer Dialog (Chi tiết 360 độ)

Khi nhấn vào một dòng bất kỳ trên bảng, một Sheet thông tin chi tiết sẽ hiện ra từ bên phải.

### A. Chỉ số nhanh (Quick Stats Grid)
- **LTV (Revenue)**: Tổng chi tiêu của doanh nghiệp.
- **Total Orders**: Tổng số lượt thanh toán đơn hàng.
- **All Time Traffic**: Tổng số người dùng truy cập.
- **All Time Events**: Tổng hoạt động/sự kiện thực hiện trên hệ thống.

### B. Các Tab chức năng
- **Overview (Tổng quan)**: 
    - Hiển thị danh tính cơ bản và Marketing Attribution.
    - Giúp xác định khách hàng này đến từ chiến dịch (Campaign) nào.
- **Purchase Journey (Hành trình mua sắm)**: 
    - Timeline danh sách tất cả các đơn hàng đã mua.
    - Hiển thị: Tên gói, Số tiền (VND), và Ngày giao dịch.
- **GA4 Behavior (Hành vi hành trình - All Time)**:
    - Danh sách các Module/Trang tính năng được sử dụng nhiều nhất.
    - Thống kê chi tiết từng Module: Tên Module (Title), Đường dẫn (Path), Số Users và Số Events của riêng module đó.

---

## 3. Quản lý phân khúc (`/customers/segments`)

Hệ thống cho phép lưu trữ các bộ lọc phức tạp thành "Segment" để tái sử dụng.
- **Quy tắc (Rules)**: Cho phép lọc theo mọi trường dữ liệu từ doanh thu, truy cập đến lịch sử sử dụng module.
- **Toán tử**: Hỗ trợ các phép so sánh (==, >=, <=) và các phép lọc đặc biệt như "Within last X days" hoặc "Is Any" (có hoạt động).
- **Lưu trữ**: Các phân khúc được lưu trực tiếp vào Supabase và đồng bộ hóa ngay lập tức với trang Dashboard chính.
