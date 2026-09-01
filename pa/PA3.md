## Soft Testi 



<!-- Start of picture text -->
Faculty of Information Information and Technology Technology<br>Software Engineering Department Engineering Department Department<br>University of Science of Science Science<br><!-- End of picture text -->

goo KMOa KMOa * Faculty of Information Information and Technology Technology s y Software Engineering Department Engineering Department Department S University of Science of Science Science 3 



<!-- Start of picture text -->
goo KMOa KMOa<br>*<br>s y<br>S<br>3<br><!-- End of picture text -->

### **Table of Contents** 

|**Objectives**|**1**|
|---|---|
|**1 Member Contribution Assessment**|**2**|
|**2 Test plan**|**3**|
|**3 Test cases**|**5**|
|3.1 List of test cases|5|
|3.2 Test case specifcations|7|
|3.2.1 Test case 1|7|
|3.2.2 Test case 2|9|
|3.2.3 Test case 3|11|
|3.2.4 Test case 4|12|
|3.2.5 Test case 5|13|
|3.2.6 Test case 6|14|
|3.2.7 Test case 7|14|
|3.2.8 Test case 8|15|
|3.2.9 Test case 9|16|
|3.2.10 Test case 10|17|
|3.2.11 Test case 11|18|
|3.2.12 Test case 12|20|
|3.2.13 Test case 13|22|
|3.2.14 Test case 14|22|
|3.2.15 Test case 15|23|



~~——~~ 



**Introduction to Software Engineering** 

**Software Testing** 

# **1 Member Contribution Assessment** 

|**ID**|**Name**|**Contribution (%)**|**Signature**|
|---|---|---|---|
||||Viet|
|24127590|Đoàn Thế Việt|20%||
|24127405|Võ Minh Huy|20%|Huy|
|24127559|Nguyễn Thanh Toàn|20%|Toan|
|24127553|Phan Trường Phúc Thuận|20%|Thuan|
||||Nhut|
|24127097|Lê Duy Nhựt|20%||



HCMUS | SE Dept. 

**2** 

**Introduction to Software Engineering** 

**Software Testing** 

# **2 Test plan** 

The primary objective of the testing phase is to verify that the Smart Procurement module complies with both architectural constraints and functional requirements. Testing spans multiple layers of the system architecture: 

**1. Architectural & Database Testing:** Ensuring physical relational database schema strictly complies with 3NF standards, verifying foreign key (FK) constraints, CASCADE/RESTRICT deletion rules, NOT NULL/UNIQUE constraints, and ACID compliance during concurrent inventory updates. 

**2. Boundary Value Analysis (BVA):** Evaluating Low-stock Alert thresholds (PRODUCT joining STORE_INVENTORY) and batch expiration rules using Boundary Value Analysis (BVA). Boundary points (Q = T + 1, Q = T, Q = T - 1) are rigorously tested to eliminate edge-case failures. 

**3. Functional API & Helper Logic Testing:** REST API endpoints (GET, POST, PUT, DELETE) are tested via Postman and Django Browsable API for status codes, payload structures, and error handling (400 Bad Request, 200 OK, 201 Created). Helper functions and business domain methods are verified via Django Shell and automated unit tests. 

Scope: webhook ingestion (GrabMart/ShopeeFood/BeMart), payload normalization, real-time FEFO stock deduction (core/inventory.py), and ACID transaction integrity. 

Techniques: Django APITestCase (functional), threading.Barrier + TransactionTestCase 

(race-condition), mocked DB exception (fault injection), Locust vs gunicorn (manual stress test, see docs/test/omni-6-race-condition-report.md). 

Pass criteria: deducted quantity matches successful orders only; inventory never negative; a failed transaction leaves no orphaned rows and no partial deduction. 

**4. UI/Integration Testing – Hardware Mocking:** POS checkout hardware (barcode scanner, receipt printer, cash drawer) has no physical device in the test environment, so each is tested through a software stand-in. The barcode scanner is emulated by typing a barcode and pressing Enter into the scan input, 

HCMUS | SE Dept. 

**3** 

**Introduction to Software Engineering** 

**Software Testing** 

which the app treats the same as a real scan. The receipt printer and cash drawer are tested by checking that the correct "print" or "open drawer" action fires at the right point in checkout — only after a cash payment is confirmed, never before, and never for a non-cash sale. Bank QR payment is tested using "Simulate Bank Confirmation" / "Simulate Rejection" buttons in place of a real bank webhook, so both the success and rejection paths can be tested reliably. This approach needs no physical hardware or live banking connection, while still verifying the required behavior (e.g., "drawer only opens after a successful cash payment"). When real hardware is added later, the same tests can extend to it with minimal changes. 

HCMUS | SE Dept. 

**4** 

**Introduction to Software Engineering** 

**Software Testing** 

# **3 Test cases** 

#### **3.1 List of test cases** 

|**Seq**|**Test case**|**Target**|**Description**|
|---|---|---|---|
|TC1|**TC-ACCS-01**|Two-Factor<br>Authentication (2FA) via<br>OTP|Verify<br>successful<br>OTP<br>generation and verification flow<br>for staff login|
|TC2|**TC-ACCS-02**|Login<br>Validation<br>&<br>Security|Verify that providing invalid<br>credentials or incorrect email<br>matching<br>triggers<br>an<br>error<br>response (401 Unauthorized)|
|TC3|**TC-ACCS-03**|Role-Based<br>Access<br>Control (RBAC)|Verify that a Cashier role is<br>restricted<br>from<br>accessing<br>restricted management endpoints<br>(returns 403 Forbidden)|
|TC4|**TC-PROC-01**|Supplier<br>REST<br>API<br>Validation|Validate REST API payload<br>constraints (invalid email or<br>missing contact_phone)|
|TC5|**TC-PROC-02**|Low-Stock Alert Logic<br>(BVA)|Verify low-stock logic using<br>BVA boundaries (Q = 6, 5, 4<br>against threshold T = 5)|
|TC6|**TC-PROC-03**|Batch Expiration Helper|Verify batch expiration filtering<br>for near-expiry (5 days) vs<br>far-expiry (10 days)|
|TC7|Multi-channel<br>order|U007 — Manage<br>Omnichannel Orders|Orders from GrabMart,<br>ShopeeFood, BeMart aggregate<br>onto one dashboard feed.|



HCMUS | SE Dept. 

**5** 

**Software Testing** 

|**Introduction to**|**Software Engine**<br>synchronizatio<br>n|**ering**|**Software Te**|
|---|---|---|---|
|TC8|Race-condition<br>inventory<br>deduction|U008 — Auto-Deduct<br>Inventory in Real Time|Two near-simultaneous purchases<br>of the last unit of stock.|
|TC9|Transaction<br>rollback on DB<br>failure|U008 (A2) — Database<br>update failure|A mid-transaction DB error must<br>roll back the whole order, not just<br>inventory.|
|TC10|TC-POS-01|U002 – POS Cart /<br>Checkout|Verify that scanning multiple<br>products adds them to the order<br>and correctly calculates the<br>subtotal, tax, and total amount.|
|TC11|TC-POS-02|U012 – Sales<br>Performance Analytics|Verify the sales performance<br>report accurately identifies the<br>best-selling and worst-selling<br>products based on completed<br>POS orders.|
|TC12|TC-POS-03|U014 – Near-expiry<br>Discount|Verify the system automatically<br>applies the correct discount for<br>near-expiry products and rejects<br>expired products without<br>applying a discount.|
|TC<br>13|TC-POS-04|U003 – Scan Product<br>Barcode|Verify scanning an existing<br>product's barcode adds it to the<br>cart and updates totals;<br>scanning a barcode with no<br>matching product shows a<br>not-found error without<br>changing the cart.|
|TC<br>14|TC-POS-05|U005 – Trigger Cash<br>Drawer|Verify the cash drawer opens<br>automatically only after a cash<br>payment is confirmed as<br>sufficient,and never opens|



HCMUS | SE Dept. 

**6** 

**Introduction to Software Engineering** 

**Software Testing** 

||||before confirmation or for a<br>Bank QR sale.|
|---|---|---|---|
|TC<br>15|TC-POS-06|U006 – Pay via Bank<br>QR Code|Verify the Bank QR tab<br>displays a QR code and<br>pending state, transitions to<br>completed on simulated<br>confirmation, and shows a<br>rejection message on<br>simulated decline without<br>losing the transaction.|



#### **3.2 Test case specifications** 

##### **_3.2.1 Test case 1_** 

|**_Test case_**|**TC-ACCS-01**|
|---|---|
|_Related Use case_|U001 – Staff Authentication & Two-Factor Authentication (2FA) via OTP|
|_Context_|Staff provides correct username, password, and matching email to request and<br>successfully verify an OTP token via REST API.|
|_Input Data_|Payload (JSON) for requesting OTP:<br>{<br>"username": "cashier_04",<br>"password": "CashierPass@123",<br>"email": "cashier_04@test.com"<br>}<br>Followed by verifying the received 6-digit OTP payload.|
|_Expected Output_|HTTP Status Code: 200 OK|



HCMUS | SE Dept. 

**7** 

**Introduction to Software Engineering** 

**Software Testing** 

||Response JSON body returns JWTaccesstoken,refreshtoken, and<br>corresponding userrole("Cashier").|
|---|---|
|_Test steps_|1. Send POST request to/api/login/request-otp/with the valid<br>payload via Postman.|
||2. Retrieve the generated OTP code from the backend server terminal.|
||3. Send POST request to/api/login/verify-otp/with username and<br>the correct OTP code.|
||4. Inspect returned HTTP status code and response body.|
|_Actual Output_|HTTP Status Code: 200 OK|
||Response JSON:{"refresh": "...", "access": "...",<br>"role": "Cashier"}|
|_Result_|**PASSED**|



HCMUS | SE Dept. 

**8** 

**Introduction to Software Engineering** 

**Software Testing** 

##### **_3.2.2 Test case 2_** 

|**_Test case_**|**TC-ACCS-02**|
|---|---|
|_Related Use case_|U001 – Staff Authentication & Security Validation|
|_Context_|User attempts to request an OTP but provides incorrect credentials or an email<br>that does not match the account profile.|
|_Input Data_|Payload (JSON):<br>{<br> "username": "cashier_04",<br>"password": "WrongPassword",<br>"email": "wrong_email@test.com"<br>}|
|_Expected Output_|HTTP Status Code: 401 Unauthorized<br>Response JSON body flags authentication error:{"error": "Sai<br>thông tin đăng nhập! Bạn còn X lần thử."}|
|_Test steps_|1. Send POST request to/api/login/request-otp/with the incorrect<br>password/email payload via Postman.<br>2. Inspect returned HTTP status code and response body.|
|_Actual Output_|HTTP Status Code: 401 Unauthorized|



HCMUS | SE Dept. 

**9** 

**Introduction to Software Engineering** 

**Software Testing** 

||Response JSON: {"error": "Sai thông tin đăng nhập!|
|---|---|
||Bạn còn 2 lần thử."}|
|_Result_|**PASSED**|



HCMUS | SE Dept. 

**10** 

**Introduction to Software Engineering** 

**Software Testing** 

##### **_3.2.3 Test case 3_** 

|**_Test case_**|**TC-ACCS-03**|
|---|---|
|_Related Use case_|U001 – Role-Based Access Control (RBAC)|
|_Context_|A user assigned with aCashierrole attempts to access restricted<br>administrative API endpoints (e.g., managing staff records).|
|_Input Data_|HTTP GET request to/api/staff/containing a Bearer<br>Token in the headers belonging to a Cashier account.<br>Headers:<br>Authorization: Bearer<cashier_access_token>|
|_Expected Output_|HTTP Status Code: 403 Forbidden<br>Response JSON body flags permission denial:{"detail": "You do<br>not have permission to perform this action."}|
|_Test steps_|1. Obtain a valid access token for a Cashier account (cashier_04).<br>2. Send GET request to/api/staff/with the Cashier's Bearer token via<br>Postman.<br>3. Inspect returned HTTP status code and response body.|
|_Actual Output_|HTTP Status Code: 403 Forbidden<br>Response<br>JSON:<br>{"detail":<br>"You<br>do<br>not<br>have<br>permission to perform this action."}|
|_Result_|**PASSED**|



HCMUS | SE Dept. 

**11** 

**Introduction to Software Engineering** 

**Software Testing** 

##### **_3.2.4 Test case 4_** 

|**_Test case_**|**TC-PROC-01**|
|---|---|
|_Related Use case_|U009 – Manage Suppliers & Purchase Orders|
|_Context_|Chain Manager attempts to create a new supplier via REST API but provides<br>an invalid email format and omits mandatory contact_phone field.|
|_Input Data_|Payload (JSON):<br>{<br>"supplier_name": "Vinamilk Distributor",<br>"contact_phone": "",<br>"email": "invalid-email-format",<br>"address": "HCMC, Vietnam"<br>}|
|_Expected Output_|HTTP Status Code: 400 Bad Request<br>Response JSON body flags validation errors:<br>- contact_phone: ["This field may not be blank."]<br>- email: ["Enter a valid email address."]|
|_Test steps_|1. Send POST request to /api/suppliers/ with the invalid JSON payload via<br>Postman.<br>2. Inspect returned HTTP status code and response body.<br>3. Execute automated unit test core.tests.SupplierValidationTestCase.|
|_Actual Output_|HTTP Status Code: 400 Bad Request<br>Response JSON: {"contact_phone": ["This field may not be blank."],<br>"email": ["Enter a valid email address."]}|
|_Result_|**PASSED**|



HCMUS | SE Dept. 

**12** 

**Introduction to Software Engineering** 

**Software Testing** 

##### **_3.2.5 Test case 5_** 

|**_Test case_**|**TC-PROC-02**|
|---|---|
|_Related Use case_|U011 – Receive Minimum Inventory Alert|
|_Context_|A product has MinThreshold = 5 in PRODUCT table. Physical quantity (Q) in<br>STORE_INVENTORY is updated to evaluate BVA logic at Q = 6, 5, and 4.|
|_Input Data_|Product ID: 1, ProductName: Instant Milk, MinThreshold: 5<br>- Scenario A: Stock Quantity Q = 6 (Above boundary)<br>- Scenario B: Stock Quantity Q = 5 (On boundary)<br>- Scenario C: Stock Quantity Q = 4 (Below boundary)|
|_Expected Output_|- Scenario A (Q = 6): is_low_stock evaluates to False (No alert)<br>- Scenario B (Q = 5): is_low_stock evaluates to True (Alert triggered)<br>- Scenario C (Q = 4): is_low_stock evaluates to True (Alert triggered)|
|_Test steps_|1. Launch Django Shell (python manage.py shell).<br>2. Fetch product instance and invoke p.is_low_stock(q) for q in [6, 5, 4].<br>3. Execute automated unit test core.tests.LowStockBVATestCase.|
|_Actual Output_|Scenario A (Q = 6): Returned False<br>Scenario B (Q = 5): Returned True<br>Scenario C (Q = 4): Returned True|
|_Result_|**PASSED**|



HCMUS | SE Dept. 

**13** 

**Introduction to Software Engineering** 

**Software Testing** 

##### **_3.2.6 Test case 6_** 

|**_Test case_**|**TC-PROC-03**|
|---|---|
|_Related Use case_|U013 – Track Batch / Expiration Dates|
|_Context_|Store Manager accesses inventory data to filter batches approaching<br>expiration date (expiration_date in BATCH table within 7-day window).|
|_Input Data_|Database State:<br>- Batch 101: expiration_date = Today + 5 days (Near-expiry)<br>- Batch 102: expiration_date = Today + 10 days (Far-expiry)|
|_Expected Output_|Batch 101 is flagged as is_expiring_soon = True.<br>Batch 102 is filtered out (is_expiring_soon = False).|
|_Test steps_|1. Query batch expiration helper via Django Shell.<br>2. Verify filter condition against current date.<br>3. Execute automated test core.tests.BatchExpirationTestCase.|
|_Actual Output_|Batch 101 (+5 days): Returned True<br>Batch 102 (+10 days): Returned False|
|_Result_|**PASSED**|



##### **3.2.7 Test case 7** 

|**_Test case_**|**TC-OMNI-1**|
|---|---|
|_Related Use case_|U007 — Manage Omnichannel Orders|
|_Context_|Store is connected to GrabMart, ShopeeFood, and BeMart; webhook listeners<br>are live.|
|_Input Data_|3 webhook payloads, one per platform, same store, each referencing a distinct<br>product.<br>Same 3 payloads re-sent once (duplicate delivery check).|
|_Expected Output_|All 3 orders appear via GET /api/orders/, one per order_type, correct totals.<br>GET /api/orders/?channel=<platform> isolates exactly that one order.|



HCMUS | SE Dept. 

**14** 

**Introduction to Software Engineering** 

**Software Testing** 

||Re-sending the 3 payloads does not create duplicate orders (count stays 3).|
|---|---|
|_Test steps_|1. POST GrabMart, ShopeeFood, BeMart payloads back-to-back for the same<br>store.<br>2. Assert each webhook returns 200.<br>3. GET /api/orders/ → assert 3 orders total.<br>4. GET /api/orders/?channel=<platform> for each → assert 1 result each.<br>5. Re-send all 3payloads → assert order count is still 3.|
|_Actual Output_|omnichannel/tests.py :: OmnichannelMultiPlatformAggregationTests (2 tests).<br>docker compose exec backend python manage.py test<br>omnichannel.tests.OmnichannelMultiPlatformAggregationTests<br>Ran 2 tests in 0.518s — OK(0 failures,0 errors).|
|_Result_|**PASSED**|
|**_est case 8_**<br>**_Test case_**|**TC-OMNI-2**|
|_Related Use case_|U008 – Auto-Deduct Inventory in Real Time|
|_Context_|StoreInventory.quantity = 1 for a product; two channels attempt to buy the last<br>unit at the same instant.|
|_Input Data_|2 concurrent deduct_stock(store, product, 1) calls, released together via<br>threading.Barrier(2), each in its own real DB transaction.|
|_Expected Output_|Exactly 1 call succeeds and reduces stock to 0.<br>The other call raises InsufficientStockError.<br>Inventory never goes negative or gets double-deducted.|
|_Test steps_|1. Seed StoreInventory.quantity = 1.<br>2. Spawn 2 threads waiting on a shared Barrier.<br>3. Each thread calls deduct_stock() inside transaction.atomic().<br>4. Collect both results; refresh and check final quantity.|
|_Actual Output_|core/test_race_condition.py ::<br>StockDeductionRaceConditionTests.test_two_concurrent_sales_of_last_unit_<br>only_one_succeeds<br>docker compose exec backend python manage.py test<br>core.test_race_condition omnichannel.tests<br>Results = ['rejected', 'success']; final quantity = 0. Ran 7 tests in 0.700s —<br>OK.|



##### **_3.2.8 Test case 8_** 

HCMUS | SE Dept. 

**15** 

**Introduction to Software Engineering** 

**Software Testing** 

|_Result_<br>**PASSED**|
|---|



##### **_3.2.9 Test case 9_** 

|**_Test case_**|**TC-OMNI-3**|
|---|---|
|_Related Use case_|U008 (A2) – Database update failure|
|_Context_|An order-creation transaction (Order + OrderDetail + deduct_stock) is in<br>progress;a DB exception is injected at the final inventory-write step.|
|_Input Data_|1 valid normalized order payload.<br>core.inventory.StoreInventory.save mocked to raise Exception('simulated DB<br>failure').|
|_Expected Output_|The entire transaction rolls back: no Order/OrderDetail rows persist.<br>StoreInventory.quantity is unchanged.<br>Caller receives an error(exceptionpropagates).|
|_Test steps_|1. Patch core.inventory.StoreInventory.save to raise.<br>2. Call save_normalized_order() with a valid payload.<br>3. Assert the call raises.<br>4. Query Order/OrderDetail for the external_order_id → assert 0 rows.<br>5. Refresh StoreInventory→ assertquantityunchanged.|
|_Actual Output_|omnichannel/tests.py ::<br>OrderRollbackOnFailureTests.test_failure_during_inventory_deduction_rolls_ba<br>ck_order<br>docker compose exec backend python manage.py test core.test_race_condition<br>omnichannel.tests<br>Order count = 0, OrderDetail count = 0, inventory.quantity = 10 (unchanged).<br>Ran 7 tests in 0.700s — OK.|
|_Result_|**PASSED**|



HCMUS | SE Dept. 

**16** 

**Introduction to Software Engineering** 

**Software Testing** 

##### **_3.2.10 Test case 10_** 

|**_Test case_**|**TC-POS-01**|
|---|---|
|_Related Use case_|U002 – POS Cart / Checkout|
|_Context_|A cashier scans multiple products at the POS counter. The system adds the<br>products to the current order and calculates the subtotal,tax,and total amount.|
|_Input Data_|**POST** /api/pos/orders/create/<br>Request Body:{ "store_id": 1, "staff_id": 1 }<br>Then**POST** /api/pos/orders/{order_id}/add-item/<br>Request Body:{ "product_id": 1, "quantity": 2 }<br>Then**GET**_/api/pos/orders/1/_|
|_Expected Output_|HTTP Status Code: 200 OK<br>The order details are returned successfully.<br>The response contains the ordered products, quantities,<br>subtotal, tax, and total amount.<br>The calculated values must satisfy:<br>Subtotal = sum of item subtotals<br>Tax = Subtotal × tax rate<br>Total = Subtotal + Tax|
|_Test steps_|1. Create a new POS order using Postman.<br>2. Record the returnedorder_id.<br>3. Add 2 units of product1.<br>4. Send**GET** /api/pos/orders/{order_id}/.<br>5. Check thequantity,unitprice,subtotal,tax,and total amount.|
|_Actual Output_|HTTP Status Code: 200 OK<br>Response JSON:<br>{<br>"order_id": 1,<br>"status": "Pending",<br>"items": [<br>{<br>"product_id": 1,<br>"product_name": "Coca Cola",<br>"quantity": 2,<br>"unit_price": 9600.0,|



HCMUS | SE Dept. 

**17** 

**Introduction to Software Engineering** 

**Software Testing** 

||"sub_total": 19200.0|
|---|---|
||}<br>],|
||"subtotal": 19200.0,|
||"tax": 1920.0,|
||"total": 21120.0<br>}|
|_Result_|**PASSED**|



##### **_3.2.11 Test case 11_** 

|**_Test case_**|**TC-POS-02**|
|---|---|
|_Related Use case_|U012 – Sales Performance Analytics|
|_Context_|An authorized staff member requests the sales performance report to identify the<br>best-sellingand worst-selling products based on completed POS orders.|
|_Input Data_|**GET** /api/pos/analytics/sales/<br>Test data:<br>Coca Cola →**10 units sold**<br>Pepsi →**5 units sold**<br>Sting→**2 units sold**|
|_Expected Output_|HTTP Status Code:**200 OK**<br>The reported quantities must match the quantities calculated from<br>ORDER_DETAIL.|
|_Test steps_|1. Prepare completed POS orders containing the test sales data.<br>2. Send**GET**request to/api/pos/analytics/sales/using Postman.<br>3. Inspect the HTTP status code.<br>4. Check the Best-seller and Worst-seller returned by the API.<br>5. Compare the results with the data inORDER_DETAIL|
|_Actual Output_|{<br>"best_sellers": [<br>{<br>"product__product_id": 7,<br>"product__product_name": "Analytics Coca<br>Cola",<br>"total_quantity": 10|



HCMUS | SE Dept. 

**18** 

**Introduction to Software Engineering** 

**Software Testing** 

|},<br>{|
|---|
|<br>"product__product_id": 8,|
|"product__product_name": "Analytics|
|Pepsi",|
|"total_quantity": 5|
|},|
|{<br>"product__product_id": 9,|
|"product__product_name": "Analytics<br>Sting",<br>"total_quantity": 2<br>}<br>],<br>"worst_sellers": [<br>{<br>"product__product_id": 9,|
|"product__product_name": "Analytics|
|Sting",|
|"total_quantity": 2<br>},<br>{<br>"product__product_id": 8,|
|"product__product_name": "Analytics|
|Pepsi",|
|"total_quantity": 5<br>},<br>{<br>"product__product_id": 7,|
|"product__product_name": "Analytics Coca|
|Cola",|
|"total_quantity": 10<br>}<br>],<br>"revenue_by_hour": [<br>{<br>"hour": "2026-08-17T13:00:00Z",|
|"total_revenue": 215000.0<br>}<br>],|



HCMUS | SE Dept. 

**19** 

**Introduction to Software Engineering** 

**Software Testing** 

||"revenue_by_day": [<br>{<br>"day": "2026-08-17",<br>"total_revenue": 215000.0<br>}<br>],<br>"revenue_by_month": [<br>{<br>"month": "2026-08-01T00:00:00Z",<br>"total_revenue": 215000.0<br>}<br>],<br>"sales_trend": [<br>{<br>"day": "2026-08-17",<br>"total_revenue": 215000.0<br>}<br>]<br>}|
|---|---|
|_Result_|**PASSED**|



##### **_3.2.12 Test case 12_** 

|**_Test case_**|**TC-POS-03**|
|---|---|
|_Related Use case_|U014 – Near-expiry Discount|
|_Context_|A cashier scans a product whose expiration date is<br>approaching. The system checks the batch expiration<br>date and automatically calculates the discounted<br>selling price. Expired products must not receive a<br>discount|
|_Input Data_|**GET**<br>/api/pos/products/{product_id}/price<br>/|



HCMUS | SE Dept. 

**20** 

|**Introduction to Software Engineering**|**Software Testing**|
|---|---|
||**Case A – Near expiry:**Base Price =12,000, Days<br>remaining =7 days, Discount =20%<br>**Case B – Normal:**Base Price =12,000, Days<br>remaining =30 days<br>**Case C – Expired:**Expiration date =yesterday|
|_Expected Output_|**Case A – Near expiry:**<br>Discount =2,400<br>Final Price =9,600<br>**Case B – Normal:**<br>Final Price =100000,000<br>No discount is applied.|
||**Case C – Expired:**<br>The system does not apply the discount and rejects the<br>expiredproduct.|
|_Test steps_|1. Create test batches for the three expiration<br>conditions.<br>2. Send**GET**request for the near-expiry product.<br>3. Verify the discounted price.<br>4. Send**GET**request for the normal product.<br>5. Verify that the original price is returned.<br>6. Send**GET**request for the expired product.<br>7. Verifythat the system rejects the expiredproduct|
|_Actual Output_|**Case A:**HTTP Status Code200 OK,<br>{<br>"product_id": 1,<br>"product_name": "Coca Cola",<br>"original_price": "12000.00",<br>"discount": "2400.00",<br>"final_price": "9600.00",<br>"days_left": 7<br>}|
|HCMUS | SE Dept.|**Case B:**HTTP Status Code200 OK, Final Price =<br>12,000.<br>{<br>"product_id": 4,<br>"product_name": "Pepsi",<br>"original_price": "100000.00",<br>"discount": "0.00",<br>"final_price": "100000.00",<br>**21**|



**Software Testing** 

|**Introduction to Software Engineering**|
|---|



||"days_left": 30<br>}|
|---|---|
||**Case C:**System returns an error indicating that the|
||product has expired|
|_Result_|**PASSED**|



##### **_3.2.13 Test case 13_** 

|**_Test case_**|**TC-POS-03**|
|---|---|
|_Related Use case_|U003 – Scan Product Barcode|
|_Context_|Cashier scans a barcode on the POS screen — once<br>for aproduct that exists,once for one that doesn't.|
|_Input Data_|**A**: Scan 8934673123451 (Coca-Cola 330ml).<br>**B**: Scan 0000000000000(no match).|
|_Expected Output_|**A:**item added to cart, subtotal updates.<br> **B**: cart unchanged; "Product not found" error<br>shown.|
|_Test steps_|**1**. Open /pos with an empty cart.<br>**2**. Scan 8934673123451; verify the item and<br>subtotal.<br>**3**. Scan 0000000000000; verify the error and that<br>the cart is unchanged.|
|_Actual Output_|**A**: Coca-Cola 330ml added (qty 1, $0.83); subtotal<br>updated.<br> **B**: "Product not found" toast shown; cart<br>unchanged.|
|_Result_|**PASSED**|



##### **_3.2.14 Test case 14_** 

|**_Test case_**|**TC-POS-03**|
|---|---|
|_Related Use case_|U005 – Trigger Cash Drawer|
|_Context_|Cashier opens the Payment modal. The cash drawer<br>must open only after a cash payment is confirmed<br>sufficient — never before, and never for a non-cash<br>method.|
|_Input Data_|**A**: $0.83 cart, tendered $0, click Complete.<br>**B:**same cart, tendered $50, click Complete.|



HCMUS | SE Dept. 

**22** 

**Introduction to Software Engineering** 

**Software Testing** 

||**C:**fresh $0.83 cart, Bank QR tab, click "Simulate<br>Bank Confirmation".|
|---|---|
|_Expected Output_|**A:**"amount short" message; payment not<br>completed; no drawer toast.<br>**B:**payment completes; "cash drawer opened" toast<br>fires after the receipt panel renders.<br>**C:**Bank QR payment completes; drawer toast never<br>fires.|
|_Test steps_|**1.**Add Coca-Cola 330ml ($0.83); open Payment<br>(Cash tab).<br>**2**. A: tendered $0, click Complete; check for<br>validation message, no toast.<br>**3**. B: tendered $50, click Complete; check for<br>drawer toast after receipt renders.<br>**4**. C: new transaction, Bank QR tab, "Simulate<br>Bank Confirmation";confirm no drawer toast.|
|_Actual Output_|**A**: "Amount short" message shown; no order<br>created; no toast.<br>**B**: order completed (Cash, $0.83); "Cash drawer<br>opened" toast fired after the receipt rendered.<br>**C**: order completed via Bank QR ($0.83); no drawer<br>toast at any point.|
|_Result_|**PASSED**|



##### **_3.2.15 Test case 15_** 

|**_Test case_**|**TC-POS-03**|
|---|---|
|_Related Use case_|U006 – Pay via Bank QR Code|
|_Context_|Cashier switches to the Bank QR tab. The UI must<br>show the QR code and a pending state, then react<br>correctly to a simulated confirm or reject (standing<br>in for the bank's payment webhook — no live<br>payment integration exists in this build).|
|_Input Data_|**A:**Coca-Cola 330ml ($0.83), Bank QR tab, click<br>"Simulate Bank Confirmation".<br>**B:**same product, fresh transaction, Bank QR tab,<br>click "Simulate Rejection".|
|_Expected Output_|Bank QR tab shows a QR code, "Scan to pay $X"<br>caption, and both simulate controls (pending state).<br>**A:**transaction completes as "Bank QR"; no drawer<br>toast.|



HCMUS | SE Dept. 

**23** 

**Introduction to Software Engineering** 

**Software Testing** 

||**B:**rejection message shown; transaction stays open<br>(cart intact); cashier can switch back to Cash<br>without losingthe sale.|
|---|---|
|_Test steps_|**1.**Add Coca-Cola 330ml; open Payment; switch to<br>Bank QR tab.<br>**2**. Verify QR code, caption, and simulate buttons<br>render.|
||**3.**A: click "Simulate Bank Confirmation"; verify<br>receipt state.<br>**4.**New transaction, repeat 1–2; B: click "Simulate<br>Rejection"; verify rejection message, cart survives,<br>and Space returns to Cash tab.|
|_Actual Output_|Bank QR tab rendered the QR placeholder, "Scan to<br>pay $0.83" caption, demo note, and both simulate<br>buttons.<br>**A:**order completed (Bank QR, $0.83); no drawer<br>toast.<br>**B:**"Payment rejected" toast and message shown;<br>transaction not completed (cart intact); Space<br>returned to Cash tab with the same transaction,<br>confirming the cashier can retry without losing the<br>sale.|
|_Result_|**PASSED**|



HCMUS | SE Dept. 

**24** 

