import json
import time
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, NoSuchElementException, StaleElementReferenceException
)
from tests.selenium.config import BASE_URL, EXPLICIT_WAIT

class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.base_url = BASE_URL
        self.wait = WebDriverWait(driver, EXPLICIT_WAIT)

    def navigate_to(self, path: str = ""):
        target = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        self.driver.get(target)
        self.wait_for_page_loaded()
        return self

    def wait_for_page_loaded(self):
        try:
            WebDriverWait(self.driver, 10).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except TimeoutException:
            pass

    def wait_for_url_contains(self, text: str, timeout: int = EXPLICIT_WAIT) -> bool:
        try:
            return WebDriverWait(self.driver, timeout).until(EC.url_contains(text))
        except TimeoutException:
            return False

    def wait_for_element_visible(self, locator, timeout: int = EXPLICIT_WAIT):
        return WebDriverWait(self.driver, timeout).until(
            EC.visibility_of_element_located(locator)
        )

    def wait_for_element_clickable(self, locator, timeout: int = EXPLICIT_WAIT):
        return WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable(locator)
        )

    def safe_click(self, locator, timeout: int = EXPLICIT_WAIT):
        elem = self.wait_for_element_clickable(locator, timeout)
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
        time.sleep(0.1)
        try:
            elem.click()
        except Exception:
            # Fallback to JavaScript click if intercepted by animation/glass backdrop
            self.driver.execute_script("arguments[0].click();", elem)
        return self

    def safe_type(self, locator, text: str, clear_first: bool = True, timeout: int = EXPLICIT_WAIT):
        elem = self.wait_for_element_visible(locator, timeout)
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
        if clear_first:
            elem.clear()
        elem.send_keys(text)
        return self

    def get_text(self, locator, timeout: int = EXPLICIT_WAIT) -> str:
        try:
            elem = self.wait_for_element_visible(locator, timeout)
            return elem.text.strip()
        except TimeoutException:
            return ""

    def is_element_displayed(self, locator, timeout: int = 4) -> bool:
        try:
            elem = WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(locator)
            )
            return elem.is_displayed()
        except (TimeoutException, NoSuchElementException):
            return False

    def get_current_url(self) -> str:
        return self.driver.current_url

    def clear_auth_storage(self):
        """Clears JWT and user session from localStorage and sessionStorage."""
        self.driver.execute_script("""
            localStorage.removeItem('meditwin_token');
            localStorage.removeItem('meditwin_user');
            sessionStorage.removeItem('meditwin_token');
            sessionStorage.removeItem('meditwin_user');
        """)

    def set_session_auth(self, role: str, email: str, token: str = "mock-jwt-test-token"):
        """Programmatically sets authentication storage for fast state initialization."""
        user_json = json.dumps({
            "userId": 999,
            "email": email,
            "role": role,
            "firstName": "Test",
            "lastName": role.capitalize(),
        })
        self.driver.execute_script(f"""
            localStorage.setItem('meditwin_token', '{token}');
            localStorage.setItem('meditwin_user', '{user_json}');
        """)
