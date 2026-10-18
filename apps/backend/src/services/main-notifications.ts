import "../common/load-env";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsKafkaModule } from "../notifications/notifications-kafka.module";
import {
  reportStartupFailure,
  startKafkaMicroservice,
  startTcpMicroservice,
} from "../common/bootstrap";

void Promise.all([
  startTcpMicroservice(
    NotificationsModule,
    "Notification Service",
    "NOTIFICATIONS_SERVICE_HOST",
    "NOTIFICATIONS_SERVICE_PORT",
    4004,
  ),
  startKafkaMicroservice(NotificationsKafkaModule),
]).catch((error: unknown) =>
  reportStartupFailure("Notification Service", error),
);
