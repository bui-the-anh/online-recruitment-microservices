/**
 * Full API smoke for TalentHub gateway (3 roles).
 * Usage: node scripts/api-smoke.mjs
 */
const API = process.env.API_URL || "http://localhost:3001";
const PASS = "Demo@123456";

const results = [];
let failed = 0;

function cookieJar() {
  const jar = new Map();
  return {
    store(res) {
      const raw = res.headers.getSetCookie?.() || [];
      const legacy = res.headers.get("set-cookie");
      const list = raw.length ? raw : legacy ? [legacy] : [];
      for (const line of list) {
        const part = line.split(";")[0];
        const eq = part.indexOf("=");
        if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    clear() {
      jar.clear();
    },
  };
}

async function req(method, path, { jar, body, formData, expectStatus } = {}) {
  const headers = {};
  if (jar?.header()) headers.Cookie = jar.header();
  let payload = undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload });
  if (jar) jar.store(res);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  const ok =
    expectStatus != null
      ? res.status === expectStatus
      : res.status >= 200 && res.status < 300;
  const label = `${method} ${path}`;
  if (!ok) {
    failed += 1;
    results.push({
      ok: false,
      label,
      status: res.status,
      detail: typeof data === "string" ? data.slice(0, 200) : data?.error?.message || data,
    });
  } else {
    results.push({ ok: true, label, status: res.status });
  }
  return { res, data, ok };
}

async function login(email) {
  const jar = cookieJar();
  const { ok, data } = await req("POST", "/api/auth/login", {
    jar,
    body: { email, password: PASS },
  });
  if (!ok) throw new Error(`Login failed for ${email}`);
  return { jar, user: data.user };
}

async function main() {
  console.log(`API smoke → ${API}\n`);

  // Public
  await req("GET", "/health", { expectStatus: 200 });
  await req("GET", "/api/jobs?page=1&pageSize=2");
  await req("GET", "/api/companies/featured");
  await req("GET", "/api/companies?page=1&pageSize=2");

  // Candidate
  const candidate = await login("candidate@demo.vn");
  await req("GET", "/api/auth/me", { jar: candidate.jar });
  await req("GET", "/api/candidate/profile", { jar: candidate.jar });
  await req("PATCH", "/api/candidate/profile", {
    jar: candidate.jar,
    body: { headline: "Senior Frontend Engineer (smoke)" },
  });
  const jobs = await req("GET", "/api/jobs?page=1&pageSize=5", {
    jar: candidate.jar,
  });
  const jobId = jobs.data?.items?.[0]?.id || jobs.data?.[0]?.id;
  if (jobId) {
    await req("GET", `/api/jobs/${jobId}`, { jar: candidate.jar });
  }
  const companies = await req("GET", "/api/companies?page=1&pageSize=1", {
    jar: candidate.jar,
  });
  const companyId = companies.data?.items?.[0]?.id || companies.data?.[0]?.id;
  if (companyId) {
    await req("GET", `/api/companies/${companyId}`, { jar: candidate.jar });
  }
  await req("GET", "/api/applications", { jar: candidate.jar });
  const apps = await req("GET", "/api/applications", { jar: candidate.jar });
  const appId = Array.isArray(apps.data)
    ? apps.data[0]?.id
    : apps.data?.items?.[0]?.id;
  if (appId) {
    await req("GET", `/api/applications/${appId}`, { jar: candidate.jar });
  }
  await req("GET", "/api/notifications", { jar: candidate.jar });
  await req("GET", "/api/dashboard", { jar: candidate.jar });

  // CV upload
  const pdf = new Blob([Buffer.from("%PDF-1.4\n%%EOF\n")], {
    type: "application/pdf",
  });
  const form = new FormData();
  form.append("file", pdf, "smoke-cv.pdf");
  const upload = await req("POST", "/api/uploads/cv", {
    jar: candidate.jar,
    formData: form,
  });
  if (upload.ok && upload.data?.url && jobId) {
    // apply may 409 if already applied — accept 201 or 409
    const applyRes = await fetch(`${API}/api/applications`, {
      method: "POST",
      headers: {
        Cookie: candidate.jar.header(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId,
        cvUrl: upload.data.url,
        coverLetter: "Smoke apply",
      }),
    });
    candidate.jar.store(applyRes);
    const applyOk = applyRes.status === 201 || applyRes.status === 409;
    results.push({
      ok: applyOk,
      label: "POST /api/applications (create|duplicate)",
      status: applyRes.status,
    });
    if (!applyOk) failed += 1;
  }

  await req("POST", "/api/auth/logout", { jar: candidate.jar });

  // Recruiter
  const recruiter = await login("hr@vpay.demo");
  await req("GET", "/api/auth/me", { jar: recruiter.jar });
  await req("GET", "/api/companies/me", { jar: recruiter.jar });
  await req("GET", "/api/dashboard", { jar: recruiter.jar });
  await req("GET", "/api/recruiter/jobs?page=1&pageSize=4&status=ALL", {
    jar: recruiter.jar,
  });
  const rJobs = await req(
    "GET",
    "/api/recruiter/jobs?page=1&pageSize=1&status=APPROVED",
    { jar: recruiter.jar },
  );
  const rJobId = rJobs.data?.items?.[0]?.id;
  await req("GET", "/api/applications?page=1&pageSize=4&status=ALL", {
    jar: recruiter.jar,
  });
  if (rJobId) {
    await req(
      "GET",
      `/api/applications?page=1&pageSize=4&jobId=${rJobId}&status=ALL`,
      { jar: recruiter.jar },
    );
  }
  const rApps = await req(
    "GET",
    "/api/applications?page=1&pageSize=4&status=APPLIED",
    { jar: recruiter.jar },
  );
  const rAppId = rApps.data?.items?.[0]?.id;
  if (rAppId) {
    await req("GET", `/api/applications/${rAppId}`, { jar: recruiter.jar });
    // may already be VIEWED after get — try interview transition if VIEWED
  }
  await req("GET", "/api/notifications", { jar: recruiter.jar });
  await req("GET", "/api/settings", { jar: recruiter.jar });
  await req("PATCH", "/api/settings", {
    jar: recruiter.jar,
    body: {
      notifyNewApplication: true,
      notifyJobModeration: true,
      notifyInterviewReminder: true,
      notifyWeeklyReport: false,
    },
  });
  await req("GET", "/api/auth/sessions", { jar: recruiter.jar });
  await req("POST", "/api/auth/logout", { jar: recruiter.jar });

  // Admin
  const admin = await login("admin@demo.vn");
  await req("GET", "/api/auth/me", { jar: admin.jar });
  await req("GET", "/api/dashboard", { jar: admin.jar });
  await req("GET", "/api/settings", { jar: admin.jar });
  await req("PATCH", "/api/settings", {
    jar: admin.jar,
    body: {
      notifyJobPending: true,
      notifyRecruiterRegistered: true,
      notifyBrowserSound: false,
    },
  });
  await req("GET", "/api/auth/sessions", { jar: admin.jar });
  await req("GET", "/api/admin/jobs?page=1&pageSize=4&status=PENDING", {
    jar: admin.jar,
  });
  await req("GET", "/api/admin/recruiters?page=1&pageSize=4", {
    jar: admin.jar,
  });
  const recruiters = await req("GET", "/api/admin/recruiters?page=1&pageSize=1", {
    jar: admin.jar,
  });
  const recruiterId =
    recruiters.data?.items?.[0]?.id || recruiters.data?.[0]?.id;
  if (recruiterId) {
    await req("GET", `/api/admin/recruiters/${recruiterId}`, {
      jar: admin.jar,
    });
  }
  await req("GET", "/api/admin/audit-logs?page=1&pageSize=5", {
    jar: admin.jar,
  });
  await req("GET", "/api/applications", { jar: admin.jar });
  await req("POST", "/api/auth/logout", { jar: admin.jar });

  // Auth refresh (login again)
  const refreshJar = cookieJar();
  await req("POST", "/api/auth/login", {
    jar: refreshJar,
    body: { email: "candidate@demo.vn", password: PASS },
  });
  await req("POST", "/api/auth/refresh", { jar: refreshJar });

  console.log("—".repeat(60));
  for (const row of results) {
    const mark = row.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${row.status}  ${row.label}`);
    if (!row.ok && row.detail) console.log(`      → ${JSON.stringify(row.detail).slice(0, 180)}`);
  }
  console.log("—".repeat(60));
  console.log(
    `Total ${results.length} · PASS ${results.length - failed} · FAIL ${failed}`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("FATAL", error);
  process.exit(1);
});
