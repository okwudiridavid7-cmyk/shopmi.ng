import { Worker } from "bullmq";
import {
  getRedisConnection,
  QUEUE_PLAN_LIFECYCLE,
  ensurePlanLifecycleSchedule,
} from "./connection";
import { expirePlans, sendPlanReminders } from "../lib/plans";
import { checkPendingDomains } from "../lib/customDomains";
import { sweepDomains } from "../services/domains";

export function startPlanLifecycleWorker(): Worker {
  const worker = new Worker(
    QUEUE_PLAN_LIFECYCLE,
    async () => {
      const reminded = await sendPlanReminders();
      const expired = await expirePlans();
      const domains = await checkPendingDomains().catch((err) => {
        console.error("[worker] domain checks failed:", err instanceof Error ? err.message : err);
        return { checked: 0, verified: 0 };
      });
      const registered = await sweepDomains().catch((err) => {
        console.error("[worker] domain sweep failed:", err instanceof Error ? err.message : err);
        return { renewed: 0, reminded: 0, expired: 0 };
      });
      if (reminded || expired || domains.verified || registered.renewed || registered.reminded || registered.expired) {
        console.log(
          `[worker] plan-lifecycle reminded ${reminded}, expired ${expired}, domains verified ${domains.verified}/${domains.checked}, registered domains renewed ${registered.renewed} reminded ${registered.reminded} expired ${registered.expired}`
        );
      }
      return { reminded, expired, domains, registered };
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] plan-lifecycle job ${job?.id} failed:`, err.message);
  });

  void ensurePlanLifecycleSchedule().catch((err) => {
    console.error(
      "[worker] failed to schedule plan lifecycle:",
      err instanceof Error ? err.message : err
    );
  });

  console.log("[worker] Plan lifecycle worker started");
  return worker;
}
