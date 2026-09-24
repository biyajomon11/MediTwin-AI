import json
import os
import time
from datetime import datetime
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from tests.selenium.config import (
    HEADLESS, WINDOW_WIDTH, WINDOW_HEIGHT,
    SCREENSHOTS_DIR, REPORTS_DIR, BASE_URL, BACKEND_URL
)
from tests.selenium.utils.test_data_manager import setup_all_test_accounts

# Global collector for test execution details
TEST_RESULTS = []

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Ensures backend accounts exist and directories are ready."""
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    setup_all_test_accounts()
    yield


@pytest.fixture(scope="function")
def driver(request):
    """Provides a configured Selenium WebDriver instance."""
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument(f"--window-size={WINDOW_WIDTH},{WINDOW_HEIGHT}")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-extensions")
    options.add_argument("--ignore-certificate-errors")

    # Set Chrome binary if in standard location on Windows
    chrome_paths = [
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    ]
    for cp in chrome_paths:
        if os.path.exists(cp):
            options.binary_location = cp
            break

    driver_instance = webdriver.Chrome(options=options)
    driver_instance.set_page_load_timeout(30)
    driver_instance.implicitly_wait(2)

    # Attach driver to test item for failure hook
    request.node.driver = driver_instance

    yield driver_instance

    try:
        driver_instance.quit()
    except Exception:
        pass


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Hook to capture screenshots on failure and collect test execution stats."""
    outcome = yield
    report = outcome.get_result()

    if report.when == "call":
        test_id = getattr(item.obj, "test_id", item.nodeid.split("::")[-1])
        module = item.module.__name__.split(".")[-1] if hasattr(item, "module") else "general"
        role = getattr(item.obj, "role", "General")
        priority = getattr(item.obj, "priority", "Medium")
        expected = getattr(item.obj, "expected", "Test should succeed")
        test_name = item.obj.__doc__.strip().split("\n")[0] if item.obj.__doc__ else item.name

        duration = getattr(report, "duration", 0.0)
        status = "PASS" if report.passed else ("FAIL" if report.failed else "SKIPPED")
        error_msg = ""
        screenshot_path = ""

        if report.failed:
            driver = getattr(item, "driver", None)
            timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
            filename = f"{test_id}_{timestamp}.png"
            filepath = SCREENSHOTS_DIR / filename

            if driver:
                try:
                    driver.save_screenshot(str(filepath))
                    screenshot_path = str(filepath.relative_to(REPORTS_DIR.parent))
                except Exception as e:
                    error_msg = f"Screenshot capture error: {e}"

            if call.excinfo:
                error_msg = str(call.excinfo.value)

            # Pytest HTML extra
            if hasattr(item, "config") and hasattr(item.config, "_html"):
                html = item.config._html
                extra = getattr(report, "extra", [])
                if screenshot_path:
                    extra.append(html.extras.image(str(filepath)))
                report.extra = extra

        record = {
            "test_id": test_id,
            "test_name": test_name,
            "module": module,
            "role": role,
            "priority": priority,
            "expected_result": expected,
            "actual_result": "Success" if report.passed else error_msg or "Failed assertion",
            "status": status,
            "duration": round(duration, 2),
            "error": error_msg,
            "screenshot": screenshot_path,
        }
        TEST_RESULTS.append(record)


def pytest_sessionfinish(session, exitstatus):
    """After all tests run, export test_results.json and generate custom reports."""
    results_file = REPORTS_DIR / "test_results.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(TEST_RESULTS, f, indent=2)

    # Trigger custom report generation (Markdown & PDF)
    try:
        from tests.selenium.utils.report_generator import generate_all_reports
        generate_all_reports(TEST_RESULTS)
    except Exception as e:
        print(f"[REPORTS] Error generating custom reports: {e}")
