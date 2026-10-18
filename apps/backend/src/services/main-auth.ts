import "../common/load-env";
import { AuthModule } from "../auth/auth.module";
import {
  reportStartupFailure,
  startTcpMicroservice,
} from "../common/bootstrap";

void startTcpMicroservice(
  AuthModule,
  "Auth Service",
  "AUTH_SERVICE_HOST",
  "AUTH_SERVICE_PORT",
  4001,
).catch((error: unknown) => reportStartupFailure("Auth Service", error));
