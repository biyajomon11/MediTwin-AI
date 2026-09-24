from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class DoctorDashboardPage(BasePage):
    PATH = "/dashboard/doctor"

    # Sidebar Navigation Items
    DASHBOARD_TAB = (By.XPATH, "//nav//button[contains(., 'Dashboard')]")
    PATIENT_RECORDS_TAB = (By.XPATH, "//nav//button[contains(., 'Patient Records')]")
    AI_SUMMARIES_TAB = (By.XPATH, "//nav//button[contains(., 'AI Patient Summaries')]")
    GUIDELINES_TAB = (By.XPATH, "//nav//button[contains(., 'Clinical Guidelines')]")
    PROFILE_TAB = (By.XPATH, "//nav//button[contains(., 'Doctor Profile')]")
    LOGOUT_BTN = (By.XPATH, "//button[contains(., 'Sign Out') or contains(., 'Logout')]")

    # Header and Dashboard Elements
    WORKSTATION_TITLE = (By.XPATH, "//h1[contains(text(), 'Doctor Clinical Workstation')]")
    METRIC_CARDS = (By.XPATH, "//div[contains(@class, 'glass-card')]")
    ACCESS_DENIED_HEADER = (By.XPATH, "//h1[contains(text(), 'Access Denied')]")

    # Patient Records Subtabs
    SUBTAB_OVERVIEW = (By.XPATH, "//button[contains(., 'Overview')]")
    SUBTAB_LABS = (By.XPATH, "//button[contains(., 'Lab Reports')]")
    SUBTAB_APPOINTMENTS = (By.XPATH, "//button[contains(., 'Appointments')]")
    SUBTAB_PRESCRIPTIONS = (By.XPATH, "//button[contains(., 'Prescriptions')]")
    SUBTAB_NOTES = (By.XPATH, "//button[contains(., 'Clinical Notes')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_workstation_loaded(self) -> bool:
        return self.is_element_displayed(self.WORKSTATION_TITLE, timeout=10)

    def is_access_denied_displayed(self) -> bool:
        return self.is_element_displayed(self.ACCESS_DENIED_HEADER, timeout=6)

    def click_patient_records(self):
        self.safe_click(self.PATIENT_RECORDS_TAB)
        return self

    def click_ai_summaries(self):
        self.safe_click(self.AI_SUMMARIES_TAB)
        return self

    def click_guidelines(self):
        self.safe_click(self.GUIDELINES_TAB)
        return self

    def click_profile_tab(self):
        self.safe_click(self.PROFILE_TAB)
        return self

    def click_logout(self):
        self.safe_click(self.LOGOUT_BTN)
        return self
