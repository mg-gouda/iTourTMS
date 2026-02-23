-- CreateTable
CREATE TABLE "ct_contract_child_policy" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "category" "ChildAgeCategory" NOT NULL,
    "ageFrom" INTEGER NOT NULL,
    "ageTo" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "freeInSharing" BOOLEAN NOT NULL DEFAULT false,
    "maxFreePerRoom" INTEGER NOT NULL DEFAULT 0,
    "extraBedAllowed" BOOLEAN NOT NULL DEFAULT true,
    "mealsIncluded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_child_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ct_contract_child_policy_contractId_idx" ON "ct_contract_child_policy"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_child_policy_contractId_category_key" ON "ct_contract_child_policy"("contractId", "category");

-- AddForeignKey
ALTER TABLE "ct_contract_child_policy" ADD CONSTRAINT "ct_contract_child_policy_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
