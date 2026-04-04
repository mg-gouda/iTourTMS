import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { MODULE_REGISTRY } from "@/lib/constants/modules";
import { createTRPCRouter, publicProcedure } from "@/server/trpc";
import {
  verifyLicenseKey,
  LICENSE_VALIDITY_DAYS,
} from "@/server/services/shared/license";

const strongPasswordSchema = z
  .string()
  .min(12, "Minimum 12 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Must contain a special character");

export const setupRouter = createTRPCRouter({
  // Check if setup is needed (no company exists)
  checkSetupRequired: publicProcedure.query(async ({ ctx }) => {
    const companyCount = await ctx.db.company.count();
    const activeLicense = await ctx.db.license.findFirst({
      where: { isActivated: true, isRevoked: false },
      select: { id: true },
    });
    return {
      setupRequired: companyCount === 0,
      hasActiveLicense: !!activeLicense,
      licenseId: activeLicense?.id ?? null,
    };
  }),

  // Activate a license key (used during setup step 1 and renewal)
  activateLicense: publicProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Find all unactivated, non-revoked license records
      const pendingLicenses = await ctx.db.license.findMany({
        where: { isActivated: false, isRevoked: false },
        select: { id: true, keyHash: true },
      });

      if (pendingLicenses.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending license keys found. Contact your provider.",
        });
      }

      // Check the input key against each pending license hash
      for (const license of pendingLicenses) {
        const match = await verifyLicenseKey(input.key, license.keyHash);
        if (match) {
          const now = new Date();
          const expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + LICENSE_VALIDITY_DAYS);

          // Revoke any previously activated licenses (for renewal)
          await ctx.db.license.updateMany({
            where: { isActivated: true, isRevoked: false },
            data: { isRevoked: true },
          });

          // Activate this license
          const activated = await ctx.db.license.update({
            where: { id: license.id },
            data: {
              isActivated: true,
              activatedAt: now,
              expiresAt,
            },
          });

          return {
            licenseId: activated.id,
            expiresAt: activated.expiresAt,
          };
        }
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid license key.",
      });
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

  // Get airports (public — used by booking forms across modules)
  getAirports: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.airport.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, country: { select: { code: true, name: true } } },
      orderBy: { code: "asc" },
    });
  }),

  // Complete setup wizard — provisions everything
  completeSetup: publicProcedure
    .input(
      z.object({
        // License ID from step 1
        licenseId: z.string().min(1),
        // Step 2: Company
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
          password: strongPasswordSchema,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Atomic check-and-create inside a serializable transaction to prevent race conditions
      return ctx.db.$transaction(async (tx) => {
        // Lock: count inside the transaction so concurrent calls are serialized
        const existingCompany = await tx.company.count();
        if (existingCompany > 0) {
          throw new Error("Setup already completed");
        }
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

        // 1b. Link license to company
        await tx.license.update({
          where: { id: input.licenseId },
          data: { companyId: company.id },
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
            currentStep: 5,
            completedSteps: [1, 2, 3, 4, 5],
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
