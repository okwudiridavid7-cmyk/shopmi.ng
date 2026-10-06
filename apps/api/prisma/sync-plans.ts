import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PLANS, retireLegacyPlans, upsertPlans } from "./plans";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Writes the pricing tiers from plans.ts to the database and moves shops off
 * legacy plans. Touches nothing else, so it is safe to run against production
 * (unlike seed.ts, which also resets platform settings and the admin password).
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    await upsertPlans(prisma);
    const moved = await retireLegacyPlans(prisma);
    const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
    for (const p of plans) {
      console.log(
        `${p.active ? "active  " : "inactive"} ${p.slug.padEnd(8)} ₦${Number(p.price)}`
      );
    }
    for (const [slug, count] of Object.entries(moved)) {
      console.log(`moved ${count} shop(s) off legacy "${slug}"`);
    }
    console.log(`Synced ${PLANS.length} plans.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
