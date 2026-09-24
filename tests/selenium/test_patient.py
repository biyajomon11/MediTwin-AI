import time
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.PatientDashboardPage import PatientDashboardPage
from tests.selenium.config import PATIENT_EMAIL, PATIENT_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestPatientModule:

    def login_patient(self, driver):
        login_page = LoginPage(driver)
        login_page.login(PATIENT_EMAIL, PATIENT_PASSWORD)
        dashboard = PatientDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/patient", timeout=12)
        return dashboard

    def test_patient_001_login(self, driver):
        """PATIENT-001: Verify Patient login opens /dashboard/patient"""
        dashboard = self.login_patient(driver)
        assert dashboard.is_dashboard_loaded(), "Patient dashboard failed to load."
    pytest_item_metadata(test_patient_001_login, "PATIENT-001", "Patient", "Critical", "Patient login redirects to /dashboard/patient")

    def test_patient_002_health_profile_loads(self, driver):
        """PATIENT-002: Verify Patient health dashboard displays health summary"""
        dashboard = self.login_patient(driver)
        assert dashboard.is_element_displayed(dashboard.DASHBOARD_TITLE, timeout=6), "Health dashboard not visible."
    pytest_item_metadata(test_patient_002_health_profile_loads, "PATIENT-002", "Patient", "High", "Patient health profile view displays")

    def test_patient_003_prescriptions_view(self, driver):
        """PATIENT-003: Verify My Prescriptions view displays medications"""
        dashboard = self.login_patient(driver)
        dashboard.click_prescriptions()
        rx_view = dashboard.is_element_displayed((dashboard.DASHBOARD_TITLE[0], "//main//*[contains(text(), 'Prescription') or contains(text(), 'Medication')]"), timeout=6)
        assert rx_view, "Prescriptions view failed to display."
    pytest_item_metadata(test_patient_003_prescriptions_view, "PATIENT-003", "Patient", "High", "Prescriptions view displays medications")

    def test_patient_004_medical_documents_view(self, driver):
        """PATIENT-004: Verify Medical Documents view loads"""
        dashboard = self.login_patient(driver)
        dashboard.click_documents()
        docs_view = dashboard.is_element_displayed((dashboard.DASHBOARD_TITLE[0], "//main//*[contains(text(), 'Document') or contains(text(), 'Lab')]"), timeout=6)
        assert docs_view, "Medical documents view failed to display."
    pytest_item_metadata(test_patient_004_medical_documents_view, "PATIENT-004", "Patient", "Medium", "Medical documents tab loads")

    def test_patient_005_medicine_reminders(self, driver):
        """PATIENT-005: Verify Medicine Reminders view loads"""
        dashboard = self.login_patient(driver)
        dashboard.click_reminders()
        rem_view = dashboard.is_element_displayed((dashboard.DASHBOARD_TITLE[0], "//main//*[contains(text(), 'Reminder') or contains(text(), 'Schedule')]"), timeout=6)
        assert rem_view, "Medicine reminders view failed to display."
    pytest_item_metadata(test_patient_005_medicine_reminders, "PATIENT-005", "Patient", "Medium", "Medicine reminders view loads")

    def test_patient_006_ai_health_summary(self, driver):
        """PATIENT-006: Verify AI Health Summary view displays digital twin insights"""
        dashboard = self.login_patient(driver)
        dashboard.click_ai_summary()
        ai_view = dashboard.is_element_displayed((dashboard.DASHBOARD_TITLE[0], "//main//*[contains(text(), 'AI') or contains(text(), 'Twin') or contains(text(), 'Summary')]"), timeout=6)
        assert ai_view, "AI Health Summary view failed to display."
    pytest_item_metadata(test_patient_006_ai_health_summary, "PATIENT-006", "Patient", "Medium", "AI Health Summary view loads")
