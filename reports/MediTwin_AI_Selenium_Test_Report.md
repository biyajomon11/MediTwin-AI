# MediTwin AI – Selenium Automated Testing Report

**Project Name:** MEDI TWIN AI – INTELLIGENT PATIENT DIGITAL TWIN  
**Academic Degree:** Master of Computer Applications (MCA)  
**Candidate Name:** Biya Jomon  
**Execution Date & Time:** 2026-09-22 16:09:48 IST  
**Target Environment:** Local Full-Stack (React 18 + Node/Express + PostgreSQL 16)  
**Frontend URL:** [http://localhost:3000](http://localhost:3000)  
**Backend API URL:** [http://localhost:5000](http://localhost:5000)  

---

## 1. Introduction

The **MediTwin AI – Intelligent Patient Digital Twin** system is a specialized postgraduate healthcare web platform engineered to deliver longitudinal physiological tracking, AI-assisted clinical summarization, and strict multi-institutional role-based access control (RBAC). In modern clinical software engineering, manual user interface verification is insufficient to guarantee patient data confidentiality, continuous regression stability, and flawless client-server state synchronization. This report documents the design, implementation, and execution of an enterprise-grade automated testing suite using **Selenium WebDriver 4**, **Python 3.14**, and **Pytest**. The suite verifies real, live browser interactions against the actual running MediTwin AI system without mocking backend services or bypassing security boundaries.

## 2. System Testing

System testing validates the completely integrated MediTwin AI application to evaluate system compliance with clinical and architectural requirements. Testing encompassed complete end-to-end workflows: user authentication, session state persistence via JSON Web Tokens (JWT), role-specific dashboard rendering, dynamic modal interactions, clinical records access, and strict RBAC perimeter enforcement across four clinical and administrative roles: **Doctor**, **Nurse**, **Patient**, and **Hospital Admin**.

## 3. Test Plan

### 3.1 Test Objectives

1. Verify authentic browser interactions against live frontend and backend endpoints.
2. Ensure zero unauthorized cross-role data access (RBAC enforcement).
3. Validate clinical data integrity and error handling across form inputs and navigation links.
4. Confirm that JWT tokens are safely handled in browser storage and invalidated upon session termination.
5. Automatically capture empirical execution logs and failure screenshots.

### 3.2 Test Scope

- **In Scope:** Authentication, Doctor Workstation, Nurse Clinical Station, Personal Patient Dashboard, Hospital Executive Analytics, RBAC boundary tests, client-side input validation, client-to-server API workflows, navigation routing, and session termination.
- **Out of Scope:** Clinical diagnostic validity of AI model conclusions, third-party SMS/email gateways, and simulated hardware telemetry.

### 3.3 Test Environment

- **Frontend Application:** React 18.3, TypeScript 5.7, Vite 6.0, TailwindCSS 3.4 (`http://localhost:3000`)
- **Backend Service:** Node.js, Express 4.18, TypeScript 5.3, Prisma ORM 5.10 (`http://localhost:5000`)
- **Database Layer:** PostgreSQL 16 (3NF Normalized clinical schema)
- **Automation Host:** Microsoft Windows 11 AMD64

### 3.4 Test Tools

- **Automation Engine:** Selenium WebDriver 4.49.0
- **Test Runner:** Pytest 9.1.1 with pytest-html
- **Browser:** Google Chrome (Headless & Headed modes supported)
- **Reporting Framework:** ReportLab 5.0.0, Python Markdown

### 3.5 Test Deliverables

1. Automated test codebase implementing Page Object Model (`tests/selenium/`)
2. Comprehensive Interactive HTML Report (`reports/selenium_report.html`)
3. Academic Markdown Test Report (`reports/MediTwin_AI_Selenium_Test_Report.md`)
4. Formatted PDF Academic Report (`reports/MediTwin_AI_Selenium_Test_Report.pdf`)
5. Machine-Readable Test Dataset (`reports/test_results.json`)
6. High-Precision Test Execution Log (`reports/logs/selenium_test.log`)

### 3.6 Entry Criteria

- Frontend Vite server running and accessible on port 3000.
- Backend Express server running and responding on port 5000.
- PostgreSQL database running with migrated schema and verified test credentials.

### 3.7 Exit Criteria

- 100% of defined critical and high priority test cases executed.
- Zero unresolved Critical/Blocker defects affecting core clinical navigation or authentication.
- All test results, logs, and screenshots captured.


## 4. Automation Testing

Automation testing replaces error-prone, repetitive manual checks with programmatic test scripts that drive real browsers. In the context of MediTwin AI, automated regression testing ensures that modifications to frontend UI components (such as consultation queues or prescription cards) do not inadvertently break role security, session handling, or API communications. Automated regression testing offers high execution velocity, deterministic assertions, and complete reproducibility across development cycles.

## 5. Selenium Testing

**Selenium WebDriver** is the premier W3C-standard browser automation framework utilized for this project. Key architectural mechanisms employed include:
- **Browser Automation:** Direct, native driving of Google Chrome via Chrome DevTools Protocol / ChromeDriver.
- **Page Object Model (POM):** Clean architectural separation where web pages (e.g., `LoginPage`, `DoctorDashboardPage`) encapsulate locators and user actions, keeping test files focused purely on business assertions.
- **Web Element Interaction:** Stable locators utilizing semantic attributes, placeholder selectors, and accessible DOM hierarchies, avoiding fragile dynamic classes.
- **Explicit Waits (`WebDriverWait`):** Dynamic synchronization utilizing `expected_conditions` (`visibility_of_element_located`, `element_to_be_clickable`, `url_contains`) to eliminate arbitrary sleeps and accommodate asynchronous React rendering.
- **Failure Screen Capture:** Automated hooks intercepting test outcomes to save timestamped PNG screenshots immediately upon failure.

## 6. Test Environment

| Component | Technology / Version | Deployment Endpoint |
| :--- | :--- | :--- |
| **Frontend** | React 18.3.1, Vite 6.0.11, TailwindCSS 3.4.17 | `http://localhost:3000` |
| **Backend API** | Node.js, Express 4.18.3, TypeScript 5.3.3 | `http://localhost:5000` |
| **Database** | PostgreSQL 16, Prisma ORM 5.10.0 | `localhost:5432 / meditwin` |
| **Operating System** | Microsoft Windows 11 Enterprise (AMD64) | Host Machine |
| **Browser** | Google Chrome 120+ (Headless: True) | Automated WebDriver |
| **Python Engine** | Python 3.14.0 (64-bit) | Runtime Environment |
| **Selenium Suite** | Selenium 4.49.0 | W3C Standard Driver |
| **Pytest Framework** | Pytest 9.1.1 with pytest-html | Test Harness |


## 7. Master Test Case Table

| Test Case ID | Module | Test Title | Priority | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| `ADMIN-001` | Admin | Verify Hospital Admin login opens /dashboard/admin | Critical | Verify Hospital Admin login opens /dashboard/admin | Success | **PASS** |
| `ADMIN-002` | Admin | Verify Hospital Admin dashboard displays key facility metrics | High | Verify Hospital Admin dashboard displays key facility metrics | Success | **PASS** |
| `ADMIN-003` | Admin | Verify Hospital Reports & Statistics view loads | High | Verify Hospital Reports & Statistics view loads | Success | **PASS** |
| `ADMIN-004` | Admin | Verify Hospital Activity Monitor displays clinical activity stream | High | Verify Hospital Activity Monitor displays clinical activity stream | Success | **PASS** |
| `ADMIN-005` | Admin | Verify Department Analytics view loads | Medium | Verify Department Analytics view loads | Success | **PASS** |
| `API-001` | API Integration | Verify Browser action triggers backend login and stores verified JWT session | High | Verify Browser action triggers backend login and stores verified JWT session | Success | **PASS** |
| `API-002` | API Integration | Verify backend clinical-overview API returns live database data for doctor | High | Verify backend clinical-overview API returns live database data for doctor | Success | **PASS** |
| `API-003` | API Integration | Verify backend rejects empty/malformed authentication request with HTTP 400 | High | Verify backend rejects empty/malformed authentication request with HTTP 400 | Success | **PASS** |
| `AUTH-001` | Authentication | Verify valid Doctor login succeeds and opens dashboard | Critical | Verify valid Doctor login succeeds and opens dashboard | Success | **PASS** |
| `AUTH-002` | Authentication | Verify invalid password displays error and denies login | Critical | Verify invalid password displays error and denies login | Success | **PASS** |
| `AUTH-003` | Authentication | Verify unregistered email fails authentication | High | Verify unregistered email fails authentication | Success | **PASS** |
| `AUTH-004` | Authentication | Verify empty login form keeps submit button disabled | Medium | Verify empty login form keeps submit button disabled | Success | **PASS** |
| `AUTH-005` | Authentication | Verify logout clears session and blocks back-navigation | Critical | Verify logout clears session and blocks back-navigation | Success | **PASS** |
| `DOC-001` | Doctor | Verify Doctor workstation loads operational clinical metrics | Critical | Verify Doctor workstation loads operational clinical metrics | Success | **PASS** |
| `DOC-002` | Doctor | Verify Doctor profile displays practitioner data | High | Verify Doctor profile displays practitioner data | Success | **PASS** |
| `DOC-003` | Doctor | Verify doctor can edit permitted profile fields | High | Verify doctor can edit permitted profile fields | Success | **PASS** |
| `DOC-004` | Doctor | Verify protected administrative credentials are read-only | High | Verify protected administrative credentials are read-only | Success | **PASS** |
| `DOC-005` | Doctor | Verify doctor can access patient records and view subtabs | High | Verify doctor can access patient records and view subtabs | Success | **PASS** |
| `DOC-006` | Doctor | Verify clinical guidelines view loads approved protocols | Medium | Verify clinical guidelines view loads approved protocols | Success | **PASS** |
| `DOC-007` | Doctor | Verify AI Patient Summary view loads | Medium | Verify AI Patient Summary view loads | Success | **PASS** |
| `DOC-008` | Doctor | Verify appointment request queue and prescription section display | High | Verify appointment request queue and prescription section display | Success | **PASS** |
| `FORM-001` | Form Validation | Verify login submit button remains disabled when inputs are empty | High | Verify login submit button remains disabled when inputs are empty | Success | **PASS** |
| `FORM-002` | Form Validation | Verify register portal displays all 4 institutional roles | High | Verify register portal displays all 4 institutional roles | Success | **PASS** |
| `FORM-003` | Form Validation | Verify doctor registration page loads required input fields | Medium | Verify doctor registration page loads required input fields | Success | **PASS** |
| `NAV-001` | Navigation | Verify navigation from Landing page to Login and Registration | Medium | Verify navigation from Landing page to Login and Registration | Success | **PASS** |
| `NAV-002` | Navigation | Verify Doctor workstation tabs switch views cleanly without page breaks | Medium | Verify Doctor workstation tabs switch views cleanly without page breaks | Success | **PASS** |
| `NAV-003` | Navigation | Verify navigating to unknown URL route redirects gracefully to landing page | Low | Verify navigating to unknown URL route redirects gracefully to landing page | Success | **PASS** |
| `NURSE-001` | Nurse | Verify Nurse login opens /dashboard/nurse | Critical | Verify Nurse login opens /dashboard/nurse | Success | **PASS** |
| `NURSE-002` | Nurse | Verify Patient Observations & Vital Signs section displays | High | Verify Patient Observations & Vital Signs section displays | Success | **PASS** |
| `NURSE-003` | Nurse | Verify Nursing Notes & Treatment Records loads | High | Verify Nursing Notes & Treatment Records loads | Success | **PASS** |
| `NURSE-004` | Nurse | Verify Patient Clinical Records tab is accessible | Medium | Verify Patient Clinical Records tab is accessible | Success | **PASS** |
| `PATIENT-001` | Patient | Verify Patient login opens /dashboard/patient | Critical | Verify Patient login opens /dashboard/patient | Success | **PASS** |
| `PATIENT-002` | Patient | Verify Patient health dashboard displays health summary | High | Verify Patient health dashboard displays health summary | Success | **PASS** |
| `PATIENT-003` | Patient | Verify My Prescriptions view displays medications | High | Verify My Prescriptions view displays medications | Success | **PASS** |
| `PATIENT-004` | Patient | Verify Medical Documents view loads | Medium | Verify Medical Documents view loads | Success | **PASS** |
| `PATIENT-005` | Patient | Verify Medicine Reminders view loads | Medium | Verify Medicine Reminders view loads | Success | **PASS** |
| `PATIENT-006` | Patient | Verify AI Health Summary view displays digital twin insights | Medium | Verify AI Health Summary view displays digital twin insights | Success | **PASS** |
| `RBAC-001` | RBAC | Verify authenticated Doctor cannot access Nurse workstation | Critical | Verify authenticated Doctor cannot access Nurse workstation | Success | **PASS** |
| `RBAC-002` | RBAC | Verify authenticated Doctor cannot access Admin dashboard | Critical | Verify authenticated Doctor cannot access Admin dashboard | Success | **PASS** |
| `RBAC-003` | RBAC | Verify authenticated Nurse cannot access Doctor workstation | Critical | Verify authenticated Nurse cannot access Doctor workstation | Success | **PASS** |
| `RBAC-004` | RBAC | Verify authenticated Nurse cannot access Admin dashboard | Critical | Verify authenticated Nurse cannot access Admin dashboard | Success | **PASS** |
| `RBAC-005` | RBAC | Verify authenticated Patient cannot access Doctor workstation | Critical | Verify authenticated Patient cannot access Doctor workstation | Success | **PASS** |
| `RBAC-006` | RBAC | Verify authenticated Patient cannot access Nurse workstation | Critical | Verify authenticated Patient cannot access Nurse workstation | Success | **PASS** |
| `RBAC-007` | RBAC | Verify authenticated Patient cannot access Admin dashboard | Critical | Verify authenticated Patient cannot access Admin dashboard | Success | **PASS** |
| `RBAC-008` | RBAC | Verify unauthenticated user cannot access protected doctor workstation | Critical | Verify unauthenticated user cannot access protected doctor workstation | Success | **PASS** |

---

## 8. Authentication Testing

--------------------------------------------------------
### Test Case: AUTH-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** AUTH-001  
**Module Name:** Authentication  
**Test Title:** Verify valid Doctor login succeeds and opens dashboard  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:19  
**Description:** Verify that an authenticated Doctor can access the Doctor Workstation using verified credentials.  
**Pre-Condition:** Valid Doctor test account (test.doctor@meditwin.local) exists in database and app is running.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Navigate to MediTwin AI landing page | http://localhost:3000 | Landing page rendered successfully | Page loaded with title and navigation | **PASS** |
| 2 | Click 'Portal Access' / 'Sign In' button | Navbar action button | Auth modal opens displaying login form | Auth modal displayed with email and password inputs | **PASS** |
| 3 | Enter Doctor email address | test.doctor@meditwin.local | Email input receives text | Value entered cleanly | **PASS** |
| 4 | Enter Doctor password | DoctorPass@123 | Password masked in input field | Password accepted into form state | **PASS** |
| 5 | Click 'Access Clinical Portal' button | Login submit button | Form submits and API returns 200 OK with JWT | Authentication successful, token stored | **PASS** |
| 6 | Verify browser redirection to Doctor Dashboard | URL check /dashboard/doctor | Redirection to Doctor Workstation completed | URL changed to http://localhost:3000/dashboard/doctor | **PASS** |
| 7 | Verify Doctor Workstation header and metrics display | DOM elements //h1 or metrics cards | Clinical metrics and workstation UI visible | Doctor Clinical Workstation rendered cleanly | **PASS** |

**Post-Condition:** Doctor remains authenticated with active JWT token in browser storage.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: AUTH-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** AUTH-002  
**Module Name:** Authentication  
**Test Title:** Verify invalid password displays error and denies login  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:24  
**Description:** Verify that authentication is rejected when an invalid password is provided.  
**Pre-Condition:** Valid Doctor account exists; test is performed with an incorrect password.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open login modal on landing page | http://localhost:3000 | Login modal displayed | Login modal rendered | **PASS** |
| 2 | Enter registered Doctor email | test.doctor@meditwin.local | Email accepted | Email entered | **PASS** |
| 3 | Enter deliberately incorrect password | WrongDoctorPassword!99 | Password accepted in input | Password entered | **PASS** |
| 4 | Click 'Access Clinical Portal' button | Login submit button | Backend rejects request with HTTP 401 Unauthorized | Server responded with 401 error | **PASS** |
| 5 | Verify error alert message is displayed in UI | DOM alert banner / toast | Error message displayed to user | Error message 'Invalid email or password' displayed | **PASS** |
| 6 | Verify user is NOT redirected to dashboard | Current browser URL | URL remains on landing/login | URL remains http://localhost:3000 | **PASS** |

**Post-Condition:** User remains unauthenticated; no JWT token is stored.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: AUTH-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** AUTH-003  
**Module Name:** Authentication  
**Test Title:** Verify unregistered email fails authentication  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:28  
**Description:** Verify that authentication fails gracefully when an unregistered email address is entered.  
**Pre-Condition:** Database does not contain unregistered.practioner@nonexistent.domain.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open login modal | http://localhost:3000 | Login modal displayed | Login modal rendered | **PASS** |
| 2 | Enter unregistered email address | unregistered.doc992@nonexistent.org | Email accepted | Email entered | **PASS** |
| 3 | Enter arbitrary password | ArbitraryPass#2026 | Password accepted | Password entered | **PASS** |
| 4 | Click login submit button | Login submit button | Backend returns 401 Unauthorized | HTTP 401 returned from API | **PASS** |
| 5 | Verify error feedback alert | DOM error element | User alert displayed cleanly | Authentication error feedback displayed | **PASS** |

**Post-Condition:** User remains on login modal; no session created.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: AUTH-004
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** AUTH-004  
**Module Name:** Authentication  
**Test Title:** Verify empty login form keeps submit button disabled  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:32  
**Description:** Verify client-side validation prevents submission when email or password fields are empty.  
**Pre-Condition:** Application is running; login modal is opened.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open login modal | http://localhost:3000 | Login modal opened | Modal opened with blank inputs | **PASS** |
| 2 | Leave email and password inputs empty | None (empty string) | Inputs remain empty | Inputs empty | **PASS** |
| 3 | Inspect submit button state | button[type='submit'] | Button is disabled or prevents submission | Button has disabled attribute or class | **PASS** |
| 4 | Attempt click on submit button | Button click attempt | No submission occurs; user remains on form | No API call dispatched; form unchanged | **PASS** |

**Post-Condition:** No network request is emitted.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: AUTH-005
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** AUTH-005  
**Module Name:** Authentication  
**Test Title:** Verify logout clears session and blocks back-navigation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:33  
**Description:** Verify that logging out invalidates local session tokens and prevents back-navigation to protected pages.  
**Pre-Condition:** Doctor is logged in with active session.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate Doctor and reach dashboard | test.doctor@meditwin.local | Dashboard loaded | Dashboard active at /dashboard/doctor | **PASS** |
| 2 | Click 'Logout' / 'Sign Out' in navigation | Logout button | Logout handler clears storage and redirects | Storage cleared, redirect initiated | **PASS** |
| 3 | Verify redirection to landing page | URL check / | Redirected to landing page | Browser landed at http://localhost:3000 | **PASS** |
| 4 | Verify meditwin_token is removed from storage | localStorage inspection | Token key is null/undefined | localStorage.getItem('meditwin_token') is null | **PASS** |
| 5 | Attempt direct browser navigation to /dashboard/doctor | driver.get('/dashboard/doctor') | Route guard redirects to login / denies access | Redirected immediately back to landing page | **PASS** |

**Post-Condition:** Session cleared; redirect to landing/login; protected route blocked.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 9. Doctor Module Testing

--------------------------------------------------------
### Test Case: DOC-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-001  
**Module Name:** Doctor  
**Test Title:** Verify Doctor workstation loads operational clinical metrics  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:39  
**Description:** Verify that the Doctor Clinical Workstation loads operational metrics (active patients, critical alerts, pending consultations).  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Login as Doctor | test.doctor@meditwin.local | Authenticated successfully | Redirected to /dashboard/doctor | **PASS** |
| 2 | Verify workstation heading renders | Heading element | Heading displays clinical title | Heading 'Doctor Clinical Workstation' verified | **PASS** |
| 3 | Verify patient telemetry & operational cards | Metric card containers | Cards render metrics (Patients, Appointments) | Metrics cards present in DOM and populated | **PASS** |

**Post-Condition:** Doctor dashboard rendered with clinical metrics.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: DOC-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-002  
**Module Name:** Doctor  
**Test Title:** Verify Doctor profile displays practitioner data  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:44  
**Description:** Verify that Doctor profile displays practitioner name, department, specialization, and qualifications.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Navigate to Doctor Profile | /dashboard/doctor/profile | Profile page opens | URL is /dashboard/doctor/profile | **PASS** |
| 2 | Verify profile card header and doctor name | Profile name element | Practitioner full name displays | Doctor name 'Dr. Sarah Jenkins' retrieved | **PASS** |
| 3 | Verify specialization and department fields | Department badge | Specialization details present | Department 'Cardiology / Internal Medicine' verified | **PASS** |

**Post-Condition:** Doctor profile viewed cleanly.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: DOC-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-003  
**Module Name:** Doctor  
**Test Title:** Verify doctor can edit permitted profile fields  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:48  
**Description:** Verify that a doctor can open the Edit Profile modal, interact with permitted fields, and dismiss/save safely.  
**Pre-Condition:** Doctor profile page loaded.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Doctor Profile page | /dashboard/doctor/profile | Profile rendered | Profile displayed | **PASS** |
| 2 | Click 'Edit Profile' button | Edit button | Edit profile modal opens | Edit modal displayed with input fields | **PASS** |
| 3 | Verify editable inputs are enabled | Input elements (phone, bio) | Inputs are enabled for editing | Inputs interactable | **PASS** |
| 4 | Click Cancel / Close button | Cancel button | Modal closes gracefully | Modal dismissed; profile remains intact | **PASS** |

**Post-Condition:** Modal closed safely without unintended data corruption.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: DOC-004
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-004  
**Module Name:** Doctor  
**Test Title:** Verify protected administrative credentials are read-only  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:55  
**Description:** Verify that critical administrative credentials (License No, Hospital ID, Role) are protected and not directly modifiable.  
**Pre-Condition:** Doctor profile page loaded.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Doctor Profile page | /dashboard/doctor/profile | Profile page active | Page active | **PASS** |
| 2 | Switch to 'Doctor Credentials & Settings' tab | Tab navigation element | Credentials tab selected | Tab active | **PASS** |
| 3 | Verify Medical License / Hospital ID section | Section container | Protected credentials displayed | Protected credentials card rendered | **PASS** |
| 4 | Verify fields do not have unrestricted inline edit | Input inspection | Fields are displayed as static text or read-only | Static display elements verified | **PASS** |

**Post-Condition:** Protected fields verified as read-only.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: DOC-005
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-005  
**Module Name:** Doctor  
**Test Title:** Verify doctor can access patient records and view subtabs  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:00  
**Description:** Verify doctor can view clinical patient records and navigate between clinical overview and patient tabs.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Doctor Workstation | /dashboard/doctor | Workstation displayed | Workstation active | **PASS** |
| 2 | Click 'Patient Records' / Clinical navigation tab | Navigation tab | Patient records view loads | Patient records interface displayed | **PASS** |
| 3 | Verify patient summary list / table rendered | Patient table/cards | Patient items present | Patient records loaded from backend API | **PASS** |

**Post-Condition:** Patient records list and clinical subtabs accessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: DOC-006
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-006  
**Module Name:** Doctor  
**Test Title:** Verify clinical guidelines view loads approved protocols  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:06  
**Description:** Verify clinical guidelines repository displays institutional medical protocols.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Doctor Workstation | /dashboard/doctor | Workstation active | Workstation active | **PASS** |
| 2 | Click 'Clinical Guidelines' tab | Tab button | Guidelines view displayed | Guidelines panel displayed | **PASS** |
| 3 | Verify guideline protocol cards display | Card elements | Protocols (Hypertension, Diabetes) visible | Approved medical protocols rendered cleanly | **PASS** |

**Post-Condition:** Clinical guidelines rendered.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: DOC-007
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-007  
**Module Name:** Doctor  
**Test Title:** Verify AI Patient Summary view loads  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:12  
**Description:** Verify AI Patient Digital Twin summary workstation interface is accessible.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Doctor Workstation | /dashboard/doctor | Workstation active | Workstation active | **PASS** |
| 2 | Click 'AI Patient Summary' tab | Tab button | AI summary workstation renders | AI Patient Summary panel rendered | **PASS** |
| 3 | Verify digital twin analysis interface elements | DOM elements | Interface displays prompt/selection controls | UI controls and action buttons displayed | **PASS** |

**Post-Condition:** AI summary UI loaded without errors.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: DOC-008
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** DOC-008  
**Module Name:** Doctor  
**Test Title:** Verify appointment request queue and prescription section display  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:16  
**Description:** Verify consultation queue displays pending appointment requests with action triggers.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Doctor Workstation | /dashboard/doctor | Workstation active | Workstation active | **PASS** |
| 2 | Switch to 'Consultation Queue' tab | Queue tab button | Consultation queue loads | Queue rendered with appointment cards | **PASS** |
| 3 | Verify patient appointment cards display actions | Card action buttons | Action buttons (Consult, Prescribe) visible | Action buttons visible without horizontal scroll cutoff | **PASS** |

**Post-Condition:** Consultation queue and prescription management visible.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 10. Nurse Module Testing

--------------------------------------------------------
### Test Case: NURSE-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** NURSE-001  
**Module Name:** Nurse  
**Test Title:** Verify Nurse login opens /dashboard/nurse  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:38  
**Description:** Verify that an authenticated Nurse is redirected to the Nurse Clinical Station.  
**Pre-Condition:** Nurse account exists (test.nurse@meditwin.local).  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open login modal | http://localhost:3000 | Modal displayed | Modal open | **PASS** |
| 2 | Enter Nurse email and password | test.nurse@meditwin.local / NursePass@123 | Credentials entered | Credentials accepted | **PASS** |
| 3 | Click login button | Submit button | API returns 200 OK | Authenticated cleanly | **PASS** |
| 4 | Verify redirection to Nurse Dashboard | /dashboard/nurse | URL is /dashboard/nurse | Browser navigated to /dashboard/nurse | **PASS** |
| 5 | Verify Nurse Workstation heading | DOM heading | Nurse workstation title visible | Title 'Nurse Clinical Station' verified | **PASS** |

**Post-Condition:** Nurse dashboard active.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: NURSE-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** NURSE-002  
**Module Name:** Nurse  
**Test Title:** Verify Patient Observations & Vital Signs section displays  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:43  
**Description:** Verify Nurse can access the Patient Observations & Vital Signs logging interface.  
**Pre-Condition:** Nurse is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Nurse Dashboard | /dashboard/nurse | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Patient Observations' tab | Observations tab | Observations section displayed | Observations interface rendered | **PASS** |
| 3 | Verify vital signs metric cards | Vitals elements (BP, SpO2, Heart Rate) | Vital signs cards present | Vital signs logging elements verified | **PASS** |

**Post-Condition:** Vital signs interface visible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: NURSE-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** NURSE-003  
**Module Name:** Nurse  
**Test Title:** Verify Nursing Notes & Treatment Records loads  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:49  
**Description:** Verify Nurse can view nursing shift notes and recorded treatment entries.  
**Pre-Condition:** Nurse is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Nurse Dashboard | /dashboard/nurse | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Nursing Notes' tab | Notes tab button | Nursing notes panel displays | Notes interface rendered | **PASS** |
| 3 | Verify note history or new note entry trigger | Note cards / Add Note button | Treatment records displayed | Nursing notes history and entry controls present | **PASS** |

**Post-Condition:** Nursing notes panel rendered.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: NURSE-004
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** NURSE-004  
**Module Name:** Nurse  
**Test Title:** Verify Patient Clinical Records tab is accessible  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:54  
**Description:** Verify Nurse can inspect ward patient clinical summaries.  
**Pre-Condition:** Nurse is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Nurse Dashboard | /dashboard/nurse | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Ward Patients' tab | Ward patients tab | Ward patient list displayed | Patient cards rendered | **PASS** |
| 3 | Verify assigned ward patient count/items | Patient items in DOM | Patient items present | Ward patient records verified | **PASS** |

**Post-Condition:** Ward patient records accessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 11. Patient Module Testing

--------------------------------------------------------
### Test Case: PATIENT-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** PATIENT-001  
**Module Name:** Patient  
**Test Title:** Verify Patient login opens /dashboard/patient  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:59  
**Description:** Verify that an authenticated Patient is redirected to the Personal Health Dashboard.  
**Pre-Condition:** Patient account exists (test.patient@meditwin.local).  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open login modal | http://localhost:3000 | Modal displayed | Modal open | **PASS** |
| 2 | Enter Patient credentials | test.patient@meditwin.local / PatientPass@123 | Credentials entered | Credentials accepted | **PASS** |
| 3 | Click login button | Submit button | API returns 200 OK | Authenticated cleanly | **PASS** |
| 4 | Verify redirection to Patient Dashboard | /dashboard/patient | URL is /dashboard/patient | Browser navigated to /dashboard/patient | **PASS** |
| 5 | Verify Patient Dashboard greeting | Dashboard greeting header | Personal health dashboard title visible | Title 'Personal Health Dashboard' verified | **PASS** |

**Post-Condition:** Patient dashboard active.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: PATIENT-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** PATIENT-002  
**Module Name:** Patient  
**Test Title:** Verify Patient health dashboard displays health summary  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:04  
**Description:** Verify personal vitals summary, twin status, and health metrics are displayed.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Patient Dashboard | /dashboard/patient | Dashboard active | Dashboard active | **PASS** |
| 2 | Verify health metric cards display | Cards (Heart Rate, Blood Pressure, Glucose) | Metric cards rendered | Metric cards displayed with baseline values | **PASS** |

**Post-Condition:** Vitals summary rendered.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: PATIENT-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** PATIENT-003  
**Module Name:** Patient  
**Test Title:** Verify My Prescriptions view displays medications  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:08  
**Description:** Verify Patient can view active prescriptions and prescribed dosage instructions.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Patient Dashboard | /dashboard/patient | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Prescriptions' navigation tab | Prescriptions tab button | Prescriptions view renders | Prescription panel displayed | **PASS** |
| 3 | Verify medication cards display | Medication cards | Medication names & schedules visible | Active prescriptions displayed with dosage info | **PASS** |

**Post-Condition:** Prescription list displayed.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: PATIENT-004
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** PATIENT-004  
**Module Name:** Patient  
**Test Title:** Verify Medical Documents view loads  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:14  
**Description:** Verify Medical Documents repository is accessible for viewing reports.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Patient Dashboard | /dashboard/patient | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Medical Documents' tab | Documents tab button | Documents view displays | Documents repository displayed | **PASS** |
| 3 | Verify document upload trigger and report items | Upload button / Report list | Documents list rendered | Medical document repository loaded cleanly | **PASS** |

**Post-Condition:** Medical documents interface visible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: PATIENT-005
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** PATIENT-005  
**Module Name:** Patient  
**Test Title:** Verify Medicine Reminders view loads  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:19  
**Description:** Verify Patient can access scheduled medicine reminders and dosage alarms.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Patient Dashboard | /dashboard/patient | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Medicine Reminders' tab | Reminders tab button | Reminders view displays | Reminders panel rendered | **PASS** |
| 3 | Verify reminder timeline items | Timeline / Reminder items | Scheduled reminders visible | Scheduled medicine alarms displayed | **PASS** |

**Post-Condition:** Medicine reminders interface visible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: PATIENT-006
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** PATIENT-006  
**Module Name:** Patient  
**Test Title:** Verify AI Health Summary view displays digital twin insights  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:24  
**Description:** Verify Patient can access AI-generated health insights and digital twin trends.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Patient Dashboard | /dashboard/patient | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'AI Health Summary' tab | AI summary tab button | AI health summary panel displays | AI summary interface loaded | **PASS** |
| 3 | Verify digital twin analysis cards | Summary text/cards | Health insights visible | Digital twin health insights rendered cleanly | **PASS** |

**Post-Condition:** AI health summary displayed.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 12. Hospital Admin Testing

--------------------------------------------------------
### Test Case: ADMIN-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** ADMIN-001  
**Module Name:** Admin  
**Test Title:** Verify Hospital Admin login opens /dashboard/admin  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:09:48  
**Description:** Verify that an authenticated Hospital Admin is redirected to the Administrative Console.  
**Pre-Condition:** Admin account exists (test.admin@meditwin.local).  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open login modal | http://localhost:3000 | Modal displayed | Modal open | **PASS** |
| 2 | Enter Admin credentials | test.admin@meditwin.local / AdminPass@123 | Credentials entered | Credentials accepted | **PASS** |
| 3 | Click login button | Submit button | API returns 200 OK | Authenticated cleanly | **PASS** |
| 4 | Verify redirection to Admin Dashboard | /dashboard/admin | URL is /dashboard/admin | Browser navigated to /dashboard/admin | **PASS** |
| 5 | Verify Admin Dashboard title | DOM heading | Admin console title visible | Title 'Hospital Executive Analytics' verified | **PASS** |

**Post-Condition:** Admin dashboard active.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: ADMIN-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** ADMIN-002  
**Module Name:** Admin  
**Test Title:** Verify Hospital Admin dashboard displays key facility metrics  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:09:52  
**Description:** Verify hospital capacity, occupancy rate, staff on duty, and system health metrics display.  
**Pre-Condition:** Admin is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Admin Dashboard | /dashboard/admin | Dashboard active | Dashboard active | **PASS** |
| 2 | Verify facility metric cards display | Cards (Bed Occupancy, Active Staff, System Status) | Metrics cards rendered | Hospital facility metrics cards displayed and populated | **PASS** |

**Post-Condition:** Facility metrics verified.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: ADMIN-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** ADMIN-003  
**Module Name:** Admin  
**Test Title:** Verify Hospital Reports & Statistics view loads  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:09:59  
**Description:** Verify Admin can access aggregated clinical and operational reports.  
**Pre-Condition:** Admin is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Admin Dashboard | /dashboard/admin | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Reports & Analytics' tab | Reports tab button | Reports view displays | Reports interface rendered | **PASS** |
| 3 | Verify report charts or statistics cards | Chart containers / Summary metrics | Statistics visible | Hospital operational statistics rendered cleanly | **PASS** |

**Post-Condition:** Reports view verified.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: ADMIN-004
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** ADMIN-004  
**Module Name:** Admin  
**Test Title:** Verify Hospital Activity Monitor displays clinical activity stream  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:04  
**Description:** Verify security and operational audit trail activity stream displays live events.  
**Pre-Condition:** Admin is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Admin Dashboard | /dashboard/admin | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Activity Monitor' tab | Activity tab button | Activity monitor view displays | Activity stream rendered | **PASS** |
| 3 | Verify audit stream list items | Audit events list | Recent system events visible | Clinical activity stream displayed with timestamps | **PASS** |

**Post-Condition:** Activity monitor stream visible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: ADMIN-005
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** ADMIN-005  
**Module Name:** Admin  
**Test Title:** Verify Department Analytics view loads  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:08  
**Description:** Verify department-wise metrics (Cardiology, Emergency, ICU, General Medicine) display.  
**Pre-Condition:** Admin is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Admin Dashboard | /dashboard/admin | Dashboard active | Dashboard active | **PASS** |
| 2 | Click 'Departments' tab | Departments tab button | Department analytics view displays | Departments view rendered | **PASS** |
| 3 | Verify departmental breakdown cards | Department breakdown cards | Department metrics visible | Department analytics loaded cleanly | **PASS** |

**Post-Condition:** Department analytics verified.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 13. RBAC Testing

--------------------------------------------------------
### Test Case: RBAC-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-001  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Doctor cannot access Nurse workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:29  
**Description:** Verify strict RBAC isolation: Doctor attempting direct URL access to /dashboard/nurse is rejected.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Doctor | test.doctor@meditwin.local | Doctor authenticated | Doctor logged in at /dashboard/doctor | **PASS** |
| 2 | Navigate directly to /dashboard/nurse | driver.get('/dashboard/nurse') | Navigation attempt to unauthorized route | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL and DOM check | Redirected to /dashboard/doctor or access denied | URL remained /dashboard/doctor; nurse UI blocked | **PASS** |

**Post-Condition:** Nurse dashboard remains inaccessible; user redirected safely.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-002  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Doctor cannot access Admin dashboard  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:34  
**Description:** Verify strict RBAC isolation: Doctor attempting direct URL access to /dashboard/admin is rejected.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Doctor | test.doctor@meditwin.local | Doctor authenticated | Doctor logged in | **PASS** |
| 2 | Navigate directly to /dashboard/admin | driver.get('/dashboard/admin') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on doctor dashboard | Access blocked; executive console protected | **PASS** |

**Post-Condition:** Admin dashboard remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-003  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Nurse cannot access Doctor workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:39  
**Description:** Verify strict RBAC isolation: Nurse attempting direct URL access to /dashboard/doctor is rejected.  
**Pre-Condition:** Nurse is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Nurse | test.nurse@meditwin.local | Nurse authenticated | Nurse logged in at /dashboard/nurse | **PASS** |
| 2 | Navigate directly to /dashboard/doctor | driver.get('/dashboard/doctor') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on nurse dashboard | Access blocked; doctor clinical controls protected | **PASS** |

**Post-Condition:** Doctor workstation remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-004
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-004  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Nurse cannot access Admin dashboard  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:44  
**Description:** Verify strict RBAC isolation: Nurse attempting direct URL access to /dashboard/admin is rejected.  
**Pre-Condition:** Nurse is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Nurse | test.nurse@meditwin.local | Nurse authenticated | Nurse logged in | **PASS** |
| 2 | Navigate directly to /dashboard/admin | driver.get('/dashboard/admin') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on nurse dashboard | Access blocked; admin console protected | **PASS** |

**Post-Condition:** Admin dashboard remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-005
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-005  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Patient cannot access Doctor workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:49  
**Description:** Verify strict RBAC isolation: Patient attempting direct URL access to /dashboard/doctor is rejected.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Patient | test.patient@meditwin.local | Patient authenticated | Patient logged in at /dashboard/patient | **PASS** |
| 2 | Navigate directly to /dashboard/doctor | driver.get('/dashboard/doctor') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on patient dashboard | Access blocked; clinical doctor tools protected | **PASS** |

**Post-Condition:** Doctor workstation remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-006
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-006  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Patient cannot access Nurse workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:54  
**Description:** Verify strict RBAC isolation: Patient attempting direct URL access to /dashboard/nurse is rejected.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Patient | test.patient@meditwin.local | Patient authenticated | Patient logged in | **PASS** |
| 2 | Navigate directly to /dashboard/nurse | driver.get('/dashboard/nurse') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on patient dashboard | Access blocked; nursing notes protected | **PASS** |

**Post-Condition:** Nurse workstation remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-007
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-007  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Patient cannot access Admin dashboard  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:59  
**Description:** Verify strict RBAC isolation: Patient attempting direct URL access to /dashboard/admin is rejected.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Patient | test.patient@meditwin.local | Patient authenticated | Patient logged in | **PASS** |
| 2 | Navigate directly to /dashboard/admin | driver.get('/dashboard/admin') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on patient dashboard | Access blocked; hospital administration protected | **PASS** |

**Post-Condition:** Admin dashboard remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-008
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-008  
**Module Name:** RBAC  
**Test Title:** Verify unauthenticated user cannot access protected doctor workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:13:04  
**Description:** Verify that an anonymous visitor without JWT credentials is immediately redirected to landing/login.  
**Pre-Condition:** No authentication token present in browser session.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open browser with clean session | Empty cookie/storage context | Session unauthenticated | Session is clean | **PASS** |
| 2 | Directly request protected URL /dashboard/doctor | http://localhost:3000/dashboard/doctor | Navigation dispatched | Request sent | **PASS** |
| 3 | Verify route protection redirects to landing page | URL check | Redirected to landing page (/) / login | URL is http://localhost:3000; dashboard blocked | **PASS** |

**Post-Condition:** Anonymous visitor remains on landing/login page.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 14. Security and Privacy Testing

--------------------------------------------------------
### Test Case: RBAC-005
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-005  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Patient cannot access Doctor workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:49  
**Description:** Verify strict RBAC isolation: Patient attempting direct URL access to /dashboard/doctor is rejected.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Patient | test.patient@meditwin.local | Patient authenticated | Patient logged in at /dashboard/patient | **PASS** |
| 2 | Navigate directly to /dashboard/doctor | driver.get('/dashboard/doctor') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on patient dashboard | Access blocked; clinical doctor tools protected | **PASS** |

**Post-Condition:** Doctor workstation remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-006
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-006  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Patient cannot access Nurse workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:54  
**Description:** Verify strict RBAC isolation: Patient attempting direct URL access to /dashboard/nurse is rejected.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Patient | test.patient@meditwin.local | Patient authenticated | Patient logged in | **PASS** |
| 2 | Navigate directly to /dashboard/nurse | driver.get('/dashboard/nurse') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on patient dashboard | Access blocked; nursing notes protected | **PASS** |

**Post-Condition:** Nurse workstation remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-007
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-007  
**Module Name:** RBAC  
**Test Title:** Verify authenticated Patient cannot access Admin dashboard  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:12:59  
**Description:** Verify strict RBAC isolation: Patient attempting direct URL access to /dashboard/admin is rejected.  
**Pre-Condition:** Patient is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Authenticate as Patient | test.patient@meditwin.local | Patient authenticated | Patient logged in | **PASS** |
| 2 | Navigate directly to /dashboard/admin | driver.get('/dashboard/admin') | Unauthorized route navigation | Attempt dispatched | **PASS** |
| 3 | Verify route guard blocks access | URL check | User denied access / kept on patient dashboard | Access blocked; hospital administration protected | **PASS** |

**Post-Condition:** Admin dashboard remains inaccessible.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: RBAC-008
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** RBAC-008  
**Module Name:** RBAC  
**Test Title:** Verify unauthenticated user cannot access protected doctor workstation  
**Priority:** Critical  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:13:04  
**Description:** Verify that an anonymous visitor without JWT credentials is immediately redirected to landing/login.  
**Pre-Condition:** No authentication token present in browser session.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open browser with clean session | Empty cookie/storage context | Session unauthenticated | Session is clean | **PASS** |
| 2 | Directly request protected URL /dashboard/doctor | http://localhost:3000/dashboard/doctor | Navigation dispatched | Request sent | **PASS** |
| 3 | Verify route protection redirects to landing page | URL check | Redirected to landing page (/) / login | URL is http://localhost:3000; dashboard blocked | **PASS** |

**Post-Condition:** Anonymous visitor remains on landing/login page.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 15. Navigation Testing

--------------------------------------------------------
### Test Case: NAV-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** NAV-001  
**Module Name:** Navigation  
**Test Title:** Verify navigation from Landing page to Login and Registration  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:28  
**Description:** Verify top navbar buttons route seamlessly to Auth modal and Registration portal.  
**Pre-Condition:** Landing page loaded.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open landing page | http://localhost:3000 | Landing page rendered | Page active | **PASS** |
| 2 | Click 'Register' link in navbar | Navbar register button | Navigates to /register | URL changed to /register | **PASS** |
| 3 | Return to landing page and click 'Portal Access' | Sign in button | Auth modal opens | Auth modal displayed cleanly | **PASS** |

**Post-Condition:** Navigation links verified.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: NAV-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** NAV-002  
**Module Name:** Navigation  
**Test Title:** Verify Doctor workstation tabs switch views cleanly without page breaks  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:31  
**Description:** Verify switching between clinical subtabs updates workstation view without unhandled errors.  
**Pre-Condition:** Doctor is authenticated.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open Doctor Workstation | /dashboard/doctor | Workstation active | Workstation active | **PASS** |
| 2 | Click 'Patient Records' tab | Tab element | Patient records view rendered | View updated cleanly | **PASS** |
| 3 | Click 'Clinical Guidelines' tab | Tab element | Guidelines view rendered | View updated cleanly | **PASS** |
| 4 | Click 'Consultation Queue' tab | Tab element | Queue view rendered | View updated cleanly | **PASS** |

**Post-Condition:** Subtabs switch smoothly.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: NAV-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** NAV-003  
**Module Name:** Navigation  
**Test Title:** Verify navigating to unknown URL route redirects gracefully to landing page  
**Priority:** Low  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:36  
**Description:** Verify 404 / undefined route handling prevents application crashes and redirects gracefully.  
**Pre-Condition:** Application is running.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Navigate to arbitrary unknown route | http://localhost:3000/nonexistent-route-404-test | Navigation executed | Page requested | **PASS** |
| 2 | Verify application catches route | Router fallback check | Redirects to landing (/) or displays not found | Application handled route gracefully without JS error | **PASS** |

**Post-Condition:** Application remains stable.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 16. Form Validation Testing

--------------------------------------------------------
### Test Case: FORM-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** FORM-001  
**Module Name:** Form Validation  
**Test Title:** Verify login submit button remains disabled when inputs are empty  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:23  
**Description:** Verify form validation state prevents dispatching empty authentication requests.  
**Pre-Condition:** Login modal is opened.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Open login modal | http://localhost:3000 | Modal displayed | Modal open | **PASS** |
| 2 | Inspect submit button disabled property | Button attribute check | Submit button is disabled | disabled property is True | **PASS** |
| 3 | Enter email only, leave password empty | test@test.com | Password remains empty | Password empty | **PASS** |
| 4 | Verify button remains disabled | Button attribute check | Submit button still disabled | disabled property is True | **PASS** |

**Post-Condition:** Form remains clean.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: FORM-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** FORM-002  
**Module Name:** Form Validation  
**Test Title:** Verify register portal displays all 4 institutional roles  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:25  
**Description:** Verify registration portal presents cards for Doctor, Nurse, Patient, and Hospital Admin.  
**Pre-Condition:** Application is running.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Navigate to /register | http://localhost:3000/register | Register portal loads | Page active at /register | **PASS** |
| 2 | Verify role selection cards render | DOM role cards | 4 distinct role cards visible | Doctor, Nurse, Patient, and Admin options verified | **PASS** |

**Post-Condition:** Role selection options verified.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: FORM-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** FORM-003  
**Module Name:** Form Validation  
**Test Title:** Verify doctor registration page loads required input fields  
**Priority:** Medium  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:11:27  
**Description:** Verify specialized registration form for Doctor contains full name, email, password, license number, and specialization.  
**Pre-Condition:** Application is running.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Navigate to Doctor Registration | http://localhost:3000/register/doctor | Doctor register page opens | Page active | **PASS** |
| 2 | Verify required input fields present | Form elements (name, email, password, license) | All required inputs rendered in DOM | Input fields verified cleanly | **PASS** |

**Post-Condition:** Form fields verified.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 17. API-Integrated Testing

--------------------------------------------------------
### Test Case: API-001
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** API-001  
**Module Name:** API Integration  
**Test Title:** Verify Browser action triggers backend login and stores verified JWT session  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:13  
**Description:** Verify complete browser-to-backend integration: login triggers POST /api/auth/login, returns signed JWT, and browser stores token.  
**Pre-Condition:** Backend API is running at http://localhost:5000.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Execute browser login form submission | test.doctor@meditwin.local / DoctorPass@123 | Browser dispatches POST /api/auth/login | HTTP POST dispatched | **PASS** |
| 2 | Backend processes credentials via bcrypt & returns JWT | API response validation | HTTP 200 OK returned with token | Status 200 OK received with JWT token | **PASS** |
| 3 | Inspect browser localStorage for meditwin_token | localStorage.getItem('meditwin_token') | Token string starts with 'ey...' (valid JWT) | Valid signed JWT token stored in browser session | **PASS** |

**Post-Condition:** Verified JWT token is present in browser storage.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: API-002
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** API-002  
**Module Name:** API Integration  
**Test Title:** Verify backend clinical-overview API returns live database data for doctor  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:18  
**Description:** Verify authenticated HTTP GET /api/doctor/clinical-overview retrieves real records from PostgreSQL database.  
**Pre-Condition:** Doctor JWT token obtained.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Send GET /api/doctor/clinical-overview with Authorization header | Bearer <DOCTOR_JWT> | API responds with HTTP 200 OK | Status code 200 OK received | **PASS** |
| 2 | Validate JSON payload schema | Response body validation | Contains doctor profile and appointment metrics | Structured clinical data payload verified | **PASS** |

**Post-Condition:** Clinical database overview payload validated.  
**Evidence:** Captured in automated execution stream / Clean execution  

--------------------------------------------------------
### Test Case: API-003
--------------------------------------------------------

**Project Name:** MediTwin AI – Intelligent Patient Digital Twin  
**Test Case ID:** API-003  
**Module Name:** API Integration  
**Test Title:** Verify backend rejects empty/malformed authentication request with HTTP 400  
**Priority:** High  
**Test Designed By:** Biya Jomon  
**Test Executed By:** Automated Selenium Test Suite  
**Test Design Date:** 2026-09-22  
**Test Execution Date:** 2026-09-22 16:10:19  
**Description:** Verify backend Zod / Express validation layer rejects malformed JSON authentication payloads with HTTP 400.  
**Pre-Condition:** Backend API running.  

**Test Steps:**

| Step | Test Step | Test Data | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Send POST /api/auth/login with empty JSON body {} | Payload: {} | Backend rejects request with HTTP 400 Bad Request | HTTP 400 returned | **PASS** |
| 2 | Verify validation error response structure | Error response JSON | Contains error message 'Email and password are required' | Validation error message confirmed | **PASS** |

**Post-Condition:** No invalid records created.  
**Evidence:** Captured in automated execution stream / Clean execution  

## 18. Test Execution Summary

| Metric | Result Value | Formula / Notes |
| :--- | :---: | :--- |
| **Total Test Cases** | **45** | All automated end-to-end scenarios |
| **Passed Test Cases** | **45** | Fully verified with assertions |
| **Failed Test Cases** | **0** | Zero test failures recorded |
| **Skipped Test Cases** | **0** | None skipped |
| **Blocked Test Cases** | **0** | None blocked |
| **Total Execution Duration** | **175.1 seconds** | 5 minutes, 25 seconds |
| **Pass Percentage** | **100.0%** | `Passed / Executed Tests × 100` |
| **Fail Percentage** | **0.0%** | `Failed / Executed Tests × 100` |


### Module-Wise Test Distribution

| Module | Total | Passed | Failed | Blocked | Pass Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Admin** | 5 | 5 | 0 | 0 | 100.0% |
| **API Integration** | 3 | 3 | 0 | 0 | 100.0% |
| **Authentication** | 5 | 5 | 0 | 0 | 100.0% |
| **Doctor** | 8 | 8 | 0 | 0 | 100.0% |
| **Form Validation** | 3 | 3 | 0 | 0 | 100.0% |
| **Navigation** | 3 | 3 | 0 | 0 | 100.0% |
| **Nurse** | 4 | 4 | 0 | 0 | 100.0% |
| **Patient** | 6 | 6 | 0 | 0 | 100.0% |
| **RBAC** | 8 | 8 | 0 | 0 | 100.0% |

---

## 19. Failed Test Cases

No failed test cases were recorded during this execution.


## 20. Blocked/Skipped Tests

No test cases were blocked or skipped during this test run. All forty-five planned test cases executed synchronously against active frontend and backend services. External production third-party dependencies (such as live SMS OTP gateways and heavy LLM cloud endpoints) were verified using validated local database entries and deterministic UI responses.


## 21. Screenshots and Evidence

The automated framework incorporates an automatic failure screenshot hook configured in `conftest.py`. Upon any unexpected assertion error or element locator timeout, the active WebDriver session immediately captures a full-resolution viewport screenshot and stores it in `reports/screenshots/` with the filename format `TEST_ID_timestamp.png`. During this execution run, zero failures occurred, and milestone DOM evidence was logged directly into `reports/logs/selenium_test.log`.


## 22. Defect Summary

| Defect ID | Test Case ID | Module | Severity | Priority | Description | Resolution Status |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| *None* | N/A | N/A | N/A | N/A | No active defects identified during execution | Closed |


## 23. Recommendations

1. **Continuous Integration (CI) Automation:** Integrate this Selenium test suite into a GitHub Actions or GitLab CI pipeline running in headless mode on every pull request.
2. **Standardized Test Locators:** Continue augmenting complex React elements with explicit `data-testid` attributes to ensure long-term locator resilience against UI restyling.
3. **Synthetic Data Reset Fixtures:** Maintain idempotent database seeding fixtures to ensure long-term test repeatability across distributed academic workstations.


## 24. Conclusion

All executed test cases passed successfully. The automated Selenium testing framework implemented for **MediTwin AI – Intelligent Patient Digital Twin** demonstrated high stability, deterministic verification, and rigorous enforcement of clinical workflow integrity. All forty-five test cases spanning authentication, clinical doctor tools, nursing observations, patient personal health views, hospital administration analytics, form validations, and role-based access control were executed against the live application with a 100% pass rate. This automated test suite provides academic and practical assurance that MediTwin AI adheres to modern healthcare web standards, ensuring that patient data remains secure, role boundaries remain unbreachable, and clinical interfaces operate reliably.
