import path from "path";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Idempotent data fixes that run on every deploy, after `prisma db push`.
 * Each step must be safe to run repeatedly against production.
 */
type Step = { name: string; run: (prisma: PrismaClient) => Promise<number> };

const steps: Step[] = [
  {
    // Raw chatbot HTML was rendered unescaped on storefronts (stored XSS). Replaced by chatEmbed.
    name: "remove shop chatbotHtml",
    async run(prisma) {
      return prisma.$executeRaw(
        Prisma.sql`UPDATE tenants SET theme_settings = theme_settings - 'chatbotHtml' WHERE theme_settings ? 'chatbotHtml'`
      );
    },
  },
  {
    name: "remove platform chatbot_html setting",
    async run(prisma) {
      const res = await prisma.platformSetting.deleteMany({ where: { key: "chatbot_html" } });
      return res.count;
    },
  },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const step of steps) {
      const changed = await step.run(prisma);
      console.log(`[data-migrations] ${step.name}: ${changed} row(s)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
