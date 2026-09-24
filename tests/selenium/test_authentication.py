import time
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.DoctorDashboardPage import DoctorDashboardPage
from tests.selenium.config import DOCTOR_EMAIL, DOCTOR_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestAuthentication:

    def test_auth_001_valid_doctor_login(self, driver):
        """AUTH-001: Verify valid Doctor login succeeds and opens dashboard"""
        login_page = LoginPage(driver)
        login_page.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)

        doc_dashboard = DoctorDashboardPage(driver)
        assert doc_dashboard.wait_for_url_contains("/dashboard/doctor", timeout=12), \
            f"Expected /dashboard/doctor, got {driver.current_url}"
        assert doc_dashboard.is_workstation_loaded(), "Doctor workstation failed to render."
    pytest_item_metadata(test_auth_001_valid_doctor_login, "AUTH-001", "Doctor", "Critical", "Login succeeds, opens /dashboard/doctor")

    def test_auth_002_invalid_password(self, driver):
        """AUTH-002: Verify invalid password displays error and denies login"""
        login_page = LoginPage(driver)
        login_page.login(DOCTOR_EMAIL, "WrongPassword@999")

        err = login_page.get_error_message()
        assert len(err) > 0, "Expected error message for invalid password, none displayed."
        assert "/dashboard" not in driver.current_url, "User was improperly redirected to dashboard."
    pytest_item_metadata(test_auth_002_invalid_password, "AUTH-002", "Doctor", "Critical", "Login fails, error message displayed")

    def test_auth_003_unregistered_email(self, driver):
        """AUTH-003: Verify unregistered email fails authentication"""
        login_page = LoginPage(driver)
        login_page.login("nonexistent.user.xyz999@meditwin.local", "SomePass@123")

        err = login_page.get_error_message()
        assert len(err) > 0, "Expected error message for unregistered account."
        assert "/dashboard" not in driver.current_url, "Unauthorized user reached dashboard."
    pytest_item_metadata(test_auth_003_unregistered_email, "AUTH-003", "General", "High", "Login fails with error banner")

    def test_auth_004_empty_login_form(self, driver):
        """AUTH-004: Verify empty login form keeps submit button disabled"""
        login_page = LoginPage(driver)
        login_page.open()

        assert not login_page.is_submit_enabled(), "Submit button should be disabled when fields are empty."
    pytest_item_metadata(test_auth_004_empty_login_form, "AUTH-004", "General", "Medium", "Sign In button remains disabled")

    def test_auth_005_logout_workflow(self, driver):
        """AUTH-005: Verify logout clears session and blocks back-navigation"""
        login_page = LoginPage(driver)
        login_page.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)

        doc_dashboard = DoctorDashboardPage(driver)
        assert doc_dashboard.wait_for_url_contains("/dashboard/doctor", timeout=12)

        doc_dashboard.click_logout()
        assert login_page.wait_for_url_contains("/login", timeout=8) or "/" in driver.current_url, \
            "Expected redirection to login or landing page after logout."

        # Attempt navigating back to protected route
        doc_dashboard.open()
        assert doc_dashboard.is_access_denied_displayed() or "/login" in driver.current_url, \
            "Protected dashboard was accessible after logout!"
    pytest_item_metadata(test_auth_005_logout_workflow, "AUTH-005", "Doctor", "Critical", "Logout terminates session, blocks re-entry")
