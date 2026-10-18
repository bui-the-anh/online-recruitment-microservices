import "../common/load-env";
import { ApplicationsModule } from "../applications/applications.module";
import {
  reportStartupFailure,
  startTcpMicroservice,
} from "../common/bootstrap";

void startTcpMicroservice(
  ApplicationsModule,
  "Application Service",
  "APPLICATIONS_SERVICE_HOST",
  "APPLICATIONS_SERVICE_PORT",
  4003,
).catch((error: unknown) => reportStartupFailure("Application Service", error));
