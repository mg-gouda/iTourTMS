import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { generateLicenseKey } from "../src/server/services/shared/license";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const { plainKey, keyHash, keyPrefix, keySuffix } =
    await generateLicenseKey();

  await prisma.license.create({
    data: {
      keyHash,
      keyPrefix,
      keySuffix,
      isActivated: false,
    },
  });

  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("  LICENSE KEY GENERATED SUCCESSFULLY");
  console.log("═══════════════════════════════════════");
  console.log("");
  console.log(`  Key: ${plainKey}`);
  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("  Save this key securely.");
  console.log("  Give it to the client for activation.");
  console.log("  Valid for 365 days from activation.");
  console.log("═══════════════════════════════════════");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Failed to generate license key:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
