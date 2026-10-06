import { UnrecoverableError, Worker } from "bullmq";
import { prisma } from "../db/prisma";
import { AiUnavailableError, generateProductDescription } from "../services/aiDescription";
import { enhanceProductImage } from "../services/imageEnhance";
import { getObject } from "../lib/storage";
import {
  getRedisConnection,
  QUEUE_AI_DESCRIPTION,
  QUEUE_AI_IMAGE,
  type DescriptionJobPayload,
  type EnhanceJobPayload,
} from "./connection";

async function markFailed(aiJobId: string, message: string, permanent: boolean): Promise<never> {
  await prisma.aiJob.update({
    where: { id: aiJobId },
    data: {
      status: "failed",
      error: message.slice(0, 500),
      completedAt: new Date(),
    },
  });
  if (permanent) throw new UnrecoverableError(message);
  throw new Error(message);
}

export function startAiDescriptionWorker(): Worker {
  const worker = new Worker<DescriptionJobPayload>(
    QUEUE_AI_DESCRIPTION,
    async (job) => {
      const { aiJobId, title, categoryName, shopCategoryName, brandName, location } = job.data;

      await prisma.aiJob.update({
        where: { id: aiJobId },
        data: { status: "processing" },
      });

      try {
        const description = await generateProductDescription({
          title,
          categoryName,
          shopCategoryName,
          brandName,
          location,
        });

        // Never write the description onto the product here. The seller reviews it and
        // saves; a retry must not overwrite a description they already edited.
        await prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: "completed",
            result: { description },
            completedAt: new Date(),
          },
        });

        return { description };
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI job failed";
        const permanent = err instanceof AiUnavailableError;
        await markFailed(aiJobId, message, permanent);
      }
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] description job ${job?.id} failed:`, err.message);
  });

  console.log("[worker] AI description worker started");
  return worker;
}

export function startAiImageWorker(): Worker {
  const worker = new Worker<EnhanceJobPayload>(
    QUEUE_AI_IMAGE,
    async (job) => {
      const { aiJobId, tenantId, sourceKey } = job.data;

      await prisma.aiJob.update({
        where: { id: aiJobId },
        data: { status: "processing" },
      });

      try {
        if (!sourceKey.startsWith(`t/${tenantId}/`)) {
          await markFailed(aiJobId, "That image isn't one of yours.", true);
        }
        const source = await getObject("public", sourceKey);
        if (!source) {
          await markFailed(aiJobId, "We couldn't find that image.", true);
        }
        const result = await enhanceProductImage(tenantId, source!);
        await prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: "completed",
            result: {
              originalUrl: result.originalUrl,
              watermarkedUrl: result.watermarkedUrl,
            },
            completedAt: new Date(),
          },
        });
        return result;
      } catch (err) {
        if (err instanceof UnrecoverableError) throw err;
        const message = err instanceof Error ? err.message : "Enhance job failed";
        const permanent = err instanceof AiUnavailableError;
        await markFailed(aiJobId, message, permanent);
      }
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] enhance job ${job?.id} failed:`, err.message);
  });

  console.log("[worker] AI image enhance worker started");
  return worker;
}
