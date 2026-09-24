import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.RegistrationPages import RegistrationPage, DoctorRegisterPage

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestFormValidation:

    def test_form_001_login_required_fields(self, driver):
        """FORM-001: Verify login submit button remains disabled when inputs are empty"""
        login = LoginPage(driver)
        login.open()
        assert not login.is_submit_enabled(), "Sign In button should be disabled when empty."

        # Enter only email
        login.enter_email("test@example.com")
        assert not login.is_submit_enabled(), "Sign In button should remain disabled without password."

        # Enter password
        login.enter_password("Secret123")
        assert login.is_submit_enabled(), "Sign In button should enable when both fields are populated."
    pytest_item_metadata(test_form_001_login_required_fields, "FORM-001", "General", "High", "Submit button enforces required credentials")

    def test_form_002_role_selection_cards(self, driver):
        """FORM-002: Verify register portal displays all 4 institutional roles"""
        reg = RegistrationPage(driver)
        reg.open()
        assert reg.is_element_displayed(reg.DOCTOR_CARD), "Doctor registration card missing."
        assert reg.is_element_displayed(reg.NURSE_CARD), "Nurse registration card missing."
        assert reg.is_element_displayed(reg.PATIENT_CARD), "Patient registration card missing."
        assert reg.is_element_displayed(reg.ADMIN_CARD), "Admin registration card missing."
    pytest_item_metadata(test_form_002_role_selection_cards, "FORM-002", "General", "High", "All 4 role registration pathways accessible")

    def test_form_003_doctor_registration_fields(self, driver):
        """FORM-003: Verify doctor registration page loads required input fields"""
        doc_reg = DoctorRegisterPage(driver)
        doc_reg.open()
        assert doc_reg.is_element_displayed(doc_reg.FIRST_NAME_INPUT), "Doctor first name input missing."
        assert doc_reg.is_element_displayed(doc_reg.EMAIL_INPUT), "Doctor email input missing."
        assert doc_reg.is_element_displayed(doc_reg.PASSWORD_INPUT), "Doctor password input missing."
    pytest_item_metadata(test_form_003_doctor_registration_fields, "FORM-003", "Doctor", "Medium", "Doctor registration form rendered with inputs")
