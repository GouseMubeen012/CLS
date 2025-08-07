🏫 SCHOOL CAMPUS CASHLESS SYSTEM

📘 INTRODUCTION
The School Campus Cashless System is built to provide a smooth, cashless experience for students to purchase goods and services from campus stores like canteens, general stores, barber shops, and health clinics. Instead of using physical cash, students will use a prepaid barcode card charged via the School’s local bank.

🚩 PROBLEMS ADDRESSED
• Long queues at the local bank to collect campus currency
• Manual handling of cash and inefficiency in currency distribution
• Excess workload on banking staff to manage student transactions

✅ PROPOSED SOLUTION

💳 Student Barcode Cards
• Every student is issued a barcode card linked to their bank account
• Cards are charged at the bank office using barcode scanning
• Students use their cards at any store within the campus

🧾 Store App
• Reads student barcodes to retrieve:
➤ Student balance
➤ Daily spending limit and remaining amount
• Stores all transaction history
• Allows shopkeepers to view the list of all transactions for the day

🏦 Bank App Features

🛍️ Store Management
• Create and manage store accounts
• Track and settle store transactions

👨‍🎓 Student Management
• Create student profiles
• Generate and print barcode-enabled ID cards
• Set and update daily spending limits

👥 User Roles
• Admin
• Store User
• Student

📊 Analytics & Reports
• Track payments store-wise
• Monitor settled and pending payments
• View transaction summaries per store
• Basic insights on student spending patterns

🔁 SETTLEMENT PROCESS BETWEEN BANK & STORE

1️⃣ Transaction Recording
When a student makes a purchase, the store logs the transaction as pending

2️⃣ Store Dashboard
Stores can view:
• All pending transactions
• Total sales for the day
• Last settlement records

3️⃣ Bank-Initiated Settlement
The Bank Admin selects a store and date range to review pending transactions and initiates settlement, changing transaction status to processing

4️⃣ Settlement Record Creation
A formal settlement record is created including:
• Total payable amount
• Settlement time period
• Status set to: Processing

5️⃣ Completion of Settlement
After verification, the status is updated to Completed, and transactions are marked as Settled

6️⃣ Store Settlement History
Stores can access past settlements, including:
• Settlement status
• Amounts paid
• Dates of settlement

📇 STUDENT ID CARD STRUCTURE
Each card will include:
• Student Name
• Photograph
• Barcode (Student ID)
• Office Phone Number
• Class & Year

⚙️ TECH STACK 
Frontend: React.js
Backend: Node.js
Database: PostgreSQL
Barcode: QR / Barcode Scanner Integration
Authentication: Role-Based Access Control (Admin, Store, Student)
