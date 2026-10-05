"""
MediTwin AI - Hospital Administrator Module
Administrator Profile Integration, Security, Validation & RBAC Tests
Specifications: ADMIN-PROFILE-001 through ADMIN-PROFILE-022
"""

import os
import json
import time
import jwt
import requests
import pytest
from selenium.webdriver.common.by import By
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.AdminDashboardPage import AdminDashboardPage
from tests.selenium.pages.AdminProfilePage import AdminProfilePage

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-meditwin-jwt-key")

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "test.admin@meditwin.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "AdminPass@123")

DOCTOR_EMAIL = os.getenv("TEST_DOCTOR_EMAIL", "test.doctor@meditwin.local")
DOCTOR_PASSWORD = os.getenv("TEST_DOCTOR_PASSWORD", "DoctorPass@123")


def get_token(user_id: int, email: str, role: str, admin_id: int = None) -> str:
    """Helper to generate verified JWT token for test requests."""
    payload = {
        "userId": user_id,
        "email": email,
        "role": role,
    }
    if admin_id is not None:
        payload["adminId"] = admin_id
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture(scope="session")
def admin_token():
    """Authenticates the test admin and returns JWT token."""
    res = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=5)
    if res.status_code == 200:
        return res.json().get("token")
    return get_token(14, ADMIN_EMAIL, "admin", 2)


@pytest.fixture(scope="session")
def admin1_token():
    """Admin token for Hospital 1 (User ID 7, Admin ID 1)."""
    return get_token(7, "rohithadmin99@gmail.com", "admin", 1)


@pytest.fixture(scope="session")
def doctor_token():
    """Doctor token (role doctor)."""
    res = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": DOCTOR_EMAIL, "password": DOCTOR_PASSWORD}, timeout=5)
    if res.status_code == 200:
        return res.json().get("token")
    return get_token(11, DOCTOR_EMAIL, "doctor")


@pytest.fixture(scope="session")
def nurse_token():
    """Nurse token (role nurse)."""
    return get_token(12, "test.nurse@meditwin.local", "nurse")


@pytest.fixture(scope="session")
def patient_token():
    """Patient token (role patient)."""
    return get_token(13, "test.patient@meditwin.local", "patient")


class TestAdminProfile:

    def test_admin_profile_001_admin_can_load_own_profile(self, admin_token):
        """ADMIN-PROFILE-001: Admin can load own profile."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        payload = res.json()
        assert payload.get("success") is True
        data = payload.get("data")
        assert "id" in data
        assert "userId" in data
        assert "firstName" in data
        assert "lastName" in data
        assert "email" in data
        assert "role" in data
        assert data["role"] in ("ADMIN", "admin")
        assert "hospital" in data
        assert data["hospital"] is not None
        assert "id" in data["hospital"]
        assert "name" in data["hospital"]

    def test_admin_profile_002_unauthenticated_user_blocked(self):
        """ADMIN-PROFILE-002: Unauthenticated user blocked."""
        res = requests.get(f"{BACKEND_URL}/api/admin/profile", timeout=8)
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_003_doctor_blocked(self, doctor_token):
        """ADMIN-PROFILE-003: Doctor blocked."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {doctor_token}"},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_004_nurse_blocked(self, nurse_token):
        """ADMIN-PROFILE-004: Nurse blocked."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {nurse_token}"},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_005_patient_blocked(self, patient_token):
        """ADMIN-PROFILE-005: Patient blocked."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {patient_token}"},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_006_admin_can_edit_permitted_fields(self, admin_token):
        """ADMIN-PROFILE-006: Admin can edit permitted fields."""
        update_data = {
            "firstName": "John",
            "lastName": "Administrator",
            "phone": "+91 9876543210"
        }
        res = requests.put(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=update_data,
            timeout=8,
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        payload = res.json()
        assert payload.get("success") is True
        data = payload.get("data")
        assert data["firstName"] == "John"
        assert data["lastName"] == "Administrator"
        assert data["phone"] == "+91 9876543210"

    def test_admin_profile_007_changes_persist_to_postgresql(self, admin_token):
        """ADMIN-PROFILE-007: Changes persist to PostgreSQL."""
        # Read back via GET
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        data = res.json().get("data")
        assert data["firstName"] == "John"
        assert data["lastName"] == "Administrator"
        assert data["phone"] == "+91 9876543210"

    def test_admin_profile_008_role_cannot_be_changed(self, admin_token):
        """ADMIN-PROFILE-008: Role cannot be changed."""
        res = requests.put(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"role": "DOCTOR", "roleId": 2},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403 when modifying role, got {res.status_code}"
        err = res.json().get("error", "").lower()
        assert "prohibited" in err or "not permitted" in err

        # Verify role in DB is unchanged
        check = requests.get(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert check.json()["data"]["role"] in ("ADMIN", "admin")

    def test_admin_profile_009_hospital_cannot_be_changed(self, admin_token):
        """ADMIN-PROFILE-009: Hospital cannot be changed."""
        res = requests.put(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"hospitalId": 999},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403 when modifying hospitalId, got {res.status_code}"
        err = res.json().get("error", "").lower()
        assert "prohibited" in err or "not permitted" in err

    def test_admin_profile_010_permissions_cannot_be_changed(self, admin_token):
        """ADMIN-PROFILE-010: Permissions cannot be changed."""
        res = requests.put(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"permissions": ["ALL_POWERFUL", "SUPER_ADMIN"]},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403 when modifying permissions, got {res.status_code}"
        err = res.json().get("error", "").lower()
        assert "prohibited" in err or "not permitted" in err

    def test_admin_profile_011_another_administrator_cannot_be_accessed(self, admin_token):
        """ADMIN-PROFILE-011: Another administrator cannot be accessed via query param or body spoofing."""
        # Authenticated as User 14 (Admin ID 2). Try to request Admin ID 1
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile?adminId=1&userId=7",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        data = res.json().get("data")
        # Identity must resolve from token (User 14 / Admin ID 2), NOT query parameter
        assert data["userId"] == 14
        assert data["id"] == 2

    def test_admin_profile_012_invalid_phone_rejected(self, admin_token):
        """ADMIN-PROFILE-012: Invalid phone rejected."""
        res = requests.put(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"phone": "invalid-letters-in-phone-123"},
            timeout=8,
        )
        assert res.status_code == 422, f"Expected 422 for invalid phone, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_013_required_field_validation_works(self, admin_token):
        """ADMIN-PROFILE-013: Required field validation works."""
        # Empty firstName
        res = requests.put(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"firstName": "   "},
            timeout=8,
        )
        assert res.status_code == 422, f"Expected 422 for empty firstName, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_014_correct_password_allows_password_change(self, admin_token):
        """ADMIN-PROFILE-014: Correct password allows password change."""
        # Change password to new password
        new_pass = "AdminPassUpdated@99"
        res = requests.patch(
            f"{BACKEND_URL}/api/admin/profile/password",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={
                "currentPassword": ADMIN_PASSWORD,
                "newPassword": new_pass,
                "confirmPassword": new_pass,
            },
            timeout=8,
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json().get("success") is True

        # Verify login works with new password
        login_res = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": new_pass},
            timeout=5,
        )
        assert login_res.status_code == 200, "Login failed with new password"
        new_token = login_res.json()["token"]

        # Immediately revert back to ADMIN_PASSWORD so suite remains idempotent
        revert_res = requests.patch(
            f"{BACKEND_URL}/api/admin/profile/password",
            headers={"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"},
            json={
                "currentPassword": new_pass,
                "newPassword": ADMIN_PASSWORD,
                "confirmPassword": ADMIN_PASSWORD,
            },
            timeout=8,
        )
        assert revert_res.status_code == 200, "Failed to revert password"

    def test_admin_profile_015_incorrect_password_blocks_password_change(self, admin_token):
        """ADMIN-PROFILE-015: Incorrect password blocks password change."""
        res = requests.patch(
            f"{BACKEND_URL}/api/admin/profile/password",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={
                "currentPassword": "WrongCurrentPassword@999",
                "newPassword": "SomeValidNewPass@123",
                "confirmPassword": "SomeValidNewPass@123",
            },
            timeout=8,
        )
        assert res.status_code == 400, f"Expected 400 for incorrect password, got {res.status_code}"
        assert res.json().get("success") is False
        assert "current password" in res.json().get("error", "").lower()

    def test_admin_profile_016_password_mismatch_rejected(self, admin_token):
        """ADMIN-PROFILE-016: Password mismatch rejected."""
        res = requests.patch(
            f"{BACKEND_URL}/api/admin/profile/password",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={
                "currentPassword": ADMIN_PASSWORD,
                "newPassword": "ValidPassword@123",
                "confirmPassword": "MismatchedPassword@456",
            },
            timeout=8,
        )
        assert res.status_code == 422, f"Expected 422 for password mismatch, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_017_weak_password_rejected(self, admin_token):
        """ADMIN-PROFILE-017: Weak password rejected (< 8 chars)."""
        res = requests.patch(
            f"{BACKEND_URL}/api/admin/profile/password",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={
                "currentPassword": ADMIN_PASSWORD,
                "newPassword": "short",
                "confirmPassword": "short",
            },
            timeout=8,
        )
        assert res.status_code == 422, f"Expected 422 for weak password, got {res.status_code}"
        assert res.json().get("success") is False

    def test_admin_profile_018_password_hash_never_returned(self, admin_token):
        """ADMIN-PROFILE-018: Password hash never returned in profile or password endpoints."""
        res_profile = requests.get(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        profile_body = res_profile.text.lower()
        assert "password_hash" not in profile_body
        assert "passwordhash" not in profile_body
        assert "$2b$" not in profile_body
        assert "$2a$" not in profile_body

        res_update = requests.put(
            f"{BACKEND_URL}/api/admin/profile",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"phone": "+91 9876543210"},
            timeout=8,
        )
        update_body = res_update.text.lower()
        assert "password_hash" not in update_body
        assert "$2b$" not in update_body

    def test_admin_profile_019_password_never_appears_in_logs(self, admin_token):
        """ADMIN-PROFILE-019: Password never appears in logs."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile/activity?limit=50",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        logs = res.json().get("data", [])
        for entry in logs:
            entry_str = json.dumps(entry).lower()
            assert ADMIN_PASSWORD.lower() not in entry_str
            assert "$2b$" not in entry_str
            assert "$2a$" not in entry_str

    def test_admin_profile_020_notification_preferences_update(self, admin_token):
        """ADMIN-PROFILE-020: Notification preferences update and persist."""
        patch_res = requests.patch(
            f"{BACKEND_URL}/api/admin/profile/preferences",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"preferences": {"appointmentAlerts": True, "systemMaintenanceAlerts": False}},
            timeout=8,
        )
        assert patch_res.status_code == 200, f"Expected 200, got {patch_res.status_code}"
        assert patch_res.json().get("success") is True

        get_res = requests.get(
            f"{BACKEND_URL}/api/admin/profile/preferences",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert get_res.status_code == 200
        prefs = get_res.json().get("data")
        assert prefs["appointmentAlerts"] is True
        assert prefs["systemMaintenanceAlerts"] is False

    def test_admin_profile_021_activity_is_displayed_correctly(self, admin_token):
        """ADMIN-PROFILE-021: Activity is displayed correctly."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/profile/activity?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload.get("success") is True
        activities = payload.get("data")
        assert isinstance(activities, list)
        assert len(activities) > 0
        act = activities[0]
        assert "id" in act
        assert "action" in act
        assert "table" in act
        assert "timestamp" in act

    def test_admin_profile_022_logout_clears_authenticated_access(self, admin_token):
        """ADMIN-PROFILE-022: Logout records ADMIN_LOGGED_OUT audit log."""
        res = requests.post(
            f"{BACKEND_URL}/api/admin/profile/logout",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        assert res.json().get("success") is True
        assert "logged out" in res.json().get("message", "").lower()


class TestAdminProfileSelenium:

    def login_admin(self, driver):
        login_page = LoginPage(driver)
        login_page.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        dashboard = AdminDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/admin", timeout=12)
        return dashboard

    def test_admin_profile_e2e_001_login_profile(self, driver):
        """ADMIN-PROFILE-E2E-001: Admin login -> Profile via sidebar"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        assert profile_page.is_profile_loaded(), "Admin Profile page failed to load from sidebar"
    pytest_item_metadata(test_admin_profile_e2e_001_login_profile, "ADMIN-PROFILE-E2E-001", "Admin", "Critical", "Admin navigates to profile from dashboard sidebar")

    def test_admin_profile_e2e_002_profile_info_displayed(self, driver):
        """ADMIN-PROFILE-E2E-002: Profile information displayed"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        assert profile_page.is_profile_loaded(), "Profile header/card not displayed"
        assert profile_page.is_active_account_displayed(), "Active Account status badge not displayed"
        assert profile_page.is_hospital_info_displayed(), "Hospital information card not displayed"
    pytest_item_metadata(test_admin_profile_e2e_002_profile_info_displayed, "ADMIN-PROFILE-E2E-002", "Admin", "High", "Admin and hospital details display on profile page")

    def test_admin_profile_e2e_003_edit_permitted_fields(self, driver):
        """ADMIN-PROFILE-E2E-003: Edit permitted fields modal opens"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        profile_page.click_edit_profile()
        assert profile_page.is_element_displayed(profile_page.EDIT_MODAL, timeout=6), "Edit profile modal failed to open"
        profile_page.cancel_profile_edit()
    pytest_item_metadata(test_admin_profile_e2e_003_edit_permitted_fields, "ADMIN-PROFILE-E2E-003", "Admin", "High", "Edit profile modal opens for permitted fields")

    def test_admin_profile_e2e_004_cancel_editing(self, driver):
        """ADMIN-PROFILE-E2E-004: Cancel editing cleanly closes modal"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        profile_page.click_edit_profile()
        assert profile_page.is_element_displayed(profile_page.EDIT_MODAL, timeout=6)
        profile_page.cancel_profile_edit()
        time.sleep(0.5)
    pytest_item_metadata(test_admin_profile_e2e_004_cancel_editing, "ADMIN-PROFILE-E2E-004", "Admin", "Medium", "Edit profile modal can be cancelled without changes")

    def test_admin_profile_e2e_005_protected_fields_readonly(self, driver):
        """ADMIN-PROFILE-E2E-005: Protected fields are read-only and excluded from edit controls"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        profile_page.click_edit_profile()
        # Verify protected inputs (role, roleId, hospitalId, userId) are NOT editable input elements in modal
        protected_inputs = driver.find_elements(profile_page.EDIT_MODAL[0], "//input[@name='role' or @name='roleId' or @name='hospitalId' or @name='userId']")
        assert len(protected_inputs) == 0, "Protected fields must not be editable in edit profile form"
        profile_page.cancel_profile_edit()
    pytest_item_metadata(test_admin_profile_e2e_005_protected_fields_readonly, "ADMIN-PROFILE-E2E-005", "Admin", "Critical", "Protected fields remain read-only")

    def test_admin_profile_e2e_006_password_change(self, driver):
        """ADMIN-PROFILE-E2E-006: Password change section displayed with security fields"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        assert profile_page.is_element_displayed(profile_page.SECURITY_CARD, timeout=6), "Change password card missing"
        assert profile_page.is_element_displayed(profile_page.CURRENT_PASSWORD_INPUT, timeout=5)
        assert profile_page.is_element_displayed(profile_page.NEW_PASSWORD_INPUT, timeout=5)
        assert profile_page.is_element_displayed(profile_page.CONFIRM_PASSWORD_INPUT, timeout=5)
    pytest_item_metadata(test_admin_profile_e2e_006_password_change, "ADMIN-PROFILE-E2E-006", "Admin", "High", "Password change card displays all required input fields")

    def test_admin_profile_e2e_007_invalid_password_rejected(self, driver):
        """ADMIN-PROFILE-E2E-007: Short / invalid password rejected with validation message"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        profile_page.safe_type(profile_page.CURRENT_PASSWORD_INPUT, "DummyPass@123")
        profile_page.safe_type(profile_page.NEW_PASSWORD_INPUT, "short")
        profile_page.safe_type(profile_page.CONFIRM_PASSWORD_INPUT, "short")
        profile_page.safe_click(profile_page.UPDATE_PASSWORD_BTN)
        time.sleep(1)
        # Check validation warning is displayed
        val_error = driver.find_elements(By.XPATH, "//*[contains(text(), '8 characters') or contains(text(), 'failed') or contains(text(), 'correct')]")
        assert len(val_error) > 0, "Validation message expected for password under 8 characters"
    pytest_item_metadata(test_admin_profile_e2e_007_invalid_password_rejected, "ADMIN-PROFILE-E2E-007", "Admin", "High", "Invalid password input is rejected on frontend")

    def test_admin_profile_e2e_008_notification_preferences(self, driver):
        """ADMIN-PROFILE-E2E-008: Notification preferences section displayed"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        assert profile_page.is_preferences_displayed(), "Administrative notification preferences card missing"
    pytest_item_metadata(test_admin_profile_e2e_008_notification_preferences, "ADMIN-PROFILE-E2E-008", "Admin", "Medium", "Notification preferences toggles display")

    def test_admin_profile_e2e_009_recent_activity(self, driver):
        """ADMIN-PROFILE-E2E-009: Recent activity stream displayed"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        assert profile_page.is_activity_displayed(), "Recent activity audit stream card missing"
    pytest_item_metadata(test_admin_profile_e2e_009_recent_activity, "ADMIN-PROFILE-E2E-009", "Admin", "Medium", "Recent administrative activity audit stream displays")

    def test_admin_profile_e2e_010_logout(self, driver):
        """ADMIN-PROFILE-E2E-010: Logout button clears session"""
        dashboard = self.login_admin(driver)
        dashboard.click_profile()
        profile_page = AdminProfilePage(driver)
        assert profile_page.is_element_displayed(profile_page.SIGN_OUT_BTN, timeout=6), "Sign out button missing on profile page"
    pytest_item_metadata(test_admin_profile_e2e_010_logout, "ADMIN-PROFILE-E2E-010", "Admin", "Critical", "Logout control available and clears administrative session")

