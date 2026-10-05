from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class AdminDashboardPage(BasePage):
    PATH = "/dashboard/admin"

    # Sidebar Navigation Items
    DASHBOARD_TAB = (By.XPATH, "//nav//button[contains(., 'Admin Dashboard')]")
    NOTIFICATIONS_TAB = (By.XPATH, "//nav//button[contains(., 'Hospital Notifications')]")
    REPORTS_TAB = (By.XPATH, "//nav//button[contains(., 'Reports')]")
    ACTIVITIES_TAB = (By.XPATH, "//nav//button[contains(., 'Activity Monitor')]")
    DEPARTMENTS_TAB = (By.XPATH, "//nav//button[contains(., 'Department Analytics')]")
    PROFILE_TAB = (By.XPATH, "//nav//button[contains(., 'Administrator Profile') or contains(., 'Profile')]")
    LOGOUT_BTN = (By.XPATH, "//button[contains(., 'Sign Out') or contains(., 'Logout')]")

    # Header and Dashboard Elements
    ADMIN_TITLE = (By.XPATH, "//h1[contains(text(), 'Hospital Executive Analytics') or contains(text(), 'Administrator') or contains(text(), 'Admin')]")
    REPORTS_CONTAINER = (By.XPATH, "//*[contains(text(), 'Hospital Overview') or contains(text(), 'Demographic')]")
    ACTIVITIES_CONTAINER = (By.XPATH, "//*[contains(text(), 'Activity Monitor') or contains(text(), 'Audit')]")
    ACCESS_DENIED_HEADER = (By.XPATH, "//h1[contains(text(), 'Access Denied')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_dashboard_loaded(self) -> bool:
        return self.is_element_displayed(self.ADMIN_TITLE, timeout=10)

    def is_access_denied_displayed(self) -> bool:
        return self.is_element_displayed(self.ACCESS_DENIED_HEADER, timeout=6)

    def click_reports(self):
        self.safe_click(self.REPORTS_TAB)
        return self

    def click_activities(self):
        self.safe_click(self.ACTIVITIES_TAB)
        return self

    def click_departments(self):
        self.safe_click(self.DEPARTMENTS_TAB)
        return self

    def click_profile(self):
        self.safe_click(self.PROFILE_TAB)
        return self

    def click_logout(self):
        self.safe_click(self.LOGOUT_BTN)
        return self
