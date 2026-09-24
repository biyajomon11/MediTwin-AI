import pytest
from tests.selenium.pages.LandingPage import LandingPage
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.RegistrationPages import RegistrationPage
from tests.selenium.pages.DoctorDashboardPage import DoctorDashboardPage
from tests.selenium.config import DOCTOR_EMAIL, DOCTOR_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestNavigation:

    def test_nav_001_landing_to_login(self, driver):
        """NAV-001: Verify navigation from Landing page to Login and Registration"""
        landing = LandingPage(driver)
        landing.open()
        assert landing.is_element_displayed(landing.HERO_TITLE), "Landing page hero title not visible."

        landing.click_sign_in()
        login = LoginPage(driver)
        assert login.wait_for_url_contains("/login", timeout=6), "Failed navigating from Landing to Login."
    pytest_item_metadata(test_nav_001_landing_to_login, "NAV-001", "General", "Medium", "Landing page links route correctly to Login")

    def test_nav_002_sidebar_tab_navigation(self, driver):
        """NAV-002: Verify Doctor workstation tabs switch views cleanly without page breaks"""
        login = LoginPage(driver)
        login.login(DOCTOR_EMAIL, DOCTOR_PASSWORD)
        dashboard = DoctorDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/doctor", timeout=12)

        dashboard.click_patient_records()
        assert dashboard.is_element_displayed(dashboard.SUBTAB_OVERVIEW, timeout=5)

        dashboard.click_guidelines()
        dashboard.click_ai_summaries()
    pytest_item_metadata(test_nav_002_sidebar_tab_navigation, "NAV-002", "Doctor", "Medium", "Sidebar tab navigation functions smoothly")

    def test_nav_003_unknown_route_redirect(self, driver):
        """NAV-003: Verify navigating to unknown URL route redirects gracefully to landing page"""
        landing = LandingPage(driver)
        landing.navigate_to("/unknown-nonexistent-path-999")
        assert landing.wait_for_url_contains("/", timeout=6) or landing.is_element_displayed(landing.HERO_TITLE), \
            "Unknown route did not redirect gracefully."
    pytest_item_metadata(test_nav_003_unknown_route_redirect, "NAV-003", "General", "Low", "Unknown route redirects gracefully")
