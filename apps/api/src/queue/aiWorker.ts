import { Worker } from "bullmq";
import { prisma } from "../db/prisma";
import { generateProductDescription } from "../services/aiDescription";
import {
  getRedisConnection,
  QUEUE_AI_DESCRIPTION,
  type DescriptionJobPayload,
} from "./connection";

export function startAiDescriptionWorker(): Worker {
  const worker = new Worker<DescriptionJobPayload>(
    QUEUE_AI_DESCRIPTION,
    async (job) => {
      const {
        aiJobId,
        title,
        categoryName,
        shopCategoryName,
        brandName,
        location,
        price,
        currency,
        productId,
        tenantId,
      } = job.data;

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
          price,
          currency,
        });

        if (productId) {
          const product = await prisma.product.findFirst({
            where: { id: productId, tenantId },
          });
          if (product) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                description,
                aiGeneratedDescription: true,
              },
            });
          }
        }

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
        await prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: "failed",
            error: message,
            completedAt: new Date(),
          },
        });
        throw err;
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
