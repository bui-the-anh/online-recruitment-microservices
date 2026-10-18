import "../common/load-env";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsKafkaModule } from "../notifications/notifications-kafka.module";
import {
  reportStartupFailure,
  startKafkaMicroservice,
  startTcpMicroservice,
} from "../common/bootstrap";

void startTcpMicroservice(
  NotificationsModule,
  "Notification Service",
  "NOTIFICATIONS_SERVICE_HOST",
  "NOTIFICATIONS_SERVICE_PORT",
  4004,
).catch((error: unknown) =>
  reportStartupFailure("Notification Service", error),
);

void startKafkaMicroservice(NotificationsKafkaModule).catch((error: unknown) =>
  reportStartupFailure("Notification Kafka consumer", error),
);
