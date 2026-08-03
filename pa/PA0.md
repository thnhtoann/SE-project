





<!-- Start of picture text -->
°gor KHO,<br>9g<br>o<br>=<br>EI<br>o¥ TP. HO Ce al<br><!-- End of picture text -->

#### **Table of Contents** 

|**Objectives..........................................................................................................3**|
|---|
|**1**<br>**Member Contribution Assessment.........................................................3**|
|**2**<br>**Preliminary Problem Statement.............................................................4**|
|2.1 Business Problem Description.................................................................................5|
|2.2 Operating Environment............................................................................................6|
|2.3 Design and Implementation Constraints...............................................................6|
|**3**<br>**Proposed Solution.....................................................................................7**|
|3.1<br>Software.............................................................................................................8|
|3.1.1.<br>Features......................................................................................................8|
|3.1.2.<br>Software Architecture.............................................................................13|
|3.2<br>Hardware.........................................................................................................15|
|3.2.1.<br>Client-Side Hardware (Physical Store Level)........................................15|
|3.2.2.<br>Server Infrastructure (Cloud Hub)........................................................16|
|3.2.3 Network Constraints.....................................................................................16|
|**4**<br>**Development Plan...................................................................................18**|
|4.1<br>Requirements Analysis..................................................................................18|
|4.2<br>Software Design..............................................................................................18|
|4.3<br>Implementation..............................................................................................19|
|4.4<br>Testing..............................................................................................................19|
|4.5<br>Deployment and Maintainance....................................................................20|
|**5**<br>**Human Resources & Costing Plan.........................................................20**|
|5.1 Personnel Structure.............................................................................................21|
|5.2 Estimated Project Cost.........................................................................................22|
|**6**<br>**Tools setup...............................................................................................22**|



**Introduction to Software Engineering** 

**Project Proposal** 

## **Project Proposal** 

### **Objectives** 

This document focus on the following topics: 

- Completing the Project Proposal document with the following sections: 

   - Preliminary Problem Statement 

   - Proposed Solution 

   - Development Plan 

   - Human Resources & Costing Plan 

- Understanding the Project Proposal document. 

HCMUS | SE Dept. 

**1** 

**Introduction to Software Engineering** 

**Project Proposal** 

HCMUS | SE Dept. 

**2** 

**Introduction to Software Engineering** 

**Project Proposal** 

# **1 Preliminary Problem Statement** 

##### **_2.1 Business Problem Description_** 

In the current Vietnamese retail market, basic operations such as Point of Sale (POS) and barcode-based checkout have become standard practices. However, as convenience stores and mini supermarket chains expand to multiple branches, they face more complex operational challenges. 

###### **Omnichannel Inventory Fragmentation:** 

The rapid growth of online delivery platforms such as GrabMart, ShopeeFood, and BeMart requires stores to operate across multiple sales channels. Employees often need to monitor different platforms manually, resulting in inventory inconsistencies, order cancellations, and reduced customer satisfaction. 

###### **Supply Chain and Procurement Challenges:** 

Many purchasing decisions are still based on managers’ experience rather than data. Without proper sales analysis and inventory monitoring, stores may overstock slowmoving products while running out of high-demand items, leading to inefficient inventory management. 

###### **High Wastage of Perishable Products:** 

Fresh food and ready-to-eat products are important revenue sources for convenience 

HCMUS | SE Dept. 

**3** 

**Introduction to Software Engineering** 

**Project Proposal** 

stores, but they have short shelf lives. Without batch and expiration date tracking, stores face higher product wastage and financial losses. 

To address these challenges, this project proposes a centralized **Convenience Store Chain Management System** that supports inventory management, procurement, sales monitoring, and business reporting for multiple stores. 

##### **_2.2 Operating Environment_** 

The proposed system adopts a web-based Client–Server architecture to support centralized management across multiple store branches without requiring complex software installation. 

###### Client Environment 

- **Management Dashboard:** A responsive web application for store managers and chain managers, compatible with modern HTML5-supported web browsers such as Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari. 

- **Point of Sale (POS):** A lightweight browser-based interface designed for fast cashier operations with keyboard shortcut support. 

- **Hardware Integration:** The POS system supports barcode scanners, thermal receipt printers, and cash drawers connected through USB or Bluetooth. 

###### Network Environment 

The system requires a stable Internet connection to synchronize data between stores and communicate with external services such as online delivery platforms and QR payment gateways. 

HCMUS | SE Dept. 

**4** 

**Introduction to Software Engineering** 

**Project Proposal** 

##### **_2.3 Design and Implementation Constraints_** 

To ensure maintainability, scalability, and data security, the project follows the following design and implementation constraints. 

###### Technology Constraints 

- Backend: **Django (Python)** following the RESTful API architecture. 

- Frontend: Modern web technologies using a Single Page Application (SPA) approach. 

- Authentication and authorization are implemented using **JSON Web Token (JWT)** with role-based access control. 

###### Database Constraints 

- The system uses a relational database management system such as **PostgreSQL** or **MySQL** . 

- The database is designed in **Third Normal Form (3NF)** and follows **ACID** principles to maintain data consistency and transaction integrity. 

- Historical sales data should be exportable for future reporting and data analysis. 

Documentation and Project Management Constraints 

- System analysis and design documents follow **UML** standards, including Use Case Diagrams, Activity Diagrams, and Sequence Diagrams. 

- Source code is managed using **GitHub** (or Bitbucket), following the required project repository structure provided by the course. 

HCMUS | SE Dept. 

**5** 

**Introduction to Software Engineering** 

**Project Proposal** 

# **2 Proposed Solution** 

##### **_2.1 Software_** 

###### **_2.1.1. Features_** 

#### **Table 1: Point of Sale (POS) Features** 

|**Role**|**User Story**|**System**<br>**Feature**|**Constraints**|
|---|---|---|---|
|**Cashier**|I want to have a minimalist<br>checkout interface and operate<br>entirely via hotkeys so that I can<br>optimize the checkout speed<br>and avoid interrupting the<br>payment fow.|Hotkey-<br>optimized POS<br>interface|Static Web Application (SPA),<br>running directly on the<br>browser.|
|**Cashier**|I want to use a barcode scanner<br>and print receipts for customers|Hardware<br>Integration|USB/Bluetooth connection<br>with barcode scanners and|
||so that I can perform physical|(Scanner/Printer|thermal printers, with|
||operations accurately and meet|)|automatic cash drawer|
||mandatory retail standards.||triggering.|



HCMUS | SE Dept. 

**6** 

**Introduction to Software Engineering** 

**Project Proposal** 

|**Role**|**User Story**|**System**|**Constraints**|
|---|---|---|---|
|||**Feature**||
|**Cashier /**|I want to be able to pay by|Bank QR|Continuous Internet|
|**Customer**|scanning a bank QR code so that|Payment|connection required to|
||we can diversify payment|Integration|receive Webhooks from the|
||methods and increase||Banking system API.|
||convenience for customers.|||



#### **Table 2: Omnichannel Hub Features** 

|**Role**|**User Story**|**System**<br>**Feature**|**Constraints**|
|---|---|---|---|
|**Store**|I want the system to|Multi-platform|Backend built with Django|
|**Manager**|automatically aggregate|Delivery|(Python), complying with RESTful|
||orders from GrabMart,<br>ShopeeFood, and BeMart<br>onto a single unifed<br>dashboard so that I can<br>eliminate the bottleneck<br>of manually monitoring<br>multiple devices.|Synchronizatio<br>n|API standards.|



HCMUS | SE Dept. 

**7** 

**Introduction to Software Engineering** 

**Project Proposal** 

|**Role**|**User Story**|**System**|**Constraints**|
|---|---|---|---|
|||**Feature**||
|**System**|I want inventory levels to<br>be automatically|Real-time<br>Inventory|Database (PostgreSQL/MySQL)<br>must comply with ACID principles|
||deducted in real time|Synchronizatio|to ensure transaction integrity.|
||across all channels as|n||
||soon as an order is placed|||
||so that we can prevent|||
||severe data discrepancies<br>and protect the chain's|||
||reputation.|||



#### **Table 3: Smart Procurement Features** 

HCMUS | SE Dept. 

**8** 

**Introduction to Software Engineering** 

**Project Proposal** 

|Role|User Story|System Feature|Constraints|
|---|---|---|---|
|**Chain Manager**|I want the system to automatically<br>trigger alerts when the inventory of<br>any item reaches its minimum<br>threshold so that we can prevent|Minimum<br>Inventory Alert|Database designed<br>in 3NF (Third Normal<br>Form) for high-<br>performance|
||out-of-stock situations for best-<br>selling items.||querying.|
|**Chain Manager**|I want to centrally manage the<br>supplier list and track the real-time<br>status of incoming shipments so<br>that I can tightly control the supply<br>source and goods circulation<br>process.|Supplier &<br>Purchase Order<br>Management|Client-Server<br>architecture, web-<br>based operations.|



#### **Table 4: Data Analytics & Security (Admin Dashboard) Features** 

HCMUS | SE Dept. 

**9** 

**Introduction to Software Engineering** 

**Project Proposal** 

|**Role**|**User Story**|**System**<br>**Feature**|**Constraints**|
|---|---|---|---|
|**Chain**|I want to view sales performance|Sales|Responsive interface|
|**Manager**|reports (Best-sellers / Worst-sellers)<br>so that I can make accurate business<br>and purchasing decisions.|Performance<br>Reporting|built on HTML5/CSS3<br>(Chrome, Firefox,<br>Safari, Edge). Data<br>must be easily<br>exportable for future<br>Machine Learning<br>training.|
|**Store**<br>**Manager**|I want to closely monitor product<br>shelf-life and expiration dates by<br>batch for short-term goods (Fresh<br>Food / Fast Food) so that I can apply<br>timely discounts and signifcantly<br>reduce the wastage rate.|Batch &<br>Expiration Date<br>Tracking|System strictly<br>manages<br>comprehensive time-<br>series data structures.|
|**System**|I want the system to enforce clear<br>access control and role permissions<br>among Cashiers, Warehouse<br>Managers, and Chain Managers so<br>that we can ensure data security and<br>operational information safety.|Authentication<br>& Authorization|Mandatory use of<br>JSON Web Token (JWT)<br>alongside strict<br>Session management.|



HCMUS | SE Dept. 

**10** 

**Introduction to Software Engineering** 

**Project Proposal** 

###### **_2.1.2. Software Architecture_** 

To fulfill the comprehensive list of omnichannel retail functionalities, the system adopts an N-Tier (Multi-Layered) Client-Server Architecture strictly following an API-first development approach. The system is decoupled into four primary functional layers: 

###### **1. Presentation Layer (Client-Side):** 

- **POS Client:** Built as a lightweight Single Page Application (SPA) running directly on modern web browsers. It utilizes a hotkey-optimized DOM structure and maintains communication with local retail peripherals via WebUSB / WebBluetooth protocols. 

- **Management & Analytics Portal:** A fully responsive web interface rendered via HTML5 and CSS3, guaranteed to support major web browsers including Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge. 

###### **2. API Gateway & Security Layer:** 

Acts as the centralized entry point for all incoming client traffic. This layer strictly enforces user authentication and precise role-based authorization (differentiating Cashiers, Warehouse Managers, and Chain Managers) via **JSON Web Tokens (JWT)** combined with secure Session management. 

###### **3. Application / Business Logic Layer (Server-Side):** 

The core backend infrastructure is developed using **Python (Django)** , exposing fully compliant **RESTful APIs** . It encapsulates isolated modular services: 

- _POS & Checkout Engine:_ Processes raw hotkey transaction streams and calculates line-item logic. 

- _Omnichannel Webhook Listener:_ A continuous background daemon responsible for ingesting real-time order payloads from third-party delivery aggregators (GrabMart, ShopeeFood, BeMart) and Banking API webhooks. 

HCMUS | SE Dept. 

**11** 



<!-- Start of picture text -->
Professional Modern 3-Tier Architecture Diagram<br>Client Tier App Tier Data Tier<br>F<br>Barcode<br>Browser Receipt —_—_E c Engine 2a nn<br>| Printera= Webhook PostgreSQL/ MySQL<br>= Listener (ACID - 3NF)<br>Cash =)<br>Drawer<br><!-- End of picture text -->

**Introduction to Software Engineering** 

**Project Proposal** 

##### **_2.2 Hardware_** 

To ensure uninterrupted retail operations and low-latency synchronization across all physical stores, the hardware and environmental constraints are defined as follows: 

###### **_2.2.1. Client-Side Hardware (Physical Store Level)_** 

- **Point of Sale (POS) Terminals:** Standard desktop PCs, laptops, or dedicated capacitive touch POS hardware running modern operating systems (Windows 10/11, macOS, or lightweight Linux distributions) capable of hosting an HTML5-compatible web browser. Minimum specifications: Dualcore processor (2.0 GHz), 4GB RAM, and 64GB SSD storage. 

- **Mandatory Retail Peripherals** : 

   - **Barcode Scanner:** 1D/2D handheld or hands-free barcode scanner connected via physical USB or Bluetooth. 

   - **Receipt Printer:** Thermal receipt printer (80mm standard) communicating via USB or Bluetooth protocols. 

   - **Cash Drawer:** Electronic cash drawer connected directly to the thermal printer's RJ11/RJ12 peripheral port, enabling automatic cash drawer triggering upon the completion of a receipt print cycle. 

###### **_2.2.2. Server Infrastructure (Cloud Hub)_** 

- **Application Server:** Virtual Private Server (VPS) or Cloud Instance running a robust web server such as **Apache or Nginx** within a Linux operating environment (e.g., Ubuntu Server). Minimum allocated cluster resources: 4 vCPUs, 8GB RAM, and 100GB NVMe storage. 

- **Database Server:** A dedicated relational database instance (PostgreSQL/MySQL) equipped with automated daily snapshots and replication to safeguard chain data integrity. 

HCMUS | SE Dept. 

**13** 

**Introduction to Software Engineering** 

**Project Proposal** 

###### **_3.2.3 Network Constraints_** 

**Store Connectivity:** A continuous, highly stable broadband Internet connection (minimum bandwidth of 30 Mbps down / 10 Mbps up) is **strictly required** at all operational POS locations. This is a non-negotiable operating constraint required to successfully intercept real-time asynchronous Webhooks emitted by the Banking payment network and external delivery platforms. 

HCMUS | SE Dept. 

**14** 

**Introduction to Software Engineering** 

**Project Proposal** 

# **3 Development Plan** 

##### **_3.1 Requirements Analysis_** 

During this phase, the team will identify and analyze the business requirements of a convenience store chain management system. Functional and non-functional requirements will be collected based on the project objectives. User stories, use cases, and business processes will be defined to establish the project scope. 

###### **Deliverables:** 

- Vision Document 

- Software Requirements Specification (SRS) 

- User Stories 

- Use Case Diagram 

- Project Proposal 

##### **_3.2 Software Design_** 

Based on the approved requirements, the team will design the overall architecture of the system, database structure, user interface, and software components. UML diagrams will be created to describe the interactions between system components and users. 

###### **Deliverables:** 

HCMUS | SE Dept. 

**15** 

**Introduction to Software Engineering** 

**Project Proposal** 

- Software Architecture Document 

- Database Design (ER Diagram) 

- UML Diagrams (Activity, Sequence, Class Diagrams) 

- User Interface Mockups 

##### **_3.3 Implementation_** 

The implementation phase focuses on developing the web-based convenience store management system. The team will build the frontend, backend, database, and core modules such as POS management, inventory management, supplier management, procurement, reporting, and user authentication. Source code will be managed using GitHub with version control. 

###### **Deliverables:** 

- Frontend Application 

- Backend RESTful APIs 

- Database Implementation 

- Source Code Repository 

##### **_3.4 Testing_** 

The completed system will be tested to ensure that all functional and non-functional requirements are satisfied. Different testing activities will be performed, including unit testing, integration testing, system testing, and user acceptance testing. Any detected defects will be fixed before deployment. 

###### **Deliverables:** 

- Test Plan 

- Test Cases 

HCMUS | SE Dept. 

**16** 

**Introduction to Software Engineering** 

**Project Proposal** 

- Test Report 

- Bug Fix Report 

##### **_3.5 Deployment and Maintainance_** 

After successful testing, the system will be deployed to the production environment. Basic user documentation will be prepared for system administrators and store employees. Maintenance activities include fixing reported issues, improving system performance, and implementing minor enhancements based on user feedback. 

###### **Deliverables:** 

- Deployed System 

- User Manual 

- Maintenance Report 

- Final Project Report 

HCMUS | SE Dept. 

**17** 

**Introduction to Software Engineering** 

**Project Proposal** 

# **4 Human Resources & Costing Plan** 

###### **5.1 Personnel Structure** 

The project team consists of four members, with each member taking primary responsibility for a specific area while collaborating throughout the entire development process. 

|**_Role_**|**_Responsibilities_**|
|---|---|
|_Project Manager_|_Project planning, task allocation, progress_<br>_monitoring, communication, documentation_<br>_review, and integration of project_<br>_deliverables._|
|_Backend Developer_|_Design and implement RESTful APIs,_<br>_business logic, authentication, inventory_<br>_management, procurement, and database_<br>_integration using Django._|
|_Frontend Developer_|_Develop responsive web interfaces, POS_<br>_screens, management dashboard, and_<br>_integrate frontend components with_<br>_backend APIs._|
|_QA & Documentation Engineer_|_Prepare software documentation, design test_<br>_cases, perform testing, report defects, and_<br>_verify systemquality before deployment._|



HCMUS | SE Dept. 

**18** 

**Introduction to Software Engineering** 

**Project Proposal** 

###### **5.2 Estimated Project Cost** 

Since this project is developed for academic purposes, most development tools and software are free or open source. Therefore, the estimated development cost is minimal. 

|**_Item_**|**_Description_**|**_Estimated Cost_**|
|---|---|---|
|_Development Tools_|_Visual Studio Code, GitHub,_<br>_Postman_|_Free_|
|_Backend Framework_|_Django (Python)_|_Free_|
|_Frontend Technologies_|_HTML5, CSS3, JavaScript_|_Free_|
|_Database_|_PostgreSQL_<br>_/_<br>_MySQL_<br>_Community Edition_|_Free_|
|_Project Management_|_Jira_|_Free_|
|_Communication_|_Discord_|_Free_|
|_Testing Tools_|_Browser Developer Tools,_<br>_Postman_|_Free_|
|_Cloud Deployment (Optional)_|_VPS or Cloud Hosting for_<br>_demonstration_|_Approximately USD 10–20 (if_<br>_required)_|



**Total Estimated Cost:** Approximately **USD 0–20** , depending on whether cloud deployment is required for the final demonstration. 

HCMUS | SE Dept. 

**19** 

**Introduction to Software Engineering** 

**Project Proposal** 

# **5 Tools setup** 

To ensure effective team collaboration and adhere to professional software development workflows, our team has successfully established and integrated a comprehensive toolsuite. This infrastructure supports agile task management, source control integrity, and real-time automated communications. 

###### **5.1 Communication Platform (Discord)** 

Our team utilizes Discord as the centralized communication hub for all project-related discussions and daily synchronization. 

- **Automated Log Channels:** Channels named #jira-log and #github-log have been integrated via webhooks to receive instant updates from Jira and GitHub. 

- **Daily scrum/ Meeting voice Channels.** 

Discord Invite Link : <u>Discord</u> 

HCMUS | SE Dept. 

**20** 



<!-- Start of picture text -->
Intro to Software Engineer v & jira-log & s a x 2<br>Welcome to #ijira-log B !<br>This is the start of the #jira-log HM channel.<br>a # Edit Channel<br># jira-log B a. 29as June 2026bee<br>L Jiri<br>. gee Jiri PAPP) yes:<br>@ @thnh_toann moved Task from In Progress to In Review<br>[SCRUM-14] Draw Use Case and UML Diagrams (Activity, Sequence, Class).<br>Status: inProgress > In Review<br>BB) Project: My Software Team<br>@® Add Comment "8 Assign to me © > ToDo D > In Progress<br>> Done<br><!-- End of picture text -->



<!-- Start of picture text -->
Write the Project Proposal. ProvectDocumenT... GEE<br>SERUM-42 Create required GitHub repository PROJECT DOCUMENT. a<br>Draft Vision Document and Software Requirements Specification (SRS). (4 PROJECT DOCUMENT... EXITIUTES a -<br>4 Draw Use Case and UML Diagrams (Activity, Sequence, Class). PROJECT DOCUMENT... GIUTUUTIES 2<br>Design Database ER Diagram (SNF! provectDocuMeNT... QUEST a<br>Core Architecture& Basic POS Ne 2s]0<br>SCRUM-24 ImplementJWT Authentication and Role-based Access Control. SMART PROCUREME 9<br>Develop web-based POS UI with hotkey support CORE POS SYSTEM a<br>Build Backend APIs for POS checkout logic CORE Pos SYSTEM Q<br>24 of 24<br>Build Webhook API to receive external orders [OMNICHANNEL HUG ] Q<br>Implement real-time inventory deduction logic across all channels FOMNICHANNELHUG BME TO 00 ~ | 2<br>Implement Bank QR Payment Integration. COREpos sysTEM<br>wore<br>he ; a<br>evelop Minimum Inventory Alert feature SMART PROCUREME 2<br>eof 6<br>QA, Deployment& Documentation _[ Piolo|<br>Write the User Manual and Final Project Report. TESTING & DEPLOY. a<br><!-- End of picture text -->



<!-- Start of picture text -->
@ My Software Team 3 --- e114 || 2)<br>® Summary ® Backlog (D Board </> Code =~ Timeline ©) Docs = Forms </> Development +<br>Qs Qa = Filter Complete sprint #R@WMEel ct.) (2 || 26] | -:-<br>TODO 1 INPROGRESS 1 INREVIEW 2 DONE 3 a<br>Design Database ER Diagram... Design UI Mockups. Draft Vision Document and Write the Project Proposal.<br>(SNF). PROJECT DOCUMENTATION & MANAG... Software Requirements PROJECT DOCUMENTATION & MANAG...<br>PROJECT DOCUMENTATION & MANAG... Specification (SRS).<br>SCRUM-15 a SCRUM-16 2 PROJECT DOCUMENTATION & MANAG... SCRUM-10 i<br>SCRUM-13 [5 | aS Set up Jira board,<br>+ Create communication channel<br>Draw Use Case and UML PROJECT DOCUMENTATION & MANAG...<br>Diagrams (Activity, Sequence,<br>Class) SGRUM-11 a<br>PROJECT DOCUMENTATION & MANAG...<br>SCRUM-14 2 Create required GitHub<br>repository<br>PROJECT DOCUMENTATION & MANAG...<br>SCRUM-12 p-3<br><!-- End of picture text -->



<!-- Start of picture text -->
@ SE-project x? Pin @Watch 0 ~ ~ WW Starr 0 +<br>P main ~ P 1Branch © OTags Q Gotof T Add file ~ es) <> Code ~ About £3<br>| A simple project.<br>a) thnhtoann T 1 © 3 Commits WM R ‘<br>B® docs ast webhoo Prirmitentacra A,<br>@& pa Init project 45 utes ago i.<br>B src In t 5 a & 0 fork<br>[) README.md In hound<br>Releases<br>t<br>SE-project. Packages<br>ist 2<br>A simple project.<br><!-- End of picture text -->

