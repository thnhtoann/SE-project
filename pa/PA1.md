Requi ts Analysi 



<!-- Start of picture text -->
Software Engineering Department<br>Faculty of Information and Technology of Information and Technology and Technology Technology<br>University of Science of Science Science<br><!-- End of picture text -->

oe Rhy, Software Engineering Department ¢ Ck Ck 4 Faculty of Information and Technology of Information and Technology and Technology Technology % é University of Science of Science Science 



<!-- Start of picture text -->
¢ Ck Ck 4<br>% é<br><!-- End of picture text -->

## **Table of Contents** 

|**Objectives**|**1**|
|---|---|
|**1**<br>**Member Contribution Assessment**|**2**|
|**2**<br>**Problem Statement**|**3**|
|**3**<br>**Requirements Overview**|**4**|
|**4**<br>**Requirements Analysis**|**5**|
|**5**<br>**Prototype/Mockup**|**6**|



~~<mark>———</mark> —~~ 



**Introduction to Software Engineering** 

**Requirements Analysis** 

# **1 Member Contribution Assessment** 

|**ID**|**Name**|**Contribution (%)**|**Signature**|
|---|---|---|---|
||||<br>Viet|
|24127590|Đoàn Thế Việt|20%||
|24127405|Võ Minh Huy|20%|Huy|
|24127559|Nguyễn Thanh Toàn|20%|Toan|
|24127553|Phan Trường Phúc Thuận|20%|Thuan|
||||Nhut|
|24127097|Lê Duy Nhựt|20%||



HCMUS | SE Dept. 

**2** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

# **2 Problem Statement** 

###### **2.1 Business Description of the Software Problem** 

Modern convenience store chains face significant operational bottlenecks due to the growing complexity of retail management and changing consumer behaviors. Currently, store cashiers struggle with slow checkout processes during peak hours, which leads to long queues and customer dissatisfaction. Simultaneously, the rapid rise of external online delivery platforms—such as GrabMart, ShopeeFood, and BeMart—has introduced a highly fragmented order management workflow. Store managers are forced to manually monitor and aggregate incoming orders across multiple disparate devices or applications. This lack of integration frequently results in severe inventory discrepancies, overselling, and data inconsistency, as stock levels are not automatically synchronized between physical store purchases and digital orders. 

Furthermore, managing perishable goods with short shelf lives is highly manual and prone to human error. Without an automated tracking system, stores suffer from significant financial losses due to product waste when near-expiry items are not identified and discounted in time. On a macro level, procurement operations are often reactive rather than proactive. Chain managers lack centralized visibility into supplier performance, shipment tracking, and real-time low-stock alerts, making it difficult to optimize supply chain operations and maintain sufficient stock levels across the entire network. 

To resolve these critical business challenges, the proposed **Convenience Store Chain Management System** aims to streamline and automate retail operations through a centralized software solution. The system encompasses four core pillars: a high-speed Point of Sale (POS) optimized for hotkey operations to maximize checkout efficiency, an Omnichannel Hub that unifies all external delivery orders and auto-deducts inventory in real time, a Smart Procurement module for automated minimum inventory alerts and supplier management, and a comprehensive Data Analytics & Security dashboard to track sales performance and batch expiration dates. 

HCMUS | SE Dept. 

**3** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

###### **2.2 Operating Environment** 

The system will operate in a highly connected, multi-tier distributed environment to support both localized store operations and centralized chain management: 

- **Client-Side (POS Terminal):** The POS interface utilized by Cashiers must function as a lightweight Single Page Application (SPA) to ensure instantaneous response times during checkout. 

- **Client-Side (Management Portal):** The administrative dashboards for Store Managers and Chain Managers must be accessible, responsive, and fully compatible with modern web browsers supporting HTML5. 

- **Server-Side:** The backend infrastructure will be built using the Django (Python) framework, exposing functionalities through a RESTful API architecture to serve client requests and external platform webhooks efficiently. 

- **Hardware Requirements:** The POS terminals deployed at physical store locations must meet the minimum hardware specifications of a Dual-core processor (2.0 GHz), 4GB of RAM, and 64GB SSD storage. Additionally, these terminals must integrate seamlessly with peripheral hardware, including barcode scanners and thermal receipt printers. 

- **Network Environment:** To facilitate real-time data synchronization across channels and intercept Webhooks from banking payment APIs and delivery platforms, a continuous, highly stable broadband Internet connection is mandatory. The network at all POS locations must maintain a minimum bandwidth of 30 Mbps download and 10 Mbps upload. 

###### **2.3 Design and Implementation Constraints** 

The development, deployment, and operation of the system are strictly bound by the following technical and architectural constraints: 

- **Database Constraints:** The underlying database management system must be either PostgreSQL or MySQL. To optimize performance and eliminate data redundancy, the database schema must be strictly designed in Third Normal Form (3NF). Most importantly, all database transactions must strictly adhere to ACID (Atomicity, Consistency, Isolation, Durability) principles to guarantee absolute transaction integrity, preventing race conditions during simultaneous real-time stock deductions. 

- **Security and Access Control Constraints:** The system must enforce rigorous security measures and role-based access control (RBAC), strictly differentiating the permissions of Cashiers, Store Managers, and Chain Managers. This must be implemented using 

HCMUS | SE Dept. 

**4** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

JSON Web Tokens (JWT) combined with secure session management to authenticate and authorize API requests. 

- **Hardware Integration Constraints:** The software must be capable of communicating with standard retail hardware peripherals. Specifically, the system is constrained to automatically trigger the physical cash drawer to open only upon the successful completion of a verified payment transaction. 

# **3 Requirements Overview** 

#### **_3.1 Stakeholders_** 

|**STT**|**Stakeholder**|**Description**|
|---|---|---|
|1|**Cashier**|The person directly operating the POS system at the physical store, using<br>hotkeys, barcode scanners, and receipt printers to process customer<br>payments.|
|2|**Store**<br>**Manager**|Manages a specific branch's operations, monitors omnichannel orders<br>(GrabMart, ShopeeFood, BeMart), and closely tracks batch/expiration<br>dates of perishable food to apply timely discounts.|
|3|**Chain**<br>**Manager**|Manages the overall store chain, receives minimum inventory alerts,<br>centrally manages suppliers and purchase orders, and views sales<br>performance reports for business decisions.|
|4|**Customer**|Shoppers at the store who indirectly interact with the system by paying via<br>bank QR code scanning.|



HCMUS | SE Dept. 

**5** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

#### **_3.2 Requirements_** 

##### **_3.2.1. Functional Requirements Specification_** 

###### **Group 1: Point of Sale (POS)** 

- **FR1.1** : The system must provide a minimalist checkout interface that allows the Cashier to operate entirely via hotkeys to optimize checkout speed. 

- **FR1.2** : The system must integrate with hardware peripherals, including barcode scanners and thermal receipt printers, and automatically trigger the cash drawer upon the completion of a payment. 

- **FR1.3** : The system must support alternative payment methods by allowing customers to pay via bank QR code scanning. 

###### **Group 2: Omnichannel Hub** 

- **FR2.1** : The system must automatically aggregate incoming orders from external delivery platforms (GrabMart, ShopeeFood, BeMart) onto a single unified dashboard. 

- **FR2.2** : The system must automatically deduct inventory levels in real time across all channels as soon as an order is placed to prevent data discrepancies. 

###### **Group 3: Smart Procurement** 

- **FR3.1** : The system must automatically trigger alerts when the inventory of any item reaches its predefined minimum threshold. 

- **FR3.2** : The system must allow the Chain Manager to centrally manage the supplier list and track the real-time status of incoming shipments. 

###### **Group 4: Data Analytics & Security (Admin Dashboard)** 

- **FR4.1** : The system must generate sales performance reports (Best-sellers / Worst-sellers) to 

- support business and purchasing decisions. 

- **FR4.2** : The system must allow tracking of product shelf-life and expiration dates by batch, 

- specifically for short-term perishable goods. 

HCMUS | SE Dept. 

**6** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_3.2.2. Non-Functional Requirements Specification_** 

4 **NFR1** - Security & Access Control: The system must enforce strict access control and role-based permissions (differentiating Cashiers, Store Managers, and Chain Managers) using JSON Web Tokens (JWT) combined with secure session management. 

5 **NFR2** - Performance & Database: The database (PostgreSQL/MySQL) must be designed in Third Normal Form (3NF) for high-performance querying and strictly comply with ACID principles to guarantee transaction integrity during real-time stock deductions. 

6 **NFR3** - Network Constraints: A continuous, highly stable broadband Internet connection (minimum bandwidth of 30 Mbps down / 10 Mbps up) is mandatory at all POS locations to intercept real-time Webhooks from banking APIs and delivery platforms. 

7 **NFR4** - Technology Stack: The client-side POS must be a lightweight Single Page Application (SPA), while the Management Portal must be responsive on HTML5-supported browsers. The server-side must be built using Django (Python) following a RESTful API architecture. 

8 **NFR5** - Hardware Constraints: The POS terminals at physical stores must meet the minimum specifications of a Dual-core processor (2.0 GHz), 4GB RAM, and 64GB SSD storage running modern operating systems. 

HCMUS | SE Dept. 

**7** 



<!-- Start of picture text -->
Convenience Store Chain Management System<br>«include» Scan Product Barcode<br>«extend» eee<br>- - Process Bank QR Payment wort rtttrrtsrr eresBD Process POS Checkout<br>- ween. include»<br>Ts «include»<br>Apply Discount on Near-Expiry Items Mt<br>= «extend» me tte<br>are ss. «include».<br>«include» Track Batch;Expiration Dates Me, - Trigger Cash Drawer<br>Receive Low-Stock Alerts Mee se<br>< Manage Suppliers & Purchase Orders Auto-Deduct Inventory in Real Time<br>Shain manager «include»<br>View Sales Performance Reports a<br>p/ Manage Omnichannel Orders<br>Cashier<br>Store manager<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Requirements Analysis** 

#### **_4.2 Use Case Specification_** 

##### **_4.2.1. Use Case 1_** 

|**_Use case ID_**|**U001**|
|---|---|
|_Use Case_|Login / Authenticate|
|_Brief Description_|This use case allows Cashiers, Store Managers, and Chain<br>Managers to securely access the system using their<br>registered accounts. The system authenticates users and<br>provides access according to their assigned roles and<br>permissions.|
|_Actor_|Cashier<br>Store Manager<br>Chain Manager|
|_Pre-Condition_|The user has a valid account registered in the system.<br>The authentication service is available.<br>The user has access to an Internet connection.|
|_Result_|The user successfully logs into the system.<br>The system identifies the user's role and displays the<br>appropriate interface.<br>Unauthorized users cannot access restricted functions.|
|_Main Scenario_|1. The user opens the login page of the system.<br>2. The user enters their username and password.<br>3. The user selects the Login button.<br>4. The system receives the authentication information.<br>5. The system validates the provided username and<br>password.|



HCMUS | SE Dept. 

**9** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

||6. The system verifies the user's role and access<br>permissions.<br>7. The system creates a secure session for the user.<br>8. The system redirects the user to the corresponding<br>dashboard.|
|---|---|
||**A1: Invalid username or password**|
||1. User enters incorrect authentication information.<br>2. System rejects the login request.|
||3. System displays an error message.|
|_Alternative Scenarios_|4. User can retry logging in.|
||**A2: Account is inactive**|
||1. System detects that the account is disabled.<br>2. System denies access.<br>3. System informs the user to contact the administrator.|
||1. The system must encrypt user credentials during<br>transmission.<br>2. Authentication response time should be less than 3|
|_Non-Functional Constraints_|seconds.<br>3. The system must support role-based access control.|
||4. User sessions must be securely managed.|



HCMUS | SE Dept. 

**10** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_4.2.2. Use Case 2_** 

|**_Use case ID_**|**U002**|
|---|---|
|_Use Case_|Process POS Checkout|
|_Brief Description_|This use case allows Cashiers to process customer purchases<br>through the Point of Sale (POS) system. The system supports<br>product scanning, payment processing, inventory updates,<br>and transaction completion.|
|_Actor_|Cashier|
|_Pre-Condition_|The Cashier has successfully logged into the POS system.<br>Products exist in the inventory database.<br>POS devices are connected and available.|
|_Result_|The customer purchase transaction is completed.<br>Product inventory is updated.<br>Transaction information is stored in the system.|
|_Main Scenario_|1. The Cashier starts a new transaction.<br>2. The Cashier scans the product barcode.<br>3. The system retrieves product information from the<br>database.<br>4. The system displays product name, price, and<br>quantity.<br>5. The Cashier confirms the selected products.<br>6. The system calculates the total payment amount.<br>7. The Customer completes the payment.<br>8. The system verifies the payment status.<br>9. The system deducts the purchased product quantities<br>from inventory.|



HCMUS | SE Dept. 

**11** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

||10. The system generates transaction information.<br>11. The system stores the completed transaction.<br>12. The system completes the checkout process.|
|---|---|
||**A1: Product is unavailable**|
||1. The Cashier scans a product.<br>2. The system detects that the product does not exist or<br>is out of stock.<br>3. The system displays an error notification.<br>4. The Cashier removes the product or selects another<br>product.|
||**A2: Payment failure**|
|_Alternative Scenarios_|1. The Customer attempts to complete payment.<br>2. The payment process fails.<br>3. The system keeps the transaction pending.<br>4. The Cashier requests another payment method.|
||**A3: System connection failure**|
||1. The system loses connection with the server.<br>2. The system displays a connection error.<br>3. The transaction cannot be completed until the<br>connection is restored.|
||The checkout process must provide fast response time.|
|_Non-Functional Constraints_|The system must ensure transaction accuracy.|
||Inventory updates must maintain data consistency.|



HCMUS | SE Dept. 

**12** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

The system should support efficient cashier operations. 

##### **_4.2.3. Use Case 3_** 

|**_Use case ID_**|**U003**|
|---|---|
|_Use Case_|Scan Product Barcode|
|_Brief Description_|This use case allows Cashiers to scan product barcodes using<br>barcode scanner devices to retrieve product information<br>during the checkout process.|
|_Actor_|Cashier|
|_Pre-Condition_|The Cashier is processing a customer transaction.<br>The barcode scanner is connected.<br>Product information exists in the database.|
|_Result_|The scanned product information is displayed.<br>The product is added to the current transaction.|
||1. The Cashier scans a product barcode.<br>2. The barcode scanner sends barcode information to<br>the system.<br>3. The system searches for the corresponding product<br>information.|
|_Main Scenario_|4. The system retrieves product details from the<br>database.<br>5. The system displays product name, price, and<br>available quantity.<br>6. The system adds the product to the current<br>transaction.|
|_Alternative Scenarios_|**A1: Invalid barcode**|



HCMUS | SE Dept. 

**13** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

||1. The Cashier scans a barcode.<br>2. The system cannot find matching product<br>information.<br>3. The system displays "Product not found".<br>4. The Cashier manually searches for the product.|
|---|---|
||**A2: Database unavailable**|
||1. The system cannot access product information.<br>2. The system displays a database connection error.<br>3. The Cashier waits until the system becomes<br>available.|
|_Non-Functional Constraints_|Barcode scanning should provide quick response.<br>The system must support common 1D and 2D barcode<br>formats.|
||Product information must be accurately retrieved.|



HCMUS | SE Dept. 

**14** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_4.2.4. Use Case 4_** 

|**_Use case ID_**|**U004**|
|---|---|
|_Use Case_|Print Receipt|
|_Brief Description_|This use case allows the system to generate and print<br>customer receipts after successful payment completion.|
|_Actor_|Cashier|
|_Pre-Condition_|The customer transaction has been completed.<br>Payment has been successfully confirmed.<br>The receipt printer is connected.|
|_Result_|A receipt is printed successfully.<br>Transaction details are stored.|
|_Main Scenario_|1. The Cashier completes the payment confirmation.<br>2. The system prepares receipt information.<br>3. The system sends the printing request to the receipt<br>printer.<br>4. The printer prints the customer receipt.<br>5. The Cashier provides the receipt to the customer.<br>6. The system stores receipt information.|
|_Alternative Scenarios_|**A1: Printer connection failure**<br>1. The system cannot communicate with the receipt<br>printer.<br>2. The system displays a printer error message.<br>3. The Cashier reconnects the printer or retries printing.|
|_Non-Functional Constraints_|Receipt printing should be completed within a short time.|



HCMUS | SE Dept. 

**15** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

|The system must support thermal receipt printers.|
|---|
|Receipt information must match transaction data.|



##### **_4.2.5. Use Case 5_** 

|**_Use case ID_**|**U005**|
|---|---|
|_Use Case_|Trigger Cash Drawer|
|_Brief Description_|This use case allows the system to automatically open the<br>cash drawer after a successful cash payment transaction.|
|_Actor_|Cashier|
|_Pre-Condition_|A cash payment transaction has been confirmed.<br>The cash drawer is connected to the POS system.|
|_Result_|The cash drawer opens successfully.<br>The Cashier can complete the cash collection process.|
|_Main Scenario_|1. The Cashier confirms that the customer has<br>completed cash payment.<br>2. The system verifies the payment status.<br>3. The system sends an opening command to the cash<br>drawer.<br>4. The cash drawer opens automatically.<br>5. The Cashier collects the payment and completes the<br>transaction.|
|_Alternative Scenarios_|**A1: Cash drawer connection failure**<br>1. The system cannot communicate with the cash<br>drawer.<br>2. The system displays a hardware connection error.|



HCMUS | SE Dept. 

**16** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

||3. The Cashier manually opens the cash drawer if<br>necessary.|
|---|---|
||The cash drawer must only open after successful payment<br>confirmation.|
|_Non-Functional Constraints_|Communication with hardware devices must be secure.|
||Hardware errors should be recorded for troubleshooting.|



##### **_4.2.6. Use Case 6_** 

|**_Use case ID_**|**U006**|
|---|---|
|_Use Case_|Pay via Bank QR Code|
|_Brief Description_|This use case allows Customers to complete payment by<br>scanning a bank QR code. The system communicates with<br>the payment service to verify transaction status and update<br>the checkout process.|
|_Actor_|Customer<br>Cashier|
|_Pre-Condition_|The customer has completed product selection.<br>The POS system has generated the total payment amount.<br>The payment service is available.|
|_Result_|The payment transaction is successfully completed.<br>The system updates the transaction status.<br>The customer receives confirmation of payment.|
|_Main Scenario_|1. The Cashier selects the QR payment method.<br>2. The system generates a payment QR code based on<br>the transaction amount.|



HCMUS | SE Dept. 

**17** 

**Requirements Analysis** 

|**Introduction to Softwa**|**re Engineering**<br>**Requirements Ana**|
|---|---|
||3. The Customer scans the QR code using a banking<br>application.<br>4. The Customer confirms the payment transaction.<br>5. The payment service processes the payment request.<br>6. The system receives the payment confirmation<br>response.<br>7. The system updates the transaction status to<br>completed.<br>8. The system continues the checkout process.|
||**A1: Payment is rejected**|
|_Alternative Scenarios_|1. The Customer performs QR payment.<br>2. The payment service rejects the transaction.<br>3. The system receives the failed payment status.<br>4. The system notifies the Cashier.<br>5. The Customer selects another payment method.|
||**A2: Payment service unavailable**|
||1. The system cannot connect to the payment service.<br>2. The system displays a connection error.<br>3. The Cashier requests another payment method.|
|_Non-Functional Constraints_|Payment information must be securely transmitted.<br>The system must prevent duplicate payment processing.<br>Payment confirmation should be received within a<br>reasonable time.|



HCMUS | SE Dept. 

**18** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_4.2.7. Use Case 7_** 

|**_Use case ID_**|**U007**|
|---|---|
|_Use Case_|Manage Omnichannel Orders|
|_Brief Description_|This use case allows Store Managers to monitor and manage<br>orders from multiple online delivery platforms through a<br>centralized dashboard.|
|_Actor_|Store Manager|
|_Pre-Condition_|The store is connected to supported delivery platforms.<br>The Store Manager has permission to access order<br>management features.|
|_Result_|Online orders from multiple platforms are displayed in one<br>system.<br>Order status is updated and synchronized.|
|_Main Scenario_|1. The Store Manager accesses the Omnichannel Order<br>Dashboard.<br>2. The system retrieves orders from connected delivery<br>platforms.<br>3. The system displays incoming orders with order<br>details.<br>4. The Store Manager reviews the order information.<br>5. The Store Manager confirms or updates the order<br>status.<br>6. The system sends the updated status to the<br>corresponding platform.<br>7. The system stores order information.|



HCMUS | SE Dept. 

**19** 

**Requirements Analysis** 

|**Introduction to Softw**|**are Engineering**<br>**Requirements Ana**|
|---|---|
||**A1: External platform connection failure**|
|_Alternative Scenarios_|1. The system cannot connect to a delivery platform.<br>2. The system displays synchronization error<br>information.<br>3. The Store Manager retries the synchronization<br>process.|
||**A2: Product unavailable for online order**|
||1. The system detects insufficient inventory.<br>2. The system notifies the Store Manager.<br>3. The Store Manager updates or cancels the order.|
|_Non-Functional Constraints_|Order synchronization should occur with minimal delay.<br>The system must maintain consistent order information<br>across platforms.<br>External API communication must be secure.|



HCMUS | SE Dept. 

**20** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_4.2.8. Use Case 8_** 

|**_Use case ID_**|**U008**|
|---|---|
|_Use Case_|Auto-Deduct Inventory in Real Time|
|_Brief Description_|This use case allows the system to automatically update<br>inventory quantities whenever a sales transaction or online<br>order is completed.|
|_Actor_|System|
|_Pre-Condition_|Product information exists in the inventory database.<br>A completed sales transaction is available.|
|_Result_|Product quantities are updated automatically.<br>Inventory data remains consistent across all sales channels.|
|_Main Scenario_|1. A customer transaction is completed.<br>2. The system identifies purchased products.<br>3. The system retrieves current inventory information.<br>4. The system calculates the updated product quantity.<br>5. The system deducts the sold quantity from inventory.<br>6. The system saves the updated inventory information.<br>7. The system synchronizes inventory data with other<br>sales channels.|
|_Alternative Scenarios_|**A1: Insufficient inventory quantity**<br>1. The system detects that inventory is lower than the<br>requested quantity.<br>2. The system prevents incorrect inventory deduction.<br>3. The system sends an inventory warning.|



HCMUS | SE Dept. 

**21** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

||**A2: Database update failure**|
|---|---|
||1. The system cannot update inventory information.<br>2. The transaction update is rolled back.<br>3. The system records the error.|
||Inventory<br>updates<br>must<br>maintain<br>ACID transaction<br>properties.|
|_Non-Functional Constraints_|Inventory synchronization must provide real-time accuracy.<br>The system must prevent data inconsistency between stores<br>and channels.|



##### **_4.2.9. Use Case 9_** 

|**_Use case ID_**|**U009**|
|---|---|
|_Use Case_|Manage Suppliers & Purchase Orders|
|_Brief Description_|This use case allows Chain Managers to manage supplier<br>information and create purchase orders to control product<br>supply across the convenience store chain.|
|_Actor_|Chain Manager|
|_Pre-Condition_|The Chain Manager has permission to manage suppliers.<br>Supplier information exists or can be added.|
|_Result_|Supplier information is stored and updated.<br>Purchase orders are created and managed successfully.|
||1. The<br>Chain<br>Manager<br>accesses<br>the<br>supplier|
|_Main Scenario_|management function.|
||2. The system displays supplier information.|



HCMUS | SE Dept. 

**22** 

**Requirements Analysis** 

|**Introduction to Softw**|**are Engineering**<br>**Requirements Ana**|
|---|---|
||3. The Chain Manager adds, updates, or removes<br>supplier data.<br>4. The system validates supplier information.<br>5. The Chain Manager creates a purchase order.<br>6. The Chain Manager selects products and required<br>quantities.<br>7. The system calculates purchase order information.<br>8. The system stores the purchase order.|
||**A1: Invalid supplier information**|
|_Alternative Scenarios_|1. The Chain Manager enters supplier information.<br>2. The system detects invalid or incomplete data.<br>3. The system requests correction.<br>**A2: Product information unavailable**|
||1. The Chain Manager creates a purchase order.<br>2. The system cannot find product information.<br>3. The system prevents order completion.|
|_Non-Functional Constraints_|Supplier data must be stored accurately.<br>Purchase order information must be traceable.<br>Only authorized users can manage supplier information.|



HCMUS | SE Dept. 

**23** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_4.2.10. Use Case 10_** 

|**_Use case ID_**|**U010**|
|---|---|
|_Use Case_|Track Shipment Status|
|_Brief Description_|This use case allows Chain Managers to monitor the status<br>of incoming shipments from suppliers. The system provides<br>updated shipment information to help managers control the<br>goods delivery process.|
|_Actor_|Chain Manager|
|_Pre-Condition_|Purchase orders have been created.<br>Supplier shipment information is available.<br>The Chain Manager has permission to access shipment<br>tracking features.|
|_Result_|The Chain Manager can view the current status of<br>shipments.<br>Shipment information is updated and stored in the system.|
|_Main Scenario_|1. The Chain Manager accesses the shipment tracking<br>function.<br>2. The system retrieves shipment information from<br>purchase orders.<br>3. The system displays the list of ongoing shipments.<br>4. The Chain Manager selects a shipment to view<br>details.<br>5. The system displays shipment information including<br>supplier, products, quantity, and delivery status.<br>6. The Chain Manager updates the shipment status if<br>necessary.|



HCMUS | SE Dept. 

**24** 

**Requirements Analysis** 

|**Introduction to Softw**|**are Engineering**<br>**Requirements Ana**|
|---|---|
||7. The system saves the updated shipment information.|
||**A1: Shipment information unavailable**|
|_Alternative Scenarios_|1. The Chain Manager requests shipment information.<br>2. The system cannot find corresponding shipment data.<br>3. The system displays a notification.<br>4. The Chain Manager checks the purchase order<br>information again.<br>**A2: Supplier delivery delay**|
||1. The system detects that the shipment has exceeded<br>the expected delivery date.<br>2. The system marks the shipment as delayed.<br>3. The system notifies the Chain Manager.|
|_Non-Functional Constraints_|Shipment information must be updated accurately.<br>The system should provide real-time or near real-time<br>shipment status.<br>Only authorized users can access shipment tracking<br>information.|



HCMUS | SE Dept. 

**25** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_4.2.11. Use Case 11_** 

|**_Use case ID_**|**U011**|
|---|---|
|_Use Case_|Receive Minimum Inventory Alert|
|_Brief Description_|This use case allows the system to automatically notify<br>Chain Managers when product inventory reaches the<br>minimum threshold level.|
|_Actor_|Chain Manager<br>System|
|_Pre-Condition_|Minimum inventory thresholds are configured for products.<br>Inventory data is available in the system.|
|_Result_|The<br>Chain<br>Manager<br>receives<br>inventory<br>shortage<br>notifications.<br>The system helps prevent product shortages.|
|_Main Scenario_|1. The system continuously monitors product inventory<br>levels.<br>2. The system compares current inventory quantity with<br>the configured minimum threshold.<br>3. The system detects that a product quantity is below<br>the minimum level.<br>4. The system generates an inventory alert.<br>5. The system sends the notification to the Chain<br>Manager.<br>6. The Chain Manager reviews the alert.<br>7. The Chain Manager decides whether to create a<br>purchase order.|



HCMUS | SE Dept. 

**26** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

||**A1: Inventory level is sufficient**|
|---|---|
|_Alternative Scenarios_|1. The system checks product quantity.<br>2. The quantity is higher than the minimum threshold.<br>3. The system does not generate an alert.<br>**A2: Notification delivery failure**|
||1. The system generates an inventory alert.<br>2. The notification service fails.<br>3. The system stores the alert for later delivery.|
||Inventory monitoring should operate continuously.|
|_Non-Functional Constraints_|Alerts must be generated accurately.|
||The system should minimize false notifications.|



##### **_4.2.12. Use Case 12_** 

|**_Use case ID_**|**U012**|
|---|---|
|_Use Case_|View Sales Performance Report|
|_Brief Description_|This use case allows Chain Managers to view sales<br>performance reports to support business analysis and<br>decision-making.|
|_Actor_|Chain Manager|
|_Pre-Condition_|Sales transaction data exists in the system.<br>The Chain Manager has permission to access reports.|
|_Result_|The<br>Chain<br>Manager<br>can<br>view<br>sales<br>performance<br>information.|



HCMUS | SE Dept. 

**27** 

**Requirements Analysis** 

|**Introduction to Software Engineering**|
|---|



||Business decisions can be supported by analyzed sales data.|
|---|---|
||1. The Chain Manager accesses the Sales Report<br>function.|
||2. The system retrieves sales data from the database.<br>3. The Chain Manager selects the desired reporting<br>period.|
|_Main Scenario_|4. The system processes sales information.<br>5. The system generates sales performance reports.<br>6. The system displays information such as:|
||a. Best-selling products.|
||b. Low-selling products.<br>c. Sales trends.|
||7. The Chain Manager reviews the report.|
||**A1: No sales data available**|
||1. The Chain Manager requests a report.|
|_Alternative Scenarios_|2. The system finds no data for the selected period.<br>3. The system displays an empty report notification.<br>**A2: Report generation failure**|
||1. The system cannot process the report request.<br>2. The system displays an error message.<br>3. The Chain Manager retries the operation later.|
||Reports must be generated accurately.|
|_Non-Functional Constraints_|The system should provide reasonable response time.|
||Only authorized users can access business reports.|



HCMUS | SE Dept. 

**28** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

##### **_4.2.13. Use Case 13_** 

|**_Use case ID_**|**U013**|
|---|---|
|_Use Case_|Track Batch / Expiration Dates|
|_Brief Description_|This use case allows Store Managers to monitor product<br>batches and expiration dates, especially for fresh food and<br>short-life products.|
|_Actor_|Store Manager|
|_Pre-Condition_|Product batch information has been entered into the system.<br>The Store Manager has permission to access inventory<br>information.|
|_Result_|The Store Manager can view product expiration information.<br>Products near expiration can be identified and managed.|
|_Main Scenario_|The Store Manager accesses the batch management function.<br>1. The system retrieves product batch information.<br>2. The system displays product details including:<br>a. Product name.<br>b. Batch number.<br>c. Expiration date.<br>d. Current quantity.<br>3. The Store Manager searches or filters products by<br>expiration date.|
||4. The<br>system<br>displays<br>products<br>approaching<br>expiration.<br>5. The Store Manager reviews the information and<br>decides further actions.|



HCMUS | SE Dept. 

**29** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

||**A1: Missing batch information**|
|---|---|
||1. The system detects incomplete batch information.<br>2. The system displays a warning.<br>3. The Store Manager updates the missing information.|
|_Alternative Scenarios_|**A2: Expired products detected**|
||1. The system detects expired products.<br>2. The system marks the products as expired.<br>3. The Store Manager removes or handles the products<br>according to store po|
||Expiration data must be accurate.|
|_Non-Functional Constraints_|The system should support efficient searching and filtering.<br>Product history information must be maintained.|



##### **_4.2.14. Use Case 14_** 

|**_Use case ID_**|**U014**|
|---|---|
|_Use Case_|Apply Discount on Near-Expiry Items|
|_Brief Description_|This use case allows Store Managers to apply discounts to<br>products approaching expiration dates in order to reduce<br>product waste.|
|_Actor_|Store Manager|
|_Pre-Condition_|Products with expiration information exist in the system.<br>The Store Manager has permission to modify product<br>pricing.|



HCMUS | SE Dept. 

**30** 

**Requirements Analysis** 

|**Introduction to Sof**|**tware Engineering**<br>**Requirements Ana**|
|---|---|
|_Result_|Discount information is applied successfully.<br>Customers can purchase products at adjusted prices.<br>Product waste can be reduced.|
||1. The<br>Store<br>Manager<br>accesses<br>the<br>expiration<br>management function.|
||2. The<br>system<br>displays<br>products<br>approaching<br>expiration.|
|_Main Scenario_|3. The Store Manager selects products requiring<br>discount adjustment.<br>4. The Store Manager enters the discount percentage or<br>new price.<br>5. The system validates the discount information.<br>6. The system updates the product selling price.<br>7. The system stores the discount information.|
||8. The updated price is displayed at the POS system.|
||**A1: Invalid discount value**|
|_Alternative Scenarios_|1. The Store Manager enters a discount value.<br>2. The system detects that the value is invalid.<br>3. The system rejects the update.<br>4. The Store Manager enters a valid value.<br>**A2: Product already expired**|
||1. The Store Manager selects an expired product.<br>2. The system detects that the expiration date has<br>passed.|
||3. The system prevents discount application.|
||4. The system recommends removing the product.|



HCMUS | SE Dept. 

**31** 

|**Introduction to Softw**|**are Engineering**<br>**Requirements Analysis**|
|---|---|
||Discount changes must be recorded for tracking purposes.|
|_Non-Functional Constraints_|Only authorized users can modify product prices.<br>The system must ensure price updates are synchronized with<br>POS operations.|



HCMUS | SE Dept. 

**32** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

# **5** 

### **Prototype/Mockup** 

#### 5.1. **Approach and Tooling** 

The prototype for the Convenience Store Chain Management System was built in **Figma** . To accelerate wireframing, the team started from a general-purpose admin-dashboard UI kit (originally a real-estate/property-management template) and reused its layout patterns — sidebars, top bars, cards, tables, and forms — as stand-ins for the screens required by the system. The frame names and sample data still visible in the file (e.g. "Property," "Agents," "Listing List") are leftovers from that source kit; they have not yet been fully relabeled, but their layouts are representative of the intended screens. The table below documents how each prototype screen maps to the actual system, so the mapping can guide the visual-design pass that follows this phase. 

Figma Link :Figma 

#### 5.2 Prototype Screen 

|Figma Screen|Mapped System Screen|Related Use Case|Primary Actor|
|---|---|---|---|
|Auth – Sign in|Login screen|U001 –<br>Login/Authenticate|Cashier, Store<br>Manager, Chain<br>Manager|
|Auth – Password|Forgot/reset password|U001 (A1: invalid<br>credentials)|Cashier, Store<br>Manager, Chain<br>Manager|
|Auth – Lock Screen|Session timeout /<br>re-authentication|U001, NFR1 (secure<br>session)|All authenticated users|
|Auth – Signup|Account provisioning<br>(admin-side)|Supports RBAC setup|Chain Manager (admin)|
|Transactions|POS checkout screen|U002 – Process POS<br>Checkout, U003 – Scan<br>Product Barcode, U005|Cashier|



HCMUS | SE Dept. 

**33** 

**Introduction to Software Engineering** 

**Requirements Analysis** 

|||– Trigger Cash Drawer,<br>U006 – Pay via Bank<br>QR Code||
|---|---|---|---|
|Orders|Omnichannel Order<br>Dashboard|U007 – Manage<br>Omnichannel Orders|Store Manager|
|Customers –  View|List membership in<br>store||Store Manager|
|Dashboards – Customer|Membership dashboard|U012 – View Sales<br>Performance Report|Store Manager, Chain<br>Manager|
|Dashboards – Store|Sales performance<br>dashboard per branch|U012 – View Sales<br>Performance Report|Store Manager, Chain<br>Manager|
|Dashboards – Analytics|Sales performance<br>dashboard (best/worst<br>sellers)|U012 – View Sales<br>Performance Report|Chain Manager|
|Staff – Grid View|Staff/account grid<br>(Cashiers, Store<br>Managers by branch)|Supports RBAC /<br>account provisioning<br>(NFR1, U001)|Chain Manager|
|Staff Details|Staff account detail<br>(role, permissions,<br>assigned branch)|NFR1, U001|Chain Manager|
|Add Staff|Add new staff account|NFR1, U001|Chain Manager|



HCMUS | SE Dept. 

**34** 



<!-- Start of picture text -->
‘SIGN IN<br>Enter your email address and password to access admin pane!<br>Enter your email<br>Enter your password<br>Remember me<br>OR sign with<br>G f oO<br>New here? Sign Up<br><!-- End of picture text -->



<!-- Start of picture text -->
TinyMart POS Exit terminal<br>Beverages Snacks Dairy Fresh Household Current sale Clear<br>Sparkling Water bia $0.90<br>Bottled Water 500m! Iced Coffee Can Orange Juice 1L Sparkling Water Potato Chips .1@ $6.00i<br>$0.60 $1.20 $1.80 $0.90<br>Cheddar Cheese Slice 164 $2.40<br>Instant Noodles Cup Rice Snack Bar Potato Chips Dried Seaweed Snack<br>$1.20 $0.80 $1.50 $1.10<br>Fresh Milk 1L Yogurt Cup Cheddar Cheese Slice White Bread Loaf<br>$1.80 $0.90 $2.40 $1.60<br>Subtotal $9.30<br>Tax (8%) $0.74<br>- ; Total $10.04<br>Croissant Banana Bunch Dish Soap Paper Towels<br>$1.30 $1.10 $2.20 $3.10 Pay with Cash<br>Pay with Bank QR<br><!-- End of picture text -->



<!-- Start of picture text -->
a= Giase@1 @<br>Orders on<br>Al Order List Ts<br>@) Jere Patmu 03/2023 “ 456 et $280 Var [concstec © @<br>> Valerie Obrien 2107/20% +231 82-8901034 * $ 808 Willow Dr, 909 Asp = ©<br><!-- End of picture text -->



<!-- Start of picture text -->
r)<br>= Giiage<br>Listing List Product > Listing Li<br>Total Sales Total SKUs a Unit Sold<br>$12,7812.09 Cs 15,780 Unit ih 893 Unit ®<br>vstart mo see Detais><br>A Properties List TisMonth ©<br>BB coce-Cola md oversee ‘ ° soa © @<br>BB instant Noodles Box pox Out of stock Bermud $12.00 © ¢<br>Shampoo a a 8 Aust $4. ® @<br>B Lays Potato Chips m : ; Pepsico VN sc eo @<br>B Fresh Milk 1L L Dairy 2 jk cS ® @<br>BB MarlboroRed pack 2 seoo 50 Philip MorrisVN $2.8 © @<br>BB Colgate Toothpaste 1009 \ etc : Colgte-Potnolve $120 ® ¢@<br>Red Bull Energy Drink Crore : $ © @<br><!-- End of picture text -->



<!-- Start of picture text -->
== Guagce- @<br>Staff Grid st aft<br>ia} fn Welcome Back , Manager Shift Schedule . Total Salesby Staff<br>&& statStat 250 20 os $45,0004<br>Grid View Total250Staff @© 80 400ccupiedFulltime a eeotal Shift Pn ° Days Left<br>Updated : 4 day ago Ur hour ago jew More<br>3 MichaelA. Miner TheresaT. Brose Walter L. Calab<br>] 4 Sales this month: $2,430 AE Sales this month: $2,430 £% Sales this month: $2,430<br>=) @ Th2o Dien Branch @ Th20 Dien Bran @ Thao Dien Branch<br>Social Media Social Media Social Media<br>f © 1 f @ 1 f @ Ls<br>B OliveCashic Mize i B Christaashier Sardina : B DarrenCashier Rivera<br>{¥ Sales this month: $2,430 {AE Sales this month: $2,430 {¥ Sales this month: $2,430<br>@ Theo Dien Branch @ Thao Dien Bran @ Thao Dien Branch<br><!-- End of picture text -->



<!-- Start of picture text -->
Staff<br>& Staff<br>Staff Details<br>f<br>i) r<br>a<br>Michael<br>a MichaelA.Miner | vee | en a #1 Medal A. Miner g<br>) » fs]<br>@ ThaoDien Brat Sy tae<br>1123 064-357-77 > by) 4<br>Be ent|)<br>f @ 1 A<br>AboutMeet MichaelMichael © 19,343 Collected in This Month<br>Branch : Thao Dien Stor Certificates<br>StaffID : EMP-2048-394<br>Position : Cashi<br><!-- End of picture text -->



<!-- Start of picture text -->
=  Q- Search. GiageC3)<br>© Dashboards Analytics Dashboard > Analyt<br>Analytics<br><O><br>il) Inver 2,854 4 705 + 9,431 +4 $78.3M<br>> staf<br>ra) Sales Analytic This Month ¥ $117,000.43<br>~ te My Balance<br>IG Earnings : $85,934<br>> " K v esasIncome » $7,566.11Expanse<br>"i Send Receive<br>; : Units Sold Revenue<br>\/ 15,780Target $78.3MTarget<br>F ’ A “ f 3 N , ANAAAAAAAN SARAAAAARAAAAR<br>come Expense Bala<br>23,675.00 m 11,562.00 ¥538% 67,365.00 View More ><br>Onlinestal  SourceTraffic In This Week this Month © Most Sales Location Asia v Weekly Sales<br>@ Tan Son Nhat Airport<br>Total Buyer @ Notre-Dame Cathedral<br>70 @ Ben Thanh Market<br>Binh Tay Market @<br>Phu My Hung | i | | | |<br>& Buyers : 70 Branch 1 Branch 2 Branch 3 Branch 4 Branch 5 ~ : . .<br>See More Statistic 711% 67.0% Weekly Order Volume: 5,746<br>Latest Transaction This Month ¥<br>Purchase ID Buyer Name Receipt ID Purchase Date Total Amount Payment Method Payment Status Action<br>#7Z2540 s Michael A. Miner IN-4563 07 Jan, 2023 $45,842 Cash d ®<br>#723924 @) Theresa T. Brose IN-3728 3 Dec, 20: $78,48 QR Code an © f<br>#7Z5032 @) JamesL Erickson IN-8265 28 Sep, 2023 $83,644 Cash q © ¢<br>#7Z1695 @ > Lily W. Wilson IN-9025 10 Aug, 2023 $94,305 Card ® ¢ G<br>#728473 @) Sarah M. Brooks IN-8948 2 May, 202: $42.5¢ QR Code Can ® ¢<br>#7Z2150 @) Joe K. Hall IN-098: 15 Mar, 2023 $25,67 Online Banking J © ¢<br><!-- End of picture text -->

