import time
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.NurseDashboardPage import NurseDashboardPage
from tests.selenium.config import NURSE_EMAIL, NURSE_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestNurseModule:

    def login_nurse(self, driver):
        login_page = LoginPage(driver)
        login_page.login(NURSE_EMAIL, NURSE_PASSWORD)
        dashboard = NurseDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/nurse", timeout=12)
        return dashboard

    def test_nurse_001_login(self, driver):
        """NURSE-001: Verify Nurse login opens /dashboard/nurse"""
        dashboard = self.login_nurse(driver)
        assert dashboard.is_workstation_loaded(), "Nurse workstation failed to load."
    pytest_item_metadata(test_nurse_001_login, "NURSE-001", "Nurse", "Critical", "Nurse login redirects to /dashboard/nurse")

    def test_nurse_002_observations_loads(self, driver):
        """NURSE-002: Verify Patient Observations & Vital Signs section displays"""
        dashboard = self.login_nurse(driver)
        dashboard.click_observations()
        obs_view = dashboard.is_element_displayed((dashboard.WORKSTATION_TITLE[0], "//main//*[contains(text(), 'Observation') or contains(text(), 'Vital')]"), timeout=6)
        assert obs_view, "Observations view failed to render."
    pytest_item_metadata(test_nurse_002_observations_loads, "NURSE-002", "Nurse", "High", "Nurse observations and vitals render")

    def test_nurse_003_nursing_notes_loads(self, driver):
        """NURSE-003: Verify Nursing Notes & Treatment Records loads"""
        dashboard = self.login_nurse(driver)
        dashboard.click_nursing_notes()
        notes_view = dashboard.is_element_displayed((dashboard.WORKSTATION_TITLE[0], "//main//*[contains(text(), 'Nursing Notes') or contains(text(), 'Treatment')]"), timeout=6)
        assert notes_view, "Nursing notes view failed to render."
    pytest_item_metadata(test_nurse_003_nursing_notes_loads, "NURSE-003", "Nurse", "High", "Nursing notes & treatment records load")

    def test_nurse_004_clinical_records_nav(self, driver):
        """NURSE-004: Verify Patient Clinical Records tab is accessible"""
        dashboard = self.login_nurse(driver)
        dashboard.click_clinical_records()
        records_view = dashboard.is_element_displayed((dashboard.WORKSTATION_TITLE[0], "//main//*[contains(text(), 'Clinical Records') or contains(text(), 'Patient') or contains(text(), 'Medical History')]"), timeout=6)
        assert records_view, "Clinical records view failed to render."
    pytest_item_metadata(test_nurse_004_clinical_records_nav, "NURSE-004", "Nurse", "Medium", "Clinical records subnavigation loads")
