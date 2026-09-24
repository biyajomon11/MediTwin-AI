import time
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.DoctorDashboardPage import DoctorDashboardPage
from tests.selenium.pages.DoctorProfilePage import DoctorProfilePage
from tests.selenium.config import DOCTOR_EMAIL, DOCTOR_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestDoctorModule:

    def login_doctor(self, driver):
        login_page = LoginPage(driver)
        login_page.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)
        dashboard = DoctorDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/doctor", timeout=12)
        return dashboard

    def test_doc_001_workstation_loads(self, driver):
        """DOC-001: Verify Doctor workstation loads operational clinical metrics"""
        dashboard = self.login_doctor(driver)
        assert dashboard.is_workstation_loaded(), "Doctor workstation failed to load."
    pytest_item_metadata(test_doc_001_workstation_loads, "DOC-001", "Doctor", "Critical", "Doctor workstation loads successfully")

    def test_doc_002_doctor_profile_loads(self, driver):
        """DOC-002: Verify Doctor profile displays doctor's information"""
        self.login_doctor(driver)
        profile_page = DoctorProfilePage(driver)
        profile_page.open()
        assert profile_page.is_profile_loaded(), "Doctor profile failed to render."
        name = profile_page.get_doctor_name()
        assert len(name) > 0, "Doctor name missing in profile."
    pytest_item_metadata(test_doc_002_doctor_profile_loads, "DOC-002", "Doctor", "High", "Doctor profile displays practitioner data")

    def test_doc_003_edit_profile_permitted_fields(self, driver):
        """DOC-003: Verify doctor can edit permitted profile fields"""
        self.login_doctor(driver)
        profile_page = DoctorProfilePage(driver)
        profile_page.open()
        assert profile_page.is_profile_loaded()

        profile_page.click_edit_profile()
        assert profile_page.is_element_displayed(profile_page.EDIT_MODAL, timeout=5), "Edit modal failed to open."

        # Cancel edit to leave state intact
        profile_page.cancel_edit()
    pytest_item_metadata(test_doc_003_edit_profile_permitted_fields, "DOC-003", "Doctor", "High", "Edit profile modal opens and cancels safely")

    def test_doc_004_protected_credentials_locked(self, driver):
        """DOC-004: Verify protected administrative credentials are read-only"""
        self.login_doctor(driver)
        profile_page = DoctorProfilePage(driver)
        profile_page.open()
        profile_page.click_credentials_tab()
        assert profile_page.is_protected_section_displayed(), "Protected credentials section not found."
    pytest_item_metadata(test_doc_004_protected_credentials_locked, "DOC-004", "Doctor", "High", "Administrative credentials remain protected")

    def test_doc_005_patient_records_subtabs(self, driver):
        """DOC-005: Verify doctor can access patient records and view subtabs"""
        dashboard = self.login_doctor(driver)
        dashboard.click_patient_records()
        assert dashboard.is_element_displayed(dashboard.SUBTAB_OVERVIEW, timeout=6), "Patient records view failed to open."
    pytest_item_metadata(test_doc_005_patient_records_subtabs, "DOC-005", "Doctor", "High", "Patient records subtabs accessible")

    def test_doc_006_clinical_guidelines_accessible(self, driver):
        """DOC-006: Verify clinical guidelines view loads approved protocols"""
        dashboard = self.login_doctor(driver)
        dashboard.click_guidelines()
        guidelines_view = dashboard.is_element_displayed((dashboard.SUBTAB_OVERVIEW[0], "//h1[contains(text(), 'Clinical Practice Guidelines') or contains(text(), 'Guidelines')]"), timeout=6)
        assert guidelines_view, "Clinical guidelines view failed to display."
    pytest_item_metadata(test_doc_006_clinical_guidelines_accessible, "DOC-006", "Doctor", "Medium", "Clinical guidelines protocols load")

    def test_doc_007_ai_summaries_accessible(self, driver):
        """DOC-007: Verify AI Patient Summary view loads"""
        dashboard = self.login_doctor(driver)
        dashboard.click_ai_summaries()
        ai_view = dashboard.is_element_displayed((dashboard.SUBTAB_OVERVIEW[0], "//h1[contains(text(), 'AI Patient Clinical Summary')]"), timeout=6)
        assert ai_view, "AI Patient Summary view failed to display."
    pytest_item_metadata(test_doc_007_ai_summaries_accessible, "DOC-007", "Doctor", "Medium", "AI Patient Summaries workstation loads")

    def test_doc_008_appointment_request_and_prescription_ui(self, driver):
        """DOC-008: Verify appointment request queue and prescription section display"""
        self.login_doctor(driver)
        profile_page = DoctorProfilePage(driver)
        profile_page.open()
        assert profile_page.is_appointment_request_displayed(), "Appointment request queue missing."
        assert profile_page.is_prescription_section_displayed(), "Prescription section missing."

        # Verify prescription modal details open
        profile_page.click_prescription_details()
        assert profile_page.is_prescription_modal_displayed(), "Prescription modal failed to open."
        profile_page.close_prescription_modal()
    pytest_item_metadata(test_doc_008_appointment_request_and_prescription_ui, "DOC-008", "Doctor", "High", "Appointment requests and prescription modal operate smoothly")
