from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class PatientDashboardPage(BasePage):
    PATH = "/dashboard/patient"

    # Sidebar Navigation Items
    DASHBOARD_TAB = (By.XPATH, "//nav//button[contains(., 'Health Dashboard')]")
    PROFILE_TAB = (By.XPATH, "//nav//button[contains(., 'Health Profile')]")
    MEDICAL_HISTORY_TAB = (By.XPATH, "//nav//button[contains(., 'Medical History')]")
    PRESCRIPTIONS_TAB = (By.XPATH, "//nav//button[contains(., 'Prescriptions')]")
    DOCUMENTS_TAB = (By.XPATH, "//nav//button[contains(., 'Medical Documents')]")
    REMINDERS_TAB = (By.XPATH, "//nav//button[contains(., 'Medicine Reminders')]")
    NOTIFICATIONS_TAB = (By.XPATH, "//nav//button[contains(., 'Notifications')]")
    APPOINTMENTS_TAB = (By.XPATH, "//nav//button[contains(., 'Appointments')]")
    AI_SUMMARY_TAB = (By.XPATH, "//nav//button[contains(., 'AI Health Summary')]")
    LOGOUT_BTN = (By.XPATH, "//button[contains(., 'Sign Out') or contains(., 'Logout')]")

    # Header and Dashboard Elements
    DASHBOARD_TITLE = (By.XPATH, "//h1[contains(text(), 'Health') or contains(text(), 'Patient')]")
    PRESCRIPTIONS_CONTAINER = (By.XPATH, "//*[contains(text(), 'Prescriptions') or contains(text(), 'Active Medications')]")
    APPOINTMENTS_CONTAINER = (By.ID, "patient-appointments-module")
    ACCESS_DENIED_HEADER = (By.XPATH, "//h1[contains(text(), 'Access Denied')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_dashboard_loaded(self) -> bool:
        return self.is_element_displayed(self.DASHBOARD_TITLE, timeout=10)

    def is_access_denied_displayed(self) -> bool:
        return self.is_element_displayed(self.ACCESS_DENIED_HEADER, timeout=6)

    def click_prescriptions(self):
        self.safe_click(self.PRESCRIPTIONS_TAB)
        return self

    def click_medical_history(self):
        self.safe_click(self.MEDICAL_HISTORY_TAB)
        return self

    def click_documents(self):
        self.safe_click(self.DOCUMENTS_TAB)
        return self

    def click_reminders(self):
        self.safe_click(self.REMINDERS_TAB)
        return self

    def click_ai_summary(self):
        self.safe_click(self.AI_SUMMARY_TAB)
        return self

    def click_appointments(self):
        self.safe_click(self.APPOINTMENTS_TAB)
        return self

    def click_logout(self):
        self.safe_click(self.LOGOUT_BTN)
        return self
