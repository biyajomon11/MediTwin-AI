# MediTwin AI – Automated Selenium Testing Framework

This directory contains the automated end-to-end testing suite for the **MediTwin AI** intelligent healthcare web application using **Selenium WebDriver**, **Python**, and **Pytest**.

The tests validate the actual running application in real browser instances across authentication, role-based access control (RBAC), clinical modules (Doctor, Nurse, Patient, Hospital Admin), form validation, and API-integrated workflows.

---

## 1. Directory Structure

```
tests/selenium/
├── config.py                     # Environment variables, URLs, browser timeouts, test credentials
├── conftest.py                   # WebDriver fixtures, failure screenshot hooks, HTML report customization
├── pages/                        # Page Object Model (POM) layer
│   ├── BasePage.py               # Core interactions, explicit waits, storage management
│   ├── LandingPage.py            # Landing & marketing portal
│   ├── LoginPage.py              # Login form, credentials validation, notifications
│   ├── DoctorDashboardPage.py    # Doctor clinical workstation & subnavigation
│   ├── DoctorProfilePage.py      # Doctor profile, edit modals, appointment request queue
│   ├── NurseDashboardPage.py     # Nurse observation cards, nursing notes, vitals entry
│   ├── PatientDashboardPage.py   # Patient vitals, prescriptions, documents, reminders
│   ├── AdminDashboardPage.py     # Hospital overview, statistics, activity monitor
│   └── RegistrationPages.py      # Registration forms for Doctor, Nurse, Patient, Admin
├── utils/
│   ├── test_data_manager.py      # Idempotent database account verification & provisioning
│   └── report_generator.py       # Custom Markdown, PDF, and JSON report generator
├── test_authentication.py        # AUTH-001 through AUTH-005
├── test_doctor.py                # DOC-001 through DOC-008
├── test_nurse.py                 # NURSE-001 through NURSE-004
├── test_patient.py               # PATIENT-001 through PATIENT-006
├── test_admin.py                 # ADMIN-001 through ADMIN-005
├── test_rbac.py                  # RBAC-001 through RBAC-008 (Security Boundaries)
├── test_navigation.py            # NAV-001 through NAV-003
├── test_form_validation.py       # FORM-001 through FORM-003
└── test_api_integration.py       # API-001 through API-003
reports/
├── selenium_report.html          # Interactive Pytest HTML execution report
├── MediTwin_AI_Selenium_Test_Report.md  # Detailed human-readable Markdown test report
├── MediTwin_AI_Selenium_Test_Report.pdf # Formatted PDF report
├── test_results.json             # Machine-readable test execution dataset
└── screenshots/                  # Failure and milestone screenshots (TEST_ID_timestamp.png)
```

---

## 2. Prerequisites & Installation

Ensure the following are installed:
- **Python 3.10+** (Python 3.14 recommended)
- **Google Chrome** or Chromium browser
- **MediTwin AI Services** running:
  - Frontend: `http://localhost:3000` (`npm run dev`)
  - Backend: `http://localhost:5000` (`npm run dev` in `backend/`)

Install Python test dependencies:
```bash
pip install -r requirements.txt
```

---

## 3. Configuration & Environment Variables

The framework reads from environment variables with safe development defaults defined in `tests/selenium/config.py`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `BASE_URL` | `http://localhost:3000` | URL of the frontend Vite application |
| `BACKEND_URL` | `http://localhost:5000` | URL of the Express/PostgreSQL API |
| `HEADLESS` | `true` | Set to `false` to watch tests execute in visible browser window |
| `BROWSER` | `chrome` | Target browser engine |
| `EXPLICIT_WAIT` | `12` | Default explicit wait timeout in seconds |
| `TEST_DOCTOR_EMAIL` | `test.doctor@meditwin.local` | Test doctor account email |
| `TEST_DOCTOR_PASSWORD` | `DoctorPass@123` | Test doctor account password |
| `TEST_NURSE_EMAIL` | `test.nurse@meditwin.local` | Test nurse account email |
| `TEST_NURSE_PASSWORD` | `NursePass@123` | Test nurse account password |
| `TEST_PATIENT_EMAIL` | `test.patient@meditwin.local` | Test patient account email |
| `TEST_PATIENT_PASSWORD` | `PatientPass@123` | Test patient account password |
| `TEST_ADMIN_EMAIL` | `test.admin@meditwin.local` | Test admin account email |
| `TEST_ADMIN_PASSWORD` | `AdminPass@123` | Test admin account password |

---

## 4. Test Execution Commands

### Run Entire Test Suite with Reports
```bash
python -m pytest tests/selenium -v --html=reports/selenium_report.html --self-contained-html
```

### Run with Visible Browser (Non-Headless)
In PowerShell:
```powershell
$env:HEADLESS="false"; python -m pytest tests/selenium -v
```

In Bash:
```bash
HEADLESS=false python -m pytest tests/selenium -v
```

### Run Specific Test Suites

- **Authentication Only (`AUTH-001` - `AUTH-005`)**:
  ```bash
  python -m pytest tests/selenium/test_authentication.py -v
  ```

- **Doctor Module (`DOC-001` - `DOC-008`)**:
  ```bash
  python -m pytest tests/selenium/test_doctor.py -v
  ```

- **Nurse Module (`NURSE-001` - `NURSE-004`)**:
  ```bash
  python -m pytest tests/selenium/test_nurse.py -v
  ```

- **Patient Module (`PATIENT-001` - `PATIENT-006`)**:
  ```bash
  python -m pytest tests/selenium/test_patient.py -v
  ```

- **Hospital Admin Module (`ADMIN-001` - `ADMIN-005`)**:
  ```bash
  python -m pytest tests/selenium/test_admin.py -v
  ```

- **Role-Based Access Control (`RBAC-001` - `RBAC-008`)**:
  ```bash
  python -m pytest tests/selenium/test_rbac.py -v
  ```

- **API Integration (`API-001` - `API-003`)**:
  ```bash
  python -m pytest tests/selenium/test_api_integration.py -v
  ```

---

## 5. Automated Reports & Screenshots

Upon execution, the framework automatically generates 4 output artifacts in the `reports/` folder:

1. **`reports/selenium_report.html`**: Interactive HTML report showing test durations, metadata, and embedded screenshots.
2. **`reports/MediTwin_AI_Selenium_Test_Report.md`**: Detailed executive summary and module breakdown in standard GitHub-flavored Markdown.
3. **`reports/MediTwin_AI_Selenium_Test_Report.pdf`**: Styled executive report ready for management review.
4. **`reports/test_results.json`**: Machine-readable JSON summary for CI/CD metrics.
5. **`reports/screenshots/`**: Full-page screenshots automatically captured on test failure (`{TEST_ID}_{timestamp}.png`).
