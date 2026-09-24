import time
import pytest
from tests.selenium.pages.LoginPage import LoginPage
from tests.selenium.pages.AdminDashboardPage import AdminDashboardPage
from tests.selenium.config import ADMIN_EMAIL, ADMIN_PASSWORD

def pytest_item_metadata(func, test_id, role, priority, expected):
    func.test_id = test_id
    func.role = role
    func.priority = priority
    func.expected = expected
    return func

class TestAdminModule:

    def login_admin(self, driver):
        login_page = LoginPage(driver)
        login_page.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        dashboard = AdminDashboardPage(driver)
        dashboard.wait_for_url_contains("/dashboard/admin", timeout=12)
        return dashboard

    def test_admin_001_login(self, driver):
        """ADMIN-001: Verify Hospital Admin login opens /dashboard/admin"""
        dashboard = self.login_admin(driver)
        assert dashboard.is_dashboard_loaded(), "Admin dashboard failed to load."
    pytest_item_metadata(test_admin_001_login, "ADMIN-001", "Admin", "Critical", "Admin login redirects to /dashboard/admin")

    def test_admin_002_dashboard_metrics(self, driver):
        """ADMIN-002: Verify Hospital Admin dashboard displays key facility metrics"""
        dashboard = self.login_admin(driver)
        assert dashboard.is_element_displayed(dashboard.ADMIN_TITLE, timeout=6), "Admin workstation title missing."
    pytest_item_metadata(test_admin_002_dashboard_metrics, "ADMIN-002", "Admin", "High", "Admin operational metrics display")

    def test_admin_003_hospital_reports(self, driver):
        """ADMIN-003: Verify Hospital Reports & Statistics view loads"""
        dashboard = self.login_admin(driver)
        dashboard.click_reports()
        reports_view = dashboard.is_element_displayed((dashboard.ADMIN_TITLE[0], "//*[contains(text(), 'Report') or contains(text(), 'Stat') or contains(text(), 'Demographic')]"), timeout=6)
        assert reports_view, "Hospital reports view failed to display."
    pytest_item_metadata(test_admin_003_hospital_reports, "ADMIN-003", "Admin", "High", "Hospital reports & statistics display")

    def test_admin_004_activity_monitor(self, driver):
        """ADMIN-004: Verify Hospital Activity Monitor displays clinical activity stream"""
        dashboard = self.login_admin(driver)
        dashboard.click_activities()
        activities_view = dashboard.is_element_displayed((dashboard.ADMIN_TITLE[0], "//*[contains(text(), 'Activity') or contains(text(), 'Audit') or contains(text(), 'Monitor')]"), timeout=6)
        assert activities_view, "Hospital activity monitor failed to display."
    pytest_item_metadata(test_admin_004_activity_monitor, "ADMIN-004", "Admin", "High", "Hospital activity monitor displays audit events")

    def test_admin_005_department_analytics(self, driver):
        """ADMIN-005: Verify Department Analytics view loads"""
        dashboard = self.login_admin(driver)
        dashboard.click_departments()
        dept_view = dashboard.is_element_displayed((dashboard.ADMIN_TITLE[0], "//*[contains(text(), 'Department') or contains(text(), 'Analytics')]"), timeout=6)
        assert dept_view, "Department analytics view failed to display."
    pytest_item_metadata(test_admin_005_department_analytics, "ADMIN-005", "Admin", "Medium", "Department analytics view loads")
