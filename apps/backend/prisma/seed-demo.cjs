const path = require("node:path");
const { config } = require("dotenv");
const {
  PrismaClient,
  Role,
  AccountStatus,
  VerificationStatus,
  JobStatus,
  EmploymentType,
  WorkMode,
  ApplicationStatus,
} = require("@prisma/client");
const { hash } = require("bcryptjs");

config({ path: path.resolve(__dirname, "../../../.env") });

const DEMO_PASSWORD = "Demo@123456";

const COMPANIES = [
  {
    key: "vpay",
    email: "hr@vpay.demo",
    recruiterName: "Trần Minh Quân",
    name: "FinTech V-Pay Vietnam",
    industry: "FinTech & E-payment",
    location: "Hà Nội",
    address: "Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội",
    description:
      "V-Pay là nền tảng thanh toán số hàng đầu Việt Nam, kết nối hàng triệu người dùng và merchant. Chúng tôi xây dựng hạ tầng e-payment tin cậy, tốc độ cao và mở rộng ra Đông Nam Á với văn hóa engineering-first.",
    website: "https://v-pay.com.vn",
    companySize: "500 - 1,000 nhân sự",
    foundedYear: 2012,
    followersCount: 12400,
    rating: 4.8,
    reviewCount: 512,
    benefits: ["Lương tháng 13+", "MacBook M3 Max", "Hybrid 3 ngày"],
    responseRate: 98,
    avgResponseDays: 2,
    featured: true,
    coverUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
    metrics: [
      { label: "Users", value: "15M+" },
      { label: "Merchants", value: "120K" },
      { label: "Transaction success", value: "99.1%" },
      { label: "E-payment share", value: "65%" },
    ],
    cultureValues: [
      {
        title: "Agile Mindset & Speed",
        description: "Thích ứng nhanh, ship liên tục và đo lường bằng impact.",
      },
      {
        title: "Growth Opportunities",
        description: "Lộ trình học tập và thăng tiến rõ ràng cho mọi cấp bậc.",
      },
      {
        title: "Transparency & Respect",
        description: "Giao tiếp thẳng thắn, tôn trọng ý kiến và dữ liệu.",
      },
      {
        title: "True Work-Life Balance",
        description: "Lịch hybrid linh hoạt, ưu tiên sức khỏe bền vững.",
      },
    ],
    galleryUrls: [
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80",
    ],
    benefitsDetail: [
      {
        title: "Lương tháng 13–15",
        description: "Thưởng hiệu suất và review lương định kỳ 6 tháng.",
      },
      {
        title: "Bảo hiểm sức khỏe toàn diện",
        description: "Gói PVI/VIP cho nhân sự và người thân.",
      },
      {
        title: "MacBook Pro M2/M3",
        description: "Trang bị máy và phụ kiện làm việc từ ngày onboard.",
      },
      {
        title: "Quỹ đào tạo 30 triệu/năm",
        description: "Hỗ trợ khóa học, conference và chứng chỉ chuyên môn.",
      },
    ],
    team: [
      {
        name: "Vũ Phương Linh",
        title: "Senior Talent Partner",
        email: "linh.vu@vpay.demo",
      },
      {
        name: "Trần Minh Đức",
        title: "Technical Recruiter",
        email: "duc.tran@vpay.demo",
      },
    ],
  },
  {
    key: "nexgen",
    email: "talent@nexgen.demo",
    recruiterName: "Lê Hoàng Anh",
    name: "NexGen Soft",
    industry: "SaaS & Cloud",
    location: "Cầu Giấy, Hà Nội",
    description:
      "Đơn vị phát triển sản phẩm SaaS B2B với môi trường học hỏi liên tục và lộ trình thăng tiến rõ ràng.",
    website: "https://nexgen.demo",
    companySize: "200 - 500 nhân sự",
    rating: 4.6,
    reviewCount: 248,
    benefits: ["Bảo hiểm PVI-VIP", "Thưởng dự án 2 lần/năm"],
    responseRate: 96.2,
    featured: true,
    coverUrl:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
  },
  {
    key: "trust",
    email: "careers@trustcorp.demo",
    recruiterName: "Phạm Thu Hà",
    name: "TrustCorp Capital",
    industry: "Tài chính - Ngân hàng",
    location: "Quận 3, TP. Hồ Chí Minh",
    description:
      "Tập đoàn tài chính đa quốc gia, tập trung compliance và trải nghiệm khách hàng số.",
    website: "https://trustcorp.demo",
    companySize: "1,000+ nhân sự",
    rating: 4.5,
    reviewCount: 385,
    benefits: ["ESOP", "Du lịch team building quốc tế"],
    responseRate: 91.4,
    featured: true,
    coverUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
  },
  {
    key: "aivision",
    email: "jobs@aivision.demo",
    recruiterName: "Ngô Đức Huy",
    name: "AI Vision Labs",
    industry: "AI & Data",
    location: "Đà Nẵng",
    description:
      "Lab AI chuyên computer vision và LLM ứng dụng cho logistics và retail.",
    website: "https://aivision.demo",
    companySize: "50 - 200 nhân sự",
    rating: 4.7,
    reviewCount: 176,
    benefits: ["GPU budget cá nhân", "Paper bonus"],
    responseRate: 97.8,
    featured: false,
    coverUrl:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
  },
  {
    key: "pixel",
    email: "hr@pixelcraft.demo",
    recruiterName: "Đặng Mỹ Linh",
    name: "PixelCraft Studio",
    industry: "Thiết kế / UI-UX",
    location: "Quận Bình Thạnh, TP. Hồ Chí Minh",
    description:
      "Studio thiết kế sản phẩm số cho startup và enterprise, không gian làm việc truyền cảm hứng.",
    website: "https://pixelcraft.demo",
    companySize: "20 - 50 nhân sự",
    rating: 4.9,
    reviewCount: 94,
    benefits: ["Design tool full license", "Flexible hours"],
    responseRate: 94.1,
    featured: false,
    coverUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  },
  {
    key: "growth",
    email: "people@growthlab.demo",
    recruiterName: "Vũ Quang Khoa",
    name: "GrowthLab Media",
    industry: "Marketing / Growth",
    location: "Thanh Xuân, Hà Nội",
    description:
      "Agency growth marketing cho thương hiệu công nghệ, performance-driven và data-led.",
    website: "https://growthlab.demo",
    companySize: "50 - 200 nhân sự",
    rating: 4.4,
    reviewCount: 132,
    benefits: ["Commission hấp dẫn", "Học bổng khóa growth"],
    responseRate: 88.6,
    featured: false,
    coverUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
  },
  {
    key: "cloudnine",
    email: "hr@cloudnine.demo",
    recruiterName: "Hoàng Nhật Nam",
    name: "CloudNine Systems",
    industry: "SaaS & Cloud",
    location: "Quận 7, TP. Hồ Chí Minh",
    description:
      "Nền tảng hạ tầng cloud cho SME Việt Nam, đội ngũ SRE và platform engineering mạnh.",
    website: "https://cloudnine.demo",
    companySize: "200 - 500 nhân sự",
    rating: 4.3,
    reviewCount: 201,
    benefits: ["On-call allowance", "Chứng chỉ AWS/GCP"],
    responseRate: 93.0,
    featured: false,
    coverUrl:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
  },
  {
    key: "finpulse",
    email: "talent@finpulse.demo",
    recruiterName: "Bùi Thanh Trúc",
    name: "FinPulse Analytics",
    industry: "Fintech & Gateway",
    location: "Hai Bà Trưng, Hà Nội",
    description:
      "Phân tích rủi ro tín dụng real-time cho ngân hàng số và ví điện tử.",
    website: "https://finpulse.demo",
    companySize: "50 - 200 nhân sự",
    rating: 4.6,
    reviewCount: 158,
    benefits: ["Stock options", "Remote 2 ngày/tuần"],
    responseRate: 98.1,
    featured: false,
    coverUrl:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80",
  },
];

const JOBS = [
  {
    companyKey: "vpay",
    title: "Senior Frontend Engineer (React/TypeScript)",
    category: "IT / Phần mềm",
    location: "Quận 1, TP. Hồ Chí Minh",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 3,
    experienceMax: 5,
    salaryMin: 35000000,
    salaryMax: 50000000,
    fastResponse: true,
    description:
      "Xây dựng trải nghiệm thanh toán web cho hàng triệu người dùng. Tech stack React, TypeScript, Next.js.",
    requirements:
      "Thành thạo React và TypeScript\nCó kinh nghiệm xây UI hệ thống phức tạp\nHiểu biết UI/UX và accessibility\nƯu tiên ứng viên từng làm fintech/payment",
    daysLeft: 15,
  },
  {
    companyKey: "nexgen",
    title: "Backend Engineer (Golang)",
    category: "IT / Phần mềm",
    location: "Cầu Giấy, Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.ONSITE,
    experienceMin: 2,
    experienceMax: 4,
    salaryMin: 28000000,
    salaryMax: 42000000,
    fastResponse: true,
    description: "Thiết kế API microservices hiệu năng cao phục vụ SaaS B2B.",
    requirements:
      "Thành thạo Golang\nKinh nghiệm PostgreSQL và thiết kế schema\nĐã làm việc với Kafka hoặc message queue\nBiết Docker và triển khai microservices",
    daysLeft: 22,
  },
  {
    companyKey: "trust",
    title: "Product Designer (UI/UX)",
    category: "Thiết kế / UI-UX",
    location: "Quận 3, TP. Hồ Chí Minh",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 25000000,
    salaryMax: 40000000,
    fastResponse: false,
    description: "Thiết kế trải nghiệm sản phẩm đầu tư và quản lý tài sản.",
    requirements: "Figma, Design System, research với người dùng.",
    daysLeft: 10,
  },
  {
    companyKey: "aivision",
    title: "Machine Learning Engineer",
    category: "IT / Phần mềm",
    location: "Đà Nẵng",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.REMOTE,
    experienceMin: 2,
    experienceMax: 5,
    salaryMin: 40000000,
    salaryMax: 65000000,
    fastResponse: true,
    description: "Triển khai mô hình LLM và pipeline inference production.",
    requirements: "Python, PyTorch, MLOps.",
    daysLeft: 30,
  },
  {
    companyKey: "pixel",
    title: "UI Designer",
    category: "Thiết kế / UI-UX",
    location: "Quận Bình Thạnh, TP. Hồ Chí Minh",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 1,
    experienceMax: 3,
    salaryMin: 18000000,
    salaryMax: 28000000,
    fastResponse: true,
    description: "Thiết kế giao diện web/mobile cho sản phẩm startup.",
    requirements: "Figma, visual design, prototype.",
    daysLeft: 18,
  },
  {
    companyKey: "growth",
    title: "Growth Marketing Specialist",
    category: "Marketing / Growth",
    location: "Thanh Xuân, Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.ONSITE,
    experienceMin: 2,
    experienceMax: 4,
    salaryMin: 20000000,
    salaryMax: 32000000,
    fastResponse: false,
    description: "Tối ưu funnel acquisition và retention cho khách hàng tech.",
    requirements: "Performance ads, analytics, A/B testing.",
    daysLeft: 12,
  },
  {
    companyKey: "vpay",
    title: "Risk Analyst (Fintech)",
    category: "Tài chính - Fintech",
    location: "Quận 1, TP. Hồ Chí Minh",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.ONSITE,
    experienceMin: 2,
    experienceMax: 5,
    salaryMin: 22000000,
    salaryMax: 35000000,
    fastResponse: true,
    description: "Phân tích rủi ro giao dịch và xây dựng rule engine chống gian lận.",
    requirements: "SQL, Excel/Python, hiểu biết thanh toán số.",
    daysLeft: 20,
  },
  {
    companyKey: "vpay",
    title: "Backend Engineer (Java/Spring)",
    category: "IT / Phần mềm",
    location: "Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 35000000,
    salaryMax: 55000000,
    fastResponse: true,
    description: "Xây dựng core payment service độ tin cậy cao, throughput lớn.",
    requirements: "Java, Spring Boot, Kafka, PostgreSQL.",
    daysLeft: 12,
  },
  {
    companyKey: "vpay",
    title: "Product Manager (Payments)",
    category: "Sản phẩm",
    location: "Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 4,
    experienceMax: 8,
    salaryMin: 40000000,
    salaryMax: 65000000,
    fastResponse: false,
    description: "Định hướng roadmap sản phẩm thanh toán cho merchant và ví điện tử.",
    requirements: "Kinh nghiệm fintech/payment, discovery và delivery.",
    daysLeft: 18,
  },
  {
    companyKey: "vpay",
    title: "QA Automation Engineer",
    category: "IT / Phần mềm",
    location: "Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.ONSITE,
    experienceMin: 2,
    experienceMax: 4,
    salaryMin: 20000000,
    salaryMax: 32000000,
    fastResponse: true,
    description: "Xây dựng framework test tự động cho luồng thanh toán critical.",
    requirements: "Playwright/Cypress, API testing, CI.",
    daysLeft: 9,
  },
  {
    companyKey: "trust",
    title: "Investment Banking Analyst",
    category: "Tài chính - Fintech",
    location: "Quận 3, TP. Hồ Chí Minh",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.ONSITE,
    experienceMin: 1,
    experienceMax: 3,
    salaryMin: 25000000,
    salaryMax: 38000000,
    fastResponse: false,
    description: "Hỗ trợ deal M&A và định giá doanh nghiệp.",
    requirements: "Tài chính doanh nghiệp, modeling.",
    daysLeft: 25,
  },
  {
    companyKey: "nexgen",
    title: "React Native Developer",
    category: "IT / Phần mềm",
    location: "Cầu Giấy, Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 2,
    experienceMax: 4,
    salaryMin: 26000000,
    salaryMax: 40000000,
    fastResponse: true,
    description: "Phát triển ứng dụng mobile cho khách hàng enterprise.",
    requirements: "React Native, TypeScript.",
    daysLeft: 14,
  },
  {
    companyKey: "growth",
    title: "Content Marketing Lead",
    category: "Marketing / Growth",
    location: "Thanh Xuân, Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 22000000,
    salaryMax: 35000000,
    fastResponse: false,
    description: "Dẫn dắt đội content và chiến lược storytelling thương hiệu.",
    requirements: "Content strategy, SEO, quản lý team.",
    daysLeft: 16,
  },
  {
    companyKey: "cloudnine",
    title: "Platform Engineer (SRE)",
    category: "IT / Phần mềm",
    location: "Quận 7, TP. Hồ Chí Minh",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 35000000,
    salaryMax: 55000000,
    fastResponse: true,
    description: "Xây dựng platform Kubernetes và observability cho sản phẩm cloud.",
    requirements: "Kubernetes, Terraform, Go hoặc Python.",
    daysLeft: 19,
  },
  {
    companyKey: "finpulse",
    title: "Data Scientist (Credit Risk)",
    category: "Tài chính - Fintech",
    location: "Hai Bà Trưng, Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.REMOTE,
    experienceMin: 2,
    experienceMax: 5,
    salaryMin: 30000000,
    salaryMax: 48000000,
    fastResponse: true,
    description: "Xây mô hình scorecard và giám sát rủi ro tín dụng realtime.",
    requirements: "Python, SQL, kinh nghiệm credit scoring.",
    daysLeft: 21,
  },
  {
    companyKey: "vpay",
    title: "Senior DevOps Engineer (AWS/Kubernetes)",
    category: "IT / Phần mềm",
    location: "Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 4,
    experienceMax: 7,
    salaryMin: 40000000,
    salaryMax: 65000000,
    fastResponse: true,
    description: "Vận hành nền tảng payment trên AWS/EKS, on-call rotation.",
    requirements: "Kubernetes, Terraform, observability stack.",
    daysLeft: 20,
    status: JobStatus.PENDING,
  },
  {
    companyKey: "nexgen",
    title: "Staff Platform Engineer",
    category: "IT / Phần mềm",
    location: "Cầu Giấy, Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    experienceMin: 5,
    experienceMax: 9,
    salaryMin: 45000000,
    salaryMax: 70000000,
    fastResponse: false,
    description: "Thiết kế internal developer platform cho sản phẩm SaaS.",
    requirements: "Go/Python, Kubernetes, platform engineering.",
    daysLeft: 15,
    status: JobStatus.PENDING,
  },
  {
    companyKey: "aivision",
    title: "MLOps Engineer",
    category: "IT / Phần mềm",
    location: "Đà Nẵng",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.REMOTE,
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 35000000,
    salaryMax: 55000000,
    fastResponse: true,
    description: "Triển khai và giám sát pipeline inference production.",
    requirements: "Python, Docker, model serving.",
    daysLeft: 11,
    status: JobStatus.PENDING,
  },
  {
    companyKey: "trust",
    title: "Compliance Analyst (Banking)",
    category: "Tài chính - Ngân hàng",
    location: "Quận 3, TP. Hồ Chí Minh",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.ONSITE,
    experienceMin: 2,
    experienceMax: 5,
    salaryMin: 22000000,
    salaryMax: 35000000,
    fastResponse: false,
    description: "Hỗ trợ kiểm soát tuân thủ và báo cáo nội bộ.",
    requirements: "Kiến thức banking compliance, tiếng Anh tốt.",
    daysLeft: 14,
    status: JobStatus.PENDING,
  },
  {
    companyKey: "pixel",
    title: "Brand Designer (Contract)",
    category: "Thiết kế / UI-UX",
    location: "Quận Bình Thạnh, TP. Hồ Chí Minh",
    employmentType: EmploymentType.CONTRACT,
    workMode: WorkMode.REMOTE,
    experienceMin: 2,
    experienceMax: 4,
    salaryMin: 18000000,
    salaryMax: 25000000,
    fastResponse: false,
    description: "Hỗ trợ hệ thống nhận diện thương hiệu cho khách hàng agency.",
    requirements: "Illustrator, Figma, brand guidelines.",
    daysLeft: 5,
    status: JobStatus.CLOSED,
  },
  {
    companyKey: "growth",
    title: "SEO Specialist (Rejected Demo)",
    category: "Marketing / Growth",
    location: "Thanh Xuân, Hà Nội",
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.ONSITE,
    experienceMin: 1,
    experienceMax: 3,
    salaryMin: 12000000,
    salaryMax: 18000000,
    fastResponse: false,
    description: "Tin demo bị từ chối để phục vụ màn admin.",
    requirements: "SEO cơ bản.",
    daysLeft: 7,
    status: JobStatus.REJECTED,
  },
];

const PENDING_COMPANIES = [
  {
    key: "orbitech",
    email: "hr@orbitech.demo",
    recruiterName: "Nguyễn Hải Đăng",
    name: "Công ty Cổ phần Công nghệ OrbiTech",
    industry: "Công nghệ thông tin",
    location: "Quận 7, TP. Hồ Chí Minh",
    description: "Startup IoT và phần mềm công nghiệp đang chờ xác minh.",
    website: "https://orbitech.demo",
    companySize: "50 - 200 nhân sự",
  },
  {
    key: "cubeads",
    email: "talent@cubeads.demo",
    recruiterName: "Lý Minh Châu",
    name: "CubeAds Media JSC",
    industry: "Marketing / Growth",
    location: "Cầu Giấy, Hà Nội",
    description: "Agency quảng cáo số chờ xác minh giấy phép kinh doanh.",
    website: "https://cubeads.demo",
    companySize: "20 - 50 nhân sự",
  },
  {
    key: "freightly",
    email: "people@freightly.demo",
    recruiterName: "Phan Quốc Bảo",
    name: "Freightly Logistics Vietnam",
    industry: "Logistics",
    location: "Bình Dương",
    description: "Nền tảng logistics số cho SME, hồ sơ đang chờ duyệt.",
    website: "https://freightly.demo",
    companySize: "200 - 500 nhân sự",
  },
  {
    key: "shieldpay",
    email: "compliance@shieldpay.demo",
    recruiterName: "Đỗ Thu Trang",
    name: "ShieldPay Security",
    industry: "Fintech & Gateway",
    location: "Hà Nội",
    description: "Công ty bảo mật thanh toán đang hoàn thiện xác minh.",
    website: "https://shieldpay.demo",
    companySize: "50 - 200 nhân sự",
  },
];

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function hashCode(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

async function upsertUser(prisma, data) {
  const passwordHash = await hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      fullName: data.fullName,
      role: data.role,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: data.verificationStatus ?? null,
      passwordHash,
    },
    create: {
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: data.verificationStatus ?? null,
      passwordHash,
    },
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();

    const candidate = await upsertUser(prisma, {
      email: "candidate@demo.vn",
      fullName: "Nguyễn Thu Hà",
      role: Role.CANDIDATE,
    });
    await prisma.candidateProfile.upsert({
      where: { userId: candidate.id },
      update: {
        phone: "0912 345 678",
        location: "Quận Cầu Giấy, Hà Nội",
        headline: "Senior Frontend Engineer",
        bio: "Hơn 4 năm kinh nghiệm xây dựng Single Page Applications và Mobile Apps với React/TypeScript. Am hiểu kiến trúc component, tối ưu hiệu năng web và làm việc tốt trong môi trường agile/fintech.",
        experienceYears: 4.5,
        level: "Senior / Lead",
        expectedSalaryMin: 40000000,
        expectedSalaryMax: 55000000,
        workPreference: "Sẵn sàng làm việc tại TP.HCM hoặc Remote",
        skills: [
          "React.js",
          "TypeScript",
          "Tailwind CSS",
          "Next.js",
          "Redux Toolkit",
          "Micro-frontend",
          "Jest / Testing Library",
          "GraphQL & REST",
          "CI/CD Pipeline",
        ],
        skillLevels: [
          { name: "React Architecture & State Management", percent: 96 },
          { name: "TypeScript & Web Performance Optimization", percent: 88 },
        ],
      },
      create: {
        userId: candidate.id,
        phone: "0912 345 678",
        location: "Quận Cầu Giấy, Hà Nội",
        headline: "Senior Frontend Engineer",
        bio: "Hơn 4 năm kinh nghiệm xây dựng Single Page Applications và Mobile Apps với React/TypeScript. Am hiểu kiến trúc component, tối ưu hiệu năng web và làm việc tốt trong môi trường agile/fintech.",
        experienceYears: 4.5,
        level: "Senior / Lead",
        expectedSalaryMin: 40000000,
        expectedSalaryMax: 55000000,
        workPreference: "Sẵn sàng làm việc tại TP.HCM hoặc Remote",
        skills: [
          "React.js",
          "TypeScript",
          "Tailwind CSS",
          "Next.js",
          "Redux Toolkit",
          "Micro-frontend",
          "Jest / Testing Library",
          "GraphQL & REST",
          "CI/CD Pipeline",
        ],
        skillLevels: [
          { name: "React Architecture & State Management", percent: 96 },
          { name: "TypeScript & Web Performance Optimization", percent: 88 },
        ],
      },
    });

    await upsertUser(prisma, {
      email: "admin@demo.vn",
      fullName: "Super Admin",
      role: Role.ADMIN,
    });

    const companyMap = {};
    for (const company of COMPANIES) {
      const recruiter = await upsertUser(prisma, {
        email: company.email,
        fullName: company.recruiterName,
        role: Role.RECRUITER,
        verificationStatus: VerificationStatus.VERIFIED,
      });
      const companyData = {
        name: company.name,
        industry: company.industry,
        location: company.location,
        address: company.address ?? company.location ?? null,
        taxCode: company.taxCode ?? `0${Math.abs(hashCode(company.key)) % 9000000000 + 1000000000}`,
        contactPhone: company.contactPhone ?? `09${String(Math.abs(hashCode(company.key)) % 100000000).padStart(8, "0")}`,
        description: company.description,
        website: company.website,
        companySize: company.companySize ?? null,
        foundedYear: company.foundedYear ?? null,
        followersCount: company.followersCount ?? 0,
        rating: company.rating ?? null,
        reviewCount: company.reviewCount ?? 0,
        benefits: company.benefits ?? [],
        benefitsDetail: company.benefitsDetail ?? [],
        responseRate: company.responseRate ?? null,
        avgResponseDays: company.avgResponseDays ?? null,
        coverUrl: company.coverUrl ?? null,
        galleryUrls: company.galleryUrls ?? [],
        metrics: company.metrics ?? [],
        cultureValues: company.cultureValues ?? [],
        team: company.team ?? [],
        featured: Boolean(company.featured),
        verificationDetails: "Seed demo — đã xác minh",
        licenseDocumentUrl:
          company.licenseDocumentUrl ??
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        licenseDocumentName:
          company.licenseDocumentName ??
          `DKKD_${company.key.toUpperCase()}_SIGNED.pdf`,
      };
      const saved = await prisma.company.upsert({
        where: { recruiterId: recruiter.id },
        update: companyData,
        create: {
          recruiterId: recruiter.id,
          ...companyData,
        },
      });
      companyMap[company.key] = { company: saved, recruiter };
    }

    for (const company of PENDING_COMPANIES) {
      const isRejected = company.key === "shieldpay";
      const recruiter = await upsertUser(prisma, {
        email: company.email,
        fullName: company.recruiterName,
        role: Role.RECRUITER,
        verificationStatus: isRejected
          ? VerificationStatus.REJECTED
          : VerificationStatus.PENDING_VERIFICATION,
      });
      await prisma.company.upsert({
        where: { recruiterId: recruiter.id },
        update: {
          name: company.name,
          industry: company.industry,
          location: company.location,
          address: company.location,
          taxCode: `0${Math.abs(hashCode(company.key)) % 9000000000 + 1000000000}`,
          contactPhone: `09${String(Math.abs(hashCode(company.key)) % 100000000).padStart(8, "0")}`,
          description: company.description,
          website: company.website,
          companySize: company.companySize ?? null,
          verificationDetails: isRejected
            ? "GPKD không khớp MST"
            : "Seed demo — chờ xác minh (3 tài liệu cần duyệt)",
        },
        create: {
          recruiterId: recruiter.id,
          name: company.name,
          industry: company.industry,
          location: company.location,
          address: company.location,
          taxCode: `0${Math.abs(hashCode(company.key)) % 9000000000 + 1000000000}`,
          contactPhone: `09${String(Math.abs(hashCode(company.key)) % 100000000).padStart(8, "0")}`,
          description: company.description,
          website: company.website,
          companySize: company.companySize ?? null,
          verificationDetails: isRejected
            ? "GPKD không khớp MST"
            : "Seed demo — chờ xác minh (3 tài liệu cần duyệt)",
        },
      });
    }

    // Demo: đình chỉ 1 recruiter đã xác minh
    const suspended = await prisma.user.findUnique({
      where: { email: "people@growthlab.demo" },
    });
    if (suspended) {
      await prisma.user.update({
        where: { id: suspended.id },
        data: { accountStatus: AccountStatus.SUSPENDED },
      });
      await prisma.company.updateMany({
        where: { recruiterId: suspended.id },
        data: {
          verificationDetails:
            "Vi phạm spam tuyển dụng — tài khoản bị đình chỉ",
        },
      });
    }

    const jobByTitle = {};
    for (const job of JOBS) {
      const ctx = companyMap[job.companyKey];
      const existing = await prisma.job.findFirst({
        where: {
          companyId: ctx.company.id,
          title: job.title,
        },
      });
      const payload = {
        companyId: ctx.company.id,
        recruiterId: ctx.recruiter.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        employmentType: job.employmentType,
        workMode: job.workMode,
        category: job.category,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        fastResponse: job.fastResponse,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: "VND",
        status: job.status ?? JobStatus.APPROVED,
        publishedAt:
          (job.status ?? JobStatus.APPROVED) === JobStatus.APPROVED ||
          (job.status ?? JobStatus.APPROVED) === JobStatus.CLOSED
            ? new Date()
            : null,
        expiresAt: daysFromNow(job.daysLeft),
        rejectionNote:
          (job.status ?? JobStatus.APPROVED) === JobStatus.REJECTED
            ? "Seed demo — tin bị từ chối để kiểm thử admin."
            : null,
      };
      const saved = existing
        ? await prisma.job.update({ where: { id: existing.id }, data: payload })
        : await prisma.job.create({ data: payload });
      jobByTitle[job.title] = saved;
    }

    const extraCandidates = [
      {
        email: "minh.an@demo.vn",
        fullName: "Lê Minh An",
        headline: "Frontend Engineer",
        location: "Quận 1, TP.HCM",
        experienceYears: 3,
        skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
        expectedSalaryMin: 30000000,
        expectedSalaryMax: 40000000,
        bio: "3 năm xây dựng dashboard fintech với React/TypeScript.",
      },
      {
        email: "bao.ngoc@demo.vn",
        fullName: "Phạm Bảo Ngọc",
        headline: "React Specialist",
        location: "Đà Nẵng",
        experienceYears: 5,
        skills: ["React 18", "Next.js", "GraphQL", "CI/CD"],
        expectedSalaryMin: 35000000,
        expectedSalaryMax: 48000000,
        bio: "Chuyên micro-frontend và tối ưu Core Web Vitals.",
      },
      {
        email: "hoang.nam@demo.vn",
        fullName: "Trần Hoàng Nam",
        headline: "Full-stack JS",
        location: "Hà Nội - Hybrid",
        experienceYears: 2.5,
        skills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
        expectedSalaryMin: 25000000,
        expectedSalaryMax: 35000000,
        bio: "Full-stack junior-mid, sẵn sàng học Go/Kafka.",
      },
      {
        email: "thuy.linh@demo.vn",
        fullName: "Đỗ Thùy Linh",
        headline: "Senior Frontend",
        location: "Cầu Giấy, Hà Nội",
        experienceYears: 6,
        skills: [
          "React",
          "TypeScript",
          "Next.js",
          "Micro-Frontend",
          "Web Performance",
        ],
        expectedSalaryMin: 45000000,
        expectedSalaryMax: 60000000,
        bio: "Lead FE cho sản phẩm payment, kinh nghiệm mentoring.",
      },
    ];

    const seededCandidates = [{ user: candidate, profileReady: true }];
    for (const item of extraCandidates) {
      const user = await upsertUser(prisma, {
        email: item.email,
        fullName: item.fullName,
        role: Role.CANDIDATE,
      });
      await prisma.candidateProfile.upsert({
        where: { userId: user.id },
        update: {
          location: item.location,
          headline: item.headline,
          bio: item.bio,
          experienceYears: item.experienceYears,
          expectedSalaryMin: item.expectedSalaryMin,
          expectedSalaryMax: item.expectedSalaryMax,
          skills: item.skills,
          workPreference: item.location,
        },
        create: {
          userId: user.id,
          location: item.location,
          headline: item.headline,
          bio: item.bio,
          experienceYears: item.experienceYears,
          expectedSalaryMin: item.expectedSalaryMin,
          expectedSalaryMax: item.expectedSalaryMax,
          skills: item.skills,
          workPreference: item.location,
        },
      });
      seededCandidates.push({ user, profileReady: true });
    }

    const demoApplications = [
      {
        title: "Senior Frontend Engineer (React/TypeScript)",
        candidateEmail: "candidate@demo.vn",
        status: ApplicationStatus.INTERVIEW,
        cvUrl: "http://localhost:3001/uploads/demo-cv-frontend.pdf",
        daysAgo: 1,
        coverLetter:
          "Em có 4.5 năm kinh nghiệm Core Payment / fintech FE. Thành thạo React 18, TypeScript, Next.js và kiến trúc micro-frontend. Mong được đóng góp vào đội Frontend của V-Pay.",
        interviewScheduledAt: (() => {
          const d = new Date();
          d.setHours(10, 30, 0, 0);
          return d;
        })(),
        interviewDetails: "Vòng kỹ thuật · Google Meet · Hôm nay 10:30",
      },
      {
        title: "Senior Frontend Engineer (React/TypeScript)",
        candidateEmail: "minh.an@demo.vn",
        status: ApplicationStatus.APPLIED,
        cvUrl: "http://localhost:3001/uploads/demo-cv-frontend.pdf",
        daysAgo: 0,
        coverLetter: "Em ứng tuyển vị trí Senior Frontend tại V-Pay.",
        interviewScheduledAt: null,
        interviewDetails: null,
      },
      {
        title: "Senior Frontend Engineer (React/TypeScript)",
        candidateEmail: "bao.ngoc@demo.vn",
        status: ApplicationStatus.VIEWED,
        cvUrl: "http://localhost:3001/uploads/demo-cv-frontend.pdf",
        daysAgo: 2,
        coverLetter: "Kinh nghiệm tối ưu performance cho SPA tài chính.",
        interviewScheduledAt: null,
        interviewDetails: null,
      },
      {
        title: "Senior Frontend Engineer (React/TypeScript)",
        candidateEmail: "hoang.nam@demo.vn",
        status: ApplicationStatus.REJECTED,
        cvUrl: "http://localhost:3001/uploads/demo-cv-frontend.pdf",
        daysAgo: 5,
        coverLetter: "Em muốn chuyển hướng sang fintech frontend.",
        interviewScheduledAt: null,
        interviewDetails: null,
      },
      {
        title: "Senior Frontend Engineer (React/TypeScript)",
        candidateEmail: "thuy.linh@demo.vn",
        status: ApplicationStatus.ACCEPTED,
        cvUrl: "http://localhost:3001/uploads/demo-cv-frontend.pdf",
        daysAgo: 10,
        coverLetter: "Sẵn sàng onboard ngay trong tháng này.",
        interviewScheduledAt: null,
        interviewDetails: null,
      },
      {
        title: "Backend Engineer (Java/Spring)",
        candidateEmail: "candidate@demo.vn",
        status: ApplicationStatus.APPLIED,
        cvUrl: "http://localhost:3001/uploads/demo-cv-frontend.pdf",
        daysAgo: 3,
        coverLetter: "Em cũng quan tâm backend payment nếu phù hợp.",
        interviewScheduledAt: null,
        interviewDetails: null,
      },
      {
        title: "Product Designer (UI/UX)",
        candidateEmail: "candidate@demo.vn",
        status: ApplicationStatus.INTERVIEW,
        cvUrl: "http://localhost:3001/uploads/demo-cv-designer.pdf",
        daysAgo: 7,
        coverLetter: "Đơn ứng tuyển demo từ seed.",
        interviewScheduledAt: daysFromNow(3),
        interviewDetails:
          "Lịch hẹn Vòng 1: 14:00 - Thứ Sáu qua Google Meet · Chị Lan Anh (HR Lead)",
      },
      {
        title: "React Native Developer",
        candidateEmail: "candidate@demo.vn",
        status: ApplicationStatus.VIEWED,
        cvUrl: "http://localhost:3001/uploads/demo-cv-mobile.pdf",
        daysAgo: 20,
        coverLetter: "Đơn ứng tuyển demo từ seed.",
        interviewScheduledAt: null,
        interviewDetails: null,
      },
    ];

    const candidateByEmail = Object.fromEntries(
      seededCandidates.map((row) => [row.user.email, row.user]),
    );
    // ensure primary candidate email key
    candidateByEmail["candidate@demo.vn"] = candidate;

    for (const item of demoApplications) {
      const job = jobByTitle[item.title];
      const applicant = candidateByEmail[item.candidateEmail];
      if (!job || !applicant) continue;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - item.daysAgo);
      await prisma.application.upsert({
        where: {
          jobId_candidateId: {
            jobId: job.id,
            candidateId: applicant.id,
          },
        },
        update: {
          status: item.status,
          cvUrl: item.cvUrl,
          coverLetter: item.coverLetter,
          interviewScheduledAt: item.interviewScheduledAt,
          interviewDetails: item.interviewDetails,
        },
        create: {
          jobId: job.id,
          candidateId: applicant.id,
          status: item.status,
          cvUrl: item.cvUrl,
          coverLetter: item.coverLetter,
          interviewScheduledAt: item.interviewScheduledAt,
          interviewDetails: item.interviewDetails,
          createdAt,
        },
      });
    }

    console.log("Seed demo OK.");
    console.log(`Candidate login: candidate@demo.vn / ${DEMO_PASSWORD}`);
    console.log(`Admin login: admin@demo.vn / ${DEMO_PASSWORD}`);
    console.log("Recruiter ví dụ: hr@vpay.demo /", DEMO_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
