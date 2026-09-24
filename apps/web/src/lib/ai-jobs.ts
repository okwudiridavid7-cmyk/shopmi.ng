"use client";

import { apiFetch } from "@/lib/api";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type GenerateDescriptionInput = {
  title: string;
  categoryId?: string;
  shopCategoryId?: string;
  brandName?: string;
  location?: string;
  price?: number;
  currency?: string;
  productId?: string;
};

export async function pollAiJob(
  jobId: string,
  maxAttempts = 40
): Promise<{
  description?: string | null;
  watermarkedUrl?: string | null;
  originalUrl?: string | null;
}> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await apiFetch<{
      job: {
        status: string;
        description?: string | null;
        watermarkedUrl?: string | null;
        originalUrl?: string | null;
        error?: string | null;
      };
    }>(`/api/seller/ai/jobs/${jobId}`);
    if (res.job.status === "completed") {
      return {
        description: res.job.description,
        watermarkedUrl: res.job.watermarkedUrl,
        originalUrl: res.job.originalUrl,
      };
    }
    if (res.job.status === "failed") {
      throw new Error(res.job.error ?? "Job failed");
    }
    await sleep(1500);
  }
  throw new Error("Timed out waiting for job");
}

export async function generateProductDescription(
  input: GenerateDescriptionInput
): Promise<string> {
  const { job } = await apiFetch<{ job: { id: string } }>(
    "/api/seller/ai/description",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  const result = await pollAiJob(job.id);
  if (!result.description) {
    throw new Error("No description returned");
  }
  return result.description;
}

export async function pollWatermarkJob(
  jobId: string
): Promise<string | null> {
  const result = await pollAiJob(jobId);
  return result.watermarkedUrl ?? null;
}
