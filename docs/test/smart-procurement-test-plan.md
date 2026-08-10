# Smart Procurement - Test Plan

## 1. Mục tiêu

Tài liệu này chuẩn bị cho phần PA3, tập trung vào kiểm thử Database và API cho module Smart Procurement, đặc biệt là Supplier Management, Low-stock Alert và Batch/Expiration Tracking.

## 2. Test Plan

### 2.1. Database Testing Specification (Mô tả kỹ thuật kiểm thử Cơ sở dữ liệu)

#### Mục đích
Kiểm tra cấu trúc dữ liệu và các quy tắc nghiệp vụ liên quan đến Supplier, Product, Batch và Store Inventory để đảm bảo dữ liệu đúng chuẩn thiết kế và không vi phạm ràng buộc.

#### Nội dung kiểm thử
- Kiểm tra tính đúng đắn của mô hình dữ liệu theo chuẩn 3NF:
  - Mỗi bảng chỉ lưu một chủ thể dữ liệu rõ ràng.
  - Các thuộc tính phụ thuộc hoàn toàn vào khóa chính.
  - Tránh lưu trữ dữ liệu lặp lại ở nhiều bảng.
- Kiểm tra khóa ngoại (Foreign Key):
  - Supplier được tham chiếu bởi PurchaseOrder.
  - Product được tham chiếu bởi Batch, PurchaseOrderDetail và OrderDetail.
  - Batch được tham chiếu bởi StoreInventory.
  - StoreInventory kết nối Store và Batch.
- Kiểm tra ràng buộc dữ liệu:
  - supplier_name và contact_phone không được bỏ trống.
  - email phải đúng định dạng nếu được nhập.
  - không cho phép xóa Supplier nếu đang được sử dụng bởi PurchaseOrder.
- Kiểm tra tính nhất quán dữ liệu khi thêm/sửa/xóa bản ghi.

#### Kết quả mong đợi
- Không tồn tại dữ liệu vi phạm chuẩn 3NF.
- Không có bản ghi nào vi phạm ràng buộc khóa ngoại.
- Các thao tác thêm/sửa/xóa dữ liệu đều giữ tính nhất quán.

### 2.2. Boundary Value Analysis - BVA (Kỹ thuật phân tích giá trị biên cho Tồn kho)

#### Mục đích
Kiểm tra logic cảnh báo tồn kho tại các giá trị biên quanh ngưỡng MinThreshold để xác định hệ thống phản ứng đúng ở giới hạn.

#### Phân tích giá trị biên
Giả sử Product có min_threshold = 5, hệ thống cần kiểm tra các trường hợp sau:

| Trường hợp | Giá trị tồn kho | Kết quả mong đợi |
|---|---:|---|
| Dưới ngưỡng | 4 | Sinh cảnh báo low-stock |
| Bằng ngưỡng | 5 | Sinh cảnh báo low-stock |
| Trên ngưỡng | 6 | Không sinh cảnh báo |

#### Kết luận
Logic cảnh báo nên kích hoạt khi tồn kho nhỏ hơn hoặc bằng MinThreshold, và không kích hoạt khi tồn kho lớn hơn MinThreshold.

## 3. Test Case Specifications

### 3.2. Test Case Specifications

#### 📝 Test Case 1: Manage Suppliers Validation (TC-PROC-01)

| Field | Nội dung |
|---|---|
| ID | TC-PROC-01 |
| Tên testcase | Manage Suppliers Validation |
| Mục tiêu | Kiểm tra việc thêm/sửa nhà cung cấp đúng dữ liệu và validate các ràng buộc bắt buộc như supplier_name, contact_phone, email. |
| Preconditions | Hệ thống đã chạy, API Supplier sẵn sàng tại endpoint /api/suppliers/. |
| Test Steps | 1. Gửi request POST /api/suppliers/ với dữ liệu hợp lệ. 2. Gửi request PUT /api/suppliers/{id}/ để cập nhật thông tin. 3. Gửi request POST /api/suppliers/ thiếu supplier_name hoặc contact_phone. 4. Gửi request POST /api/suppliers/ với email sai định dạng. |
| Test Data | Hợp lệ: supplier_name="Alpha Supplies", contact_phone="0901234567", email="alpha@example.com". Không hợp lệ: thiếu supplier_name, thiếu contact_phone, email="not-an-email". |
| Expected Result | Request hợp lệ được lưu thành công; request không hợp lệ trả về lỗi 400 Bad Request và thông báo validation rõ ràng. |

#### 📝 Test Case 2: Low-Stock Alert Generation (TC-PROC-02)

| Field | Nội dung |
|---|---|
| ID | TC-PROC-02 |
| Tên testcase | Low-Stock Alert Generation |
| Mục tiêu | Kiểm tra hệ thống tự động sinh cảnh báo khi tồn kho giảm xuống dưới ngưỡng MinThreshold. |
| Preconditions | Có một sản phẩm với min_threshold = 5 và dữ liệu tồn kho hiện tại đã được thiết lập. |
| Test Steps | 1. Gửi request kiểm tra tồn kho với giá trị 6. 2. Gửi request kiểm tra tồn kho với giá trị 5. 3. Gửi request kiểm tra tồn kho với giá trị 4. |
| Test Data | quantity = 6, 5, 4 |
| Expected Result | Với quantity = 6: không sinh cảnh báo. Với quantity = 5 hoặc 4: hệ thống sinh cảnh báo low-stock. |

#### 📝 Test Case 3: Track Expiry Dates (TC-PROC-03)

| Field | Nội dung |
|---|---|
| ID | TC-PROC-03 |
| Tên testcase | Track Expiry Dates |
| Mục tiêu | Kiểm tra chức năng theo dõi lô hàng và xác định các sản phẩm sắp hết hạn dựa trên dữ liệu từ bảng BATCH. |
| Preconditions | Có dữ liệu Batch trong hệ thống với các expiration_date khác nhau. |
| Test Steps | 1. Tạo một Batch có expiration_date trong vòng 7 ngày tới. 2. Tạo một Batch có expiration_date xa hơn 7 ngày. 3. Gửi request xem danh sách batch/sản phẩm sắp hết hạn. |
| Test Data | Batch A: expiration_date = today + 5 days; Batch B: expiration_date = today + 10 days |
| Expected Result | Batch A được hiển thị trong danh sách sản phẩm sắp hết hạn; Batch B không được hiển thị trong danh sách đó. |

## 4. Kết luận

Các testcase trên phù hợp để dùng cho PA3, vì chúng vừa bao phủ kiểm thử cơ sở dữ liệu, kỹ thuật BVA và các kịch bản API/logic nghiệp vụ quan trọng của Smart Procurement.
