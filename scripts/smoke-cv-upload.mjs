import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const api = process.env.API_URL || "http://localhost:3001/api";
const pdfPath = join(tmpdir(), "demo-cv-upload.pdf");
writeFileSync(
  pdfPath,
  Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
);

const loginRes = await fetch(`${api}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "candidate@demo.vn",
    password: "Demo@123456",
  }),
});
const loginBody = await loginRes.json().catch(() => ({}));
if (!loginRes.ok) {
  console.error("LOGIN_FAIL", loginRes.status, loginBody);
  process.exit(1);
}
const cookie = loginRes.headers.getSetCookie?.()?.join("; ") || "";
const rawCookie = cookie || loginRes.headers.get("set-cookie") || "";

const form = new FormData();
form.append(
  "file",
  new Blob([readFileSync(pdfPath)], { type: "application/pdf" }),
  "demo-cv-upload.pdf",
);

const uploadRes = await fetch(`${api}/uploads/cv`, {
  method: "POST",
  headers: rawCookie ? { Cookie: rawCookie.split(",")[0] } : {},
  body: form,
});
const uploadBody = await uploadRes.json().catch(() => ({}));
if (!uploadRes.ok) {
  console.error("UPLOAD_FAIL", uploadRes.status, JSON.stringify(uploadBody));
  process.exit(1);
}
console.log("UPLOAD_OK");
console.log(uploadBody.url);
console.log(uploadBody.path);
console.log(uploadBody.bucket);
