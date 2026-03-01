import { db } from "../src/server/db";

async function main() {
  const contract = await db.contract.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, code: true },
  });
  if (!contract) { console.log("No contracts"); return; }
  console.log("Contract:", contract.name, contract.code);

  const offers = await db.contractSpecialOffer.count({ where: { contractId: contract.id } });
  const children = await db.contractChildPolicy.count({ where: { contractId: contract.id } });
  const meals = await db.contractSpecialMeal.count({ where: { contractId: contract.id } });
  const cancels = await db.contractCancellationPolicy.count({ where: { contractId: contract.id } });

  console.log("Special Offers:", offers);
  console.log("Child Policies:", children);
  console.log("Special Meals:", meals);
  console.log("Cancellations:", cancels);

  if (offers > 0) {
    const o = await db.contractSpecialOffer.findMany({ where: { contractId: contract.id } });
    console.log("\nOffer details:", JSON.stringify(o, null, 2));
  }
  if (children > 0) {
    const c = await db.contractChildPolicy.findMany({ where: { contractId: contract.id } });
    console.log("\nChild details:", JSON.stringify(c, null, 2));
  }

  await db.$disconnect();
}
main();
