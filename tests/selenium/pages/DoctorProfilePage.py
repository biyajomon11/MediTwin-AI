from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class DoctorProfilePage(BasePage):
    PATH = "/doctor/profile"

    # Profile Header & Identity
    DOCTOR_NAME_HEADER = (By.XPATH, "//h2 | //h1[contains(@class, 'font-black') or contains(@class, 'font-bold')]")
    DOCTOR_ROLE_BADGE = (By.XPATH, "//*[contains(text(), 'Physician') or contains(text(), 'Doctor')]")
    EDIT_PROFILE_BTN = (By.XPATH, "//button[contains(., 'Edit Profile')]")

    # Edit Profile Modal
    EDIT_MODAL = (By.XPATH, "//div[contains(., 'Edit Doctor Profile')]")
    EXPERIENCE_INPUT = (By.XPATH, "//input[@type='number']")
    PHONE_INPUT = (By.XPATH, "//input[@type='tel'] | //input[contains(@placeholder, 'phone') or contains(@placeholder, '+')]")
    SAVE_CHANGES_BTN = (By.XPATH, "//button[contains(., 'Save Changes')]")
    CANCEL_EDIT_BTN = (By.XPATH, "//button[contains(., 'Cancel')]")
    CREDENTIALS_TAB = (By.XPATH, "//button[contains(., 'Doctor Credentials')]")
    PROTECTED_CREDENTIALS_BOX = (By.XPATH, "//main//*[contains(text(), 'Professional Information') or contains(text(), 'Medical Registration Number')]")

    # Appointment Request Table
    APPOINTMENT_REQUEST_HEADER = (By.XPATH, "//h3[contains(text(), 'Appointment Request')]")
    REGISTERED_COUNT_BADGE = (By.XPATH, "//*[contains(text(), 'Registered')]")
    FIRST_PATIENT_NAME = (By.XPATH, "//div[contains(@class, 'grid-cols-12')]//span[contains(@class, 'font-semibold')]")
    COMPLETE_APPT_BTN = (By.XPATH, "//button[@title='Mark Completed']")
    CANCEL_APPT_BTN = (By.XPATH, "//button[@title='Cancel Appointment']")
    COMPLETED_STATUS_BADGE = (By.XPATH, "//span[contains(text(), 'Completed')]")

    # Patient Details & Prescription Section
    PATIENT_DETAILS_HEADER = (By.XPATH, "//h3[contains(text(), 'Patient Details')]")
    RECORDED_VITALS_GRID = (By.XPATH, "//*[contains(text(), 'Recorded Vitals')]")
    PRESCRIPTION_HEADER = (By.XPATH, "//span[contains(text(), 'Prescription')]")
    PRESCRIPTION_DETAILS_BTN = (By.XPATH, "//button[contains(., 'Details')]")
    PRESCRIPTION_MODAL_TITLE = (By.XPATH, "//h3[contains(text(), 'Prescription Details')]")
    CLOSE_PRESCRIPTION_MODAL = (By.XPATH, "//button[contains(., 'Close')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_profile_loaded(self) -> bool:
        return self.is_element_displayed(self.DOCTOR_NAME_HEADER, timeout=10)

    def get_doctor_name(self) -> str:
        return self.get_text(self.DOCTOR_NAME_HEADER)

    def click_edit_profile(self):
        self.safe_click(self.EDIT_PROFILE_BTN)
        return self

    def click_credentials_tab(self):
        self.safe_click(self.CREDENTIALS_TAB)
        return self

    def set_experience_years(self, years: int):
        self.safe_type(self.EXPERIENCE_INPUT, str(years))
        return self

    def save_profile_changes(self):
        self.safe_click(self.SAVE_CHANGES_BTN)
        return self

    def cancel_edit(self):
        self.safe_click(self.CANCEL_EDIT_BTN)
        return self

    def is_protected_section_displayed(self) -> bool:
        return self.is_element_displayed(self.PROTECTED_CREDENTIALS_BOX, timeout=5)

    def is_appointment_request_displayed(self) -> bool:
        return self.is_element_displayed(self.APPOINTMENT_REQUEST_HEADER, timeout=6)

    def is_prescription_section_displayed(self) -> bool:
        return self.is_element_displayed(self.PRESCRIPTION_HEADER, timeout=6)

    def click_prescription_details(self):
        self.safe_click(self.PRESCRIPTION_DETAILS_BTN)
        return self

    def is_prescription_modal_displayed(self) -> bool:
        return self.is_element_displayed(self.PRESCRIPTION_MODAL_TITLE, timeout=6)

    def close_prescription_modal(self):
        self.safe_click(self.CLOSE_PRESCRIPTION_MODAL)
        return self
