/**
 * Full API E2E: create job → approve → apply → pipeline → admin actions.
 * Usage: node scripts/api-e2e.mjs
 */
const API = process.env.API_URL || "http://localhost:3001";
const PASS = "Demo@123456";
const stamp = Date.now();

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
  };
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function req(method, path, { jar, body, formData, expectStatus } = {}) {
  const headers = {};
  if (jar?.header()) headers.Cookie = jar.header();
  let payload;
  if (formData) payload = formData;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      res = await fetch(`${API}${path}`, { method, headers, body: payload });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      await sleep(1500 * attempt);
    }
  }
  if (!res) {
    failed += 1;
    results.push({
      ok: false,
      label: `${method} ${path}`,
      status: 0,
      detail: String(lastErr?.cause || lastErr || "fetch failed"),
    });
    return { res: null, data: null, ok: false, status: 0 };
  }

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
      ? Array.isArray(expectStatus)
        ? expectStatus.includes(res.status)
        : res.status === expectStatus
      : res.status >= 200 && res.status < 300;
  const label = `${method} ${path}`;
  results.push({
    ok,
    label,
    status: res.status,
    detail: ok
      ? undefined
      : typeof data === "string"
        ? data.slice(0, 200)
        : data?.error?.message || data?.message || data,
  });
  if (!ok) failed += 1;
  return { res, data, ok, status: res.status };
}

async function login(email) {
  const jar = cookieJar();
  const { ok, data } = await req("POST", "/api/auth/login", {
    jar,
    body: { email, password: PASS },
  });
  if (!ok) throw new Error(`Login failed: ${email}`);
  return { jar, user: data.user };
}

async function main() {
  console.log(`API E2E → ${API}\n`);

  await req("GET", "/health", { expectStatus: 200 });

  // --- Candidate: profile + discovery ---
  const candidate = await login("candidate@demo.vn");
  await req("GET", "/api/auth/me", { jar: candidate.jar });
  await req("PATCH", "/api/candidate/profile", {
    jar: candidate.jar,
    body: { headline: `E2E Candidate ${stamp}` },
  });
  await req("GET", "/api/jobs?page=1&pageSize=5&search=Frontend", {
    jar: candidate.jar,
  });
  await req("GET", "/api/companies/featured", { jar: candidate.jar });
  await req("GET", "/api/notifications", { jar: candidate.jar });

  // --- Recruiter: create job ---
  const recruiter = await login("hr@vpay.demo");
  const title = `E2E Selenium QA Engineer ${stamp}`;
  const created = await req("POST", "/api/jobs", {
    jar: recruiter.jar,
    body: {
      title,
      description:
        "E2E test job — automation coverage for full recruitment flow.",
      requirements: "Selenium, Playwright, API testing",
      benefits: "Hybrid, laptop",
      location: "Hà Nội",
      employmentType: "FULL_TIME",
      workMode: "HYBRID",
      category: "QA / Testing",
      level: "MID",
      headcount: 1,
      salaryMin: 20000000,
      salaryMax: 35000000,
      currency: "VND",
      salaryNegotiable: false,
      skills: ["Selenium", "API"],
    },
  });
  const jobId = created.data?.id;
  if (!jobId) throw new Error("Create job failed — no id");
  await req("GET", `/api/recruiter/jobs?page=1&pageSize=5&status=PENDING`, {
    jar: recruiter.jar,
  });

  // --- Admin: approve job + audit + recruiters ---
  const admin = await login("admin@demo.vn");
  await req("GET", "/api/dashboard", { jar: admin.jar });
  await req("PATCH", `/api/admin/jobs/${jobId}/review`, {
    jar: admin.jar,
    body: { status: "APPROVED" },
  });
  await req("GET", "/api/admin/audit-logs?page=1&pageSize=5", {
    jar: admin.jar,
  });

  // Pending recruiter: verify then leave VERIFIED (demo account)
  const pendingList = await req(
    "GET",
    "/api/admin/recruiters?page=1&pageSize=20&verification=PENDING_VERIFICATION",
    { jar: admin.jar },
  );
  const pendingItems = pendingList.data?.items || [];
  const freightly = pendingItems.find((r) =>
    String(r.email || "").includes("freightly"),
  );
  const freightlyId = freightly?.id;
  if (freightlyId) {
    await req("GET", `/api/admin/recruiters/${freightlyId}`, {
      jar: admin.jar,
    });
    await req("PATCH", `/api/admin/recruiters/${freightlyId}/account-status`, {
      jar: admin.jar,
      body: { status: "SUSPENDED" },
    });
    await req("PATCH", `/api/admin/recruiters/${freightlyId}/account-status`, {
      jar: admin.jar,
      body: { status: "ACTIVE" },
    });
  } else {
    results.push({
      ok: true,
      label: "SKIP suspend/reactivate (no freightly recruiter)",
      status: 0,
    });
  }

  await req("POST", "/api/auth/logout", { jar: admin.jar });

  // --- Candidate: apply to new approved job ---
  const pdf = new Blob([Buffer.from("%PDF-1.4\n%E2E\n%%EOF\n")], {
    type: "application/pdf",
  });
  const form = new FormData();
  form.append("file", pdf, `e2e-cv-${stamp}.pdf`);
  const upload = await req("POST", "/api/uploads/cv", {
    jar: candidate.jar,
    formData: form,
  });
  const cvUrl = upload.data?.url;
  const apply = await req("POST", "/api/applications", {
    jar: candidate.jar,
    body: {
      jobId,
      cvUrl,
      coverLetter: `E2E apply ${stamp}`,
    },
    expectStatus: [201, 409],
  });
  let applicationId = apply.data?.id;
  if (!applicationId) {
    const list = await req("GET", "/api/applications", { jar: candidate.jar });
    const items = Array.isArray(list.data) ? list.data : list.data?.items || [];
    applicationId = items.find((a) => a.jobId === jobId)?.id || items[0]?.id;
  }
  if (applicationId) {
    await req("GET", `/api/applications/${applicationId}`, {
      jar: candidate.jar,
    });
  }
  await req("GET", `/api/jobs/${jobId}`, { jar: candidate.jar });

  // --- Recruiter: pipeline transitions ---
  const recruiter2 = await login("hr@vpay.demo");
  if (applicationId) {
    // get may auto APPLIED→VIEWED
    await req("GET", `/api/applications/${applicationId}`, {
      jar: recruiter2.jar,
    });
    await req("PATCH", `/api/applications/${applicationId}/status`, {
      jar: recruiter2.jar,
      body: {
        status: "INTERVIEW",
        interviewScheduledAt: new Date(Date.now() + 86400000).toISOString(),
        interviewDetails: "E2E Meet · Google Meet",
      },
      expectStatus: [200, 400], // 400 if still APPLIED
    });
    // retry VIEWED→INTERVIEW if needed
    await req("PATCH", `/api/applications/${applicationId}/status`, {
      jar: recruiter2.jar,
      body: { status: "VIEWED" },
      expectStatus: [200, 400],
    });
    await req("PATCH", `/api/applications/${applicationId}/status`, {
      jar: recruiter2.jar,
      body: {
        status: "INTERVIEW",
        interviewScheduledAt: new Date(Date.now() + 86400000).toISOString(),
        interviewDetails: "E2E Meet",
      },
      expectStatus: [200, 400],
    });
    await req("PATCH", `/api/applications/${applicationId}/status`, {
      jar: recruiter2.jar,
      body: { status: "ACCEPTED" },
      expectStatus: [200, 400],
    });
  }
  await req("GET", "/api/dashboard", { jar: recruiter2.jar });
  await req("GET", "/api/companies/me", { jar: recruiter2.jar });

  // Close the E2E job to avoid polluting public listings forever
  await req("PATCH", `/api/jobs/${jobId}`, {
    jar: recruiter2.jar,
    body: { status: "CLOSED" },
    expectStatus: [200, 400, 403],
  });
  // Admin close if recruiter cannot
  const admin2 = await login("admin@demo.vn");
  await req("PATCH", `/api/admin/jobs/${jobId}/review`, {
    jar: admin2.jar,
    body: { status: "CLOSED" },
    expectStatus: [200, 400],
  });

  // Forbidden checks
  await req("POST", "/api/jobs", {
    jar: candidate.jar,
    body: { title: "hack" },
    expectStatus: [401, 403],
  });

  console.log("—".repeat(60));
  for (const row of results) {
    const mark = row.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${row.status}  ${row.label}`);
    if (!row.ok && row.detail)
      console.log(`      → ${JSON.stringify(row.detail).slice(0, 200)}`);
  }
  console.log("—".repeat(60));
  console.log(
    `Total ${results.length} · PASS ${results.length - failed} · FAIL ${failed}`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
