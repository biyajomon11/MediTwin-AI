import time
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.NurseDashboardPage import NurseDashboardPage
from tests.selenium.pages.NurseProfilePage import NurseProfilePage
from tests.selenium.config import NURSE_EMAIL, NURSE_PASSWORD, DOCTOR_EMAIL, DOCTOR_PASSWORD, PATIENT_EMAIL, PATIENT_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestNurseProfileModule:

    def login_nurse(self, driver):
        login_page = LoginPage(driver)
        login_page.login(NURSE_EMAIL, NURSE_PASSWORD)
        dashboard = NurseDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/nurse", timeout=12)
        return dashboard

    def test_nurse_profile_001_open_profile(self, driver):
        """NURSE-PROFILE-E2E-001: Login as Nurse -> Open Profile via sidebar"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        assert profile_page.is_profile_loaded(), "Nurse Profile page failed to render."
    pytest_item_metadata(test_nurse_profile_001_open_profile, "NURSE-PROFILE-E2E-001", "Nurse", "Critical", "Nurse Profile page opens from sidebar")

    def test_nurse_profile_002_info_displayed(self, driver):
        """NURSE-PROFILE-E2E-002: Profile information and active status displayed"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        assert profile_page.is_profile_loaded(), "Profile header not visible"
        assert profile_page.is_active_account_displayed(), "Active Account status badge not displayed"
    pytest_item_metadata(test_nurse_profile_002_info_displayed, "NURSE-PROFILE-E2E-002", "Nurse", "High", "Nurse professional information and active status display")

    def test_nurse_profile_003_edit_modal_open_cancel(self, driver):
        """NURSE-PROFILE-E2E-003 & 004: Open edit profile modal and cancel edit"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        profile_page.click_edit_profile()
        assert profile_page.is_element_displayed(profile_page.EDIT_MODAL, timeout=5), "Edit modal failed to open"
        profile_page.cancel_profile_edit()
        time.sleep(0.5)
    pytest_item_metadata(test_nurse_profile_003_edit_modal_open_cancel, "NURSE-PROFILE-E2E-003", "Nurse", "High", "Edit profile modal opens and cancels cleanly")

    def test_nurse_profile_005_protected_fields_readonly(self, driver):
        """NURSE-PROFILE-E2E-005: Protected fields are read-only and not editable in modal"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        profile_page.click_edit_profile()
        # Verify protected inputs (role, nurseId, hospitalId, departmentId) are not present as text inputs in the modal
        role_inputs = driver.find_elements(profile_page.EDIT_MODAL[0], "//input[@name='role' or @name='hospitalId' or @name='nurseId']")
        assert len(role_inputs) == 0, "Protected fields must not be editable in edit profile form"
        profile_page.cancel_profile_edit()
    pytest_item_metadata(test_nurse_profile_005_protected_fields_readonly, "NURSE-PROFILE-E2E-005", "Nurse", "Critical", "Protected fields have no edit controls")

    def test_nurse_profile_006_password_modal_open_cancel(self, driver):
        """NURSE-PROFILE-E2E-006: Open change password modal and verify inputs"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        profile_page.click_change_password()
        assert profile_page.is_element_displayed(profile_page.PASSWORD_MODAL, timeout=5), "Change password modal not displayed"
        profile_page.safe_click(profile_page.CANCEL_PASSWORD_BTN)
    pytest_item_metadata(test_nurse_profile_006_password_modal_open_cancel, "NURSE-PROFILE-E2E-006", "Nurse", "High", "Password change modal operates securely")

    def test_nurse_profile_007_preferences_displayed(self, driver):
        """NURSE-PROFILE-E2E-007: Clinical notification preferences section displayed"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        assert profile_page.is_preferences_card_displayed(), "Preferences section missing"
    pytest_item_metadata(test_nurse_profile_007_preferences_displayed, "NURSE-PROFILE-E2E-007", "Nurse", "Medium", "Notification preferences card displays")

    def test_nurse_profile_008_reminders_summary_displayed(self, driver):
        """NURSE-PROFILE-E2E-008: Clinical reminders summary card displayed"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        assert profile_page.is_reminders_card_displayed(), "Reminders summary card missing"
    pytest_item_metadata(test_nurse_profile_008_reminders_summary_displayed, "NURSE-PROFILE-E2E-008", "Nurse", "Medium", "Reminders summary card displays")

    def test_nurse_profile_009_recent_activity_displayed(self, driver):
        """NURSE-PROFILE-E2E-009: Recent account activity card displayed"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        assert profile_page.is_activity_card_displayed(), "Recent activity card missing"
    pytest_item_metadata(test_nurse_profile_009_recent_activity_displayed, "NURSE-PROFILE-E2E-009", "Nurse", "Medium", "Recent activity audit log card displays")

    def test_nurse_profile_010_logout_works(self, driver):
        """NURSE-PROFILE-E2E-010: Logout button clears session and redirects to /login"""
        dashboard = self.login_nurse(driver)
        dashboard.click_profile()
        profile_page = NurseProfilePage(driver)
        profile_page.click_sign_out()
        profile_page.wait_for_url_contains("/login", timeout=8)
        assert "/login" in driver.current_url, "Sign out failed to redirect to /login"
    pytest_item_metadata(test_nurse_profile_010_logout_works, "NURSE-PROFILE-E2E-010", "Nurse", "Critical", "Logout clears authenticated state and redirects")

    def test_nurse_profile_011_doctor_cannot_access_nurse_profile(self, driver):
        """NURSE-PROFILE-E2E-011: Doctor role cannot access /nurse/profile directly"""
        login_page = LoginPage(driver)
        login_page.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)
        dashboard = NurseDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/doctor", timeout=12)
        driver.get(driver.current_url.split('/dashboard')[0] + "/nurse/profile")
        time.sleep(2)
        # Doctor either redirected away or gets access denied
        assert "/nurse/profile" not in driver.current_url or driver.find_elements("xpath", "//*[contains(text(), 'Access Denied') or contains(text(), 'Unauthorized')]"), "Doctor should not view Nurse profile"
    pytest_item_metadata(test_nurse_profile_011_doctor_cannot_access_nurse_profile, "NURSE-PROFILE-E2E-011", "Doctor", "Critical", "Doctor blocked from Nurse profile")
