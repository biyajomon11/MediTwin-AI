import requests
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.DoctorDashboardPage import DoctorDashboardPage
from tests.selenium.config import BACKEND_URL, DOCTOR_EMAIL, DOCTOR_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestApiIntegration:

    def test_api_001_browser_to_backend_jwt_flow(self, driver):
        """API-001: Verify Browser action triggers backend login and stores verified JWT session"""
        login = LoginPage(driver)
        login.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)

        dash = DoctorDashboardPage(driver)
        assert dash.wait_for_url_contains("/dashboard/doctor", timeout=12)

        # Inspect browser localStorage for real JWT token
        token = driver.execute_script("return localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');")
        assert token and len(token) > 20, "JWT token not found in browser storage."

        # Verify user object stored with verified role
        user_raw = driver.execute_script("return localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');")
        assert user_raw and "doctor" in user_raw.lower(), "User session role not saved in browser storage."
    pytest_item_metadata(test_api_001_browser_to_backend_jwt_flow, "API-001", "Doctor", "High", "Browser login persists verified JWT token and session")

    def test_api_002_clinical_overview_endpoint(self, driver):
        """API-002: Verify backend clinical-overview API returns live database data for doctor"""
        # Obtain JWT
        auth_res = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": DOCTOR_EMAIL, "password": DOCTOR_PASSWORD}, timeout=5)
        assert auth_res.status_code == 200, f"Auth failed with status {auth_res.status_code}"
        token = auth_res.json()["token"]

        # Request clinical overview
        overview_res = requests.get(
            f"{BACKEND_URL}/api/doctor/clinical-overview",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert overview_res.status_code == 200, f"Expected 200, got {overview_res.status_code}"
        data = overview_res.json().get("data", {})
        assert "doctor" in data, "Doctor object missing in clinical overview response."
        assert "appointmentRequests" in data, "Appointment requests missing in response."
    pytest_item_metadata(test_api_002_clinical_overview_endpoint, "API-002", "Doctor", "High", "Backend returns 200 with structured clinical overview")

    def test_api_003_backend_validation_error_scenario(self, driver):
        """API-003: Verify backend rejects empty/malformed authentication request with HTTP 400"""
        res = requests.post(f"{BACKEND_URL}/api/auth/login", json={}, timeout=5)
        assert res.status_code == 400, f"Expected 400 Validation Error, got {res.status_code}"
        json_data = res.json()
        assert not json_data.get("success"), "Backend returned success on empty payload."
    pytest_item_metadata(test_api_003_backend_validation_error_scenario, "API-003", "Security", "High", "Backend validates inputs and returns HTTP 400")
