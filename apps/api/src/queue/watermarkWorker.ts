import { Worker } from "bullmq";
import { prisma } from "../db/prisma";
import { watermarkImage } from "../services/images";
import {
  getRedisConnection,
  QUEUE_IMAGE_WATERMARK,
  type WatermarkJobPayload,
} from "./connection";

export function startWatermarkWorker(): Worker {
  const worker = new Worker<WatermarkJobPayload>(
    QUEUE_IMAGE_WATERMARK,
    async (job) => {
      const { aiJobId, originalUrl, shopName, logoUrl } = job.data;

      await prisma.aiJob.update({
        where: { id: aiJobId },
        data: { status: "processing" },
      });

      try {
        const watermarkedUrl = await watermarkImage(originalUrl, {
          text: shopName,
          logoUrl,
          position: "bottom-right",
          opacity: 0.55,
        });

        await prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: "completed",
            result: { originalUrl, watermarkedUrl },
            completedAt: new Date(),
          },
        });

        return { watermarkedUrl };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Watermark job failed";
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
    { connection: getRedisConnection(), concurrency: 3 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] watermark job ${job?.id} failed:`, err.message);
  });

  console.log("[worker] Image watermark worker started");
  return worker;
}
