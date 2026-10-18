import "./common/load-env";
import { bootstrapGateway } from "./gateway.controller";
import { reportStartupFailure } from "./common/bootstrap";

void bootstrapGateway().catch((error: unknown) =>
  reportStartupFailure("API Gateway", error),
);
