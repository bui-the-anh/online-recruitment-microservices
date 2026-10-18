const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket =
  process.env.SUPABASE_STORAGE_BUCKET || "online-recruitment-microservices";

if (!url || !key) {
  console.error("MISSING_ENV");
  process.exit(1);
}

const path = `cvs/smoke/${Date.now()}-demo.pdf`;
const bytes = Buffer.from("%PDF-1.4\n%%EOF\n");

const putBucket = await fetch(`${url}/storage/v1/bucket/${bucket}`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ public: true, fileSizeLimit: 5242880 }),
});
console.log("BUCKET_UPDATE", putBucket.status);

const upload = await fetch(
  `${url}/storage/v1/object/${bucket}/${path}`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: bytes,
  },
);
const text = await upload.text();
if (!upload.ok) {
  console.error("UPLOAD_ERR", upload.status, text);
  process.exit(1);
}

console.log("STORAGE_OK");
console.log(`${url}/storage/v1/object/public/${bucket}/${path}`);
console.log(path);
