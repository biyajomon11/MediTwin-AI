from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class AdminProfilePage(BasePage):
    PATH = "/dashboard/admin?tab=profile"

    # Profile Header & Identity
    PROFILE_HEADER = (By.XPATH, "//h1[contains(., 'John') or contains(., 'Rohith') or contains(., 'Admin') or contains(., 'Profile')]")
    ADMIN_ROLE_BADGE = (By.XPATH, "//*[contains(text(), 'Hospital Administrator') or contains(text(), 'ADMIN')]")
    ACTIVE_ACCOUNT_STATUS = (By.XPATH, "//*[contains(text(), 'Active Account')]")
    EDIT_PROFILE_BTN = (By.XPATH, "//button[contains(., 'Edit Profile')]")
    SIGN_OUT_BTN = (By.XPATH, "//button[contains(., 'Sign Out of Administrator Console') or contains(., 'Sign Out')]")

    # Cards
    ADMIN_INFO_CARD = (By.XPATH, "//*[contains(text(), 'Administrator Information')]")
    HOSPITAL_CARD = (By.XPATH, "//*[contains(text(), 'Hospital Information')]")
    ACCOUNT_CARD = (By.XPATH, "//*[contains(text(), 'Account & Security Overview')]")
    SECURITY_CARD = (By.XPATH, "//*[contains(text(), 'Security & Password')]")
    PREFERENCES_CARD = (By.XPATH, "//*[contains(text(), 'Notification Preferences')]")
    ACTIVITY_CARD = (By.XPATH, "//*[contains(text(), 'Recent Account Activity')]")

    # Edit Profile Modal
    EDIT_MODAL = (By.XPATH, "//div[contains(., 'Edit Administrator Profile')]")
    FIRST_NAME_INPUT = (By.XPATH, "//input[@type='text' and preceding-sibling::label[contains(., 'First Name')]]")
    LAST_NAME_INPUT = (By.XPATH, "//input[@type='text' and preceding-sibling::label[contains(., 'Last Name')]]")
    PHONE_INPUT = (By.XPATH, "//input[preceding-sibling::label[contains(., 'Contact Phone')]]")
    SAVE_PROFILE_BTN = (By.XPATH, "//button[contains(., 'Save Changes')]")
    CANCEL_EDIT_BTN = (By.XPATH, "//button[contains(., 'Cancel')]")

    # Password Change Section
    CURRENT_PASSWORD_INPUT = (By.XPATH, "//input[@placeholder='Enter current password']")
    NEW_PASSWORD_INPUT = (By.XPATH, "//input[@placeholder='At least 8 characters']")
    CONFIRM_PASSWORD_INPUT = (By.XPATH, "//input[@placeholder='Repeat new password']")
    UPDATE_PASSWORD_BTN = (By.XPATH, "//button[contains(., 'Update Password')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_profile_loaded(self) -> bool:
        return self.is_element_displayed(self.PROFILE_HEADER, timeout=10) or self.is_element_displayed(self.ADMIN_INFO_CARD, timeout=10)

    def is_active_account_displayed(self) -> bool:
        return self.is_element_displayed(self.ACTIVE_ACCOUNT_STATUS, timeout=5)

    def is_hospital_info_displayed(self) -> bool:
        return self.is_element_displayed(self.HOSPITAL_CARD, timeout=5)

    def is_preferences_displayed(self) -> bool:
        return self.is_element_displayed(self.PREFERENCES_CARD, timeout=5)

    def is_activity_displayed(self) -> bool:
        return self.is_element_displayed(self.ACTIVITY_CARD, timeout=5)

    def click_edit_profile(self):
        self.safe_click(self.EDIT_PROFILE_BTN)
        return self

    def cancel_profile_edit(self):
        self.safe_click(self.CANCEL_EDIT_BTN)
        return self

    def click_sign_out(self):
        self.safe_click(self.SIGN_OUT_BTN)
        return self
