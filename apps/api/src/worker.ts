import "./config/env";
import { startAiDescriptionWorker } from "./queue/aiWorker";
import { startWatermarkWorker } from "./queue/watermarkWorker";
import { startContactMailWorker } from "./queue/contactMailWorker";
import { startContactPurgeWorker } from "./queue/contactPurgeWorker";

startAiDescriptionWorker();
startWatermarkWorker();
startContactMailWorker();
startContactPurgeWorker();

console.log(
  "[worker] listening for AI description + watermark + contact-mail + contact-purge jobs"
);
