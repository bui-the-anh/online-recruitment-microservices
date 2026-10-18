import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async handleEvent(
    type: string,
    input: {
      recruiterId?: string;
      candidateId?: string;
      jobId?: string;
      jobTitle?: string;
      rejectionNote?: string;
      status?: string;
    },
  ) {
    const messages: Record<string, { title: string; body: string }> = {
      "recruiter.registered": {
        title: "Có nhà tuyển dụng mới đăng ký",
        body: "Vui lòng rà soát hồ sơ doanh nghiệp để xác minh tài khoản.",
      },
      "application.submitted": {
        title: "Có hồ sơ ứng tuyển mới",
        body: `Có ứng viên mới ứng tuyển vào vị trí ${input.jobTitle ?? "của bạn"}.`,
      },
      "application.status.updated": {
        title: "Hồ sơ ứng tuyển được cập nhật",
        body: `Trạng thái hồ sơ của bạn đã chuyển thành ${input.status ?? "mới"}.`,
      },
      "job.approved": {
        title: "Tin tuyển dụng đã được duyệt",
        body: `Tin "${input.jobTitle ?? ""}" đã được phê duyệt và công khai.`,
      },
      "job.rejected": {
        title: "Tin tuyển dụng chưa được duyệt",
        body: `Tin "${input.jobTitle ?? ""}" bị từ chối. Lý do: ${input.rejectionNote ?? "Vui lòng liên hệ quản trị viên."}`,
      },
      "recruiter.verified": {
        title: "Tài khoản nhà tuyển dụng đã được xác minh",
        body: "Bạn hiện đủ điều kiện tạo tin tuyển dụng.",
      },
      "recruiter.verification.rejected": {
        title: "Yêu cầu xác minh chưa được chấp thuận",
        body: "Vui lòng kiểm tra lại thông tin doanh nghiệp và gửi yêu cầu hỗ trợ.",
      },
      "recruiter.suspended": {
        title: "Tài khoản đã bị tạm khóa",
        body: "Một số chức năng đã bị hạn chế. Vui lòng liên hệ quản trị viên.",
      },
      "recruiter.reactivated": {
        title: "Tài khoản đã được mở khóa",
        body: "Trạng thái xác minh nhà tuyển dụng vẫn được giữ nguyên.",
      },
    };
    const message = messages[type];
    if (!message) return;
    const recipients =
      type === "recruiter.registered"
        ? await this.prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
          })
        : input.recruiterId
          ? [{ id: input.recruiterId }]
          : input.candidateId
            ? [{ id: input.candidateId }]
            : [];
    await this.prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        type,
        title: message.title,
        body: message.body,
        payload: { jobId: input.jobId },
      })),
    });
  }

  async create(input: {
    userId?: string;
    type?: string;
    title?: string;
    body?: string;
    payload?: object;
  }) {
    if (!input.userId || !input.type || !input.title || !input.body) {
      throw new BadRequestException("Vui lòng cung cấp người nhận, loại, tiêu đề và nội dung thông báo");
    }
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload,
      },
    });
  }

  async markRead(input: { userId: string; id: string }) {
    const id = input.id?.trim();
    if (
      !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      throw new BadRequestException("Mã thông báo không hợp lệ");
    }
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId: input.userId },
    });
    if (!notification) throw new NotFoundException("Không tìm thấy thông báo");
    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }
}
