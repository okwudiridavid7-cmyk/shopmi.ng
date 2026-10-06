import "./config/env";
import { ensureFontconfig } from "./lib/fonts";
import { startAiDescriptionWorker, startAiImageWorker } from "./queue/aiWorker";
import { startContactMailWorker } from "./queue/contactMailWorker";
import { startContactPurgeWorker } from "./queue/contactPurgeWorker";
import { startTransactionalMailWorker } from "./queue/transactionalMail";
import { startPlanLifecycleWorker } from "./queue/planLifecycleWorker";
import { startDomainWorker } from "./queue/domainWorker";
import { startOrderEventsWorker } from "./queue/orderEventsWorker";
import { startWhatsAppWorker } from "./queue/whatsappWorker";

ensureFontconfig();
startAiDescriptionWorker();
startAiImageWorker();
startContactMailWorker();
startContactPurgeWorker();
startTransactionalMailWorker();
startPlanLifecycleWorker();
startDomainWorker();
startOrderEventsWorker();
startWhatsAppWorker();

console.log(
  "[worker] listening for AI + image-enhance + contact-mail + contact-purge + transactional-mail + plan-lifecycle + domain + order-event + whatsapp jobs"
);
