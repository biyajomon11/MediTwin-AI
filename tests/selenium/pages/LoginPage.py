import time
from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class LoginPage(BasePage):
    PATH = "/login"

    # Robust Locators specifically inside the Login modal form
    EMAIL_INPUT = (By.XPATH, "//input[contains(@placeholder, 'meditwin.ai') or @id='email-address-or-username-*']")
    PASSWORD_INPUT = (By.XPATH, "//input[contains(@placeholder, 'meditwin.ai') or @id='email-address-or-username-*']/ancestor::form//input[@type='password']")
    REMEMBER_ME_CHECKBOX = (By.XPATH, "//input[contains(@placeholder, 'meditwin.ai') or @id='email-address-or-username-*']/ancestor::form//input[@type='checkbox']")
    SUBMIT_BUTTON = (By.XPATH, "//input[contains(@placeholder, 'meditwin.ai') or @id='email-address-or-username-*']/ancestor::form//button[@type='submit']")
    ERROR_ALERT = (By.XPATH, "//div[contains(@class, 'bg-rose-500')]//span | //p[contains(@class, 'text-rose-400')] | //div[contains(@class, 'text-rose-300')]")
    SUCCESS_ALERT = (By.XPATH, "//div[contains(@class, 'bg-emerald-500')]")
    REGISTER_LINK = (By.XPATH, "//button[contains(text(), 'Create Account')] | //a[contains(@href, '/register')]")

    def open(self):
        res = self.navigate_to(self.PATH)
        self.wait_for_element_visible(self.EMAIL_INPUT, timeout=8)
        return res

    def enter_email(self, email: str):
        self.safe_type(self.EMAIL_INPUT, email)
        return self

    def enter_password(self, password: str):
        self.safe_type(self.PASSWORD_INPUT, password)
        return self

    def toggle_remember_me(self, checked: bool = True):
        elem = self.wait_for_element_visible(self.REMEMBER_ME_CHECKBOX)
        if elem.is_selected() != checked:
            self.safe_click(self.REMEMBER_ME_CHECKBOX)
        return self

    def click_submit(self):
        self.safe_click(self.SUBMIT_BUTTON)
        return self

    def login(self, email: str, password: str, remember: bool = True):
        self.open()
        self.enter_email(email)
        self.enter_password(password)
        if not remember:
            self.toggle_remember_me(False)
        self.click_submit()
        time.sleep(1.2)
        return self

    def get_error_message(self) -> str:
        return self.get_text(self.ERROR_ALERT, timeout=5)

    def is_success_alert_displayed(self) -> bool:
        return self.is_element_displayed(self.SUCCESS_ALERT, timeout=6)

    def is_submit_enabled(self) -> bool:
        try:
            btn = self.wait_for_element_visible(self.SUBMIT_BUTTON, timeout=3)
            return btn.is_enabled()
        except Exception:
            return False
