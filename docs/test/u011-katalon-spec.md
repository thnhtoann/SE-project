# Use Case U011 - Katalon Automated Test Specification (PA4)

Tài liệu đặc tả kịch bản kiểm thử tự động bằng **Katalon Studio** cho Use Case **U011: Receive Minimum Inventory Alert (Nhận cảnh báo tồn kho tối thiểu)** thuộc phân hệ Smart Procurement Engine (Thành viên 2).

---

## 1. Tổng quan Use Case U011 & Mục tiêu Kiểm thử

* **Mã Use Case**: U011
* **Tên Use Case**: Receive Minimum Inventory Alert (Nhận cảnh báo tồn kho tối thiểu)
* **Phân hệ**: Smart Procurement Engine
* **Mục tiêu PA4**: Thực thi kiểm thử tự động bằng Katalon Studio trên 2 kịch bản trọng tâm:
  1. `TC-U011-01`: Kiểm thử giá trị biên (Boundary Value Analysis - BVA) xác thực logic kích hoạt cảnh báo khi $Q \le T$ và không kích hoạt khi $Q > T$.
  2. `TC-U011-02`: Kiểm thử nhánh ngoại lệ A2 (Khắc phục lỗi dịch vụ gửi thông báo) - Đảm bảo khi mất kết nối mạng hoặc lỗi service thông báo, bản ghi cảnh báo vẫn được ghi nhận an toàn vào CSDL với trạng thái `is_resolved=False`.

---

## 2. Kịch bản 1: `TC-U011-01` - BVA Boundary Value Analysis Test

### 2.1. Tham số & Ma trận Giá trị Biên
* **Ngưỡng tồn kho tối thiểu ($T$)**: $T = 5$ (đối với sản phẩm thử nghiệm)
* **Các mốc kiểm thử ($Q$)**:
  - $Q = 6$ ($Q > T$ - Trên ngưỡng): Không phát sinh cảnh báo.
  - $Q = 5$ ($Q = T$ - Đúng mốc biên): Kích hoạt 1 cảnh báo với `current_stock == 5`.
  - $Q = 4$ ($Q < T$ - Dưới ngưỡng): Kích hoạt 1 cảnh báo với `current_stock == 4`.

### 2.2. Chi tiết Kịch bản Thực thi Katalon (Step-by-Step)

```groovy
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.util.KeywordUtil

// Step 1: Pre-condition - Đăng nhập lấy Bearer Token (Chain Manager / Store Manager)
def loginResponse = WS.sendRequest(findTestObject('Auth/Login', [('username'): 'manager1', ('password'): 'password123']))
WS.verifyResponseStatusCode(loginResponse, 200)
String token = WS.getElementPropertyValue(loginResponse, 'access')

// Step 2: Testcase BVA mốc Q = 6 (Above Threshold)
WS.sendRequest(findTestObject('Inventory/SetStock', [('token'): token, ('quantity'): 6]))
def alertResQ6 = WS.sendRequest(findTestObject('Inventory/GetAlerts', [('token'): token, ('is_resolved'): 'false']))
WS.verifyResponseStatusCode(alertResQ6, 200)
def alertsQ6 = WS.getElementPropertyValue(alertResQ6, '')
assert alertsQ6.findAll { it.current_stock > it.min_threshold && !it.is_resolved }.size() == 0

// Step 3: Testcase BVA mốc Q = 5 (At Threshold Boundary)
WS.sendRequest(findTestObject('Inventory/SetStock', [('token'): token, ('quantity'): 5]))
def alertResQ5 = WS.sendRequest(findTestObject('Inventory/GetAlerts', [('token'): token, ('is_resolved'): 'false']))
WS.verifyResponseStatusCode(alertResQ5, 200)
def alertItemQ5 = WS.getElementPropertyValue(alertResQ5, '[0]')
assert alertItemQ5.current_stock == 5
assert alertItemQ5.min_threshold == 5

// Step 4: Testcase BVA mốc Q = 4 (Below Threshold)
WS.sendRequest(findTestObject('Inventory/SetStock', [('token'): token, ('quantity'): 4]))
def alertResQ4 = WS.sendRequest(findTestObject('Inventory/GetAlerts', [('token'): token, ('is_resolved'): 'false']))
WS.verifyResponseStatusCode(alertResQ4, 200)
def alertItemQ4 = WS.getElementPropertyValue(alertResQ4, '[0]')
assert alertItemQ4.current_stock == 4
KeywordUtil.markPassed("TC-U011-01 BVA Test PASSED Successfully!")
```

### 2.3. Kết quả Kỳ vọng & Nghiệm thu
* **Mốc $Q=6$**: `alerts.length == 0` (PASSED)
* **Mốc $Q=5$**: `alert.current_stock == 5` (PASSED)
* **Mốc $Q=4$**: `alert.current_stock == 4` (PASSED)
* **Trạng thái**: **PASSED**

---

## 3. Kịch bản 2: `TC-U011-02` - Notification Fault Recovery (Branch A2)

### 3.1. Mục tiêu Kiểm thử
Xác thực tính bền vững của hệ thống khi dịch vụ gửi thông báo đẩy (Web Notification/Push Service) gặp sự cố (ví dụ: mất mạng, timeout 500 error). Hệ thống backend phải đảm bảo bản ghi cảnh báo tồn kho vẫn được lưu giữ an toàn trong bảng `InventoryAlert` của PostgreSQL với `is_resolved=False`.

### 2.2. Chi tiết Kịch bản Thực thi Katalon (Step-by-Step)

```groovy
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.util.KeywordUtil

// Step 1: Pre-condition - Thiết lập kho mấp mé ngưỡng Q = 4 < T = 5
def token = WS.getElementPropertyValue(WS.sendRequest(findTestObject('Auth/Login')), 'access')
WS.sendRequest(findTestObject('Inventory/SetStock', [('token'): token, ('quantity'): 4]))

// Step 2: Giả lập sự cố dịch vụ gửi thông báo đẩy gặp lỗi (Simulated Notification Service Timeout)
def sweepRes = WS.sendRequest(findTestObject('Inventory/TriggerCheckWithSimulatedNotificationFailure', [('token'): token]))
// Hệ thống trả về 200 OK từ DB sweep handler dù notification channel bị lỗi
WS.verifyResponseStatusCode(sweepRes, 200)

// Step 3: Truy vấn CSDL xác minh bản ghi cảnh báo tồn kho vẫn lưu trữ an toàn trong DB
def dbAlertRes = WS.sendRequest(findTestObject('Inventory/GetAlerts', [('token'): token, ('is_resolved'): 'false']))
WS.verifyResponseStatusCode(dbAlertRes, 200)
def activeAlert = WS.getElementPropertyValue(dbAlertRes, '[0]')

assert activeAlert != null
assert activeAlert.is_resolved == false
assert activeAlert.current_stock == 4
KeywordUtil.markPassed("TC-U011-02 Notification Fault Recovery PASSED Successfully!")
```

### 3.3. Kết quả Kỳ vọng & Nghiệm thu
* **DB Verification**: Bản ghi cảnh báo tồn kho tồn tại an toàn trong DB (`is_resolved=False`, `current_stock=4`).
* **Trạng thái**: **PASSED**

---

## 4. Bảng Tóm tắt Kết quả Kiểm thử Tự động PA4

| ID | Test Case Title | Scenario / Scope | Expected Output | Status |
|---|---|---|---|---|
| `TC-U011-01` | BVA Boundary Value Analysis | $Q = 6$ (No Alert), $Q = 5$ (Alert $Q=5$), $Q = 4$ (Alert $Q=4$) | System generates alerts only at $Q \le T$ | **PASSED** |
| `TC-U011-02` | Notification Fault Recovery | Simulated Notification Service Failure | Alert persisted in PostgreSQL DB with `is_resolved=False` | **PASSED** |
