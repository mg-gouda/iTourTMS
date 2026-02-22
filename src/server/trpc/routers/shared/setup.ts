import bcrypt from "bcryptjs";
import { z } from "zod";

import { MODULE_REGISTRY } from "@/lib/constants/modules";
import { createTRPCRouter, publicProcedure } from "@/server/trpc";

export const setupRouter = createTRPCRouter({
  // Check if setup is needed (no company exists)
  checkSetupRequired: publicProcedure.query(async ({ ctx }) => {
    const companyCount = await ctx.db.company.count();
    return { setupRequired: companyCount === 0 };
  }),

  // Get available modules for setup wizard
  getAvailableModules: publicProcedure.query(() => {
    return MODULE_REGISTRY;
  }),

  // Get countries for setup wizard
  getCountries: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }),

  // Get currencies for setup wizard
  getCurrencies: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.currency.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
  }),

  // Complete setup wizard — provisions everything
  completeSetup: publicProcedure
    .input(
      z.object({
        // Step 1: Company
        company: z.object({
          name: z.string().min(1),
          legalName: z.string().optional(),
          taxId: z.string().optional(),
          countryId: z.string().optional(),
          baseCurrencyId: z.string().optional(),
          fiscalYearStart: z.number().min(1).max(12).default(1),
          fiscalYearEnd: z.number().min(1).max(12).default(12),
          timezone: z.string().default("UTC"),
        }),
        // Step 2: Modules
        modules: z.array(z.string()).min(1),
        // Step 3: Module config
        moduleConfig: z.record(z.string(), z.any()).optional(),
        // Step 4: Admin
        admin: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          password: z.string().min(8),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already set up
      const existingCompany = await ctx.db.company.count();
      if (existingCompany > 0) {
        throw new Error("Setup already completed");
      }

      return ctx.db.$transaction(async (tx) => {
        // 1. Create company
        const company = await tx.company.create({
          data: {
            name: input.company.name,
            legalName: input.company.legalName,
            taxId: input.company.taxId,
            countryId: input.company.countryId || undefined,
            baseCurrencyId: input.company.baseCurrencyId || undefined,
            fiscalYearStart: input.company.fiscalYearStart,
            fiscalYearEnd: input.company.fiscalYearEnd,
            timezone: input.company.timezone,
          },
        });

        // 2. Create installed modules
        for (const moduleName of input.modules) {
          const moduleDef = MODULE_REGISTRY.find((m) => m.name === moduleName);
          if (moduleDef) {
            await tx.installedModule.create({
              data: {
                companyId: company.id,
                name: moduleDef.name,
                displayName: moduleDef.displayName,
                isInstalled: true,
                installedAt: new Date(),
                config: input.moduleConfig?.[moduleName] ?? null,
              },
            });
          }
        }

        // 3. Create super_admin role with all permissions
        const adminRole = await tx.role.create({
          data: {
            companyId: company.id,
            name: "super_admin",
            displayName: "Super Administrator",
            description: "Full access to all modules and features",
            isSystem: true,
          },
        });

        // 4. Create admin user
        const hashedPassword = await bcrypt.hash(input.admin.password, 12);
        const adminUser = await tx.user.create({
          data: {
            name: input.admin.name,
            email: input.admin.email,
            password: hashedPassword,
            companyId: company.id,
            emailVerified: new Date(),
          },
        });

        // 5. Assign super_admin role to admin user
        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id,
          },
        });

        // 6. Create default sequences
        const sequenceDefaults = [
          { code: "invoice", prefix: "INV", padding: 5 },
          { code: "booking", prefix: "BK", padding: 6 },
          { code: "contract", prefix: "CTR", padding: 5 },
          { code: "payment", prefix: "PAY", padding: 5 },
          { code: "voucher", prefix: "VCH", padding: 5 },
          { code: "lead", prefix: "LD", padding: 5 },
        ];

        for (const seq of sequenceDefaults) {
          await tx.sequence.create({
            data: {
              companyId: company.id,
              code: seq.code,
              prefix: seq.prefix,
              padding: seq.padding,
            },
          });
        }

        // 7. Mark setup as complete
        await tx.companySetup.create({
          data: {
            companyId: company.id,
            isComplete: true,
            currentStep: 4,
            completedSteps: [1, 2, 3, 4],
            moduleConfig: input.moduleConfig ?? undefined,
            completedAt: new Date(),
          },
        });

        return {
          companyId: company.id,
          userId: adminUser.id,
        };
      });
    }),
});
