from selenium.webdriver.common.by import By
from tests.selenium.pages.BasePage import BasePage

class NurseProfilePage(BasePage):
    PATH = "/nurse/profile"

    # Profile Header & Identity
    NURSE_NAME_HEADER = (By.XPATH, "//h2 | //h1[contains(@class, 'font-extrabold') or contains(@class, 'font-bold')]")
    NURSE_ROLE_BADGE = (By.XPATH, "//*[contains(text(), 'Registered Nurse') or contains(text(), 'Staff Nurse')]")
    ACTIVE_ACCOUNT_STATUS = (By.XPATH, "//*[contains(text(), 'Active Account')]")
    EDIT_PROFILE_BTN = (By.XPATH, "//button[contains(., 'Edit Profile')]")
    CHANGE_PASSWORD_BTN = (By.XPATH, "//button[contains(., 'Change Password')]")
    SIGN_OUT_BTN = (By.XPATH, "//button[contains(., 'Sign Out')]")

    # Professional & Hospital Info Cards
    PROFESSIONAL_INFO_CARD = (By.XPATH, "//*[contains(text(), 'Professional Information')]")
    HOSPITAL_CARD = (By.XPATH, "//*[contains(text(), 'Hospital & Department')]")
    ACCOUNT_CARD = (By.XPATH, "//*[contains(text(), 'Account Information')]")
    SECURITY_CARD = (By.XPATH, "//*[contains(text(), 'Security & Authentication')]")
    PREFERENCES_CARD = (By.XPATH, "//*[contains(text(), 'Clinical Notification Preferences')]")
    REMINDERS_CARD = (By.XPATH, "//*[contains(text(), 'Clinical Reminders & Tasks')]")
    ACTIVITY_CARD = (By.XPATH, "//*[contains(text(), 'Recent Account Activity')]")

    # Edit Profile Modal
    EDIT_MODAL = (By.XPATH, "//div[contains(., 'Edit Professional Contact Details')]")
    FIRST_NAME_INPUT = (By.XPATH, "//input[@type='text' and (contains(@placeholder, 'First') or @name='firstName')]")
    LAST_NAME_INPUT = (By.XPATH, "//input[@type='text' and (contains(@placeholder, 'Last') or @name='lastName')]")
    PHONE_INPUT = (By.XPATH, "//input[@type='tel' or contains(@placeholder, 'phone') or contains(@placeholder, '+')]")
    SAVE_PROFILE_BTN = (By.XPATH, "//button[contains(., 'Save Changes')]")
    CANCEL_EDIT_BTN = (By.XPATH, "//button[contains(., 'Cancel')]")

    # Change Password Modal
    PASSWORD_MODAL = (By.XPATH, "//div[contains(., 'Change Account Password')]")
    CURRENT_PASSWORD_INPUT = (By.XPATH, "//input[contains(@placeholder, 'current password')]")
    NEW_PASSWORD_INPUT = (By.XPATH, "//input[contains(@placeholder, 'minimum 8 characters') or contains(@placeholder, 'new password')]")
    CONFIRM_PASSWORD_INPUT = (By.XPATH, "//input[contains(@placeholder, 're-enter') or contains(@placeholder, 'confirm new password')]")
    UPDATE_PASSWORD_BTN = (By.XPATH, "//button[contains(., 'Update Password')]")
    CANCEL_PASSWORD_BTN = (By.XPATH, "//button[contains(., 'Cancel')]")

    def open(self):
        return self.navigate_to(self.PATH)

    def is_profile_loaded(self) -> bool:
        return self.is_element_displayed(self.NURSE_NAME_HEADER, timeout=10)

    def get_nurse_name(self) -> str:
        return self.get_text(self.NURSE_NAME_HEADER)

    def is_active_account_displayed(self) -> bool:
        return self.is_element_displayed(self.ACTIVE_ACCOUNT_STATUS, timeout=5)

    def click_edit_profile(self):
        self.safe_click(self.EDIT_PROFILE_BTN)
        return self

    def click_change_password(self):
        self.safe_click(self.CHANGE_PASSWORD_BTN)
        return self

    def set_phone(self, phone: str):
        self.safe_type(self.PHONE_INPUT, phone)
        return self

    def save_profile_changes(self):
        self.safe_click(self.SAVE_PROFILE_BTN)
        return self

    def cancel_profile_edit(self):
        self.safe_click(self.CANCEL_EDIT_BTN)
        return self

    def is_reminders_card_displayed(self) -> bool:
        return self.is_element_displayed(self.REMINDERS_CARD, timeout=5)

    def is_activity_card_displayed(self) -> bool:
        return self.is_element_displayed(self.ACTIVITY_CARD, timeout=5)

    def is_preferences_card_displayed(self) -> bool:
        return self.is_element_displayed(self.PREFERENCES_CARD, timeout=5)

    def click_sign_out(self):
        self.safe_click(self.SIGN_OUT_BTN)
        return self
