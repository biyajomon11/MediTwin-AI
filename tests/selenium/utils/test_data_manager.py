import logging
import requests
from tests.selenium.config import (
    BACKEND_URL,
    DOCTOR_EMAIL, DOCTOR_PASSWORD,
    NURSE_EMAIL, NURSE_PASSWORD,
    PATIENT_EMAIL, PATIENT_PASSWORD,
    ADMIN_EMAIL, ADMIN_PASSWORD,
)

logger = logging.getLogger("test_data_manager")

def ensure_account_registered(role: str, email: str, password: str, payload: dict) -> bool:
    """
    Idempotently registers or verifies a test account in the backend.
    """
    # 1. Test if already able to authenticate
    try:
        login_res = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=5,
        )
        if login_res.status_code == 200 and login_res.json().get("success"):
            logger.info(f"Test account {email} ({role}) already exists and authenticated successfully.")
            return True
    except Exception as e:
        logger.warning(f"Could not connect to backend to check account {email}: {e}")

    # 2. Attempt registration
    try:
        reg_res = requests.post(
            f"{BACKEND_URL}/api/register/{role}",
            json=payload,
            timeout=5,
        )
        if reg_res.status_code in (200, 201):
            logger.info(f"Successfully registered test {role} account: {email}")
            return True
        elif reg_res.status_code == 409:
            logger.info(f"Account {email} exists in database.")
            return True
        else:
            logger.warning(f"Registration for {role} ({email}) returned status {reg_res.status_code}: {reg_res.text}")
    except Exception as e:
        logger.error(f"Failed to register test {role} account ({email}): {e}")

    return False


def setup_all_test_accounts():
    """
    Prepares standard synthetic test accounts across all roles.
    """
    logger.info("Verifying/provisioning test accounts...")

    # Doctor
    ensure_account_registered(
        role="doctor",
        email=DOCTOR_EMAIL,
        password=DOCTOR_PASSWORD,
        payload={
            "firstName": "Sarah",
            "lastName": "Joseph",
            "email": DOCTOR_EMAIL,
            "password": DOCTOR_PASSWORD,
            "phone": "+1 555-0101",
            "licenseNumber": "DOC-SELENIUM-01",
            "specialization": "Cardiology",
            "department": "Cardiology",
            "yearsOfExperience": 12,
        },
    )

    # Nurse
    ensure_account_registered(
        role="nurse",
        email=NURSE_EMAIL,
        password=NURSE_PASSWORD,
        payload={
            "firstName": "Angel",
            "lastName": "Mary",
            "email": NURSE_EMAIL,
            "password": NURSE_PASSWORD,
            "phone": "+1 555-0102",
            "licenseNumber": "NUR-SELENIUM-01",
            "department": "Intensive Care Unit (ICU)",
        },
    )

    # Patient
    ensure_account_registered(
        role="patient",
        email=PATIENT_EMAIL,
        password=PATIENT_PASSWORD,
        payload={
            "firstName": "Surya",
            "lastName": "Chacko",
            "email": PATIENT_EMAIL,
            "password": PATIENT_PASSWORD,
            "dob": "1998-05-14",
            "gender": "Female",
            "phone": "+1 555-0103",
            "bloodGroup": "O+",
        },
    )

    # Admin
    ensure_account_registered(
        role="admin",
        email=ADMIN_EMAIL,
        password=ADMIN_PASSWORD,
        payload={
            "firstName": "Rohith",
            "lastName": "Admin",
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "hospitalName": "St. Jude Memorial Hospital",
            "department": "Hospital Administration",
            "phone": "+1 555-0104",
        },
    )
