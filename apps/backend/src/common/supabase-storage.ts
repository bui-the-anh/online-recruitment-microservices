import { BadRequestException } from "@nestjs/common";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new BadRequestException(
      `Thiếu cấu hình ${name} cho Supabase Storage`,
    );
  }
  return value;
}

export function storageBucket(): string {
  return (
    process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
    "online-recruitment-microservices"
  );
}

function storageBaseUrl(): string {
  return `${requiredEnv("SUPABASE_URL").replace(/\/$/, "")}/storage/v1`;
}

function serviceHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...extra,
  };
}

async function ensureBucketPublic(bucket: string): Promise<void> {
  const base = storageBaseUrl();
  const getRes = await fetch(`${base}/bucket/${encodeURIComponent(bucket)}`, {
    headers: serviceHeaders(),
  });
  if (!getRes.ok) return;
  const info = (await getRes.json()) as { public?: boolean };
  if (info.public) return;
  await fetch(`${base}/bucket/${encodeURIComponent(bucket)}`, {
    method: "PUT",
    headers: serviceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    }),
  });
}

export async function uploadCvToSupabase(input: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  candidateId?: string;
}): Promise<{ url: string; path: string; bucket: string }> {
  const bucket = storageBucket();
  await ensureBucketPublic(bucket);

  const extension = input.originalName.includes(".")
    ? input.originalName.slice(input.originalName.lastIndexOf(".")).toLowerCase()
    : input.mimeType === "application/pdf"
      ? ".pdf"
      : ".docx";
  const safeBase = input.originalName
    .replace(extension, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 80);
  const folder = input.candidateId ? `cvs/${input.candidateId}` : "cvs";
  const path = `${folder}/${Date.now()}-${safeBase || "cv"}${extension}`;

  const uploadRes = await fetch(
    `${storageBaseUrl()}/object/${encodeURIComponent(bucket)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: serviceHeaders({
        "Content-Type": input.mimeType,
        "x-upsert": "false",
      }),
      body: new Uint8Array(input.buffer),
    },
  );

  if (!uploadRes.ok) {
    const detail = await uploadRes.text();
    throw new BadRequestException(
      `Không tải được CV lên Storage: ${detail || uploadRes.statusText}`,
    );
  }

  const publicUrl = `${requiredEnv("SUPABASE_URL").replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
  return { url: publicUrl, path, bucket };
}
