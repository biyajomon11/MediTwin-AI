import time
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.DoctorDashboardPage import DoctorDashboardPage
from tests.selenium.pages.NurseDashboardPage import NurseDashboardPage
from tests.selenium.pages.PatientDashboardPage import PatientDashboardPage
from tests.selenium.pages.AdminDashboardPage import AdminDashboardPage
from tests.selenium.config import (
    DOCTOR_EMAIL, DOCTOR_PASSWORD,
    NURSE_EMAIL, NURSE_PASSWORD,
    PATIENT_EMAIL, PATIENT_PASSWORD,
)

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestRoleBasedAccessControl:

    def test_rbac_001_doctor_cannot_access_nurse(self, driver):
        """RBAC-001: Verify authenticated Doctor cannot access Nurse workstation"""
        login_page = LoginPage(driver)
        login_page.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)
        doc_dash = DoctorDashboardPage(driver)
        doc_dash.wait_for_url_contains("/dashboard/doctor", timeout=12)

        # Attempt navigating to nurse dashboard
        nurse_dash = NurseDashboardPage(driver)
        nurse_dash.open()
        assert nurse_dash.is_access_denied_displayed(), "Doctor was improperly permitted into Nurse workstation."
    pytest_item_metadata(test_rbac_001_doctor_cannot_access_nurse, "RBAC-001", "Security", "Critical", "Access Denied rendered for unauthorized role")

    def test_rbac_002_doctor_cannot_access_admin(self, driver):
        """RBAC-002: Verify authenticated Doctor cannot access Admin dashboard"""
        login_page = LoginPage(driver)
        login_page.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)
        doc_dash = DoctorDashboardPage(driver)
        doc_dash.wait_for_url_contains("/dashboard/doctor", timeout=12)

        admin_dash = AdminDashboardPage(driver)
        admin_dash.open()
        assert admin_dash.is_access_denied_displayed(), "Doctor was improperly permitted into Admin dashboard."
    pytest_item_metadata(test_rbac_002_doctor_cannot_access_admin, "RBAC-002", "Security", "Critical", "Access Denied rendered for unauthorized role")

    def test_rbac_003_nurse_cannot_access_doctor(self, driver):
        """RBAC-003: Verify authenticated Nurse cannot access Doctor workstation"""
        login_page = LoginPage(driver)
        login_page.login(NURSE_EMAIL, NURSE_PASSWORD)
        nurse_dash = NurseDashboardPage(driver)
        nurse_dash.wait_for_url_contains("/dashboard/nurse", timeout=12)

        doc_dash = DoctorDashboardPage(driver)
        doc_dash.open()
        assert doc_dash.is_access_denied_displayed(), "Nurse was improperly permitted into Doctor workstation."
    pytest_item_metadata(test_rbac_003_nurse_cannot_access_doctor, "RBAC-003", "Security", "Critical", "Access Denied rendered for unauthorized role")

    def test_rbac_004_nurse_cannot_access_admin(self, driver):
        """RBAC-004: Verify authenticated Nurse cannot access Admin dashboard"""
        login_page = LoginPage(driver)
        login_page.login(NURSE_EMAIL, NURSE_PASSWORD)
        nurse_dash = NurseDashboardPage(driver)
        nurse_dash.wait_for_url_contains("/dashboard/nurse", timeout=12)

        admin_dash = AdminDashboardPage(driver)
        admin_dash.open()
        assert admin_dash.is_access_denied_displayed(), "Nurse was improperly permitted into Admin dashboard."
    pytest_item_metadata(test_rbac_004_nurse_cannot_access_admin, "RBAC-004", "Security", "Critical", "Access Denied rendered for unauthorized role")

    def test_rbac_005_patient_cannot_access_doctor(self, driver):
        """RBAC-005: Verify authenticated Patient cannot access Doctor workstation"""
        login_page = LoginPage(driver)
        login_page.login(PATIENT_EMAIL, PATIENT_PASSWORD)
        pat_dash = PatientDashboardPage(driver)
        pat_dash.wait_for_url_contains("/dashboard/patient", timeout=12)

        doc_dash = DoctorDashboardPage(driver)
        doc_dash.open()
        assert doc_dash.is_access_denied_displayed(), "Patient was improperly permitted into Doctor workstation."
    pytest_item_metadata(test_rbac_005_patient_cannot_access_doctor, "RBAC-005", "Security", "Critical", "Access Denied rendered for unauthorized role")

    def test_rbac_006_patient_cannot_access_nurse(self, driver):
        """RBAC-006: Verify authenticated Patient cannot access Nurse workstation"""
        login_page = LoginPage(driver)
        login_page.login(PATIENT_EMAIL, PATIENT_PASSWORD)
        pat_dash = PatientDashboardPage(driver)
        pat_dash.wait_for_url_contains("/dashboard/patient", timeout=12)

        nurse_dash = NurseDashboardPage(driver)
        nurse_dash.open()
        assert nurse_dash.is_access_denied_displayed(), "Patient was improperly permitted into Nurse workstation."
    pytest_item_metadata(test_rbac_006_patient_cannot_access_nurse, "RBAC-006", "Security", "Critical", "Access Denied rendered for unauthorized role")

    def test_rbac_007_patient_cannot_access_admin(self, driver):
        """RBAC-007: Verify authenticated Patient cannot access Admin dashboard"""
        login_page = LoginPage(driver)
        login_page.login(PATIENT_EMAIL, PATIENT_PASSWORD)
        pat_dash = PatientDashboardPage(driver)
        pat_dash.wait_for_url_contains("/dashboard/patient", timeout=12)

        admin_dash = AdminDashboardPage(driver)
        admin_dash.open()
        assert admin_dash.is_access_denied_displayed(), "Patient was improperly permitted into Admin dashboard."
    pytest_item_metadata(test_rbac_007_patient_cannot_access_admin, "RBAC-007", "Security", "Critical", "Access Denied rendered for unauthorized role")

    def test_rbac_008_unauthenticated_user_blocked(self, driver):
        """RBAC-008: Verify unauthenticated user cannot access protected doctor workstation"""
        doc_dash = DoctorDashboardPage(driver)
        doc_dash.open()
        # Should show Access Denied or redirect to login
        assert doc_dash.is_access_denied_displayed() or "/login" in driver.current_url, \
            "Unauthenticated user was allowed into protected workstation without restriction."
    pytest_item_metadata(test_rbac_008_unauthenticated_user_blocked, "RBAC-008", "Security", "Critical", "Unauthenticated user blocked from protected routes")
