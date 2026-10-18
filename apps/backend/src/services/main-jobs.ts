import "../common/load-env";
import { JobsModule } from "../jobs/jobs.module";
import {
  reportStartupFailure,
  startTcpMicroservice,
} from "../common/bootstrap";

void startTcpMicroservice(
  JobsModule,
  "Job Service",
  "JOBS_SERVICE_HOST",
  "JOBS_SERVICE_PORT",
  4002,
).catch((error: unknown) => reportStartupFailure("Job Service", error));
