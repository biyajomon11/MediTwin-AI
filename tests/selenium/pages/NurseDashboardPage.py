from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class NurseDashboardPage(BasePage):
    PATH = "/dashboard/nurse"

    # Sidebar Navigation Items
    DASHBOARD_TAB = (By.XPATH, "//nav//button[contains(., 'Dashboard')]")
    OBSERVATIONS_TAB = (By.XPATH, "//nav//button[contains(., 'Patient Observations')]")
    NURSING_NOTES_TAB = (By.XPATH, "//nav//button[contains(., 'Nursing Notes')]")
    TREATMENT_PLANS_TAB = (By.XPATH, "//nav//button[contains(., 'Treatment Plans')]")
    CLINICAL_RECORDS_TAB = (By.XPATH, "//nav//button[contains(., 'Patient Clinical Records')]")
    PROFILE_TAB = (By.XPATH, "//nav//button[contains(., 'Profile')]")
    LOGOUT_BTN = (By.XPATH, "//button[contains(., 'Sign Out') or contains(., 'Logout')]")

    # Workstation Header
    WORKSTATION_TITLE = (By.XPATH, "//h1[contains(text(), 'Nurse')]")
    METRICS_CONTAINER = (By.XPATH, "//div[contains(@class, 'grid')]")
    ACCESS_DENIED_HEADER = (By.XPATH, "//h1[contains(text(), 'Access Denied')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_workstation_loaded(self) -> bool:
        return self.is_element_displayed(self.WORKSTATION_TITLE, timeout=10)

    def is_access_denied_displayed(self) -> bool:
        return self.is_element_displayed(self.ACCESS_DENIED_HEADER, timeout=6)

    def click_observations(self):
        self.safe_click(self.OBSERVATIONS_TAB)
        return self

    def click_nursing_notes(self):
        self.safe_click(self.NURSING_NOTES_TAB)
        return self

    def click_clinical_records(self):
        self.safe_click(self.CLINICAL_RECORDS_TAB)
        return self

    def click_profile(self):
        self.safe_click(self.PROFILE_TAB)
        return self

    def click_logout(self):
        self.safe_click(self.LOGOUT_BTN)
        return self
