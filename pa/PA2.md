## Software Design 



### **Table of Contents** 

|**1**<br>**Member Contribution Assessment**|**2**|
|---|---|
|**2**<br>**Conceptual Model**|**3**|
|**3**<br>**Architectural Design**|**4**|
|3.1<br>Architecture Diagram....................................................................|..................................... 4|
|3.2<br>Class Diagram................................................................................|.....................................4|
|3.3<br>Class Specifications.......................................................................|.....................................5|
|3.3.1<br>Class C1|5|
|**4**<br>**Data Design**|**6**|
|4.1<br>Data Diagram.................................................................................|.....................................6|
|4.2<br>Data Specification..........................................................................|.....................................6|
|**5**<br>**User Interface and User Experience Design**|**7**|
|5.1<br>Screen Diagram.............................................................................|..................................... 7|
|5.2<br>Screen Specifications.....................................................................|.....................................7|
|5.2.1<br>Screen “A”|7|
|5.2.2<br>Screen “B”|7|



~~——~~ 



**Introduction to Software Engineering** 

**Software Design** 

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



<!-- Start of picture text -->
SUPPLIER<br>ROLE CATEGORY<br>me _[ oc<br>ee a | newfoe[ome [seem | |<br>employs<br>assigns receives categorizes<br>OQ fe} ©<br>ANS 1) 0 (N\<br>STAFF aN PRODUCT<br>PURCHASE_ORDER<br>sae [ react |<br>Socom [ee fem| Scone<br>Pere [ane | fae [smeExpectedDeliveryDate| |_| en wee|<br>von [ cn_|<br>creates manages contains, has’<br>fe)<br>MN<br>ORDER<br>On<br>OrderDate | | BATCH LA N PURCHASE_ORDER_DETAIL a<br>ae re [me Tm] fie [me [mn<br>suo<br>contains tracks<br>QOAN ORDER_DETAIL 7 fe)<br>STORE_INVENTORY 7 OrderID PK,FK<br>| in| StoreID PK,FK Sint ProductID | PK,FK<br>occ ens [owe |<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Software Design** 

**Included Tables** : ROLE (Pink), STAFF (Teal), STORE (Orange). 

**Relationships** : One Role (ROLE) can be assigned to multiple Staff members (STAFF). One Branch (STORE) can employ and manage multiple Staff members (STAFF). 

###### **2. Procurement & Purchasing Group (Top Center)** 

**Purpose** : This group supports the "Smart Procurement" operations by managing supply sources and tracking incoming shipments for the chain. 

**Included Tables** : SUPPLIER (Light Green), PURCHASE_ORDER (Light Blue), PURCHASE_ORDER_DETAIL (Light Red). 

**Relationships** : One Supplier (SUPPLIER) provides multiple Purchase Orders (PURCHASE_ORDER). Each Purchase Order contains multiple line items represented by Purchase Order Details (PURCHASE_ORDER_DETAIL). 

###### **3. Products & Inventory Group (Right & Bottom Center)** 

**Purpose** : Serving as the "heart" of the system, this group manages product catalogs, batches, expiration dates, and real-time inventory quantities. 

**Included Tables** : CATEGORY (Green), PRODUCT (Light Purple), BATCH (Dark Pink - for expiration tracking), STORE_INVENTORY (Yellow - for stock quantity management). 

**Relationships** : A Category (CATEGORY) classifies multiple Products (PRODUCT). A Product consists of multiple Batches (BATCH). Store Inventory (STORE_INVENTORY) serves as a many-to-many associative table linking Branches (STORE) and Batches (BATCH) to accurately track the exact stock quantity of a specific batch at a specific branch. 

###### **4. Transactions & Orders Group (Bottom Left & Bottom Right)** 

**Purpose** : This group records all sales transactions at the physical POS counters as well as incoming orders from omnichannel delivery platforms. 

**Included Tables** : ORDER (Cyan), ORDER_DETAIL (Dark Blue). 

**Relationships** : A Branch (STORE) and a Staff member (STAFF) process and generate Orders (ORDER). Each Order contains multiple Order Details (ORDER_DETAIL), which map directly to the purchased Products (PRODUCT). 

HCMUS | SE Dept. 

**4** 



<!-- Start of picture text -->
poTHHTTT" "Eternal Services & Webhooks ==Ss=St=—=“i*~*~si‘“‘~*~s<br>H; Client Tier / Presentation Layer-SPA<br>;‘<br>:' Physical Store POS<br>:'<br>HH 'H Hotkey-optimized U! Browser<br>HH<br>:'<br>HH<br>H H<br>;H Banking Payment ilPh 3 . H<br>API panel bareirs ;<br>: i j t<br>H i i ' Store & Chain Manager Portal WebUSB / WebBiuetooth<br>‘ i i H HTMLS Scanner, Printer, Drawer<br>‘H: Hi Hi ''<br>4 i; j: H'<br>HHii jH tH<br>A1: cesnmmapcrmiis binansij acn min etch ;i Rann ams''<br>Asyne Webhook Asyne Webhook RESTAPIHTTPS RESTAPIHTTPS<br>teresa “s...Application Tier/Server-Side - Django Python<br>“Pl APl Gateway & Security Layer —<br>JWT Auth<br>Business Logic & RESTful APIs ]<br>POS Checkout Engine Fieunaink<br>@ Wartcine | Anatyics& Expy Tracir |<br>Read/Write Transaction Real-time Stock Deduction Read/Write Complex Query 3NF<br>ae 5 Data Persistence Layer a<br>PostgreSQL/ MySQL ACID &<br>2NF<br><!-- End of picture text -->

* 4_ Point of Sale - POS 

* 2 Omnichannel Hub: 



<!-- Start of picture text -->
:<br><!-- End of picture text -->

1.1 Hotkey Checkout Interface 4.2 Hardware Integration: Scanner, Printer 1.3 Auto-trigger Cash Drawer 1_4 Bank GR Payment Processing 2.1 External Delivery Synchronization _/ 2.2 Real-timeDeductionInventory 

Convenience Store Chain Management System 

3.4 Minimum Inventory Alerts 

\ ° ae A a \ ’ 

3.2 Manage Suppliers & Purchase Orders 

\ 

eers 3.3 Track Shipment Status 

\ \ 

4.1 JWT Role-based a Access Control \ fi $M 4.2 Sales Performance ff a Reporting \ eI 4. Data Analytics<sup>&</sup> Security \ a 4.3 Batch& Batch&& Expiration sy Date Tracking Tracking 

> 4.3 Batch& Batch&& Expiration Date Tracking Tracking 

4.4 Apply Discount on Near-Expiry Items 

**Introduction to Software Engineering** 

**Software Design** 

###### **_System Decomposition Diagram of the Convenience Store Chain Management System_** 

##### **3.1.2. Architectural Patterns and Special Design Aspects** 

The Convenience Store Chain Management System is not merely a standard web application but a distributed system that requires concurrent transaction processing and multi-platform integration. Therefore, the system architecture is built upon the following specific models and design patterns: 

**1. Client-Server & API-First Architecture** The system strictly adheres to the Client-Server architecture, completely decoupling the presentation environment (Frontend) from the processing environment (Backend). 

**API-First Approach:** The Backend is not responsible for rendering the interface (HTML); instead, it solely communicates via RESTful APIs using the JSON data format. This enables the system to scale easily, upgrade components independently, and reuse APIs for future platforms (e.g., Mobile Apps). 

**Single Page Application (SPA):** At the Client tier, the POS interface and Management Portal are built as SPAs. Consequently, the application loads the webpage only once, and subsequent operations (such as hotkey checkouts and tab switching) occur instantly without page reloads, fulfilling the high-speed requirements of retail operations. 

**2. MVC (Model - View - Controller) / MTV in Django** The Server-side utilizes the Django (Python) framework, which operates on a variation of the MVC pattern known as **MTV (Model - Template - View)** . By adopting the API-First approach, the system adapts this model as follows: 

**Model (Data):** Directly maps to the tables within the PostgreSQL/MySQL database. The Models ensure that the data structure strictly follows the 3NF standard and complies with ACID principles to prevent conflicts (race conditions) when the system performs simultaneous real-time inventory deductions from multiple sources. 

HCMUS | SE Dept. 

**7** 

**Introduction to Software Engineering** 

**Software Design** 

**View (Logic Controller):** Functions as the _Controller_ in the traditional MVC pattern. The REST API Views intercept incoming Requests, execute core business logic (e.g., cart calculations, validating near-expiry discounts), and return JSON responses. **Template (Interface):** The responsibility of UI rendering is entirely delegated to the Client tier (SPA). 

###### **3. Applied Design Patterns** 

To resolve complex integration and security challenges, the system architecture implements the following essential design patterns: 

**Observer / Webhook Pattern:** Instead of continuously sending requests to query third-party platforms (Polling)—which wastes server resources—the architecture establishes _Webhook Listeners_ . Whenever an external event occurs (e.g., a customer successfully completes a payment via a Banking API, or a new order arrives from GrabMart, ShopeeFood, or BeMart), these platforms proactively "push" the event payload to the system's Webhooks. This pattern is the key mechanism that enables the Omnichannel Hub module to operate in real-time. 

**Stateless Authentication Pattern:** The system does not store user login states (session states) on the server's RAM or Database. Instead, it enforces a security model based on **JSON Web Tokens (JWT)** . Upon logging in, each Cashier, Store Manager, or Chain Manager is issued a Token containing their specific Role-Based Access Control (RBAC) permissions. This pattern significantly reduces server memory load and allows the backend to scale effortlessly as the store network expands. 

**Facade Pattern (API Gateway):** The Client does not need to understand the complex internal routing of the backend services (POS Engine, Omnichannel Engine, Analytics Engine). The API Gateway acts as a Facade; it receives all incoming Client requests, validates the JWT for security, and seamlessly routes the request to the appropriate internal processing module. 

HCMUS | SE Dept. 

**8** 



<!-- Start of picture text -->
Supplier<br>- . Category Store Role «association class»<br>_ supplierid: int Storelnventory<br>-- SupplierName:contactPhone:email: String StringString -: categoryld:categoryName:Simeint String see-= location:storeName:StringteString -: roleld:roleName:aint String quantity: int<br>- address: String + getCategory() + getStorelnfo() + getRole() + updateQuantity()<br>+ getSupplierinfo() + listProducts() + getinventory() + updateRole() + checkStock()<br>+ updateSupplier() 1 i Pia<br>“<br>“<br>“<br>uipplies ategorizes employs essigns “7<br>a o..§ a On o..<br>- pold: int - productld: int - staffld: int<br>. oederDate: Date - barcode: String - username: String<br>- ex ectedDelive Date: Date - productName: String - password: String<br>“Stutue String - basePrice: decimal - fullName: String procecces<br>* tring - minThreshold: int<br>; cpdatastetus() + getProductDetails() ++ ‘oginlogout()login<br>+ receiveOrder() + updatePrice() + updateProfile()<br>+ checkThreshold() + createOrder()<br>F<br>contains includes as racks reates<br>oO: 0..<br>1. 0. o.%___0.. ,<br>tls LES rDeta a Batch -- orderld:orderDate:int DateTime<br>- orderQty:. int - batchlid: int . - orderType: String<br>. unitCost:‘ decimal iincludes -- manufactureDate: expirationDate: DateDate -- paymentMethod:total Amount: decimalString<br>+ calculateSubTotal() + checkExpiration() ~ status: String<br>+ updateDetalll) + getBatchDetails() + processPayment()<br>1) + calculateTotal()<br>+ updateOrderStatus()<br>Tontains<br>0."<br>OrderDetail ;<br>- quantity: int<br>- unitPrice; decimal<br>- subTotal: decimal<br>+ additem()<br>+ removeltem()<br>+ calculateSubTotal()<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Software Design** 

#### **3.3 Class Specifications** 

###### **_3.3.1 Class C1 - Staff_** 

_Attributes_ 

|**Seq**|**Property**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|staffId|private|Primary Key, Not Null|Unique identifier of the staff member|
|2|username|private|Unique, Not Null|Username used for login|
|3|password|private|Not Null|Encrypted password|
|4|fullName|private|Not Null|Full name of the staff member|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|login()|public|Valid username and password required|Authenticates<br>the<br>staff<br>member|
|2|logout()|public|User must be logged in|Logs the user out of the<br>system|
|3|updateProfile()|public|Staff must exist|Updates<br>personal<br>information|
|4|createOrder()|public|Staff must have permission|Creates a new customer<br>order|



HCMUS | SE Dept. 

**10** 

**Introduction to Software Engineering** 

**Software Design** 

###### **_3.3.2 Class C2 - Product_** 

_Attributes_ 

|**Seq**|**Property**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|productId|private|Primary Key|Unique product identifier|
|2|barcode|private|Unique|Product barcode|
|3|productName|private|Not Null|Name of the product|
|4|basePrice|private|>0|Selling price|
|5|minThreshold|private|>=0|Minimum stock threshold|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|getProductDetails()|public|Product exists|Returns product information|
|2|updatePrice()|public|Price > 0|Updates product price|
|3|checkThreshold()|public|Inventory exists|Checks minimum stock level|



###### **_3.3.3 Class C3 - Supplier_** 

_Attributes_ 

|**Seq**|**Property**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|supplierId|private|Primary Key,Not Null|Unique identifier of the supplier.|
|2|supplierName|private|Not Null|Name of the supplier|
|3|contactPhone|private|Valid phone number|Supplier contact phone number.|
|4|email|private|Valid email format|Supplier email address.|
|5|address|private|Not Nul|Supplier business address.|



HCMUS | SE Dept. 

**11** 

**Introduction to Software Engineering** 

**Software Design** 

_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|getSupplierInfo()|public|Supplier exists|Retrieve supplier information.|
|2|updateSupplier()|public|Valid supplier ID|Update supplier information.|



###### **_3.3.4 Class C4 - PurchaseOrder_** 

_Attributes_ 

|**Seq**|**Property**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|poId|private|Primary Key|Purchase order identifier|
|2|orderDate|private|Not Null|Purchase order creation date|
|3|expectedDeli|private|Must<br>be<br>later than|Expected delivery date|
||veryDate||orderDate||
|4|status|private|Valid status value|Current purchase order status|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|createPO()|public|Supplier selected|Create a purchase order.|
|2|updateStatus()|public|Valid status|Update purchase order status.|
|3|receiveOrder()|public|Order exists|Confirm received goods.|



HCMUS | SE Dept. 

**12** 

**Introduction to Software Engineering** 

**Software Design** 

###### **_3.3.5 Class C5 - Category_** 

_Attributes_ 

|**Seq**|**Property**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|categoryId|private|Primary Key|Category identifier.|
|2|categoryName|private|Unique, Not Null|Category name.|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|getCategory()|public|Category exists|Retrieve category information.|
|2|listProducts()|public|Category exists|Display all products in the category|



###### **_3.3.6 Class C6 - Order_** 

_Attributes_ 

|**Seq**|**Property**|**Modifie**<br>**r**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|orderId|private|Primary Key|Order identifier.|
|2|orderDate|private|Not Null|Date and time the order was created.|
|3|orderType|private|Online or In-store|Type of order.|
|4|paymentMethod|private|Valid payment method|Payment method used.|
|5|totalAmount|private|Greater than or equal<br>to 0|Total amount of the order.|
|6|status|private|Valid status value|Current order status.|



HCMUS | SE Dept. 

**13** 

**Introduction to Software Engineering** 

**Software Design** 

_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|processPayment()|public|Order exists|Process customer payment.|
|2|calculateTotal()|public|Order contains items|<br>Calculate total order value.|
|3|updateOrderStatus()|public|Valid status|Update order status.|



###### **_3.3.7 Class C7 - OrderDetail_** 

_Attributes_ 

|**Seq**|**Property**|**Modifie**|**Constraint**|**Description**|
|---|---|---|---|---|
|||**r**|||
|1|quantity|private|Greater than 0|Quantity of the product ordered.|
|2|unitPrice|private|Greater than 0|Price of one product unit.|
|3|subTotal|private|Calculated value|Subtotal for the order item.|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|addItem()|public|Valid product|Add a product to the order.|
|2|removeItem()|public|Item exists|Remove a product from the order.|
|3|calculateSubTotal()|public|Quantity and unit price<br>available|Calculate subtotal.|



HCMUS | SE Dept. 

**14** 

**Introduction to Software Engineering** 

**Software Design** 

###### **_3.3.8 Class C8 - Batch_** 

_Attributes_ 

|**Seq**|**Property**|**Modifie**<br>**r**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|batchId|private|Primary Key|Batch identifier.|
|2|manufactureDate|private|Not Null|Manufacturing date.|
|3|expirationDate|private|Must<br>be<br>after<br>manufactureDate|Expiration date of the batch|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|checkExpiration()|public|Batch exists|Check whether the batch has expired.|
|2|getBatchDetails()|public|Batch exists|Retrieve batch information.|



HCMUS | SE Dept. 

**15** 

**Introduction to Software Engineering** 

**Software Design** 

###### **_3.3.9 Class C9 - Store_** 

_Attributes_ 

|**Seq**|**Property**|**Modifie**|**Constraint**|**Description**|
|---|---|---|---|---|
|||**r**|||
|1|storeId|private|Primary Key|Store identifier.|
|2|storeName|private|Not Null|Store name.|
|3|location|private|Not Null|Store location.|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|getStoreInfo()|public|Store exists|<br>Retrieve store information.|
|2|getInventory()|public|Store exists|Display inventory of the store.|



HCMUS | SE Dept. 

**16** 

**Introduction to Software Engineering** 

**Software Design** 

###### **_3.3.10 Class C10 - Role_** 

_Attributes_ 

|**Seq**|**Property**|**Modifie**|**Constraint**|**Description**|
|---|---|---|---|---|
|||**r**|||
|1|roleId|private|Primary Key|Role identifier.|
|2|roleName|private|Unique, Not Null|Role name assigned to staff.|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|getRole()|public|Role exists|<br>Retrieve role information.|
|2|updateRole()|public|Valid role|Update role information.|



###### **_3.3.11 Class C11 - PurchaseOrderDetail_** 

_Attributes_ 

|**Seq**|**Property**|**Modifie**|**Constraint**|**Description**|
|---|---|---|---|---|
|||**r**|||
|1|orderQty|private|Greater than 0|Quantity of the product ordered from the<br>supplier.|
|2|unitCost|private|Greater than 0|Cost per unit of the product.|



HCMUS | SE Dept. 

**17** 

**Introduction to Software Engineering** 

**Software Design** 

_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|calculateSubTotal()|public|Quantity and unit cost<br>must be available|Calculates<br>the subtotal for the<br>purchase order item.|
|2|updateDetail()|public|Purchase order detail<br>must exist|Updates<br>the<br>information<br>of<br>a<br>purchase order item.|



###### **_3.3.12 Class C12 - StoreInventory_** 

_Attributes_ 

|**Seq**|**Property**|**Modifie**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|quantity|**r**<br>private|>=0|Current quantity of the product available<br>in a store.|



_Main Methods / Operations_ 

|**Seq**|**Operation**|**Modifier**|**Constraint**|**Description**|
|---|---|---|---|---|
|1|updateQuantity()|public|Quantity cannot be<br>negative|Updates the inventory quantity after<br>stock-in or stock-out operations. Updates<br>the inventory quantity after stock-in or<br>stock-out operations.|
|2|checkStock()|public|Product must exist in<br>the inventory|Checks the current stock level of the<br>product in the store.|



HCMUS | SE Dept. 

**18** 



<!-- Start of picture text -->
SUPPLIER<br>ROLE CATEGORY<br>me _[ oc<br>ee a | newfoe[ome [seem | |<br>employs<br>assigns receives categorizes<br>OQ fe} ©<br>ANS 1) 0 (N\<br>STAFF aN PRODUCT<br>PURCHASE_ORDER<br>sae [ react |<br>Socom [ee fem| Scone<br>Pere [ane | fae [smeExpectedDeliveryDate| |_| en wee|<br>von [ cn_|<br>creates manages contains, has’<br>fe)<br>MN<br>ORDER<br>On<br>OrderDate | | BATCH LA N PURCHASE_ORDER_DETAIL a<br>ae re [me Tm] fie [me [mn<br>suo<br>contains tracks<br>QOAN ORDER_DETAIL 7 fe)<br>STORE_INVENTORY 7 OrderID PK,FK<br>| in| StoreID PK,FK Sint ProductID | PK,FK<br>occ ens [owe |<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Software Design** 

As illustrated in the diagram above, the physical data model strictly adheres to the Third Normal Form (3NF) and the required PostgreSQL/MySQL database constraints to eliminate data redundancy and ensure ACID compliance. Key standardizations in this diagram include: 

- **Separation of Headers and Details** : Transactional records such as ORDER and PURCHASE_ORDER are separated from their line items (ORDER_DETAIL and PURCHASE_ORDER_DETAIL). This ensures that multiple products can be purchased or supplied in a single transaction without duplicating the main order information. 

- **Many-to-Many Resolution** : The logical many-to-many relationship between a Branch (STORE) and a Product Batch (BATCH) is fully resolved into a physical associative entity called STORE_INVENTORY. This table uses a composite Primary Key (StoreID, BatchID) to accurately track the exact real-time quantity of a specific product batch at a specific physical location. 

- **Data Integrity via Foreign Keys (FK)** : All relationships are strictly enforced using Foreign Keys to maintain referential integrity across the Omnichannel Hub and Smart Procurement modules. 

#### **4.2 Data Specification** 

**_Table 4.1: ROLE_** _(Stores user role definitions for Role-Based Access Control)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_RoleID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique identifier for_<br>_the role._|
|_2_|**_RoleName_**|_VARCHAR(50)_|_Unique, Not Null_|_The name of the role_|
|||||_(e.g.,_<br>_Cashier,_<br>_Store_|
|||||_Manager,_<br>_Chain_<br>_Manager)._|



HCMUS | SE Dept. 

**20** 

**Introduction to Software Engineering** 

**Software Design** 

**_Table 4.2: STORE_** _(Stores physical branch information)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_StoreID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique identifier for_<br>_the store branch._|
|_2_|**_StoreName_**|_VARCHAR(100)_|_Not Null_|_The display name of_<br>_the store._|
|_3_|**_Location_**|_VARCHAR(255)_|_Not Null_|_The physical address of_<br>_the store._|



**_Table 4.3: STAFF_** _(Stores user accounts and credentials)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_StaffID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique identifier for the_<br>_staff member._|
|_2_|**_Username_**|_VARCHAR(50)_|_Unique, Not Null_|_Login_<br>_username_<br>_for_<br>_system authentication._|
|_3_|**_Password_**|_VARCHAR(255)_|_Not Null_|_Hashed password for_<br>_security._|
|_4_|**_FullName_**|_VARCHAR(100)_|_Not Null_|_The full name of the_<br>_employee._|
|_5_|**_RoleID_**|_INT_|_Foreign Key, Not_<br>_Null_|_Links_<br>_to_<br>_the ROLE_<br>_table._|



HCMUS | SE Dept. 

**21** 

|**Introd**|**uction to Software**|**Engineering**|||**Software Design**|
|---|---|---|---|---|---|
|_6_<br>**_Table 4_**<br>|**_StoreID_**<br>**_.4: CATEGORY_**_(S_<br>|_INT_<br>_F_<br>_N_<br>_tores product classifi_<br>|_oreign_<br>_Key,_<br>_ullable_<br>_cations)_<br>|_Links_<br>_table_<br>_Chain_<br>|_to the STORE_<br>_(Nullable_<br>_for_<br>_Managers)._<br>|
|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Desc_**|**_ription_**|
|_1_|**_CategoryID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|<br>_Uniq_<br>_the c_|_ue identifier for_<br>_ategory._|
|_2_|**_CategoryName_**|_VARCHAR(100)_|_Not Null_|_The_<br>_cate_<br>_Foo_|_name_<br>_of_<br>_the_<br>_gory (e.g., Fresh_<br>_d, Beverage)._|



**_Table 4.5: PRODUCT_** _(Stores master product information)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_ProductID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique identifier for_<br>_the product._|
|_2_|**_Barcode_**|_VARCHAR(50)_|_Unique, Not Null_|_Scannable_<br>_barcode_<br>_used_<br>_for_<br>_POS_<br>_checkout._|
|_3_|**_ProductName_**|_VARCHAR(255)_|_Not Null_|_The display name of_<br>_the product._|



HCMUS | SE Dept. 

**22** 

**Introduction to Software Engineering** 

**Software Design** 

|_4_|**_BasePrice_**|_DECIMAL(10,2)_|_Not Null, > 0_|_Default retail price of_<br>_the product._|
|---|---|---|---|---|
|_5_|**_MinThreshold_**|_INT_|_Not Null, >= 0_|_Minimum stock level_<br>_to trigger automated_<br>_alerts._|
|_6_|**_CategoryID_**|_INT_|_Foreign_<br>_Key,_|_Links_<br>_to_<br>_the_|
||||_Not Null_|_CATEGORY table._|



**_Table 4.6: BATCH_** _(Stores product batches and expiration dates for perishable goods)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_BatchID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique identifier for the_<br>_batch._|
|_2_|**_ManufactureDate_**|_DATE_|_Not Null_|_The date the batch was_<br>_manufactured._|
|_3_|**_ExpirationDate_**|_DATE_|_Not Null_|_The expiration date of_<br>_the batch._|
|_4_|**_ProductID_**|_INT_|_Foreign Key, Not_<br>_Null_|_Links to the PRODUCT_<br>_table._|



HCMUS | SE Dept. 

**23** 

**Introduction to Software Engineering** 

**Software Design** 

**_Table 4.7: STORE_INVENTORY_** _(Associative table managing real-time stock levels per branch)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_StoreID_**|_INT_|_Primary_<br>_Key,_<br>_Foreign Key_|_Links to the STORE table._|
|_2_|**_BatchID_**|_INT_|_Primary_<br>_Key,_<br>_Foreign Key_|_Links_<br>_to_<br>_the_<br>_BATCH_<br>_table._|
|_3_|**_Quantity_**|_INT_|_Not Null, >= 0_|_Current physical stock_<br>_quantity of the batch at_<br>_the specific store._|



**_Table 4.8: SUPPLIER_** _(Stores vendor and supplier details)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_SupplierID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique identifier for_<br>_the supplier._|
|_2_|**_SupplierName_**|_VARCHAR(255)_|_Not Null_|_The_<br>_name_<br>_of_<br>_the_<br>_supplier company._|
|_3_|**_ContactPhone_**|_VARCHAR(20)_|_Not Null_|_The primary contact_<br>_phone number._|
|_4_|**_Email_**|_VARCHAR(100)_|_Nullable_|_The_<br>_contact_<br>_email_<br>_address._|
|_5_|**_Address_**|_VARCHAR(255)_|_Nullable_|_The physical address_<br>_of the supplier._|



HCMUS | SE Dept. 

**24** 

**Introduction to Software Engineering** 

**Software Design** 

**_Table 4.9: PURCHASE_ORDER_** _(Stores incoming shipment records from suppliers)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_PO_ID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique_<br>_identifier_<br>_for_<br>_the purchase_<br>_order._|
|_2_|**_OrderDate_**|_DATE_|_Not Null_|_The date the order_<br>_was placed._|
|_3_|**_ExpectedDeliveryDate_**|_DATE_|_Nullable_|_The expected date_<br>_of shipment arrival._|
|_4_|**_Status_**|_VARCHAR(50)_|_Not Null_|_Current status (e.g.,_<br>_Preparing,_<br>_Delivered,_<br>_Delayed)._|
|_5_|**_SupplierID_**|_INT_|_Foreign_<br>_Key,_<br>_Not Null_|_Links_<br>_to_<br>_the_<br>_SUPPLIER table._|



**_Table 4.10: PURCHASE_ORDER_DETAIL_** _(Stores line items for purchase orders)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_PO_ID_**|_INT_|_Primary_<br>_Key,_|_Links_<br>_to_<br>_the_|
||||_Foreign Key_|_PURCHASE_ORDER_<br>_table._|
|_2_|**_ProductID_**|_INT_|_Primary_<br>_Key,_<br>_Foreign Key_|_Links to the PRODUCT_<br>_table._|



HCMUS | SE Dept. 

**25** 

|**Introd**|**uction to Softw**|**are Engineering**||**Software Design**|
|---|---|---|---|---|
|_3_|**_OrderQty_**|_INT_|_Not Null, > 0_|_The quantity of products_<br>_ordered._|
|_4_|**_UnitCost_**|_DECIMAL(10,2)_|_Not Null, >= 0_|_The cost per unit provided_<br>_by the supplier._|



**_Table 4.11: ORDER_** _(Stores customer transaction headers across all omnichannel platforms)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_OrderID_**|_INT_|_Primary_<br>_Key,_<br>_Auto Increment_|_Unique identifier for_<br>_the transaction._|
|_2_|**_OrderDate_**|_DATETIME_|_Not Null_|_The_<br>_timestamp_<br>_of_<br>_when the transaction_<br>_occurred._|
|_3_|**_OrderType_**|_VARCHAR(50)_|_Not Null_|_Identifies the source_<br>_(POS,_<br>_GrabMart,_<br>_ShopeeFood,_<br>_or_<br>_BeMart)._|
|_4_|**_PaymentMethod_**|_VARCHAR(50)_|_Not Null_|_The method used for_<br>_payment_<br>_(Cash_<br>_or_<br>_Bank QR)._|
|_5_|**_TotalAmount_**|_DECIMAL(10,2)_|_Not Null, >= 0_|_The final calculated_<br>_total amount of the_<br>_order._|



HCMUS | SE Dept. 

**26** 

**Software Design** 

|**Introd**|**uction to Softwa**|**re Engineering**|||**Softw**|
|---|---|---|---|---|---|
|_6_|**_Status_**|_VARCHAR(50)_|_Not Null_||_Current order status_<br>_(Completed, Pending,_<br>_or Cancelled)._|
|_7_|**_StoreID_**|_INT_|_Foreign_<br>_Not Null_|_Key,_|_Links to the STORE_<br>_table._|
|_8_|**_StaffID_**|_INT_|_Foreign_<br>_Nullable_|_Key,_|_Links to the STAFF_<br>_table (Null if it is an_<br>_external omnichannel_<br>_order)._|



**_Table 4.12: ORDER_DETAIL_** _(Stores line items for customer transactions)_ 

|**_Seq_**|**_Column Name_**|**_Data Type_**|**_Constraint_**|**_Description_**|
|---|---|---|---|---|
|_1_|**_OrderID_**|_INT_|_Primary_<br>_Key,_<br>_Foreign Key_|_Links to the ORDER_<br>_table._|
|_2_|**_ProductID_**|_INT_|_Primary_<br>_Key,_<br>_Foreign Key_|_Links_<br>_to_<br>_the_<br>_PRODUCT table._|
|_3_|**_Quantity_**|_INT_|_Not Null, > 0_|_The_<br>_quantity_<br>_of_<br>_products purchased._|
|_4_|**_UnitPrice_**|_DECIMAL(10,2)_|_Not Null, >= 0_|_The selling price per_<br>_unit_<br>_(may_<br>_include_<br>_near-expiry discounts)._|
|_5_|**_SubTotal_**|_DECIMAL(10,2)_|_Not Null, >= 0_|_The calculated subtotal_<br>_(Quantity * UnitPrice)._|



HCMUS | SE Dept. 

**27** 



<!-- Start of picture text -->
A. Authentication Module (shared)<br>Pek ------ S03<br>co Reset Password<br>yf “Reset password<br>/<br>soot,ign In en - —Beektesionin= “502 )<br>sign Up Sign Up )}<br>login as Cashier<br>B. POS Terminal (Cashier)<br>aceres s09<br>aom End of Day Report<br>login as Manager/Admin ae “ GLY<br>ra aoe ---rH sos<br>7 ae nav Shift Management<br>S04<br>Sales Cart (POS Home) Le my 22s<br>z \ ~ ae InventoryS07Lookup<br>» ‘ >> ~<br>N nav ~e<br>N So<br>~. S06<br>~ Complete / Close Order Lookup<br>Checkout (F9) ~ S05<br>Checkout/ Payment<br>Cc. Admin Management Portal (Manager / Admin)<br>S21<br>POS Transactions<br>Transactions<br>$20<br>Online Orders<br>Orders —______— 1 sis<br>si9 Create onset — ~~ add Staff<br>Customers Customer List y+ooNew Staff<br>A?<br>Bes Staff S16 eee ee S17<br> ibosrds\iiup Staff List (Grid) View profile Staff Details<br>Inventory<br>ProductS13 List “~~ ~ SSDSCreate / Cancel = Add Product<br>> Add Product<br>si2 ee<br>Custustomer DDashpoarhboard Eni (Ge) ProductS14Details<br>sil<br>Store Dashboard<br>$10<br>Analytics Dashboard<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Software Design** 

|**Seq**|**Screen**|**Description**|
|---|---|---|
|**A. Auth**|**entication Module (shared)**||
|**S01**|**Sign In**|Single entry point of the system. Authenticates a user by<br>email/password and routes them to the module matching their<br>role.|
|**S02**|**Sign Up**|Registers a new account (name, email, password, accept<br>Terms); also offers Google / Facebook sign-up.|
|**S03**|**Reset Password**|Lets a user request a password-reset email by entering their|
|||account email.|
|**B. POS**|**Terminal (Cashier)**||
|**S04**|**Sales Cart (POS Home)**|Main selling screen. Adds products by name/SKU, manages<br>several parallel orders, applies discounts, links a customer and<br>starts checkout.|
|**S05**|**Checkout / Payment**|Modal that collects payment (Cash / Bank Transfer / Card),<br>computes change and finalises the sale.|
|**S06**|**Order Lookup**|Searches past orders (name, customer, code, date range,<br>channel)and shows the selected order's details.|
|**S07**|**Inventory Lookup**|Searches a product and shows its On-hand / Incoming /<br>Available stock at the current branch.|
|**S08**|**Shift Management**|Lists today's shifts, opens/closes a shift and shows<br>cash-in-shift per payment method.|
|**S09**|**End of Day Report**|Daily revenue summary with an hourly revenue chart and a|
|**C. Adm**|**in Management Portal (Manager /**|TopProducts table;printable.<br>**Administrator)**|
|**S10**|**Analytics Dashboard**|Company-wide KPIs (SKUs, staff, customers, revenue), sales<br>analytics, topsellingand latest transactions.|
|**S11**|**Store Dashboard**|Branch-level performance: revenue, sales funnel, revenue<br>sources, topstaff and branch location.|
|**S12**|**Customer Dashboard**|Membership tiers, top VIP customer, peak hours, top<br>customers and visits bydevice.|
|**S13**|**Product List**|Catalogue of all products with stock status, quantity, supplier,<br>price and row actions (view/edit/delete).|
|**S14**|**Product Details**|Single product view with supplier contact, a Reorder-Stock<br>request form, tags and stock badge.|
|**S15**|**Add Product**|Creates a new product (photo, category, price, unit, barcode,<br>batch, expiry, supplier).|
|**S16**|**Staff List (Grid)**|Staff cards with monthly sales, branch and contact links, plus<br>staff summarywidgets.|
|**S17**|**Staff Details**|Staff profile with performance status, reviews, documents and<br>certificates.|
|**S18**|**Add Staff**|Creates a staff record (name, email, phone, address,<br>city/country, social links,photo).|



HCMUS | SE Dept. 

**29** 

**Introduction to Software Engineering** 

**Software Design** 

|**S19**|**Customer List**|Table of customers with contact, status and last-contacted date,<br>plus row actions.|
|---|---|---|
|**S20**|**Online Orders**|Omnichannel order list from external delivery channels<br>(Shopee Food, GrabMart, BeMart, Shopee) with source,<br>amount, delivery address and delivery status (Delivered /<br>Preparing/ Cancelled).|
|**S21**|**POS Transactions**|In-store payment transactions with transaction ID, customer,<br>amount, payment method (card / MoMo / cash / online<br>banking), cashier and status(Completed / Pending/ Canceled).|



#### **5.2 Screen Specifications** 

The six most important screens are specified in detail below. For each one, this section describes its purpose and actor, its presentation format, and how each on-screen event is handled, together with the design image. The remaining screens are presented as user-interface designs in Section 5.3. 

###### **_5.2.1 Screen “Sign In”_** 

**Purpose:** Authenticates a user (cashier, store manager or administrator) and grants access to the module matching their role. It is the single entry point of the whole system. 

**Actor / Entry point:** All users. Reached on application launch or any unauthenticated access. 

###### **Presentation format** 

|**UI element**|**Description**|
|---|---|
|**Header**|Title “SIGN IN” with a short subtitle explaining the screen.|
|**Email field**|Text input for the account email address.|
|**Password field**|Masked input; a “Resetpassword” link sits at its top-right.|
|**Remember me**|Checkbox to keep the user signed in on the current device.|
|**Sign In button**|Primary, full-width action that submits the credentials.|
|**Social sign-in**|“OR sign with” divider followed byGoogle and Facebook buttons.|
|**Footer link**|“New here? Sign Up” navigates to account registration.|



###### **Event handling** 

|**Event / Trigger**|**System handling**|
|---|---|
|**Click “Sign In”**|Validate the credentials; on success route to POS Home (cashier) or the<br>Dashboards Hub (manager/admin); on failure show an error message.|
|**Click “Resetpassword”**|Navigate to the Reset Password screen(S03).|
|**Click “Sign Up”**|Navigate to the Sign Upscreen(S02).|
|**Tick “Remember me”**|Persist the session so the user is not asked to log in again on the same<br>device.|
|**Click Google / Facebook**|Start OAuth sign-in with the selectedprovider.|



HCMUS | SE Dept. 

**30** 



<!-- Start of picture text -->
SIGN IN<br>Enter your email address and password to accessadmin panel<br>Email<br>Enter your emai<br>Password Reset password<br>Enter your password<br>Rememberme<br>OR sign with<br>G f<br>New here? Sign Up<br><!-- End of picture text -->



<!-- Start of picture text -->
vy" Products (3) plit product row Search custome 7 4 +<br>Subtotal (3 items $3.46<br>Coca-Cola0 330ml $0.83 2 $1.67 Discount F6 $0.00<br>Vinamitk Fresh Milk $075 1 $075 Customer owes $3.46<br>Wheat Bread Loaf $1.04 1 $104 s Auto print invoice F10<br>Checkout F9<br>Add order note Employee: Admin SEO1 + Custom Product F2<br><!-- End of picture text -->



<!-- Start of picture text -->
Payment Multiple payment method<br>& as] &<br>Cash Bank Transfer Card Payment Settings<br>ustomer owes $3.46<br>Amount Received $3.46<br>s600 #1000<br>$20.00 $50.00 $100.00<br>Change Due $0.00<br>Press Space to switch payment method<br>= Use Arrow keys to change account/ suggested amount<br>Complete (F9)<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Software Design** 

###### **Presentation format** 

|**UI element**|**Description**|
|---|---|
|**Page header**|Title and breadcrumb(Product › ListingList).|
|**KPI cards**|Total Sales, Total SKUs and Unit Sold, each with a trend vs last month and a<br>“See Details” link.|
|**Products table**|Columns: Product Photo & Name, Unit/Weight, Category, Stock Status<br>(colour-coded badge), Stock Qty, Supplier, Price and Action (view / edit /<br>delete). Aperiod filter sits above the table.|
|**Pagination**|Previous, page numbers and Next.|



###### **Event handling** 

|**Event / Trigger**|**System handling**|
|---|---|
|**Change period (“This Month”)**|Refresh the KPIs and the list for the selected range.|
|**Click view(eye)**|Open theproduct's Product Details screen(S14).|
|**Click edit(pencil)**|Open theproduct in edit mode.|
|**Click delete(trash)**|Ask for confirmation and remove theproduct.|
|**Stock Status badge**|Colour-code each row – In stock (green), Low stock (orange), Out of stock<br>(red)– so at-risk items stand out.|
|**Tick row / header checkbox**|Select one or all rows for a bulk action.|
|**Click pagination**|Load the next / selected page of products.|



###### **Design** 

HCMUS | SE Dept. 

**34** 

|=<br>=<br>Q<br>se<br>Listing List<br>@<br>Dashboal|||-.<br>@<br>Giagse<br>oduct<br>><br>Listing<br>List|
|---|---|---|---|
|Inventory<br>Total Sales<br>ProductList<br>$12,7812.09<br>ast<br>mont|3<br>See Details>|Total SKUs<br>a<br>Unit Sold<br>15,780 Unit<br>ie<br>893Unit<br>¥<br>8.876<br>yslast<br>mont<br>SeeDetails><br>7%<br>vs<br>last month|®<br>See Details >|
|All Properties List<br>&)<br>Cu;|||This Month ¥|
|.<br>Product Photo&Name<br>G<br>Order|Unit/Weig|ht<br>Category<br>Stock Status<br>Stockaty<br>Supplier<br>Price|Action|
|S<br>Transactions<br>Coca-Cola<br>FA<br>Revie|330m!|Beverages<br>tock<br>240<br>France<br>$0.80|©<br>2<br>C|
|a<br>J<br>3_ instantNoodlesBox<br>r=|box|Food<br>Dut<br>of stock<br>0<br>Bermuda<br>$12.00|©<br>2|
|E<br>Post<br>Shampoo|500m|Personal Care<br>\<br>8<br>Aust<br>$4.50|®<br>2|
|Lay's Potato Chips|Ag|Sna¢<br>tock<br>320<br>PepsiCo VN<br>$0.90|©<br>eo|
|B FreshMilk 1L|L|Dai<br>h<br>2<br>Vinamitk<br>$150|®<br>@|
|3<br>MarlboroRed|pack (20pcs)|Tobacco<br>tock<br>50<br>Philip Morris VN<br>$2.80|®<br>@|
|3<br>Colgate Toothpaste 100g|100g|Personal Care<br>tock<br>96<br>Colgate-Palmolive<br>$1.20|®<br>eo<br>G|
|sea Bull Energy Drink|Orr|Beverage<br>Out of stock<br>0<br>‘C Pharma<br>$1.10|©<br>2<br>C|
|3<br>Omo Detergent 3kg|Kg|Household<br>tock<br>45<br>Unilever<br>VN<br>$6.50|®<br>2|
|3<br>KitkatChocolateBar|41.59|Snacks<br>Outofstock<br>0<br>Nestlé<br>VN<br>$0.75|®<br>@|



**Introduction to Software Engineering** 

**Software Design** 

###### **_5.2.5  Screen "Add Product"_** 

**Purpose:** Creates a new product record in the catalogue, including its photo, classification and supplier information. 

**Actor / Entry point:** Store manager / administrator. Reached from Inventory → Add Product. 

###### **Presentation format** 

|**UI element**|**Description**|
|---|---|
|**Preview card (left)**|Live preview of the product: image placeholder, stock badge, name,<br>supplier,price, tagchips and “Add Property” / “Cancel”.|
|**Photo drop-zone**|Drag-and-drop area (or “click to browse”) for the product image;<br>recommends 1600×1200.|
|**Product Information form**|Product Name, Category, Price, Unit Type, Barcode, Storage Notes, Expiry<br>Date, Batch No. and Supplier.|
|**Actions**|“Create Product”(primary)and “Cancel”.|



###### **Event handling** 

|**Event / Trigger**|**System handling**|
|---|---|
|**Drop / browse an image**|Upload and preview the product photo in the drop-zone and the preview<br>card.|
|**Fill in form fields**|Update the left preview card live (name, price, tags).|
|**Click “Add Property”**|Add a custom tag/ attribute chipto theproduct.|
|**Open a dropdown**|Choose Category, Unit Type, Batch No. or Supplier from a list.|
|**Click “Create Product”**|Validate required fields, save theproduct and return to Product List(S13).|
|**Click “Cancel”**|Discard the entry and return without saving.|
|**Missing required fields**|Show inline validation and block saving.|



###### **Design** 

HCMUS | SE Dept. 

**36** 



<!-- Start of picture text -->
_= gsEE GildeC:} @<br>_ Add Product ventory > Add Product<br>NsInventory = ‘Add Product Photo<br>t<br>t Detail<br>=o<br>2s t (CocereolaVinamilk Distribution Drop16 0 xyour12 0 images(4:3 n d o. here,PN or clickFiles toarebrowsealowed<br>Price<br>$0.80<br>® 0 ae » 8<br>Storage Notes<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Software Design** 

###### **_5.2.6  Screen "Store Dashboard"_** 

**Purpose:** A branch-level performance dashboard for managers covering revenue, the sales funnel, revenue sources, top staff and branch context. 

**Actor / Entry point:** Store manager / administrator. Reached from Dashboards → Store. 

###### **Presentation format** 

|**UI element**|**Description**|
|---|---|
|**Branch selector**|Dropdown to choose the branch (e.g. “Ho Chi Minh City Branch”) plus a<br>breadcrumb.|
|**KPI cards**|Monthly Revenue, Revenue Growth, Conversion Rate and Gross Profit<br>Margin.|
|**Sales Funnel**|Area chart with stage counters: Store Visitors, Product Scans, Carts Created<br>and Completed Orders.|
|**Total Revenue**|Revenue value plus a “Revenue Sources” breakdown (Food & Beverage,<br>Household Items, Services, Others).|
|**Staff & goals**|Top Sales Staff card, a Monthly Sales Goal gauge and an Income Statistic<br>block.|
|**Performance & location**|Recent Sales Performance chart, a branch map with per-branch visitor share<br>and a Recent Join Staff list.|



###### **Event handling** 

|**Event / Trigger**|**System handling**|
|---|---|
|**Change the branch dropdown**|Reload everywidget for the selected branch.|
|**Change a widget'speriod**|Re-querythat chart for the chosen range(Today/ This Month / This Year).|
|**Click a Top Sales Staff arrow**|Open that staff member's Staff Details screen(S17).|
|**Click “View All” / “Add Other**<br>**+”**|Drill into the full list or add a branch.|
|**Hover a chartpoint**|Show a tooltipwith the exact value.|



###### **Design** 

HCMUS | SE Dept. 

**38** 



<!-- Start of picture text -->
= Gu2e6@°<br>Store + Basha<br>$3548.09 io) $67435.00 78.8% 34.00%<br>Sales Funnel “This Month Total Revenue Tris Month » ‘Top Sales Statf<br>$15,563,786<br>1237% 167. 07K 348 ee91220378 $56,131 ees134015 $6046 Thu— Duc, Hoh45/5RatngMinn Cy ><br>$5.829 Monthly Sales Goa<br>$52,356 sem W/Z<br>=SmG<br>75%<br>Achieved<br>Recent Join Staff G<br>BD) enc Hane 7<br>2 145678 ——. . BD) rcnaetcoch vio) 2 0 8<br>@ ve Sonnet rinon vores “85k<br>; GP vsriete.c. hom<br>@Oberote o2e camer — 7<br>Bi yt @ oe coe 20 BP) Lulav. auiney ‘<br>mateshd +<br><!-- End of picture text -->



<!-- Start of picture text -->
FREE ACCOUNT<br>G f<br><!-- End of picture text -->



<!-- Start of picture text -->
RESET PASSWORD<br><!-- End of picture text -->



<!-- Start of picture text -->
P Inventory Lookup Main Store<br>Filter Coca-Cola 330mtb etait<br>i) Coca-Cola 330ml 33<br>Stock Information<br>Vinamilk Fresh Milk 1L<br>0 i and comin silabl<br>Wheat Bread Loaf Main Store Current 33 0) 33<br>12<br>Instant Noodles (Pack)<br>48<br><!-- End of picture text -->



<!-- Start of picture text -->
P Shift Management | close shit |<br>Today 16:00 - Now open<br>16:00 - Now $103.33<br>m Open 3<br>Cash in Shift t<br>© 08:00 - 16:00 $213.33<br>:<br>Payment<br>00:00 - 08:00 $37.08 Cash $82.50 $0.00 $82.50<br>- Bank Transfer $20.83 $0.00 $20.83<br>Card $0.00 $0.00 $0.00<br>Total $103.33<br><!-- End of picture text -->



<!-- Start of picture text -->
Day Report<br>This Week This Month This Quarter This Year Custom<br>F Top Products<br>Coca-Cola 330ml 58 $48.33<br>Hourly Revenue Instant Noodles (Pack) 34 $551.08<br>Vinamilk Fresh Milk 22 $16.50<br>Wheat Bread Loaf v7 $17.71<br>Bottled Water 500mt 45 $18.75<br>Total $760.00<br><!-- End of picture text -->



<!-- Start of picture text -->
== Gia8@-. @<br>Analytics Deehboard ><br>; I, | ; I, I<br>2,854 705 9,431 <« $78.3M<br>Sales Analytic This Month © $117,000.43<br>IEarnings : $85,934 My Balance<br>sme $7866<br>/™ send facaive<br>_ / \ _ Units Sold Revenue<br>Wi N / YN la<br>\ TQu/s/ N\ /y/ a 3<br>\/ 15,780 $78.3M<br>wees Recececeeenees<br>23,675.00 11,562.00 67,365.00 View More ><br>Onn source smn & ‘Top Selling Weekly Sales<br>Product Price Discount Sold Source<br>a Headphone<br>Total Buyer os ‘Shoes<br>70 ne<br>er<br>B= ul J it | i<br>& Buyers : 70<br>Ll a<br>Latest Transaction This Month »<br>#722540 B)) richaet Am I-56 Jan, 2023 s45.84 . ®<br>arz3904 =) m 3728 Dec, 2023 $78.483 aR cos = ©<br>a2s032 HB) demes Erickson In-826 8 Sep, 20 se364 a ©<br>srz1695 Buy w.wiso 1-902 2 $94,305 ad re<br>#728473 BD soran, Brooks IN-e94 May, 20 $4256 oR Coe cut ©<br>srza160 Boek I mM $25,671 ine Bank ><br><!-- End of picture text -->



<!-- Start of picture text -->
_= GuUa66.. 2<br>Customers ,<br>Bronze Members Silver Members hp Cee<br>15781Ag Spend Month £23263Avg Spen Mont Tony Nguyen<br>BSS SSS BSSSSSSS SSS SSS f @ 2<br>3474 7043 r<br>Gold Members Platinum Members<br>£20562A. Spend Month Today SA1341Ag. Spend / Today \ 8<br>5933, 89 Goa ‘cal To Customer<br>Top Spending Customers evenve<br>aonae $67435.00 |<br>7 67,893 0s a<br>Bp revi rocget<br>3 °<br>Gp vero asian , 235 578<br>nits 10s Windows Mee Book $9067500<br><!-- End of picture text -->



<!-- Start of picture text -->
== . GiagseCJ<br>Product Details nventory > Product Details<br>Supplier Details<br>Vinamilk Distribution<br>_ . eo.)<br><=<br>Reorder Stock<br>oor Coca-Cola 330m! <u:<br>Your FullN<br>® $0.80<br>& 44 Review © For Sale<br>Product Tags<br>Product Description<br><!-- End of picture text -->



<!-- Start of picture text -->
-= gas Gudeer. @<br>Staff Grid Store Staff Gric<br>Welcome Back , Manager Shift Schedule » Total Sales by Staff<br>250 30 os $45,000<br>Total Staff e Full-time a Total s ling Ap s<br>250 °<br>i ‘4 day ago ast Updated ; 12 hour ago View More<br>MichaelA.Miner TheresaT. Brose Walter LCalab<br>£1 Sales this month: $240 {Sales this mont: $2,430 {B. Sses tis month: $2430<br>* @ is f @ a} f © is<br>a OliveCashierMize i a Christasashi Sardina : a Darrenashie Rivera i<br>BB Sales this month: $2,430 £% Soles this month: $2,430 fA Seles this month: $2,430<br>f @ f f @ a f @ a<br>Robert V. Leavitt Lydia Anderson Sarah Martinez<br>{Bf Sales this month: $2430 £8 Soles tis month: $2430 {8 Soles tis month: $2430<br>a) i # © a) i<br><!-- End of picture text -->



<!-- Start of picture text -->
= cutee<br>a Sa 5<br>. .72 7% @<br>1<br>Abou Micha 6 19243 catected InThieMonth<br>a rs 5 z > a<br><!-- End of picture text -->



<!-- Start of picture text -->
_= Q Se Giag@eeC)<br>@ Dashboa Add Staff Real Estate > Add Agen<br>¢ IF Michael Add Agent Photo<br>3 trichaeiminer@dayrep.comA. Miner<br>Agents<br>t<br>G M243<br>‘Addha  Agent Social@ MediaLincoln Drive Harrisburg, PA 17101 USA &<br>£] Customer f @ Om) . .<br>Drop your images here, or click to browse<br>te r 1600 x 1200 (4: C nend JPG ar IF files ar M<br>$ Transactions<br>FA Revie<br>a7<br>a Agent Information<br>EI Post Staff Name Staff Email<br>Full Name Enter Email<br>Staff Number Properties Number<br>Staff Address<br>Enter address<br>Zip-Code City Country<br>Facebook UR Instagram UR TwitterURL<br><!-- End of picture text -->



<!-- Start of picture text -->
== Q se Giagse-. @<br>Customer List Customers > Customer List<br>@ Dashboa<br>a [ r All Customer List This Month<br>Customer Photo& Name Email Contact Property Type _Interested Properties Status Last Contacted Action<br>&] Customers<br>stv ® David Nummi dJaavidnumminen@teleworm.u +231 06-75820711 Residential 23 Maple St, 456 Oak Ave interested 15/03/202: ® 2<br>- - ®  Sinikka Penttinen jnikkapenttinen@dayrep.com +231 47-23456789 Commercial 789 Pine Blvd Under Review 20/03/202 ® @ {<br>" ® Jere Palmu jerepalmu@rhyta.com +231 73-34567890 Residential 101 Birch Ct, 202 Cedar Li ollow-up 25/03/2023 ©® @<br>Order<br>cs ' 2 Ulla Nuorela ullanuorela@rhyta.com 231 45-45678901 Residential 303Elm St interested 05/04/2023 ® @2 68<br>1 Message<br>a ® HarlandR. Orsini iarlandrorsini@dayrep.com +231 82-67890123 Residential 505 Spruce St interested 15/04/202: ® @ ft<br>® Valerie Obrien alerieobrien@dayrep.cor +231 82-89012345, Residential 308 Willow Dr, 909 Aspen Ln interested 20/04/2023 © @<br>Previous 2 3 Next<br><!-- End of picture text -->



<!-- Start of picture text -->
©<br>= Gioagee<br>Orders Stor c<br>All Order List This Month ¥<br>2) sinikka Penttinen r0102/202: +23147-23486789 crab 150 799 Vo VanNoa = ® ¢<br>&) David Padgett 15/06/2023 31 92-78901234 bet si280 404 Man e=n © @<br>® Valerie Obrien 2 1 82-8901234 ope $15.40 808 Willow Dr,909 Aspen Ln = ® @<br>® AdrianaG. Faust 9/10/20 q 5764 BeMa $8.9¢ 10 Barlow Street Mokopan = ® @<br><!-- End of picture text -->



<!-- Start of picture text -->
CJ<br>= Gio8e<br>In-store Transactions Ste fransa s<br>TXN-341220 RayC.Nichols 05/01/2023 s3ce7 : Michael A. Mit © ¢<br>TXN-547891 ™, BarbaraA Woods 14/02/202 $11,345 @ : resa T. Brose ® é<br>TXN-230477 Walk-in Customer 3/03 2: $16,78: s : Wat Calab ne ® é<br>TXN-765434 B_ Walk-in Customer /05/2¢ $10.23: Christa Sardi ® @<br>TXN-452103 B. LuisP. Brick 9/06/20; $17,89 ° . Darren Rivera ® _ C<br><!-- End of picture text -->

