/**
 * Phase 2 PRD — quick auth flow check. Start the server first: npm run dev
 * Usage: node src/scripts/smokeAuth.mjs
 * Optional: BASE_URL=http://127.0.0.1:5000
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

const email = `smoke_${Date.now()}@example.test`;
const body = {
  name: "Smoke Test",
  email,
  password: "smokepass123",
  age: 28,
  city: "Mumbai",
  dependents: 1,
  income: 50000,
};

async function main() {
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const signupJson = await signupRes.json().catch(() => ({}));
  if (!signupRes.ok) {
    console.error("signup failed", signupRes.status, signupJson);
    process.exit(1);
  }
  const { token, refreshToken } = signupJson;
  if (!token || !refreshToken) {
    console.error("signup missing token or refreshToken", signupJson);
    process.exit(1);
  }

  const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshJson = await refreshRes.json().catch(() => ({}));
  if (!refreshRes.ok || !refreshJson.token) {
    console.error("refresh failed", refreshRes.status, refreshJson);
    process.exit(1);
  }

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: body.password }),
  });
  const loginJson = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.error("login failed", loginRes.status, loginJson);
    process.exit(1);
  }

  const profileRes = await fetch(`${BASE}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${refreshJson.token}` },
  });
  const profileJson = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok) {
    console.error("profile failed", profileRes.status, profileJson);
    process.exit(1);
  }

  if (profileJson.user?.email !== email) {
    console.error("profile email mismatch", profileJson);
    process.exit(1);
  }

  const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${loginJson.token}` },
  });
  if (!logoutRes.ok) {
    console.error("logout failed", logoutRes.status, await logoutRes.text());
    process.exit(1);
  }

  const afterLogout = await fetch(`${BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: loginJson.refreshToken }),
  });
  if (afterLogout.status !== 401) {
    console.error("expected refresh to fail after logout", afterLogout.status);
    process.exit(1);
  }

  console.log("Auth smoke OK:", profileJson.user.email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
