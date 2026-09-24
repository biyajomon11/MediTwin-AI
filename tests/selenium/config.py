import os
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
TESTS_DIR = ROOT_DIR / "tests" / "selenium"
REPORTS_DIR = ROOT_DIR / "reports"
SCREENSHOTS_DIR = REPORTS_DIR / "screenshots"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Environment configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
HEADLESS = os.getenv("HEADLESS", "true").lower() in ("true", "1", "yes")
BROWSER = os.getenv("BROWSER", "chrome").lower()
WINDOW_WIDTH = int(os.getenv("WINDOW_WIDTH", "1920"))
WINDOW_HEIGHT = int(os.getenv("WINDOW_HEIGHT", "1080"))
EXPLICIT_WAIT = int(os.getenv("EXPLICIT_WAIT", "12"))

# Dedicated synthetic test accounts for repeatable testing
DOCTOR_EMAIL = os.getenv("TEST_DOCTOR_EMAIL", "test.doctor@meditwin.local")
DOCTOR_PASSWORD = os.getenv("TEST_DOCTOR_PASSWORD", "DoctorPass@123")

NURSE_EMAIL = os.getenv("TEST_NURSE_EMAIL", "test.nurse@meditwin.local")
NURSE_PASSWORD = os.getenv("TEST_NURSE_PASSWORD", "NursePass@123")

PATIENT_EMAIL = os.getenv("TEST_PATIENT_EMAIL", "test.patient@meditwin.local")
PATIENT_PASSWORD = os.getenv("TEST_PATIENT_PASSWORD", "PatientPass@123")

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "test.admin@meditwin.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "AdminPass@123")
