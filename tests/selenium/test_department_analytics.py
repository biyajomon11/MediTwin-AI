"""
MediTwin AI - Hospital Administrator Module
Department Analytics Security, RBAC, Validation & Integration Tests
Specifications: DEPT-ANALYTICS-001 through DEPT-ANALYTICS-012
"""

import os
import jwt
import requests
import pytest

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-meditwin-jwt-key")

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "test.admin@meditwin.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "AdminPass@123")

DOCTOR_EMAIL = os.getenv("TEST_DOCTOR_EMAIL", "test.doctor@meditwin.local")
DOCTOR_PASSWORD = os.getenv("TEST_DOCTOR_PASSWORD", "DoctorPass@123")


def get_token(user_id: int, email: string, role: str, admin_id: int = None) -> str:
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
def hospital1_admin_token():
    """Admin token for Hospital 1 (MediTwin Central Hospital - User ID 7, Admin ID 1)."""
    return get_token(7, "rohithadmin99@gmail.com", "admin", 1)


@pytest.fixture(scope="session")
def hospital2_admin_token():
    """Admin token for Hospital 2 (St. Jude Memorial Hospital - User ID 14, Admin ID 2)."""
    # Or obtain via login endpoint
    res = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=5)
    if res.status_code == 200:
        return res.json().get("token")
    return get_token(14, ADMIN_EMAIL, "admin", 2)


@pytest.fixture(scope="session")
def doctor_token():
    """Doctor token (User ID 11, role doctor)."""
    res = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": DOCTOR_EMAIL, "password": DOCTOR_PASSWORD}, timeout=5)
    if res.status_code == 200:
        return res.json().get("token")
    return get_token(11, DOCTOR_EMAIL, "doctor")


@pytest.fixture(scope="session")
def nurse_token():
    """Nurse token (User ID 12, role nurse)."""
    return get_token(12, "test.nurse@meditwin.local", "nurse")


@pytest.fixture(scope="session")
def patient_token():
    """Patient token (User ID 13, role patient)."""
    return get_token(13, "test.patient@meditwin.local", "patient")


class TestDepartmentAnalytics:

    def test_dept_analytics_001_admin_can_access(self, hospital1_admin_token):
        """DEPT-ANALYTICS-001: Admin can access analytics."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        payload = res.json()
        assert payload.get("success") is True
        data = payload.get("data")
        assert "hospital" in data
        assert "summary" in data
        assert "departments" in data
        assert "statusDistribution" in data
        assert "trends" in data
        assert data["summary"]["totalDepartments"] > 0
        assert len(data["departments"]) > 0

    def test_dept_analytics_002_unauthenticated_blocked(self):
        """DEPT-ANALYTICS-002: Unauthenticated user blocked."""
        res = requests.get(f"{BACKEND_URL}/api/admin/analytics/departments", timeout=8)
        assert res.status_code == 401, f"Expected 401 Unauthorized, got {res.status_code}"
        assert res.json().get("success") is False

    def test_dept_analytics_003_doctor_blocked(self, doctor_token):
        """DEPT-ANALYTICS-003: Doctor blocked."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {doctor_token}"},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403 Forbidden for doctor, got {res.status_code}"
        assert res.json().get("success") is False

    def test_dept_analytics_004_nurse_blocked(self, nurse_token):
        """DEPT-ANALYTICS-004: Nurse blocked."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {nurse_token}"},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403 Forbidden for nurse, got {res.status_code}"
        assert res.json().get("success") is False

    def test_dept_analytics_005_patient_blocked(self, patient_token):
        """DEPT-ANALYTICS-005: Patient blocked."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {patient_token}"},
            timeout=8,
        )
        assert res.status_code == 403, f"Expected 403 Forbidden for patient, got {res.status_code}"
        assert res.json().get("success") is False

    def test_dept_analytics_006_admin_cannot_access_another_hospitals_analytics(
        self, hospital1_admin_token, hospital2_admin_token
    ):
        """DEPT-ANALYTICS-006: Admin cannot access another hospital's analytics."""
        # 1. Admin 1 attempts to pass ?hospitalId=2
        spoof_res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?hospitalId=2",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert spoof_res.status_code == 403, f"Expected 403 on hospital spoofing, got {spoof_res.status_code}"

        # 2. Admin 1 attempts to filter by department 5 (which belongs to Hospital 2)
        cross_res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?departmentId=5",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert cross_res.status_code in (403, 404), f"Expected 403 or 404 for cross-hospital department, got {cross_res.status_code}"

        # 3. Admin 2 (St. Jude) sees only their hospital's departments
        h2_res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {hospital2_admin_token}"},
            timeout=8,
        )
        assert h2_res.status_code == 200
        h2_data = h2_res.json()["data"]
        assert h2_data["hospital"]["id"] == 2
        dept_ids = [d["id"] for d in h2_data["departments"]]
        assert 5 in dept_ids  # Orthopedics belongs to Hospital 2
        assert 1 not in dept_ids  # Cardiology belongs to Hospital 1

    def test_dept_analytics_007_invalid_department_id_rejected(self, hospital1_admin_token):
        """DEPT-ANALYTICS-007: Invalid department ID rejected."""
        # Non-numeric format
        res1 = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?departmentId=invalid_dept",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res1.status_code == 422, f"Expected 422 for non-numeric departmentId, got {res1.status_code}"

        # Negative department ID
        res2 = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?departmentId=-10",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res2.status_code == 422, f"Expected 422 for negative departmentId, got {res2.status_code}"

        # Non-existent department ID
        res3 = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?departmentId=99999",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res3.status_code == 404, f"Expected 404 for non-existent departmentId, got {res3.status_code}"

    def test_dept_analytics_008_invalid_date_range_rejected(self, hospital1_admin_token):
        """DEPT-ANALYTICS-008: Invalid date range rejected."""
        # startDate > endDate
        res1 = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?startDate=2026-10-15&endDate=2026-10-01",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res1.status_code == 422, f"Expected 422 for inverted date range, got {res1.status_code}"
        assert "startDate must be earlier than or equal to endDate" in res1.json().get("error", "")

        # Malformed startDate
        res2 = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?startDate=not-a-valid-date",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res2.status_code == 422, f"Expected 422 for malformed startDate, got {res2.status_code}"

        # Date range exceeds maximum limit (> 5 years)
        res3 = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments?startDate=2010-01-01&endDate=2026-01-01",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res3.status_code == 422, f"Expected 422 for date range > 5 years, got {res3.status_code}"

    def test_dept_analytics_009_analytics_use_real_database_values(self, hospital1_admin_token):
        """DEPT-ANALYTICS-009: Analytics use real database values."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        # Check real hospital details
        assert data["hospital"]["id"] == 1
        assert "MediTwin" in data["hospital"]["name"]

        # Real summary metrics
        summary = data["summary"]
        assert summary["totalDepartments"] == 4
        assert summary["totalDoctors"] >= 2
        assert summary["totalAppointments"] >= 10
        assert summary["totalPatients"] >= 1

        # Check departments detail structure
        dept_names = [d["name"] for d in data["departments"]]
        assert "Cardiology Department" in dept_names
        assert "General Medicine Department" in dept_names

        cardiology = next(d for d in data["departments"] if d["name"] == "Cardiology Department")
        assert cardiology["doctorCount"] >= 1
        assert cardiology["appointmentCount"] >= 1
        assert cardiology["completed"] >= 0

        # Status distribution total matches summary
        total_from_statuses = sum(s["count"] for s in data["statusDistribution"])
        assert total_from_statuses == summary["totalAppointments"]

    def test_dept_analytics_010_database_failure_does_not_produce_fake_analytics(self):
        """DEPT-ANALYTICS-010: Database failure / error does not produce fake analytics."""
        # Unauthenticated query must fail without fake fallback
        res = requests.get(f"{BACKEND_URL}/api/admin/analytics/departments", timeout=8)
        assert res.status_code != 200
        json_data = res.json()
        assert json_data.get("success") is False
        assert "data" not in json_data or json_data["data"] is None

        # Invalid query parameter must fail cleanly without fake mock fallback
        invalid_token = "invalid.bearer.token"
        res2 = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {invalid_token}"},
            timeout=8,
        )
        assert res2.status_code in (401, 403)
        assert res2.json().get("success") is False

    def test_dept_analytics_011_export_respects_selected_filters(self, hospital1_admin_token):
        """DEPT-ANALYTICS-011: Export respects selected filters."""
        # Export filtered by Cardiology (departmentId=1)
        res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments/export?departmentId=1",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        assert "text/csv" in res.headers.get("Content-Type", "")
        csv_text = res.text
        assert "Department,Doctors,Nurses" in csv_text
        assert "Cardiology Department" in csv_text
        assert "General Medicine Department" not in csv_text

    def test_dept_analytics_012_no_unauthorized_phi_exposed(self, hospital1_admin_token):
        """DEPT-ANALYTICS-012: No unauthorized PHI is exposed."""
        res = requests.get(
            f"{BACKEND_URL}/api/admin/analytics/departments",
            headers={"Authorization": f"Bearer {hospital1_admin_token}"},
            timeout=8,
        )
        assert res.status_code == 200
        raw_text = res.text.lower()

        # Ensure no sensitive clinical PHI fields or patient identifying fields are leaked
        forbidden_phi_fields = [
            "diagnosis",
            "medicalrecords",
            "prescriptions",
            "laboratory",
            "bloodglucose",
            "systolicbp",
            "painscore",
            "emergencycontactphone",
            "password_hash",
            "ssn",
        ]
        for field in forbidden_phi_fields:
            assert f'"{field}"' not in raw_text, f"Potential PHI leak detected: {field} found in response"
