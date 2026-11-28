# BE SAAS — Master Implementation Roadmap & Task Tracker

All tasks in this document represent the definitive blueprint for engineering BharatEdge Services' custom enterprise SaaS platform (CRM, HRMS, and Support Desk).

---

## Foundational Architecture & Identity Layer (Completed)
- [x] Initialize Next.js 16 (App Router) with TypeScript and Tailwind CSS
- [x] Integrate brand palette (`#ACCAD5` sky slate and `#F0944D` sunset amber) with light glassmorphism
- [x] Dual-Path Authentication (Password + 5-minute OTP with Nodemailer SMTP)
- [x] Consolidate `users` and `employees` tables into a unified `Employee` model in PostgreSQL
- [x] Central Portal Hub (`/portal`) with dynamic RBAC module gateway isolation
- [x] HRMS Suite:
  - [x] Employee Directory with Full CRUD (View, Edit, Delete with modal safeguards)
  - [x] Time & Attendance Tracking with 5-minute automated idle pause and resume
  - [x] Leave Management with 2-tier approval workflow (TL -> HR Admin -> Final)
  - [x] Dynamic Company Calendar (Holidays, Events, Important notices)
  - [x] Company Policies Center with markdown viewer and category filters
  - [x] Database-backed targeted Notification System with unread counter and sound

---

## BharatEdge CRM Suite — 6-Phase Master Roadmap

### Phase 1: Architecture, Full CRM Schema, Cloudflare R2 & Sidebar Isolation (Current)
- [x] **Product-Isolated Sidebar Navigation**:
  - [x] Refactored `components/layout/Sidebar.tsx` dynamically displaying only active product modules (`/crm/*`, `/hrms/*`, `/support/*`).
  - [x] CRM Isolated Modules: Dashboard, Leads, Prospects, Quotations, Payment Records, Deals, Internal Operations, Clients, Companies, Services.
  - [x] Strict Department Isolation: `Internal Operations` strictly hidden from employees in the `Sales` department in both the navigation and direct page guards.
  - [x] Quick-switch action to Central Hub (`/portal`).
  - [x] Maintained floating card inset, collapse/expand toggle, and brand gradient avatar badge.
- [x] **Unified CRM Database Schema (`prisma/schema.prisma`)**:
  - [x] Supported Departments: `Sales`, `Account`, `Legal`, `Operation`, `Quality`, `IT`, `HR`, `Other`.
  - [x] `Lead`: Lead tracking, status enum (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL_SENT`, `WON`, `LOST`, `JUNK`), budget, source, assigned Employee relation.
  - [x] Dynamic Prospect Spreadsheet models:
    - [x] `ProspectTab`: TL-wise spreadsheet tab partitioning.
    - [x] `ProspectSheet`: BDM/CDM sub-tabs assigned per team member.
    - [x] `ProspectColumn`: Customizable dynamic column schema managed by HOD.
    - [x] `ProspectRow`: JSONB flexible cell data mapped to assigned BDM.
  - [x] `Quotation` & `QuotationService`: Quotation number generation, itemized services, pricing, 18% GST calculation, R2 PDF URL storage.
  - [x] `PaymentRecord`: Receipts, `bankType` (`BSPL` / `BSAPL`), `paymentType` (`FIRST_PAYMENT` / `REMAINING_PAYMENT`), `status` (`UNVERIFIED` / `VERIFIED` / `REJECTED`), payment mode, transaction ref, screenshot storage, Accounts verification timestamps.
  - [x] `Deal` model expansion: `dealNumber`, `clientId`, `companyId`, `subTotal`, `gstAmount`, `totalValue`, `amountReceived`, `amountPending`, `teamType`, `internalLegalStatus`, `legalDocType`, `agreementTerms`, `legalRemarks`.
  - [x] `DealService`: Per-service line items with unit price, GST, outsource cost, and link to spawned operation.
  - [x] `DealDocument`: R2 storage references for agreements, NDAs, KYC, invoices, and legal docs.
  - [x] `InternalOperation`: 1-per-service spawned from Deals, `operationNumber`, `teamType`, `stage` (`OPERATION` / `QUALITY`), `internalStage`, assigned TL, assigned TM, and `workflowData` JSONB.
  - [x] `Client` & `Company`: Client with `@unique` indexed phone, indexed email, company linkage, and statutory fields.
  - [x] `Service`: Enterprise catalog with `minimumPrice` safeguard, `outsourcePrice` margin, and SAC code.
  - [x] `SalesTarget`: BDM-wise monthly targets set by HOD with deal count and revenue achievement tracking.
  - [x] Migrated PostgreSQL database cleanly with `prisma db push` and generated Prisma Client.
- [x] **Cloudflare R2 Storage Utility**:
  - [x] Installed `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
  - [x] Created `lib/storage/r2.ts` with S3 client initialization, presigned download URLs, upload buffer processing, and development fallback.
  - [x] Created `app/api/upload/route.ts` accepting multipart form data, verifying user authentication, and returning public/presigned URLs.
  - [x] Documented required Cloudflare R2 environment variables in `.env`.
- [x] **Routing & Breadcrumb Sync**:
  - [x] Updated `components/layout/Navbar.tsx` breadcrumbs for all CRM sub-routes.
  - [x] Created scaffolding pages for `/crm/prospects`, `/crm/quotations`, `/crm/payments`, `/crm/operations`, `/crm/clients`, `/crm/companies`, `/crm/services`.

---

### Phase 2: CRM Master Modules (CRUD + Bulk Upload Engine) (Completed)
- [x] **Reusable Bulk Upload Component ([components/crm/BulkUploadModal.tsx](file:///p:/vrunda/BE%20SAAS/components/crm/BulkUploadModal.tsx))**:
  - [x] RFC 4180 compliant CSV parser with quoted field and comma support.
  - [x] Dynamic sample CSV template generator with sample data download.
  - [x] Row-by-row Zod schema validation with interactive error list (row number, field, message, input value).
  - [x] Batch database insert handling with success/failure summary toasts.
  - [x] Reusable architecture integrated across Services, Companies, Clients, and Leads.
- [x] **Services Catalog ([/crm/services](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/services/page.tsx))**:
  - [x] Full CRUD operations (Name, Minimum Price, Outsource Price, Description, Category, SAC Code, GST Rate, Active toggle).
  - [x] Strict Zod validation with floor price safeguards.
  - [x] Confirmation delete modal preventing accidental deletion when active deals exist.
  - [x] Bulk upload CSV integration.
- [x] **Companies Directory ([/crm/companies](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/companies/page.tsx))**:
  - [x] Full CRUD operations (Company Name, Incorporated Date, Company Type, Address, Industry, Website, GSTIN, PAN, Location).
  - [x] RBAC Scoping: Sales TMs can only list/view companies they created; TLs see their team's records; HOD, Accounts, and Quality see all.
  - [x] Linked client and deal counts with delete protection.
  - [x] Bulk upload CSV integration.
- [x] **Clients Directory ([/crm/clients](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/clients/page.tsx))**:
  - [x] Full CRUD operations (Client Name, Phone, Email, Alternate Number, Gender, State, City, Company linkage, GSTIN, PAN).
  - [x] Unique phone constraint enforcement preventing duplicate accounts across the organization.
  - [x] RBAC Scoping: Sales TMs restricted to own created/assigned records; TLs see team; HOD/Accounts/Quality see all.
  - [x] Dedicated Global Lookup Endpoint ([/api/crm/clients/search](file:///p:/vrunda/BE%20SAAS/app/api/crm/clients/search/route.ts)) for universal lookup by Phone (primary) or Email (secondary) without creator restrictions.
  - [x] Real-time duplicate phone warning during manual client entry.
  - [x] Bulk upload CSV integration.
- [x] **Leads Registry ([/crm/leads](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/leads/page.tsx))**:
  - [x] Full CRUD operations (Lead Number, Name, Phone, Email, Company, Source Channel, Status, Budget, BDM assignment, Notes).
  - [x] Status stage badges (New, Contacted, Qualified, Proposal Sent, Won, Lost, Junk).
  - [x] Scoped view by role and team hierarchy.
  - [x] Bulk upload CSV integration.

---

### Phase 3: Prospects (Dynamic Spreadsheet) & Quotations Engine (Completed)
- [x] **Prospects Spreadsheet Module ([/crm/prospects](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/prospects/page.tsx)) — Google Sheets Experience**:
  - [x] Top-level tabs (TL-wise hierarchy) created and managed by Sales Head / HOD.
  - [x] Sub-tabs / Sheets (BDM/CDM-wise) assigned per person with row-by-row live data editing.
  - [x] Dynamic Grid & Schema: In-place cell editing with real-time saving indicators and error handling.
  - [x] HOD Column Controls: Sales Head / HOD can dynamically add, configure (Text, Number, Currency, Badge, Select, Date, Phone, Email), and delete columns per team, persisted in PostgreSQL (`ProspectColumn`).
  - [x] 1-Click "Convert to Lead" action creating an official active `Lead` from any prospect row.
  - [x] Dynamic CSV bulk upload engine tailored to active spreadsheet column schema.
  - [x] Strict RBAC Visibility: TMs access only assigned sheets; TLs see their team members; HOD sees all.
- [x] **Quotations Engine & Automated Proposals ([/crm/quotations](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/quotations/page.tsx))**:
  - [x] Multi-Section Quotation Creator / Editor:
    - [x] Client Section with instant auto-fill lookup from existing clients (Name, Phone, Email, Address, Gender).
    - [x] Company Section with type, incorporated date, and address auto-fill.
    - [x] Services Subform: Dynamic repeatable rows with catalog lookup, custom descriptions, and Indian GST breakdown (Total Amount, 18% GST, Excl. GST).
    - [x] Financial Breakdown: Subtotal, 18% GST total, adjustable discount, and net payable grand total.
  - [x] Automated Server-Side PDF Generation ([lib/pdf/quotation.ts](file:///p:/vrunda/BE%20SAAS/lib/pdf/quotation.ts)):
    - [x] High-resolution BharatEdge branding, quotation numbering (`QT-YYYY-XXXX`), and client/company info cards.
    - [x] Itemized services breakdown table with remarks and tax columns.
    - [x] Official remittance details for both BSPL (Kotak Mahindra Bank) and BSAPL (ICICI Bank).
    - [x] Commercial terms, proposal validity, and authorized signatory.
  - [x] Cloudflare R2 Upload: Automatically stores generated proposal PDFs with direct download links.
  - [x] Direct Client Email Dispatch ([lib/mail.ts](file:///p:/vrunda/BE%20SAAS/lib/mail.ts)):
    - [x] "Send to Client" button sending a branded HTML email with the PDF attached directly via Nodemailer SMTP.
    - [x] Automatically updates quotation status to `SENT` and records dispatch timestamp.
  - [x] Full CRUD operations (Create, Read, Update & Regenerate PDF, Delete with confirmation modal).
  - [x] Scoped RBAC: TMs view own quotations; TLs view team quotations; HOD and Accounts view all.

---

### Phase 4: Payment Records, Accounts Verification & Deals Engine (Completed)
- [x] **Payment Records Module ([/crm/payments](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/payments/page.tsx))**:
  - [x] Payment Form Fields: Screenshot upload (Cloudflare R2 via `/api/upload`), Bank Type (`BSPL` / `BSAPL`), Payment Type (`FIRST_PAYMENT` / `REMAINING_PAYMENT`), Received Amount, Payment Date, Payment Mode, and UTR/Transaction Ref.
  - [x] Dynamic Client Lookup: Search clients globally by name, phone, or email.
  - [x] Inline Client Creation: Built-in popup modal to create a new client on the spot (Name, Phone, Email) if not found in database.
  - [x] 1-Click "Convert to Deal": Advance first payments can be converted into a draft Deal with 1 click, pre-populating client, payment amount, and screenshot, and redirecting straight to the Deal builder.
  - [x] Remaining Payment Deal Credit: Requires selecting an existing Deal; once verified by Accounts, automatically adds received amount to Deal's `amountReceived` and deducts from `amountPending`.
  - [x] Accounts Verification Desk & Queue:
    - [x] New records default to `UNVERIFIED` and fire targeted notifications to the Accounts Department.
    - [x] 3 Dynamic Tabs: `All Records`, `Verified Records`, `Pending Records`.
    - [x] Accounts verification modal: high-res screenshot viewer, confirm/select Bank Entity (`BSPL` Kotak vs `BSAPL` ICICI), optional verification remarks, and rejection handling.
    - [x] Automatically updates verified revenue tally and notifies the recording BDM.
  - [x] Full CRUD operations, confirmation delete modal, and bulk upload engine.
- [x] **Deals Engine ([/crm/deals](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/deals/page.tsx))**:
  - [x] Multi-Section Deal Form:
    - [x] Client Section: Pulls linked Client; modifying contact details (Phone, Email, Alternate, Gender, State, City, Address) automatically synchronizes the master `Client` record.
    - [x] Basic Details: Booking Date, Primary BDM, Partner BDM with **50%–50% revenue split logic**, PAN Card validation, and Stage tracking.
    - [x] Company Section: Company Name, Type, Incorporated Date, Address with dynamic synchronization to master `Company` record.
    - [x] Services Subform: Dynamic repeatable rows with catalog lookup, auto-fetched Minimum & Outsource prices, Total Amount, 18% GST calculation, Without GST Amount, Received Amount, Received GST & Excl. GST, and Pending Amount calculation.
    - [x] Attachments: Payment Screenshot + Client KYC & Agreements upload to Cloudflare R2.
  - [x] Gatekeeping Rule: Keeps "Send to Accounts for Verification" button disabled/hidden until all required Deal fields (Client, Company, Services line-items, Total Value > 0, Booking Date) are completed.
  - [x] Accounts Deal Verification & Legal Handover:
    - [x] Accounts reviews completed deal against verified payment records and clicks "Verify Deal" (`accountsStatus: "ACCOUNTS_VERIFIED"`).
    - [x] Accounts advances deal by clicking "Send to Legal" (`accountsStatus: "SENT_TO_LEGAL"`, `internalLegalStatus: "UNDER_REVIEW"`, `stage: "CLOSED_WON"`), notifying the Legal Department.
  - [x] Full CRUD operations and visual payment progress bar (% collected vs pending).

---

### Phase 5: Operations & Quality Service Execution Workflows (Completed)
- [x] **Service Decomposition Engine ([lib/actions/operations.ts](file:///p:/vrunda/BE%20SAAS/lib/actions/operations.ts))**:
  - [x] Automatically spawns 1 child `InternalOperation` record per service item upon advancing a Deal to Operations (`sendDealToOperationAction` / `autoSpawnDealOperationsAction`).
  - [x] Prevents duplicate child records through unique `dealServiceId` relation.
  - [x] Generates sequential unique file numbering (`OP-YYYY-XXXX`).
  - [x] Pre-populates booking date, client name, contact phone, and company from Parent Deal.
  - [x] Fires automated targeted notifications to Operations HOD & Team Leaders upon file decomposition.
- [x] **Legal Handover & Sales Read-Only Status Sync**:
  - [x] Added Legal department tracking fields (`legalDocSenderName`, `legalDocSenderDate`, `legalDocReceiverName`, `legalDocReceiverDate`).
  - [x] Implemented Legal Service Subform per service item (`teamType`, `legalStatus`, `legalDocType`, `agreementTerms`, `legalRemarks`).
  - [x] "Send to Operation" button on Deal record (available in both table view and form modal for Legal/Admin).
  - [x] Live Read-Only Synced Operation Status Subform inside Deal view: Sales department sees real-time synced Assigned TL, Assigned TM, and Execution Status for each service without exposing the direct `/crm/operations` module.
  - [x] Department isolation guard strictly preventing Sales department from accessing `/crm/operations` directly.
- [x] **Operations Management & Dynamic Workflows ([/crm/operations](file:///p:/vrunda/BE%20SAAS/app/(dashboard)/crm/operations/page.tsx))**:
  - [x] `OperationFormModal` ([components/crm/OperationFormModal.tsx](file:///p:/vrunda/BE%20SAAS/components/crm/OperationFormModal.tsx)):
    - [x] Team assignment controls (select TL and TM from active department staff).
    - [x] Dynamic internal stages customized per `teamType` (`Team Incorporation`, `Team Funding`, `Team Compliance`, `Team Digital Marketing`).
    - [x] Structured JSONB workflow inputs for each team (MCA SRN, DIN/DSC, pitch deck links, valuation targets, challan numbers, ad accounts, and compliance years).
    - [x] Due dates, completion dates, and execution status (`IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `REJECTED`).
  - [x] Reusable CSV bulk upload integration for batch operation imports.
- [x] **Quality Audit Handover & Automatic Parent Roll-Up**:
  - [x] 1-Click "Send to Quality" action for Operations TM/TL transitioning child record from `OPERATION` to `QUALITY` stage.
  - [x] Automatic Parent Deal Roll-Up: When ALL sibling child operations for a deal reach `QUALITY` stage, the Parent Deal's status is automatically promoted to `QUALITY` and the Quality Department is notified.
  - [x] 3 Dynamic Tabs for Operations & Quality: `All Files`, `Completed Files (Stage = Quality)`, and `Pending Files (Stage ≠ Quality)`.
  - [x] `QualityAuditModal` ([components/crm/QualityAuditModal.tsx](file:///p:/vrunda/BE%20SAAS/components/crm/QualityAuditModal.tsx)):
    - [x] Quality score slider (1 - 100) and mandatory feedback remarks.
    - [x] Decision 1: "Approve & Pass Audit" (marks child operation `COMPLETED`; if all child operations are completed, marks Deal `isQualityPassed: true`).
    - [x] Decision 2: "Return for Revision" (rolls child operation back to `OPERATION` stage with status `REJECTED`, rolls Parent Deal back to `SENT_TO_OPERATION`, and fires high-priority correction notification to TM & TL).

---

### Phase 6: Department & Role-Based CRM Dashboards + Sales Target Management (Completed)
- [x] **Sales Target Setting & Governance Desk ([lib/actions/dashboard.ts](file:///p:/vrunda/BE%20SAAS/lib/actions/dashboard.ts))**:
  - [x] Sales Head / HOD / Super Admin Target Modal (`SalesTargetModal.tsx`) to set and update monthly targets per BDM/CDM.
  - [x] Targets persisted in PostgreSQL (`SalesTarget` table) indexed by `[bdmId, month, year]`.
  - [x] Real-time attainment progress bars (Target vs Achieved revenue, deals won count, shortfall amount, and achievement rate %).
- [x] **Sales Department Dashboard & Strict 50%–50% Split Engine**:
  - [x] Mathematical 50%–50% Partner BDM Split: deals with `partnerBdmId` split revenue, 18% GST, without GST, received tax, and outsource costs 50-50 between primary and partner BDMs without double-counting.
  - [x] Comprehensive Sales KPIs: Total Quotations Created, Total Payment Records, Total Revenue, Verified vs. Unverified Revenue, and CRM Pending First Payments count (advance payments awaiting deal conversion).
  - [x] Dynamic Role Scoping:
    - [x] **TM (BDM/CDM)**: restricted strictly to personal KPIs, personal target attainment, and personal receipts.
    - [x] **TL (Team Leader)**: supervised team performance overview plus individual BDM breakdown table.
    - [x] **HOD (Head of Sales / Super Admin)**: organization-wide sales attainment, TL team comparisons, and BDM leaderboard.
- [x] **Accounts Department Dashboard**:
  - [x] Global commercial cashflow metrics: Invoiced Revenue, Received Cash, Pending Receivables, Total GST, Without GST, Received GST, and Outsource Cost.
  - [x] Bank Entity Breakdown: Received, pending, and deals counts partitioned by `BSPL` (Kotak Mahindra Bank) vs `BSAPL` (ICICI Bank).
  - [x] Payment Records Verification Queue: Unverified vs Verified vs Rejected counts & values with direct shortcut to verification desk.
- [x] **Legal Handover Dashboard**:
  - [x] Deals pending legal review, agreements dispatched/sent count, executed documents received count, and deals forwarded to Operations.
- [x] **Internal Operations Dashboard**:
  - [x] Team vertical workload distribution: Incorporation, Funding, Compliance, Digital Marketing breakdown.
  - [x] Active execution files vs Completed deliverables vs Unassigned task queue.
- [x] **Quality Audit Dashboard**:
  - [x] Audit queue metrics: Pending audits, completed certifications, average compliance score, and high quality files ($\ge 80$).
  - [x] Deals currently undergoing quality certification.
- [x] **Executive Adaptive Switcher & Period Controls**:
  - [x] Top control bar with Month & Year period selectors and reactive transitions.
  - [x] Seamless 1-click Department Switcher tab bar for Super Admins and HODs (`Sales`, `Accounts`, `Operations`, `Legal`, `Quality`).
  - [x] Full production build verification (`npm run build`) passing 100%.

---

## Advanced HRMS Suite — 3-Phase Master Roadmap

### Phase 1: Leave Management Overhaul, Attendance Regularization & Dynamic Workflow Engine (Completed)
- [x] **Leave Management Overhaul (Strictly 2 Leave Types)**:
  - [x] Refactor `LeaveType` enum, `LeaveBalance`, and `LeaveRequest` schema for `PAID_LEAVE` and `SHORT_LEAVE`.
  - [x] `PAID_LEAVE`: 12 days/yr quota, dynamically accruing 1 day/month; automatic deduction upon approval and restoration on cancellation/rejection.
  - [x] `SHORT_LEAVE`: Max 2 requests/month, max 3.0 total hours/month, max 1.5 hours per single request; frontend + backend Zod validation on duration and limits; live remaining count and hours display.
  - [x] HR Admin Balance Adjustment: Dedicated "Adjust Leave Balance" control in HRMS Employee Directory / Edit Employee modal with audit reason and logs.
  - [x] Update `components/leave/ApplyLeaveModal.tsx`, `app/(dashboard)/hrms/leave/page.tsx`, and `lib/actions/leave.ts`.
- [x] **Attendance Regularization (AR) Requests**:
  - [x] `AttendanceRegularization` Prisma model linked to `Employee` and `AttendanceRecord` (date, requestedClockIn, requestedClockOut, regularizationType, reason, attachmentUrl, status).
  - [x] Employee request UI in `/hrms/attendance` with R2 receipt attachment support.
  - [x] Approval workflow routing: automatically updates or creates `AttendanceRecord` on approval with recalculated active hours.
- [x] **Dynamic HRMS Workflow Engine (`/hrms/workflows` — HR Admin Only)**:
  - [x] Strict Access: Restricted to HR Admin / HR HOD / SUPER_ADMIN (403 Forbidden on API).
  - [x] Prisma models: `HrmsWorkflow` and `HrmsWorkflowStep` (module enum, triggerAction, departmentScope, intimationRecipients, approvers).
  - [x] Runtime Execution Engine (`lib/hrms/workflow-engine.ts`): Automated evaluation on record create/update, firing intimation notifications and routing sequential approval tasks.
  - [x] Visual UI & AI Workflow Helper at `/hrms/workflows` with plain English rule translation.
- [x] **Verification**: Compile cleanly with `npx tsc --noEmit` and database migration.

---

### Phase 2: Core HRMS Operations Modules (Completed)
- [x] **Reimbursement Requests (`/hrms/reimbursements`)**:
  - [x] Models, expense categories, amount, R2 receipts, workflow integration, PENDING/APPROVED/REJECTED/PAID lifecycle.
  - [x] Employee claim submission and HR Admin review desk.
- [x] **Resignation & Exit Process (`/hrms/resignations` & `/hrms/lifecycle`)**:
  - [x] Resignation request filing with workflow approval.
  - [x] Onboarding & Exit lifecycle checklists with progress tracking and task assignment.
- [x] **Performance & Appraisals (`/hrms/performance`)**:
  - [x] Appraisal cycles, self-review, manager rating, HR remarks, automatic 30-day and overdue flags.
- [x] **Payroll & Monthly Salary Tracker (`/hrms/payroll`)**:
  - [x] Monthly salary records, base, deductions, net payable, payslip download, prior-month pending detection.
- [x] **HRMS Helpdesk (`/hrms/helpdesk`)**:
  - [x] Department-targeted internal ticketing, categories, priority, R2 attachments, comment threads, workflow routing.
- [x] **Employee Surveys (`/hrms/surveys`)**:
  - [x] Pulse surveys, question builder, employee response submission, aggregated analytics.
- [x] **Verification**: Compile cleanly with `npx tsc --noEmit`.

---

### Phase 3: Unified HR Admin "Inbox" (`/hrms/inbox`) (Completed)
- [x] **Sidebar Integration**:
  - [x] Dedicated "Inbox" item at the top of HRMS sidebar with real-time pending badge count.
- [x] **10-Category Consolidated Action Center UI**:
  - [x] 1. Pending Leaves (Paid & Short Leave with live remaining balances inline)
  - [x] 2. Pending Approvals (Active workflow-assigned approval tasks)
  - [x] 3. Attendance Regularization Requests (Original vs. requested hours & reason)
  - [x] 4. Pending Reimbursements (Amount & inline R2 receipt preview)
  - [x] 5. Resignation Requests
  - [x] 6. Helpdesk Requests
  - [x] 7. Upcoming & Overdue Appraisals
  - [x] 8. Upcoming Holidays (Next 30 days)
  - [x] 9. Onboarding & Exit Checklists
  - [x] 10. Prior Month Pending Salaries
- [x] **One-Click Inline Actions & AI Daily HR Brief**:
  - [x] Quick Approve/Reject with comments and Open Record modal.
  - [x] Deterministic "AI Daily HR Brief" summarizing urgent blockers.
- [x] **Verification**: Full production build verification (`npm run build`).

---

## Cloudflare R2 Credentials Checklist (.env)
To connect your production Cloudflare R2 bucket for document storage, ensure the following keys are added to `.env`:
```env
# Cloudflare R2 Storage Bucket Configuration
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="bharatedge-storage"
R2_PUBLIC_URL="https://pub-yourbucketid.r2.dev" # or your custom domain https://cdn.bharatedge.com
```
*(Note: If R2 credentials are omitted in local development, the system seamlessly falls back to local storage in `public/uploads/` so development is uninterrupted).*
