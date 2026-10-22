# Automated Concurrency & Load Test Suite
import time
import pytest
import concurrent.futures
import requests

BACKEND_URL = "http://localhost:5000/api/auth/login"

class TestPatientLoginLoad:
    """
    Test Case 3: Load Test - 1000 Patients Concurrent Login
    Evaluates system throughput, latency SLA, connection pool stability,
    and zero-error concurrency under high patient volume.
    """

    def send_login_request(self, user_index):
        payload = {
            "email": f"patient.test_{user_index % 50}@meditwin.local",
            "password": "PatientPass@123"
        }
        start_time = time.time()
        try:
            # Send concurrent HTTP authentication request
            response = requests.post(BACKEND_URL, json=payload, timeout=8)
            duration = (time.time() - start_time) * 1000  # in ms
            return {
                "user_index": user_index,
                "status_code": response.status_code,
                "duration_ms": duration,
                "success": response.status_code in [200, 401]  # Proper response without 500 error
            }
        except Exception as e:
            return {
                "user_index": user_index,
                "status_code": 0,
                "duration_ms": (time.time() - start_time) * 1000,
                "success": False,
                "error": str(e)
            }

    def test_load_1000_concurrent_patients(self):
        total_virtual_users = 1000
        concurrency_workers = 100  # 100 concurrent threads in thread pool

        print(f"\n[LOAD TEST] Initializing {total_virtual_users} concurrent patient login requests...")
        start_overall = time.time()

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency_workers) as executor:
            future_to_user = {
                executor.submit(self.send_login_request, i): i for i in range(total_virtual_users)
            }
            for future in concurrent.futures.as_completed(future_to_user):
                res = future.result()
                results.append(res)

        total_time = time.time() - start_overall
        successful_requests = [r for r in results if r["success"]]
        durations = [r["duration_ms"] for r in successful_requests]

        avg_latency = sum(durations) / len(durations) if durations else 0
        max_latency = max(durations) if durations else 0
        error_count = total_virtual_users - len(successful_requests)
        error_rate = (error_count / total_virtual_users) * 100

        print(f"[LOAD TEST] Completed in {total_time:.2f} seconds.")
        print(f"[METRICS] Total: {total_virtual_users} | Succeeded: {len(successful_requests)} | Failed: {error_count}")
        print(f"[METRICS] Avg Response Time: {avg_latency:.1f}ms | Max Latency: {max_latency:.1f}ms | Error Rate: {error_rate:.1f}%")

        # Assertions for Load SLA
        assert len(successful_requests) == total_virtual_users, f"Expected 1000 successful logins, got {len(successful_requests)}"
        assert error_rate == 0.0, f"Error rate exceeded threshold: {error_rate}%"
        assert avg_latency < 2000, f"Average latency SLA violated (>2000ms): {avg_latency:.1f}ms"
