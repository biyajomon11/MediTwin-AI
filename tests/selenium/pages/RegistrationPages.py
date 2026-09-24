from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class RegistrationPage(BasePage):
    PATH = "/register"

    DOCTOR_CARD = (By.XPATH, "//a[contains(@href, '/register/doctor') or contains(@href, '/doctor-register')]")
    NURSE_CARD = (By.XPATH, "//a[contains(@href, '/register/nurse') or contains(@href, '/nurse-register')]")
    PATIENT_CARD = (By.XPATH, "//a[contains(@href, '/register/patient') or contains(@href, '/patient-register')]")
    ADMIN_CARD = (By.XPATH, "//a[contains(@href, '/register/admin') or contains(@href, '/admin-register')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_role_selection_displayed(self) -> bool:
        return self.is_element_displayed(self.DOCTOR_CARD, timeout=5)


class DoctorRegisterPage(BasePage):
    PATH = "/register/doctor"

    FIRST_NAME_INPUT = (By.CSS_SELECTOR, "input[name='fullName'], input[name='firstName'], input[placeholder*='name' i]")
    LAST_NAME_INPUT = (By.CSS_SELECTOR, "input[name='lastName'], input[placeholder*='last' i]")
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email'], input[name='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[name='password']")
    SUBMIT_BTN = (By.CSS_SELECTOR, "button[type='submit']")

    def open(self):
        return self.navigate_to(self.PATH)

    def fill_form(self, first: str, last: str, email: str, password: str):
        if first:
            self.safe_type(self.FIRST_NAME_INPUT, first)
        if last:
            self.safe_type(self.LAST_NAME_INPUT, last)
        if email:
            self.safe_type(self.EMAIL_INPUT, email)
        if password:
            self.safe_type(self.PASSWORD_INPUT, password)
        return self

    def is_submit_enabled(self) -> bool:
        btn = self.wait_for_element_visible(self.SUBMIT_BTN)
        return btn.is_enabled()
