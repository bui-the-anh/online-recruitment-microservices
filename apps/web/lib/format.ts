export function companyInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9À-ỹ\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "DN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatSalaryRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  currency = "VND",
): string {
  const toNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const minN = toNumber(min);
  const maxN = toNumber(max);
  const format = (n: number) =>
    new Intl.NumberFormat("vi-VN").format(Math.round(n));
  if (minN !== null && maxN !== null) {
    return `${format(minN)} - ${format(maxN)} đ/tháng`;
  }
  if (minN !== null) return `Từ ${format(minN)} đ/tháng`;
  if (maxN !== null) return `Đến ${format(maxN)} đ/tháng`;
  return currency === "VND" ? "Thỏa thuận" : "Negotiable";
}

export function daysUntil(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const end = new Date(dateValue).getTime();
  if (Number.isNaN(end)) return null;
  const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function experienceLabel(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min != null && max != null) return `${min}-${max} năm`;
  if (min != null) return `${min}+ năm`;
  if (max != null) return `Đến ${max} năm`;
  return "Không yêu cầu";
}

export function employmentTypeLabel(value: string): string {
  const map: Record<string, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
    INTERNSHIP: "Internship",
    TEMPORARY: "Temporary",
  };
  return map[value] ?? value;
}

export function workModeLabel(value: string): string {
  const map: Record<string, string> = {
    ONSITE: "Onsite",
    HYBRID: "Hybrid",
    REMOTE: "Remote",
  };
  return map[value] ?? value;
}

const LOGO_COLORS = [
  "bg-[#003C90]",
  "bg-[#0F52BA]",
  "bg-[#006A61]",
  "bg-[#5B4B8A]",
  "bg-[#B54708]",
  "bg-[#0B6E4F]",
];

export function logoColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % LOGO_COLORS.length;
  }
  return LOGO_COLORS[hash];
}
