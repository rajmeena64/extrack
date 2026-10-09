import time
import httpx

BASE_URL = "http://localhost:5000"

ENDPOINTS = [
    {"name": "Login", "path": "/api/v1/auth/login", "method": "POST", "body": {"email": "test@test.com", "password": "wrong"}, "calls": 8, "ip": "10.0.1.1"},
    {"name": "Signup", "path": "/api/v1/auth/signup", "method": "POST", "body": {"email": "test@test.com", "password": "short"}, "calls": 6, "ip": "10.0.1.2"},
    {"name": "Forgot Password", "path": "/api/v1/auth/forgot-password", "method": "POST", "body": {"email": "test@test.com"}, "calls": 6, "ip": "10.0.1.3"},
    {"name": "Verify Reset OTP", "path": "/api/v1/auth/verify-reset-otp", "method": "POST", "body": {"email": "test@test.com", "otp": "000000"}, "calls": 8, "ip": "10.0.1.4"},
    {"name": "Resend Verification", "path": "/api/v1/auth/resend-verification", "method": "POST", "body": {"email": "test@test.com"}, "calls": 6, "ip": "10.0.1.5"},
    {"name": "Health Check", "path": "/api/health", "method": "GET", "body": None, "calls": 125, "ip": "10.0.1.6"},
    {"name": "Settings (Protected)", "path": "/api/v1/settings", "method": "GET", "body": None, "calls": 125, "ip": "10.0.1.7"},
]

def run_suite():
    print("=" * 95)
    print(f"{'ENDPOINT':<24} | {'SERVER LIMIT':<13} | {'ALLOWED':<8} | {'BLOCKED AT':<12} | {'AVG TIME':<10} | {'RETRY-AFTER'}")
    print("=" * 95)
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        for ep in ENDPOINTS:
            allowed = 0
            blocked_at = None
            retry_after = "-"
            latencies = []
            server_limit = "-"
            for i in range(1, ep["calls"] + 1):
                t0 = time.perf_counter()
                headers = {"X-Forwarded-For": ep["ip"]}
                resp = client.post(ep["path"], json=ep["body"], headers=headers) if ep["method"] == "POST" else client.get(ep["path"], headers=headers)
                latencies.append((time.perf_counter() - t0) * 1000)
                if "X-RateLimit-Limit" in resp.headers:
                    server_limit = f"{resp.headers['X-RateLimit-Limit']} req"
                if resp.status_code == 429:
                    if blocked_at is None:
                        blocked_at = f"Req #{i}"
                        retry_after = f"{resp.headers['Retry-After']}s" if "Retry-After" in resp.headers else "-s"
                else:
                    allowed += 1
            avg_lat = f"{sum(latencies) / len(latencies):.2f} ms"
            b_text = blocked_at if blocked_at is not None else "Never"
            print(f"{ep['name']:<24} | {server_limit:<13} | {allowed:<8} | {b_text:<12} | {avg_lat:<10} | {retry_after}")
    print("=" * 95)

if __name__ == "__main__":
    run_suite()
