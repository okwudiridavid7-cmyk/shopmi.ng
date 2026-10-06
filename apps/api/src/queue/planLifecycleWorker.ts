import { Worker } from "bullmq";
import {
  getRedisConnection,
  QUEUE_PLAN_LIFECYCLE,
  ensurePlanLifecycleSchedule,
} from "./connection";
import { expirePlans, sendPlanReminders } from "../lib/plans";
import { checkPendingDomains, recheckVerifiedDomains } from "../lib/customDomains";
import { sweepDomains } from "../services/domains";
import { expireStaleOrders } from "../services/orders";
import { expireStalePlanPayments } from "../services/planBilling";

export function startPlanLifecycleWorker(): Worker {
  const worker = new Worker(
    QUEUE_PLAN_LIFECYCLE,
    async () => {
      const orders = await expireStaleOrders().catch((err) => {
        console.error("[worker] order expiry failed:", err instanceof Error ? err.message : err);
        return { expired: 0, recovered: 0 };
      });
      await expireStalePlanPayments().catch((err) => {
        console.error("[worker] plan payment sweep failed:", err instanceof Error ? err.message : err);
      });
      if (orders.expired || orders.recovered) {
        console.log(`[worker] orders expired ${orders.expired}, recovered ${orders.recovered}`);
      }
      const reminded = await sendPlanReminders();
      const expired = await expirePlans();
      const domains = await checkPendingDomains().catch((err) => {
        console.error("[worker] domain checks failed:", err instanceof Error ? err.message : err);
        return { checked: 0, verified: 0, released: 0 };
      });
      const rechecked = await recheckVerifiedDomains().catch((err) => {
        console.error("[worker] domain re-check failed:", err instanceof Error ? err.message : err);
        return { checked: 0, detached: 0 };
      });
      if (domains.released || rechecked.detached) {
        console.log(`[worker] domains released ${domains.released}, detached ${rechecked.detached}`);
      }
      const registered = await sweepDomains().catch((err) => {
        console.error("[worker] domain sweep failed:", err instanceof Error ? err.message : err);
        return { renewed: 0, reminded: 0, expired: 0 };
      });
      if (reminded || expired || domains.verified || registered.renewed || registered.reminded || registered.expired) {
        console.log(
          `[worker] plan-lifecycle reminded ${reminded}, expired ${expired}, domains verified ${domains.verified}/${domains.checked}, registered domains renewed ${registered.renewed} reminded ${registered.reminded} expired ${registered.expired}`
        );
      }
      return { reminded, expired, domains, registered, orders };
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
