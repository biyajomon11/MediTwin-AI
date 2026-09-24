from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class LandingPage(BasePage):
    PATH = "/"

    # Locators
    SIGN_IN_BTN = (By.XPATH, "//button[contains(., 'Login')] | //a[contains(@href, '/login')]")
    REGISTER_BTN = (By.XPATH, "//button[contains(., 'Get Started') or contains(., 'Register')] | //a[contains(@href, '/register')]")
    HERO_TITLE = (By.XPATH, "//h1")
    DOCTOR_CARD = (By.XPATH, "//*[contains(text(), 'Doctor') or contains(text(), 'Physician')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def click_sign_in(self):
        self.safe_click(self.SIGN_IN_BTN)
        return self

    def click_register(self):
        self.safe_click(self.REGISTER_BTN)
        return self
