import "./config/env";
import { startAiDescriptionWorker } from "./queue/aiWorker";
import { startWatermarkWorker } from "./queue/watermarkWorker";
import { startContactMailWorker } from "./queue/contactMailWorker";
import { startContactPurgeWorker } from "./queue/contactPurgeWorker";
import { startTransactionalMailWorker } from "./queue/transactionalMail";
import { startPlanLifecycleWorker } from "./queue/planLifecycleWorker";
import { startDomainWorker } from "./queue/domainWorker";

startAiDescriptionWorker();
startWatermarkWorker();
startContactMailWorker();
startContactPurgeWorker();
startTransactionalMailWorker();
startPlanLifecycleWorker();
startDomainWorker();

console.log(
  "[worker] listening for AI + watermark + contact-mail + contact-purge + transactional-mail + plan-lifecycle + domain jobs"
);
