# PA4 Final Test & Evaluation Report — Member 2: Database & Smart Procurement Engine

* **Họ và tên**: Thành viên 2 (Database & Smart Procurement Engine)
* **Phân hệ phụ trách**: Smart Procurement & Inventory Alert Engine
* **Dự án**: Omnichannel Retail & POS Management System
* **Giai đoạn**: PA4 — Working Software & Automated Testing
* **Tệp báo cáo cá nhân**: `docs/test/final-report-m2.md`

---

## 1. Giới thiệu Phân hệ & Phạm vi Nhiệm vụ

Thành viên 2 chịu trách nhiệm thiết kế vật lý CSDL PostgreSQL chuẩn 3NF và phát triển toàn bộ phân hệ **Smart Procurement Engine**, bao gồm:
1. **Quản lý Nhà cung cấp (Supplier Management)**: Các API CRUD `/api/suppliers/` với đầy đủ ràng buộc dữ liệu.
2. **Quản lý Đơn đặt hàng nhập (Purchase Orders - PROC-2)**: API tạo đơn lồng nhau kèm sản phẩm/giá vốn trong giao dịch nguyên tử `transaction.atomic()` (ACID) tại `/api/purchase-orders/`.
3. **Theo dõi Tiến độ Vận chuyển (Shipment Tracking - PROC-3 / U010)**: API theo dõi thông tin lô hàng nhập `/api/shipments/` kèm cơ chế tự động chuyển trạng thái `Delayed` khi quá hạn.
4. **Thuật toán Cảnh báo Tồn kho Thấp (Low-Stock Alert Engine - PROC-4 / U011)**: Thuật toán JOIN tối ưu giữa `Product` và `StoreInventory` qua `Batch`, tự động phát cảnh báo khi tồn kho $Q \le MinThreshold$.
5. **Bộ kịch bản kiểm thử Postman & Katalon Studio (PROC-5 & PA4)**: Tự động hóa 100% kiểm thử Phân tích Giá trị Biên (BVA) và kiểm thử nhánh ngoại lệ A2.
6. **Bảo mật & Phân quyền RBAC (PROC-6 / Scrum 120)**: Tối ưu hóa JWT Token payload và áp dụng phân quyền vai trò (`Chain Manager` vs `Store Manager` vs `Cashier`).

---

## 2. Đặc tả Thiết kế CSDL PostgreSQL (Chuẩn 3NF)

Phân hệ Smart Procurement Engine được thiết kế tuân thủ nghiêm ngặt chuẩn 3NF và các ràng buộc dữ liệu:

* **Bảng `SUPPLIER`**: `supplier_id` (PK), `supplier_name` (Not Null), `contact_phone` (Not Null), `email`, `address`.
* **Bảng `PURCHASE_ORDER`**: `po_id` (PK), `supplier_id` (FK $\rightarrow$ `SUPPLIER`), `order_date`, `expected_delivery_date`, `status` (`Preparing`, `Delivered`, `Delayed`).
* **Bảng `PURCHASE_ORDER_DETAIL`**: `detail_id` (PK), `po_id` (FK $\rightarrow$ `PURCHASE_ORDER`), `product_id` (FK $\rightarrow$ `PRODUCT`), `order_qty` ($> 0$), `unit_cost` ($\ge 0$).
* **Bảng `INVENTORY_ALERT`**: `alert_id` (PK), `product_id` (FK), `store_id` (FK), `current_stock`, `min_threshold`, `created_at`, `is_resolved` (Boolean).

---

## 3. Đặc tả Các Test Cases (PA3 Test Specifications)

### 3.1. Test Case 1: Manage Suppliers Validation (`TC-PROC-01`)
* **Mục tiêu**: Kiểm tra tính chính xác của việc tạo/sửa nhà cung cấp và các quy tắc validation dữ liệu.
* **Các bước thực hiện**: Gửi request POST/PUT đến `/api/suppliers/` với dữ liệu hợp lệ và không hợp lệ (thiếu tên, thiếu SĐT, sai định dạng email).
* **Kết quả**: Request hợp lệ trả về `201 Created` / `200 OK`. Request không hợp lệ trả về `400 Bad Request`.

### 3.2. Test Case 2: Low-Stock Alert Generation (`TC-PROC-02`)
* **Mục tiêu**: Kiểm tra hệ thống tự động sinh cảnh báo khi tồn kho thực tế chạm mốc hoặc giảm dưới ngưỡng `min_threshold`.
* **Các bước thực hiện**: Gọi GET `/api/inventory/low-stock-alerts/` tại các mốc tồn kho khác nhau.
* **Kết quả**: Sinh cảnh báo khi $Q \le min\_threshold$; Không sinh cảnh báo khi $Q > min\_threshold$.

### 3.3. Test Case 3: Track Expiry Dates (`TC-PROC-03`)
* **Mục tiêu**: Theo dõi hạn sử dụng các lô hàng từ bảng `BATCH`.
* **Kết quả**: Phân loại chính xác các lô hàng sắp hết hạn (trong vòng 7 ngày) và hiển thị trên dashboard quản lý kho.

---

## 4. Kịch bản Kiểm thử Tự động Katalon Studio (Use Case U011 - PA4)

### 4.1. Kịch bản 1: `TC-U011-01` - BVA Boundary Value Analysis Test
* **Mục tiêu**: Kiểm thử tự động tính chính xác của thuật toán cảnh báo tồn kho tại các mốc giá trị biên quanh ngưỡng $T = 5$.
* **Ma trận dữ liệu kiểm thử**:
  - **Mốc $Q = 6$ ($Q > T$)**: Hệ thống **KHÔNG** sinh cảnh báo mới.
  - **Mốc $Q = 5$ ($Q == T$)**: Hệ thống sinh **1 cảnh báo biên** (`current_stock == 5`).
  - **Mốc $Q = 4$ ($Q < T$)**: Hệ thống sinh **1 cảnh báo thiếu hàng** (`current_stock == 4`).
* **Đoạn mã Script Katalon**:
```groovy
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.util.KeywordUtil

// Step 1: Authentication & Token Retrieval
def loginRes = WS.sendRequest(findTestObject('Auth/Login', [('username'): 'manager1', ('password'): 'password123']))
WS.verifyResponseStatusCode(loginRes, 200)
String token = WS.getElementPropertyValue(loginRes, 'access')

// Step 2: Test Boundary Q = 6 (Above Threshold)
WS.sendRequest(findTestObject('Inventory/SetStock', [('token'): token, ('quantity'): 6]))
def resQ6 = WS.sendRequest(findTestObject('Inventory/GetAlerts', [('token'): token, ('is_resolved'): 'false']))
WS.verifyResponseStatusCode(resQ6, 200)
assert WS.getElementPropertyValue(resQ6, '').findAll { it.current_stock > it.min_threshold && !it.is_resolved }.size() == 0

// Step 3: Test Boundary Q = 5 (At Threshold)
WS.sendRequest(findTestObject('Inventory/SetStock', [('token'): token, ('quantity'): 5]))
def resQ5 = WS.sendRequest(findTestObject('Inventory/GetAlerts', [('token'): token, ('is_resolved'): 'false']))
WS.verifyResponseStatusCode(resQ5, 200)
assert WS.getElementPropertyValue(resQ5, '[0]').current_stock == 5

// Step 4: Test Boundary Q = 4 (Below Threshold)
WS.sendRequest(findTestObject('Inventory/SetStock', [('token'): token, ('quantity'): 4]))
def resQ4 = WS.sendRequest(findTestObject('Inventory/GetAlerts', [('token'): token, ('is_resolved'): 'false']))
WS.verifyResponseStatusCode(resQ4, 200)
assert WS.getElementPropertyValue(resQ4, '[0]').current_stock == 4

KeywordUtil.markPassed("TC-U011-01 BVA Test PASSED")
```
* **Kết quả**: **PASSED (100%)**

### 4.2. Kịch bản 2: `TC-U011-02` - Notification Fault Recovery (Branch A2)
* **Mục tiêu**: Kiểm thử khả năng chịu lỗi và tính bền vững dữ liệu khi dịch vụ gửi thông báo gặp sự cố.
* **Các bước thực hiện**: Giả lập sự cố dịch vụ push notification bị lỗi/timeout $\rightarrow$ Gọi API quét tồn kho $\rightarrow$ Kiểm tra bản ghi cảnh báo trong CSDL PostgreSQL.
* **Kết quả**: Bản ghi cảnh báo vẫn được lưu giữ an toàn trong CSDL với `is_resolved=False` và `current_stock=4`.
* **Trạng thái**: **PASSED (100%)**

---

## 5. Kết quả Kiểm thử Hồi quy Hệ thống (Regression Testing Results)

### 5.1. Automated Unit Test Suite (Django / Docker)
Chạy câu lệnh kiểm thử tự động toàn bộ ứng dụng `core` trong container backend Docker:
```bash
docker compose exec -T backend python manage.py test core
```
* **Kết quả**: **32/32 tests PASSED** (thời gian chạy: 5.2s, 0 errors, 0 failures).

### 5.2. Postman Collection Testing
Bộ kịch bản kiểm thử Postman v2.1.0 (`docs/test/Procurement_Alerts.postman_collection.json`) tự động hóa 100% Pre-request scripts và Assertions cho tất cả các endpoint:
- `POST /api/login/` (JWT Authentication)
- `GET /api/suppliers/` & `POST /api/suppliers/`
- `POST /api/purchase-orders/` & `PATCH /api/purchase-orders/1/status/`
- `GET /api/shipments/` & `POST /api/shipments/check-overdue/`
- `GET /api/inventory/low-stock-alerts/` & `PATCH /api/inventory/low-stock-alerts/1/resolve/`

---

## 6. Bàn giao Dữ liệu Demo (Handoff Seed Data for Member 5)

Để phục vụ Thành viên 5 quay video demo sản phẩm (Working Software Demo), Thành viên 2 đã đóng gói câu lệnh khởi tạo dữ liệu tự động:
```bash
docker compose exec -T backend python manage.py seed_procurement_data
```

Dữ liệu khởi tạo bao gồm:
1. 3 Nhà cung cấp chuẩn (`Vinamilk Supplier Co.`, `Unilever Vietnam`, `Masan Consumer Group`).
2. 3 Sản phẩm có `min_threshold = 10` với mức tồn kho mấp mé ngưỡng BVA ($Q = 11, 10, 5$).
3. Đơn đặt hàng nhập mẫu `#1` sẵn sàng cho thao tác demo đổi trạng thái và xem tiến độ vận chuyển.

---

## 7. Tổng kết & Tự Đánh giá

* **Tình trạng hoàn thành**: Hoàn thành **100%** các mục tiêu PA4 theo đúng phân công và tiến độ.
* **Chất lượng sản phẩm**: Mã nguồn backend đạt chuẩn ACID, bảo mật RBAC, phủ 32 bài unit test tự động và tài liệu kiểm thử Katalon đầy đủ.
