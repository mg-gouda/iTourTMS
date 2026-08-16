-- CreateEnum
CREATE TYPE "AssetState" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssetMethod" AS ENUM ('STRAIGHT_LINE', 'DEGRESSIVE', 'DEGRESSIVE_THEN_STRAIGHT_LINE');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('RECEIVED', 'GIVEN');

-- CreateEnum
CREATE TYPE "LoanState" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxReturnState" AS ENUM ('DRAFT', 'CONFIRMED', 'FILED');

-- CreateEnum
CREATE TYPE "WorkingFileState" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DeferralState" AS ENUM ('DRAFT', 'RUNNING', 'CLOSED');

-- CreateEnum
CREATE TYPE "CopyRateMode" AS ENUM ('FREEZE', 'INCREASE', 'DECREASE', 'AVERAGE');

-- CreateEnum
CREATE TYPE "AllocationBasis" AS ENUM ('FREESALE', 'ON_REQUEST', 'COMMITMENT', 'ALLOCATION');

-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('PERCENTAGE', 'FIXED_PER_NIGHT', 'FIXED_PER_BOOKING');

-- CreateEnum
CREATE TYPE "SpecialMealOccasion" AS ENUM ('NYE', 'CHRISTMAS', 'EASTER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('NEW_BOOKING', 'DRAFT', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'TOUR_OPERATOR', 'API', 'WEBSITE');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ISSUED', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GuestType" AS ENUM ('LEAD', 'ADDITIONAL', 'CHILD');

-- CreateEnum
CREATE TYPE "PartnerBookingStatus" AS ENUM ('NEW_BOOKING', 'SENT', 'CONFIRMED', 'REGRET', 'STOP_SALE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomOccupancy" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'FAMILY');

-- CreateEnum
CREATE TYPE "HotelPaymentMethod" AS ENUM ('CASH', 'VOUCHER');

-- CreateEnum
CREATE TYPE "HotelCreditStatus" AS ENUM ('OPEN', 'PARTIALLY_CONSUMED', 'CONSUMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingPaymentDirection" AS ENUM ('TO_HOTEL', 'FROM_SOURCE');

-- CreateEnum
CREATE TYPE "DeadlineType" AS ENUM ('OPTION_EXPIRY', 'DEPOSIT_DUE', 'BALANCE_DUE', 'ROOMING_LIST', 'FREE_CANCELLATION', 'NAME_CHANGE', 'RECONFIRMATION', 'SUPPLIER_PAYMENT', 'ALLOTMENT_RELEASE');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('UPCOMING', 'WARNING', 'OVERDUE', 'COMPLETED', 'WAIVED');

-- CreateEnum
CREATE TYPE "SpecialRequestStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'NOT_AVAILABLE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "TtServiceType" AS ENUM ('ARR', 'DEP', 'ARR_DEP', 'EXCURSION', 'INTER_HOTEL', 'CITY_TOUR', 'PRIVATE_HIRE', 'AIRPORT_MEET', 'VIP', 'SHUTTLE', 'CHARTER', 'OTHER');

-- CreateEnum
CREATE TYPE "TtJobStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ASSIGNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TtVehicleOwnership" AS ENUM ('OWNED', 'RENTED', 'CONTRACTED');

-- CreateEnum
CREATE TYPE "TtVehicleStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TtDriverStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TtBookingStatus" AS ENUM ('QUOTE', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TtAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TtPortalJobStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EN_ROUTE', 'AT_PICKUP', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TtComplianceType" AS ENUM ('INSURANCE', 'REGISTRATION', 'INSPECTION', 'PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "TtPriceType" AS ENUM ('PER_VEHICLE', 'PER_PERSON', 'PER_ZONE', 'FLAT_RATE');

-- CreateEnum
CREATE TYPE "ThemePreset" AS ENUM ('MODERN_BOLD', 'CLEAN_TRUSTWORTHY', 'WARM_INVITING', 'LUXURY_ELEGANT');

-- CreateEnum
CREATE TYPE "HeaderStyle" AS ENUM ('TRANSPARENT', 'SOLID', 'MEGA_MENU');

-- CreateEnum
CREATE TYPE "ButtonStyle" AS ENUM ('PILL', 'ROUNDED', 'SQUARE');

-- CreateEnum
CREATE TYPE "HeroStyle" AS ENUM ('SLIDER', 'VIDEO', 'STATIC');

-- CreateEnum
CREATE TYPE "PublicPageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "B2bCreditTxType" AS ENUM ('BOOKING_CHARGE', 'PAYMENT_RECEIVED', 'CREDIT_NOTE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CrmLeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'WALK_IN', 'PHONE', 'EMAIL', 'SOCIAL_MEDIA', 'PARTNER', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CrmLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'DORMANT');

-- CreateEnum
CREATE TYPE "CrmOpportunityStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "CrmProductType" AS ENUM ('ACTIVITY', 'TOUR_PACKAGE');

-- CreateEnum
CREATE TYPE "CrmActivityCategory" AS ENUM ('WATER_SPORTS', 'DESERT_SAFARI', 'CITY_TOUR', 'CULTURAL', 'ADVENTURE', 'DINING', 'ENTERTAINMENT', 'WELLNESS', 'SHOPPING', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "CrmTripMode" AS ENUM ('SHARED', 'PRIVATE', 'VIP');

-- CreateEnum
CREATE TYPE "CrmNationalityTier" AS ENUM ('DEFAULT', 'TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "CrmAgeGroupLabel" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "CrmSeasonType" AS ENUM ('PEAK', 'HIGH', 'SHOULDER', 'LOW', 'BLACKOUT');

-- CreateEnum
CREATE TYPE "CrmCostCalcBasis" AS ENUM ('PER_PERSON', 'PER_GROUP', 'FLAT');

-- CreateEnum
CREATE TYPE "CrmCostType" AS ENUM ('GUIDE', 'REP_FEES', 'POLICE_PERMIT', 'POLICE_TIP', 'FELUCCA', 'CARRIAGE', 'TICKETS', 'MEALS', 'EXTRAS', 'DIVING_SNORKELING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CrmPricingType" AS ENUM ('BULK', 'PER_PAX');

-- CreateEnum
CREATE TYPE "CrmCurrency" AS ENUM ('EGP', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "CrmMarkupType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CrmBookingStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "CrmTicketSource" AS ENUM ('MANUAL', 'B2C', 'HOTEL_GUIDE', 'B2B');

-- CreateEnum
CREATE TYPE "CrmTicketStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "CrmBreakdownStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CrmDispatchStatus" AS ENUM ('DRAFT', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "OpsFileStatus" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OpsComponentType" AS ENUM ('ACCOMMODATION', 'TRANSFER', 'EXCURSION', 'FLIGHT', 'MEET_ASSIST', 'NILE_CRUISE', 'GUIDANCE', 'MEAL', 'PORTERAGE', 'TIPPING', 'FELUCCA', 'CARRIAGE', 'MISC');

-- CreateEnum
CREATE TYPE "OpsQuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OpsClientType" AS ENUM ('B2C', 'TOUR_OPERATOR', 'TRAVEL_AGENT');

-- CreateEnum
CREATE TYPE "OpsMarkupType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "OpsPackageSource" AS ENUM ('TEMPLATE', 'FILE_SPECIFIC');

-- CreateEnum
CREATE TYPE "OpsPricingBasis" AS ENUM ('PER_PERSON', 'BULK');

-- CreateEnum
CREATE TYPE "OpsVehicleType" AS ENUM ('SEDAN', 'VAN_11', 'VAN_16', 'BUS_25', 'BUS_45');

-- CreateEnum
CREATE TYPE "OpsGuideType" AS ENUM ('LOCAL_GUIDE', 'TOUR_MANAGER', 'EGYPTOLOGIST', 'REP');

-- CreateEnum
CREATE TYPE "OpsMealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'HALF_BOARD', 'FULL_BOARD');

-- CreateEnum
CREATE TYPE "OpsFlightType" AS ENUM ('ONE_WAY', 'RETURN', 'MULTI_LEG');

-- CreateEnum
CREATE TYPE "OpsFlightTxType" AS ENUM ('ISSUE', 'REISSUE', 'REFUND', 'VOID', 'REVALIDATE');

-- CreateEnum
CREATE TYPE "OpsFlightTicketStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CruiseOwnershipMode" AS ENUM ('OWN_FLEET', 'CONTRACTED');

-- CreateEnum
CREATE TYPE "CruiseBoatClass" AS ENUM ('STEAMER', 'DAHABIYA', 'LAKE_CRUISER', 'LONG_NILE_CRUISER');

-- CreateEnum
CREATE TYPE "CruiseStarRating" AS ENUM ('THREE', 'FOUR', 'FIVE', 'FIVE_DELUXE');

-- CreateEnum
CREATE TYPE "CruiseDeckLevel" AS ENUM ('LOWER_DECK', 'MAIN_DECK', 'UPPER_DECK', 'SUN_DECK');

-- CreateEnum
CREATE TYPE "CabinView" AS ENUM ('NILE_VIEW', 'CITY_VIEW', 'INSIDE', 'PANORAMIC');

-- CreateEnum
CREATE TYPE "CabinBedType" AS ENUM ('TWIN', 'DOUBLE', 'TWIN_OR_DOUBLE', 'KING', 'SUITE_CONFIG');

-- CreateEnum
CREATE TYPE "CruiseTypeCode" AS ENUM ('NILE_3N_LUX_ASW', 'NILE_4N_ASW_LUX', 'NILE_7N_ROUNDTRIP', 'LONG_NILE_CAIRO_ASW', 'LAKE_NASSER', 'DAHABIYA_CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "CruiseItineraryMode" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "CruisePortOfCall" AS ENUM ('LUXOR', 'ASWAN', 'ESNA', 'EDFU', 'KOM_OMBO', 'ABU_SIMBEL', 'CAIRO', 'EL_MINYA', 'ASYUT', 'SOHAG', 'QENA', 'DENDERA', 'ABYDOS', 'WADI_EL_SEBOUA', 'AMADA', 'KASR_IBRIM', 'OTHER');

-- CreateEnum
CREATE TYPE "CruiseContractStatus" AS ENUM ('DRAFT', 'POSTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CruiseRateBasis" AS ENUM ('PER_PERSON', 'PER_CABIN');

-- CreateEnum
CREATE TYPE "CruiseAllocationBasis" AS ENUM ('FREESALE', 'ON_REQUEST', 'COMMITMENT', 'ALLOCATION');

-- CreateEnum
CREATE TYPE "CruiseSupplementType" AS ENUM ('CABIN_CATEGORY', 'OCCUPANCY', 'DECK', 'VIEW', 'GALA_MEAL');

-- CreateEnum
CREATE TYPE "CruiseSupplementValueType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "CruiseOfferType" AS ENUM ('EARLY_BIRD', 'LONG_STAY', 'FREE_NIGHTS', 'HONEYMOON', 'GROUP_DISCOUNT', 'SINGLE_SUPPLEMENT_WAIVER', 'FREE_DOMESTIC_FLIGHT', 'MARKETING_CONTRIBUTION', 'COMBINABLE_DISCOUNT');

-- CreateEnum
CREATE TYPE "CruiseOfferValueType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_NIGHTS', 'UPGRADE', 'COMPLIMENTARY');

-- CreateEnum
CREATE TYPE "CruiseGalaMealType" AS ENUM ('NEW_YEARS_EVE', 'CHRISTMAS_EVE', 'CHRISTMAS_DAY', 'EASTER_SUNDAY', 'RAMADAN_IFTAR', 'OTHER');

-- CreateEnum
CREATE TYPE "CruiseDepartureStatus" AS ENUM ('SCHEDULED', 'OPEN_FOR_SALE', 'CLOSED_FOR_SALE', 'EMBARKING', 'SAILING', 'DISEMBARKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CruiseRecurrencePattern" AS ENUM ('NONE', 'WEEKLY', 'BI_WEEKLY', 'CUSTOM_DAYS_OF_WEEK');

-- CreateEnum
CREATE TYPE "CruiseBookingStatus" AS ENUM ('DRAFT', 'OPTION', 'ON_REQUEST', 'CONFIRMED', 'EMBARKED', 'DISEMBARKED', 'FINALIZED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "CruiseBookingSource" AS ENUM ('DIRECT', 'CRM', 'TOUR_OPS', 'B2C_WEBSITE', 'B2B_PORTAL', 'TOUR_OPERATOR');

-- CreateEnum
CREATE TYPE "CruiseBillingType" AS ENUM ('GUEST_DIRECT', 'TOUR_OPERATOR', 'TRAVEL_AGENT');

-- CreateEnum
CREATE TYPE "CabinAssignmentStatus" AS ENUM ('UNASSIGNED', 'PROVISIONAL', 'CONFIRMED', 'LOCKED');

-- CreateEnum
CREATE TYPE "CruisePaxType" AS ENUM ('ADULT', 'CHILD', 'INFANT', 'TEEN');

-- CreateEnum
CREATE TYPE "CruisePaxRole" AS ENUM ('LEAD', 'COMPANION', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "ManifestStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'AMENDED');

-- CreateEnum
CREATE TYPE "CruiseStopSaleScope" AS ENUM ('ALL', 'CABIN_CATEGORY', 'DEPARTURE', 'MARKET');

-- CreateEnum
CREATE TYPE "CruiseCancellationChargeType" AS ENUM ('PERCENTAGE', 'FIXED', 'FIRST_NIGHT', 'FULL_AMOUNT');

-- CreateEnum
CREATE TYPE "CruiseSpecialRequestType" AS ENUM ('DIETARY', 'ACCESSIBILITY', 'BED_CONFIG', 'CELEBRATION', 'ADJACENT_CABINS', 'CONNECTING_CABINS', 'HIGH_DECK', 'LOW_DECK', 'EARLY_CHECK_IN', 'LATE_CHECK_OUT', 'PORTERAGE', 'TRANSPORT', 'GUIDE_LANGUAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "CruiseSpecialRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "ManifestSubmissionMethod" AS ENUM ('ONLINE_PORTAL', 'EMAIL', 'PHYSICAL_DELIVERY', 'FAX');

-- AlterEnum
ALTER TYPE "MealCode" ADD VALUE 'PRAI';

-- AlterEnum
BEGIN;
CREATE TYPE "SupplementType_new" AS ENUM ('ROOM_TYPE', 'MEAL', 'OCCUPANCY', 'EXTRA_BED');
ALTER TABLE "ct_contract_supplement" ALTER COLUMN "supplementType" TYPE "SupplementType_new" USING ("supplementType"::text::"SupplementType_new");
ALTER TYPE "SupplementType" RENAME TO "SupplementType_old";
ALTER TYPE "SupplementType_new" RENAME TO "SupplementType";
DROP TYPE "public"."SupplementType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "offer_type" ADD VALUE 'NORMAL_EBD';

-- DropForeignKey
ALTER TABLE "ct_contract" DROP CONSTRAINT "ct_contract_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "ct_contract_allotment" DROP CONSTRAINT "ct_contract_allotment_roomTypeId_fkey";

-- DropForeignKey
ALTER TABLE "ct_contract_meal_basis" DROP CONSTRAINT "ct_contract_meal_basis_mealBasisId_fkey";

-- DropForeignKey
ALTER TABLE "ct_contract_room_type" DROP CONSTRAINT "ct_contract_room_type_roomTypeId_fkey";

-- DropIndex
DROP INDEX "ct_contract_allotment_seasonId_idx";

-- DropIndex
DROP INDEX "ct_contract_season_contractId_code_idx";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "abbreviation" TEXT,
ADD COLUMN     "anthropicApiKey" TEXT,
ADD COLUMN     "giataApiKey" TEXT,
ADD COLUMN     "reportsLogoUrl" TEXT;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "accountPayableId" TEXT,
ADD COLUMN     "accountReceivableId" TEXT,
ADD COLUMN     "creditCurrency" TEXT,
ADD COLUMN     "creditLimit" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "creditUsed" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentTermId" TEXT;

-- AlterTable
ALTER TABLE "Sequence" ADD COLUMN     "formatType" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "startNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "density" TEXT NOT NULL DEFAULT 'comfortable',
ADD COLUMN     "passwordExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tourOperatorId" TEXT,
ADD COLUMN     "twoFactorBackupCodes" TEXT[],
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "ct_child_policy" ADD COLUMN     "chargePercentage" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "ct_contract_allotment" ADD COLUMN     "basis" "AllocationBasis" NOT NULL DEFAULT 'ALLOCATION',
ALTER COLUMN "seasonId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ct_contract_child_policy" ADD COLUMN     "chargePercentage" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "ct_contract_season" DROP COLUMN "code",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "ct_contract_special_offer" ADD COLUMN     "bookFromDate" DATE,
ADD COLUMN     "paymentDeadline" DATE,
ADD COLUMN     "paymentPct" INTEGER,
ADD COLUMN     "roomingListBy" DATE,
ADD COLUMN     "stayDateType" TEXT;

-- AlterTable
ALTER TABLE "ct_destination" ADD COLUMN     "description" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "ct_hotel" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "giataId" TEXT,
ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "publicVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "fin_account" ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "fin_move_line_item" ADD COLUMN     "analyticAccountId" TEXT;

-- AlterTable
ALTER TABLE "fin_payment" ADD COLUMN     "opsFileId" TEXT;

-- CreateTable
CREATE TABLE "sys_license" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keySuffix" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "expiryNotified" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_license_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_analytic_account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "partnerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "balance" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_analytic_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_account_asset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "accountId" TEXT NOT NULL,
    "depreciationAccountId" TEXT,
    "accumulationAccountId" TEXT,
    "journalId" TEXT,
    "partnerId" TEXT,
    "state" "AssetState" NOT NULL DEFAULT 'DRAFT',
    "method" "AssetMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "originalValue" DECIMAL(12,4) NOT NULL,
    "salvageValue" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "usefulLifeYears" INTEGER NOT NULL DEFAULT 5,
    "acquisitionDate" DATE NOT NULL,
    "firstDepreciationDate" DATE,
    "netBookValue" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "accumulatedDepreciation" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_account_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_account_asset_line" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "depreciation" DECIMAL(12,4) NOT NULL,
    "residual" DECIMAL(12,4) NOT NULL,
    "moveId" TEXT,
    "isPosted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fin_account_asset_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_account_loan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loanType" "LoanType" NOT NULL DEFAULT 'RECEIVED',
    "state" "LoanState" NOT NULL DEFAULT 'DRAFT',
    "partnerId" TEXT,
    "amount" DECIMAL(12,4) NOT NULL,
    "rate" DECIMAL(8,6) NOT NULL,
    "termMonths" INTEGER NOT NULL DEFAULT 12,
    "startDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL,
    "interestAccountId" TEXT,
    "journalId" TEXT,
    "outstanding" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_account_loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_loan_schedule_line" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "principal" DECIMAL(12,4) NOT NULL,
    "interest" DECIMAL(12,4) NOT NULL,
    "total" DECIMAL(12,4) NOT NULL,
    "balance" DECIMAL(12,4) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "moveId" TEXT,

    CONSTRAINT "fin_loan_schedule_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_tax_return" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodId" TEXT,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "state" "TaxReturnState" NOT NULL DEFAULT 'DRAFT',
    "totalTaxBase" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "totalDue" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "filedAt" TIMESTAMP(3),
    "filedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_tax_return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_tax_return_line" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "taxName" TEXT NOT NULL,
    "taxBase" DECIMAL(12,4) NOT NULL,
    "taxAmount" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "fin_tax_return_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_account_lock_date" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taxLockDate" DATE,
    "saleLockDate" DATE,
    "purchaseLockDate" DATE,
    "hardLockDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_account_lock_date_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_audit_trail" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "recordName" TEXT,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_audit_trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_working_file" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodId" TEXT,
    "state" "WorkingFileState" NOT NULL DEFAULT 'DRAFT',
    "assignedTo" TEXT,
    "dueDate" DATE,
    "description" TEXT,
    "conclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_working_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_deferred_revenue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "moveLineId" TEXT,
    "amount" DECIMAL(12,4) NOT NULL,
    "recognizedAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL,
    "revenueAccountId" TEXT NOT NULL,
    "journalId" TEXT,
    "state" "DeferralState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_deferred_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_deferred_revenue_schedule" (
    "id" TEXT NOT NULL,
    "deferredId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "isRecognized" BOOLEAN NOT NULL DEFAULT false,
    "moveId" TEXT,

    CONSTRAINT "fin_deferred_revenue_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_deferred_expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "moveLineId" TEXT,
    "amount" DECIMAL(12,4) NOT NULL,
    "amortizedAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "journalId" TEXT,
    "state" "DeferralState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_deferred_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_deferred_expense_schedule" (
    "id" TEXT NOT NULL,
    "deferredId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "isAmortized" BOOLEAN NOT NULL DEFAULT false,
    "moveId" TEXT,

    CONSTRAINT "fin_deferred_expense_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_unrealized_currency" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "currencyId" TEXT NOT NULL,
    "gainLoss" DECIMAL(12,4) NOT NULL,
    "adjustmentMoveId" TEXT,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversalMoveId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_unrealized_currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_offer_tier" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "thresholdValue" INTEGER NOT NULL,
    "discountType" "SupplementValueType" NOT NULL DEFAULT 'FIXED',
    "discountValue" DECIMAL(12,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_offer_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_season_spo" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "spoType" TEXT NOT NULL,
    "name" TEXT,
    "dateFrom" DATE,
    "dateTo" DATE,
    "basePp" DECIMAL(12,4),
    "sglSup" DECIMAL(12,4),
    "thirdAdultRed" DECIMAL(12,4),
    "firstChildPct" DECIMAL(12,4),
    "secondChildPct" DECIMAL(12,4),
    "bookFrom" DATE,
    "bookTo" DATE,
    "value" DECIMAL(12,4),
    "valueType" TEXT,
    "excludedRoomTypeIds" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_season_spo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_season_spo_btc" (
    "id" TEXT NOT NULL,
    "spoId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_season_spo_btc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_season_spo_room_sup" (
    "id" TEXT NOT NULL,
    "spoId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'FIXED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_season_spo_room_sup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_season_spo_date" (
    "id" TEXT NOT NULL,
    "spoId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "basePp" DECIMAL(12,4),
    "sglSup" DECIMAL(12,4),
    "thirdAdultRed" DECIMAL(12,4),
    "firstChildPct" DECIMAL(12,4),
    "secondChildPct" DECIMAL(12,4),
    "value" DECIMAL(12,4),
    "valueType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_season_spo_date_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_marketing_contribution" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "marketId" TEXT,
    "seasonId" TEXT,
    "valueType" "SupplementValueType" NOT NULL DEFAULT 'FIXED',
    "value" DECIMAL(12,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_marketing_contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_tour_operator" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "countryId" TEXT,
    "marketId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "partnerType" TEXT NOT NULL DEFAULT 'tour_operator',
    "creditLimit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "creditUsed" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_tour_operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_tour_operator" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ct_contract_tour_operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_hotel_tour_operator" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ct_hotel_tour_operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_markup_rule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "markupType" "MarkupType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "contractId" TEXT,
    "hotelId" TEXT,
    "destinationId" TEXT,
    "marketId" TEXT,
    "tourOperatorId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATE,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_markup_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_tariff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "markupRuleId" TEXT,
    "currencyCode" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_special_meal" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "occasion" "SpecialMealOccasion" NOT NULL,
    "customName" TEXT,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "adultPrice" DECIMAL(12,2) NOT NULL,
    "childPrice" DECIMAL(12,2),
    "teenPrice" DECIMAL(12,2),
    "infantPrice" DECIMAL(12,2),
    "excludedMealBases" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ct_contract_special_meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_rate_verification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "childAges" JSONB,
    "bookingDate" DATE,
    "resultData" JSONB NOT NULL,
    "warnings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ct_rate_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_copy_log" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceContractId" TEXT NOT NULL,
    "targetContractId" TEXT NOT NULL,
    "rateMode" "CopyRateMode" NOT NULL DEFAULT 'FREEZE',
    "ratePercent" DECIMAL(8,4),
    "averageSourceIds" JSONB,
    "copiedEntities" JSONB,
    "dateShiftDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ct_contract_copy_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ct_contract_audit_log" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ct_contract_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY['contracting:read']::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiIntegration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiIntegrationHotel" (
    "id" TEXT NOT NULL,
    "apiIntegrationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiIntegrationHotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "apiIntegrationId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "url" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "responseBody" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_webhook" (
    "id" TEXT NOT NULL,
    "apiIntegrationId" TEXT NOT NULL,
    "event" TEXT,
    "payload" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incoming_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_guest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "nationality" TEXT,
    "passportNo" TEXT,
    "passportExpiry" DATE,
    "dateOfBirth" DATE,
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "countryId" TEXT,
    "notes" TEXT,
    "partnerId" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'NEW_BOOKING',
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "hotelId" TEXT NOT NULL,
    "contractId" TEXT,
    "tourOperatorId" TEXT,
    "seasonId" TEXT,
    "marketId" TEXT,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "currencyId" TEXT NOT NULL,
    "rateBasis" TEXT,
    "buyingTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sellingTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "manualRate" BOOLEAN NOT NULL DEFAULT false,
    "markupRuleId" TEXT,
    "markupType" TEXT,
    "markupValue" DECIMAL(12,4),
    "markupAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "totalPaid" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "creditApplied" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "leadGuestName" TEXT,
    "leadGuestEmail" TEXT,
    "leadGuestPhone" TEXT,
    "htlBookingStatus" "PartnerBookingStatus",
    "toBookingStatus" "PartnerBookingStatus",
    "arrivalFlightNo" TEXT,
    "arrivalTime" TEXT,
    "arrivalOriginApt" TEXT,
    "arrivalDestApt" TEXT,
    "arrivalTerminal" TEXT,
    "departFlightNo" TEXT,
    "departTime" TEXT,
    "departOriginApt" TEXT,
    "departDestApt" TEXT,
    "departTerminal" TEXT,
    "roomOccupancy" "RoomOccupancy",
    "noOfRooms" INTEGER NOT NULL DEFAULT 1,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "guestNames" JSONB,
    "childDob1" DATE,
    "childDob2" DATE,
    "hotelPaymentMethod" "HotelPaymentMethod",
    "paymentOptionDate" DATE,
    "hotelConfNo" TEXT,
    "confirmationFile" TEXT,
    "ebdPercent" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "ebdPaymentDate" DATE,
    "specialRequests" TEXT,
    "internalNotes" TEXT,
    "externalRef" TEXT,
    "bookingNotes" TEXT,
    "meetAssistVisa" BOOLEAN NOT NULL DEFAULT false,
    "apiIntegrationId" TEXT,
    "bookingDate" DATE,
    "hotelPenaltyAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sourcePenaltyAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "hotelPenaltyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "sourcePenaltyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "finCustomerMoveId" TEXT,
    "finVendorMoveId" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "checkedOutById" TEXT,
    "stopSaleOverride" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_rate_change" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "reason" TEXT,
    "rebookedGuest" TEXT,
    "oldBuyingTotal" DECIMAL(12,4) NOT NULL,
    "newBuyingTotal" DECIMAL(12,4) NOT NULL,
    "lines" JSONB,

    CONSTRAINT "rv_booking_rate_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_currency_line" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "fxRate" DECIMAL(18,8),
    "buyingTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sellingTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "visaHandling" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "calculation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_booking_currency_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_room" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "mealBasisId" TEXT NOT NULL,
    "roomIndex" INTEGER NOT NULL DEFAULT 1,
    "occupancy" "RoomOccupancy",
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "extraBed" BOOLEAN NOT NULL DEFAULT false,
    "buyingRatePerNight" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "buyingTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sellingRatePerNight" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sellingTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "rateBreakdown" JSONB,
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_booking_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_guest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "bookingRoomId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "guestType" "GuestType" NOT NULL DEFAULT 'ADDITIONAL',
    "isLeadGuest" BOOLEAN NOT NULL DEFAULT false,
    "childCategory" TEXT,
    "childAge" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_booking_guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "currencyId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" DATE NOT NULL,
    "isRefund" BOOLEAN NOT NULL DEFAULT false,
    "direction" "BookingPaymentDirection" NOT NULL DEFAULT 'FROM_SOURCE',
    "finPaymentId" TEXT,
    "finMoveId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_booking_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_voucher" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_timeline" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rv_booking_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_deadline" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "DeadlineType" NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'UPCOMING',
    "dueDate" DATE NOT NULL,
    "description" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "waivedAt" TIMESTAMP(3),
    "waivedBy" TEXT,
    "waiverNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_booking_deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_special_request" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "status" "SpecialRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_booking_special_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_booking_communication" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "recipient" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rv_booking_communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "bookingId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_zone" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_vehicle_type" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "luggageCapacity" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_vehicle_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_vehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "supplierId" TEXT,
    "plateNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "vinNumber" TEXT,
    "ownership" "TtVehicleOwnership" NOT NULL DEFAULT 'OWNED',
    "status" "TtVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_vehicle_compliance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "TtComplianceType" NOT NULL,
    "documentRef" TEXT,
    "issueDate" DATE,
    "expiryDate" DATE NOT NULL,
    "notes" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_vehicle_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_driver" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiry" DATE,
    "phone" TEXT,
    "status" "TtDriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_driver_vehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_driver_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_rep" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_rep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_rep_zone" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_rep_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_price_item" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "fromZoneId" TEXT,
    "toZoneId" TEXT,
    "priceType" "TtPriceType" NOT NULL DEFAULT 'PER_VEHICLE',
    "price" DECIMAL(12,4) NOT NULL,
    "currencyId" TEXT NOT NULL,
    "serviceType" "TtServiceType",
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_price_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_partner_price_override" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "priceItemId" TEXT NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_partner_price_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_supplier_trip_price" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "routeDesc" TEXT,
    "price" DECIMAL(12,4) NOT NULL,
    "currencyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_supplier_trip_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_traffic_job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serviceType" "TtServiceType" NOT NULL,
    "status" "TtJobStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleTypeId" TEXT,
    "serviceDate" DATE NOT NULL,
    "pickupTime" TEXT,
    "dropoffTime" TEXT,
    "pickupAirportId" TEXT,
    "pickupHotelId" TEXT,
    "pickupAddress" TEXT,
    "dropoffAirportId" TEXT,
    "dropoffHotelId" TEXT,
    "dropoffAddress" TEXT,
    "zoneId" TEXT,
    "partnerId" TEXT,
    "bookingId" TEXT,
    "flightId" TEXT,
    "paxCount" INTEGER NOT NULL DEFAULT 1,
    "leadPassenger" TEXT,
    "passengerPhone" TEXT,
    "passengerNotes" TEXT,
    "currencyId" TEXT,
    "price" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "dispatchLockedAt" TIMESTAMP(3),
    "signImageUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_traffic_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_traffic_flight" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "airlineCode" TEXT,
    "arrAirportId" TEXT,
    "depAirportId" TEXT,
    "arrTime" TEXT,
    "depTime" TEXT,
    "flightDate" DATE NOT NULL,
    "terminal" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_traffic_flight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_traffic_assignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "repId" TEXT,
    "status" "TtAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_traffic_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_status_change_log" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_status_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_no_show_evidence" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_no_show_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_guest_booking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "TtBookingStatus" NOT NULL DEFAULT 'QUOTE',
    "vehicleTypeId" TEXT NOT NULL,
    "serviceType" "TtServiceType" NOT NULL DEFAULT 'ARR',
    "serviceDate" DATE NOT NULL,
    "pickupTime" TEXT,
    "pickupAddress" TEXT,
    "dropoffAddress" TEXT,
    "paxCount" INTEGER NOT NULL DEFAULT 1,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "currencyId" TEXT NOT NULL,
    "quotedPrice" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_guest_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_guest_payment" (
    "id" TEXT NOT NULL,
    "guestBookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_guest_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_operational_cost" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "costType" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "currencyId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_operational_cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultCurrencyId" TEXT,
    "dispatchLockHours" INTEGER NOT NULL DEFAULT 48,
    "enableDriverPortal" BOOLEAN NOT NULL DEFAULT false,
    "enableRepPortal" BOOLEAN NOT NULL DEFAULT false,
    "enableSupplierPortal" BOOLEAN NOT NULL DEFAULT false,
    "enableGuestBookings" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_push_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_push_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_branding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "themePreset" "ThemePreset" NOT NULL DEFAULT 'MODERN_BOLD',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#f97316',
    "accentColor" TEXT NOT NULL DEFAULT '#06b6d4',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "foregroundColor" TEXT NOT NULL DEFAULT '#0f172a',
    "cardColor" TEXT NOT NULL DEFAULT '#ffffff',
    "mutedColor" TEXT NOT NULL DEFAULT '#f1f5f9',
    "headingFont" TEXT NOT NULL DEFAULT 'Poppins',
    "bodyFont" TEXT NOT NULL DEFAULT 'Inter',
    "headerStyle" "HeaderStyle" NOT NULL DEFAULT 'MEGA_MENU',
    "buttonStyle" "ButtonStyle" NOT NULL DEFAULT 'ROUNDED',
    "heroStyle" "HeroStyle" NOT NULL DEFAULT 'SLIDER',
    "footerColumns" INTEGER NOT NULL DEFAULT 4,
    "logoUrl" TEXT,
    "logoWhiteUrl" TEXT,
    "faviconUrl" TEXT,
    "ogImageUrl" TEXT,
    "siteTitle" TEXT,
    "siteDescription" TEXT,
    "metaKeywords" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "youtube" TEXT,
    "linkedin" TEXT,
    "tiktok" TEXT,
    "whatsapp" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "enableBlog" BOOLEAN NOT NULL DEFAULT false,
    "enableFaq" BOOLEAN NOT NULL DEFAULT true,
    "enableReviews" BOOLEAN NOT NULL DEFAULT true,
    "enableNewsletter" BOOLEAN NOT NULL DEFAULT true,
    "enableB2bPortal" BOOLEAN NOT NULL DEFAULT false,
    "enableOnlinePayment" BOOLEAN NOT NULL DEFAULT false,
    "enableInquiryMode" BOOLEAN NOT NULL DEFAULT true,
    "showPrices" BOOLEAN NOT NULL DEFAULT true,
    "yearsInBusiness" INTEGER,
    "happyGuests" INTEGER,
    "newsletterImageUrl" TEXT,
    "newsletterHeading" TEXT DEFAULT 'Stay Updated',
    "newsletterSubheading" TEXT,
    "newsletterCtaText" TEXT DEFAULT 'Subscribe',
    "newsletterFeature1Title" TEXT,
    "newsletterFeature1Desc" TEXT,
    "newsletterFeature2Title" TEXT,
    "newsletterFeature2Desc" TEXT,
    "newsletterFeature3Title" TEXT,
    "newsletterFeature3Desc" TEXT,
    "customCss" TEXT,
    "defaultMarketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_hero_slide" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_hero_slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_page" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "status" "PublicPageStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_blog_post" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "tags" TEXT[],
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_blog_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_faq" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_testimonial" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "avatar" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "quote" TEXT NOT NULL,
    "hotelId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_newsletter_subscriber" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pub_newsletter_subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_contact_inquiry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_contact_inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_markup_rule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "markupType" "MarkupType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "destinationId" TEXT,
    "hotelId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_markup_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_markup_tier" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "markupType" "MarkupType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2c_markup_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_credit_transaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "type" "B2bCreditTxType" NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "runningBalance" DECIMAL(12,4) NOT NULL,
    "reference" TEXT,
    "bookingId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2b_credit_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_lead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" "CrmLeadSource" NOT NULL DEFAULT 'WEBSITE',
    "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "createdById" TEXT,
    "notes" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_opportunity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "CrmOpportunityStage" NOT NULL DEFAULT 'PROSPECTING',
    "value" DECIMAL(12,2),
    "probability" INTEGER DEFAULT 0,
    "expectedCloseDate" DATE,
    "ownerId" TEXT,
    "leadId" TEXT,
    "customerId" TEXT,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "leadId" TEXT,
    "opportunityId" TEXT,
    "customerId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_customer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "nationality" TEXT,
    "dateOfBirth" DATE,
    "loyaltyTier" TEXT DEFAULT 'STANDARD',
    "lifetimeValue" DECIMAL(12,2),
    "partnerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_supplier" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_excursion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productType" "CrmProductType" NOT NULL DEFAULT 'ACTIVITY',
    "category" "CrmActivityCategory" NOT NULL DEFAULT 'OTHER',
    "tripMode" "CrmTripMode" NOT NULL DEFAULT 'SHARED',
    "duration" TEXT,
    "description" TEXT,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "minPax" INTEGER DEFAULT 1,
    "maxPax" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_excursion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_excursion_program" (
    "id" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_excursion_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_program_item" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_program_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_excursion_age_group" (
    "id" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "label" "CrmAgeGroupLabel" NOT NULL,
    "minAge" INTEGER NOT NULL,
    "maxAge" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_excursion_age_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_excursion_addon" (
    "id" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_excursion_addon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_cost_sheet" (
    "id" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seasonType" "CrmSeasonType" NOT NULL DEFAULT 'LOW',
    "nationalityTier" "CrmNationalityTier" NOT NULL DEFAULT 'DEFAULT',
    "tripMode" "CrmTripMode" NOT NULL DEFAULT 'SHARED',
    "validFrom" DATE,
    "validTo" DATE,
    "calcBasis" "CrmCostCalcBasis" NOT NULL DEFAULT 'PER_PERSON',
    "referencePax" INTEGER NOT NULL DEFAULT 10,
    "baseCurrency" "CrmCurrency" NOT NULL DEFAULT 'USD',
    "totalCost" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_cost_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_cost_component" (
    "id" TEXT NOT NULL,
    "costSheetId" TEXT NOT NULL,
    "costType" "CrmCostType" NOT NULL DEFAULT 'CUSTOM',
    "pricingType" "CrmPricingType" NOT NULL DEFAULT 'BULK',
    "description" TEXT NOT NULL,
    "supplierId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "currency" "CrmCurrency" NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_cost_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_pickup_location" (
    "id" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_pickup_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_transport_tier" (
    "id" TEXT NOT NULL,
    "pickupLocationId" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "minPax" INTEGER NOT NULL,
    "maxPax" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "currency" "CrmCurrency" NOT NULL DEFAULT 'EGP',
    "exchangeRate" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_transport_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_selling_price" (
    "id" TEXT NOT NULL,
    "costSheetId" TEXT NOT NULL,
    "ageGroupId" TEXT,
    "label" TEXT NOT NULL,
    "markupType" "CrmMarkupType" NOT NULL DEFAULT 'PERCENTAGE',
    "markupValue" DECIMAL(12,2) NOT NULL,
    "costPerPerson" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_selling_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_booking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT,
    "opportunityId" TEXT,
    "status" "CrmBookingStatus" NOT NULL DEFAULT 'DRAFT',
    "travelDate" DATE NOT NULL,
    "paxAdults" INTEGER NOT NULL DEFAULT 1,
    "paxChildren" INTEGER NOT NULL DEFAULT 0,
    "paxInfants" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2),
    "totalSelling" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "bookedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_booking_item" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "costSheetId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_booking_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_program_plan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "marketId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_program_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_program_plan_item" (
    "id" TEXT NOT NULL,
    "programPlanId" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "sellingPriceId" TEXT,
    "minToOperate" INTEGER NOT NULL DEFAULT 1,
    "operatingDays" INTEGER NOT NULL DEFAULT 127,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_program_plan_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_program_tour_operator" (
    "id" TEXT NOT NULL,
    "programPlanId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_program_tour_operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_pickup_time" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "pickupTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_pickup_time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_excursion_ticket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "tourOperatorId" TEXT,
    "hotelId" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "guestName" TEXT,
    "guestMobile" TEXT,
    "hotelGuideName" TEXT,
    "arrivalDate" DATE,
    "price" DECIMAL(12,2),
    "priceCurrency" VARCHAR(3),
    "pickupTime" TEXT,
    "roomNo" TEXT,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "excursionDate" DATE NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'EN',
    "remarks" TEXT,
    "source" "CrmTicketSource" NOT NULL DEFAULT 'MANUAL',
    "status" "CrmTicketStatus" NOT NULL DEFAULT 'PENDING',
    "breakdownId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_excursion_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_excursion_breakdown" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "excursionDate" DATE NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'EN',
    "repId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "notes" TEXT,
    "status" "CrmBreakdownStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_excursion_breakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_excursion_dispatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "dispatchDate" DATE NOT NULL,
    "assemblyPointName" TEXT,
    "assemblyPointLat" DOUBLE PRECISION,
    "assemblyPointLng" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "CrmDispatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_excursion_dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_dispatch_run" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL,
    "repId" TEXT,
    "trafficJobId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_dispatch_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_dispatch_run_stop" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "paxCount" INTEGER NOT NULL,

    CONSTRAINT "crm_dispatch_run_stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_credit_note" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "sourceBookingId" TEXT,
    "amount" DECIMAL(12,4) NOT NULL,
    "remainingAmount" DECIMAL(12,4) NOT NULL,
    "currencyId" TEXT NOT NULL,
    "status" "HotelCreditStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "finMoveId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_credit_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_credit_consumption" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountUsed" DECIMAL(12,4) NOT NULL,
    "notes" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedById" TEXT NOT NULL,

    CONSTRAINT "hotel_credit_consumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_file" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientType" "OpsClientType" NOT NULL DEFAULT 'B2C',
    "customerId" TEXT,
    "tourOperatorId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "travelFrom" DATE NOT NULL,
    "travelTo" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "status" "OpsFileStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "calculatorState" JSONB,
    "calculatorPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_package" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_package_component" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "type" "OpsComponentType" NOT NULL,
    "description" TEXT NOT NULL,
    "supplierId" TEXT,
    "serviceDate" DATE,
    "qty" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pricingBasis" "OpsPricingBasis" NOT NULL DEFAULT 'PER_PERSON',
    "nights" INTEGER NOT NULL DEFAULT 1,
    "markupType" "OpsMarkupType" NOT NULL DEFAULT 'PERCENTAGE',
    "markupValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mgmtFeeType" "OpsMarkupType" NOT NULL DEFAULT 'PERCENTAGE',
    "mgmtFeeValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "mgmtFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refModuleEntityId" TEXT,
    "refModuleEntityType" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_package_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_quotation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "status" "OpsQuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "clientType" "OpsClientType" NOT NULL,
    "validUntil" DATE,
    "packageMarkupType" "OpsMarkupType",
    "packageMarkupValue" DECIMAL(10,2),
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalSelling" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalMgmtFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marginPct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_override_request" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currentUsed" DECIMAL(12,2) NOT NULL,
    "creditLimit" DECIMAL(12,2) NOT NULL,
    "overageAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "pendingPayload" JSONB,
    "pendingType" TEXT,
    "createdFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_override_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_pnl" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "budgetedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budgetedRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_pnl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_flight_ticket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "opsFileId" TEXT,
    "status" "OpsFlightTicketStatus" NOT NULL DEFAULT 'DRAFT',
    "flightType" "OpsFlightType" NOT NULL DEFAULT 'ONE_WAY',
    "clientName" TEXT,
    "issueDate" DATE,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "returnDate" DATE,
    "airline" TEXT,
    "flightNumber" TEXT,
    "returnFlightNumber" TEXT,
    "ticketNumber" TEXT,
    "takeOffTime" TEXT,
    "terminal" TEXT,
    "returnTakeOffTime" TEXT,
    "returnTerminal" TEXT,
    "returnAirline" TEXT,
    "transactionType" "OpsFlightTxType" NOT NULL DEFAULT 'ISSUE',
    "vendorId" TEXT,
    "customerPartnerId" TEXT,
    "pricingBasis" "OpsPricingBasis" NOT NULL DEFAULT 'PER_PERSON',
    "pax" INTEGER NOT NULL DEFAULT 1,
    "buyingRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellingRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissionType" "OpsMarkupType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionValue" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marginPct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "changeFees" DECIMAL(12,2),
    "priceDifference" DECIMAL(12,2),
    "cancellationFees" DECIMAL(12,2),
    "voidFee" DECIMAL(12,2),
    "parentTicketId" TEXT,
    "currencyId" TEXT,
    "journalMoveId" TEXT,
    "vendorMoveId" TEXT,
    "customerMoveId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_flight_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_flight_leg" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "takeOffTime" TEXT,
    "airline" TEXT,
    "flightNumber" TEXT,
    "terminal" TEXT,

    CONSTRAINT "ops_flight_leg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_flight_fare_line" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "passengerLabel" TEXT,
    "classCode" TEXT,
    "baseFare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "aviationCommType" "OpsMarkupType" NOT NULL DEFAULT 'PERCENTAGE',
    "aviationCommValue" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "aviationCommAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employeeId" TEXT,
    "empCommType" "OpsMarkupType" NOT NULL DEFAULT 'PERCENTAGE',
    "empCommValue" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "empCommAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marginPct" DECIMAL(8,4) NOT NULL DEFAULT 0,

    CONSTRAINT "ops_flight_fare_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_transport_destination" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_transport_destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_transport_route" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_transport_route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_transport_rate_season" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_transport_rate_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_transport_rate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "vehicleType" "OpsVehicleType" NOT NULL,
    "rentEGP" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tipEGP" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "repAllowEGP" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_transport_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_sightseeing_entry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_sightseeing_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_sightseeing_rate_season" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceEGP" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_sightseeing_rate_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_guidance_rate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "guideType" "OpsGuideType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_guidance_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_guidance_rate_season" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "guidanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pricePerDay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_guidance_rate_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_meal_rate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "nameEn" TEXT NOT NULL,
    "destinationCode" TEXT,
    "mealType" "OpsMealType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_meal_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_meal_rate_season" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "mealRateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pricePerPax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_meal_rate_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coa_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coa_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coa_template_group" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codePrefixStart" TEXT NOT NULL,
    "codePrefixEnd" TEXT NOT NULL,

    CONSTRAINT "coa_template_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coa_template_account" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "reconcile" BOOLEAN NOT NULL DEFAULT false,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "groupName" TEXT,

    CONSTRAINT "coa_template_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_boat" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownershipMode" "CruiseOwnershipMode" NOT NULL,
    "boatClass" "CruiseBoatClass" NOT NULL,
    "starRating" "CruiseStarRating" NOT NULL,
    "operatorPartnerId" TEXT,
    "yearBuilt" INTEGER,
    "yearRenovated" INTEGER,
    "totalCabins" INTEGER NOT NULL,
    "totalDecks" INTEGER NOT NULL,
    "maxPax" INTEGER NOT NULL,
    "lengthMeters" DECIMAL(8,2),
    "beamMeters" DECIMAL(8,2),
    "cruisingSpeedKnots" DECIMAL(5,2),
    "hasPool" BOOLEAN NOT NULL DEFAULT false,
    "hasSpa" BOOLEAN NOT NULL DEFAULT false,
    "hasGym" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "shortDescription" TEXT,
    "homePortCode" "CruisePortOfCall" NOT NULL DEFAULT 'LUXOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_boat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_boat_amenity" (
    "id" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_boat_amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_boat_image" (
    "id" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_boat_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_deck" (
    "id" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "level" "CruiseDeckLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "planLayout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_cabin_category" (
    "id" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bedConfiguration" TEXT,
    "minOccupancy" INTEGER NOT NULL DEFAULT 1,
    "baseOccupancy" INTEGER NOT NULL DEFAULT 2,
    "maxAdults" INTEGER NOT NULL DEFAULT 2,
    "maxChildren" INTEGER NOT NULL DEFAULT 1,
    "maxInfants" INTEGER NOT NULL DEFAULT 1,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 2,
    "extraBedAvailable" BOOLEAN NOT NULL DEFAULT false,
    "maxExtraBeds" INTEGER NOT NULL DEFAULT 0,
    "sizeM2" DECIMAL(6,2),
    "hasBalcony" BOOLEAN NOT NULL DEFAULT false,
    "hasBathtub" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_cabin_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_cabin" (
    "id" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "cabinNumber" TEXT NOT NULL,
    "view" "CabinView" NOT NULL,
    "bedType" "CabinBedType" NOT NULL,
    "isAccessible" BOOLEAN NOT NULL DEFAULT false,
    "isConnecting" BOOLEAN NOT NULL DEFAULT false,
    "connectingTo" TEXT,
    "positionX" INTEGER,
    "positionY" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_cabin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_cabin_ooo" (
    "id" TEXT NOT NULL,
    "cabinId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_cabin_ooo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_type" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" "CruiseTypeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "durationNights" INTEGER NOT NULL,
    "itineraryMode" "CruiseItineraryMode" NOT NULL,
    "embarkPort" "CruisePortOfCall" NOT NULL,
    "disembarkPort" "CruisePortOfCall" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_itinerary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "boatId" TEXT,
    "cruiseTypeId" TEXT NOT NULL,
    "departureId" TEXT,
    "mode" "CruiseItineraryMode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_itinerary_day" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "portOfCall" "CruisePortOfCall" NOT NULL,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "sailingTime" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meals" TEXT,
    "includesBreakfast" BOOLEAN NOT NULL DEFAULT true,
    "includesLunch" BOOLEAN NOT NULL DEFAULT true,
    "includesDinner" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_itinerary_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_itinerary_day_excursion" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "isIncluded" BOOLEAN NOT NULL DEFAULT true,
    "optionalPricePax" DECIMAL(12,2),
    "optionalCurrency" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "nc_itinerary_day_excursion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_cancellation_policy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "freeCancellationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_cancellation_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_cancellation_tier" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "chargeType" "CruiseCancellationChargeType" NOT NULL,
    "chargeValue" DECIMAL(12,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_cancellation_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_contract" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "ownershipMode" "CruiseOwnershipMode" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "status" "CruiseContractStatus" NOT NULL DEFAULT 'DRAFT',
    "rateBasis" "CruiseRateBasis" NOT NULL DEFAULT 'PER_PERSON',
    "allocationBasis" "CruiseAllocationBasis" NOT NULL DEFAULT 'ALLOCATION',
    "defaultReleaseDays" INTEGER NOT NULL DEFAULT 7,
    "includesFullBoard" BOOLEAN NOT NULL DEFAULT true,
    "includesSightseeing" BOOLEAN NOT NULL DEFAULT true,
    "includesSoftDrinks" BOOLEAN NOT NULL DEFAULT false,
    "includesVisitFees" BOOLEAN NOT NULL DEFAULT false,
    "includesTransfers" BOOLEAN NOT NULL DEFAULT false,
    "includesDomesticFlight" BOOLEAN NOT NULL DEFAULT false,
    "flightRouting" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "cancellationPolicyId" TEXT,
    "termsAndConditions" TEXT,
    "notes" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "parentContractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "nc_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_season" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "releaseDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_base_rate" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "cabinCategoryId" TEXT NOT NULL,
    "ratePerPaxPerNight" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "marketId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_base_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_supplement" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" "CruiseSupplementType" NOT NULL,
    "cabinCategoryId" TEXT,
    "deckLevel" "CruiseDeckLevel",
    "view" "CabinView",
    "childAgeCategory" "ChildAgeCategory",
    "occupancyKey" TEXT,
    "valueType" "CruiseSupplementValueType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "perPaxPerNight" BOOLEAN NOT NULL DEFAULT true,
    "marketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_supplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_child_policy" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "category" "ChildAgeCategory" NOT NULL,
    "ageFrom" INTEGER NOT NULL,
    "ageTo" INTEGER NOT NULL,
    "bedding" "ChildBedding" NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "discountPercent" DECIMAL(5,2),
    "fixedRate" DECIMAL(12,2),
    "maxFreeChildren" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_child_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_contract_embark_day" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "durationNights" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,

    CONSTRAINT "nc_contract_embark_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_contract_market" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "markup" DECIMAL(8,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_contract_market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_contract_to" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "tourOperatorId" TEXT NOT NULL,
    "markup" DECIMAL(8,4),
    "marketingContribution" DECIMAL(12,2),
    "commissionPercent" DECIMAL(5,2),
    "paymentTermDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_contract_to_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_offer" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "CruiseOfferType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "CruiseOfferValueType" NOT NULL,
    "value" DECIMAL(12,4),
    "freeNightsPay" INTEGER,
    "freeNightsGet" INTEGER,
    "bookingFromDate" TIMESTAMP(3),
    "bookingToDate" TIMESTAMP(3),
    "travelFromDate" TIMESTAMP(3),
    "travelToDate" TIMESTAMP(3),
    "daysBeforeDeparture" INTEGER,
    "minNights" INTEGER,
    "minPax" INTEGER,
    "applicableCabinCategoryIds" TEXT[],
    "applicableMarketIds" TEXT[],
    "isCombinable" BOOLEAN NOT NULL DEFAULT false,
    "notCombinableWith" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_gala_meal" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "CruiseGalaMealType" NOT NULL,
    "applicableDate" TIMESTAMP(3) NOT NULL,
    "pricePerPax" DECIMAL(12,2) NOT NULL,
    "childPricePerPax" DECIMAL(12,2),
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_gala_meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_stop_sale" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractId" TEXT,
    "boatId" TEXT,
    "departureId" TEXT,
    "scope" "CruiseStopSaleScope" NOT NULL,
    "cabinCategoryId" TEXT,
    "marketId" TEXT,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_stop_sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_departure_pattern" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "cruiseTypeId" TEXT NOT NULL,
    "pattern" "CruiseRecurrencePattern" NOT NULL,
    "daysOfWeek" INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "embarkPort" "CruisePortOfCall" NOT NULL,
    "disembarkPort" "CruisePortOfCall" NOT NULL,
    "contractId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_departure_pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_departure" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "cruiseTypeId" TEXT NOT NULL,
    "contractId" TEXT,
    "embarkDate" TIMESTAMP(3) NOT NULL,
    "disembarkDate" TIMESTAMP(3) NOT NULL,
    "embarkPort" "CruisePortOfCall" NOT NULL,
    "disembarkPort" "CruisePortOfCall" NOT NULL,
    "status" "CruiseDepartureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cutoffDate" TIMESTAMP(3),
    "notes" TEXT,
    "manifestStatus" "ManifestStatus" NOT NULL DEFAULT 'PENDING',
    "manifestSubmittedAt" TIMESTAMP(3),
    "manifestNumber" TEXT,
    "totalCabins" INTEGER NOT NULL,
    "totalPaxCapacity" INTEGER NOT NULL,
    "generatedFromPatternId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_departure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_allotment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "departureId" TEXT,
    "seasonId" TEXT,
    "cabinCategoryId" TEXT NOT NULL,
    "allocationBasis" "CruiseAllocationBasis" NOT NULL,
    "totalCabins" INTEGER NOT NULL,
    "soldCabins" INTEGER NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3),
    "isFreesale" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_allotment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_booking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "CruiseBookingStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "CruiseBookingSource" NOT NULL DEFAULT 'DIRECT',
    "billingType" "CruiseBillingType" NOT NULL DEFAULT 'GUEST_DIRECT',
    "departureId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "marketId" TEXT,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "cabinCount" INTEGER NOT NULL DEFAULT 1,
    "customerId" TEXT,
    "leadGuestName" TEXT NOT NULL,
    "leadGuestEmail" TEXT,
    "leadGuestPhone" TEXT,
    "leadGuestNationalityId" TEXT,
    "tourOperatorId" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "netTotal" DECIMAL(14,2) NOT NULL,
    "markup" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "galaSupplement" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grossTotal" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(14,2) NOT NULL,
    "optionExpiryAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "cancellationPenalty" DECIMAL(14,2),
    "embarkedAt" TIMESTAMP(3),
    "disembarkedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "opsFileId" TEXT,
    "hotelReservationIds" TEXT[],
    "trafficJobIds" TEXT[],
    "flightTicketIds" TEXT[],
    "invoiceMoveId" TEXT,
    "refundMoveId" TEXT,
    "voucherGeneratedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_booking_cabin" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "cabinCategoryId" TEXT NOT NULL,
    "occupancy" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "childAges" INTEGER[],
    "ratePerPaxPerNight" DECIMAL(12,2) NOT NULL,
    "nights" INTEGER NOT NULL,
    "sglSupplement" DECIMAL(12,2),
    "childDiscounts" DECIMAL(12,2),
    "deckPreference" "CruiseDeckLevel",
    "viewPreference" "CabinView",
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nc_booking_cabin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_passenger" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "cabinLineId" TEXT,
    "paxType" "CruisePaxType" NOT NULL,
    "paxRole" "CruisePaxRole" NOT NULL DEFAULT 'COMPANION',
    "titleId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER,
    "gender" TEXT,
    "nationalityId" TEXT,
    "passportNumber" TEXT,
    "passportIssueDate" TIMESTAMP(3),
    "passportExpiryDate" TIMESTAMP(3),
    "passportIssueCountryId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "dietary" TEXT,
    "medicalNotes" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_cabin_assignment" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "cabinId" TEXT NOT NULL,
    "status" "CabinAssignmentStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_cabin_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_booking_payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paymentId" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_booking_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_special_request" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "CruiseSpecialRequestType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CruiseSpecialRequestStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_special_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_booking_comm" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_booking_comm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_booking_amendment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "priceImpact" DECIMAL(14,2),
    "penaltyApplied" DECIMAL(14,2),
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_booking_amendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_voucher" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_manifest" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "status" "ManifestStatus" NOT NULL DEFAULT 'PENDING',
    "submissionMethod" "ManifestSubmissionMethod",
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "submissionRef" TEXT,
    "totalPax" INTEGER NOT NULL,
    "totalAdults" INTEGER NOT NULL,
    "totalChildren" INTEGER NOT NULL,
    "totalInfants" INTEGER NOT NULL,
    "pdfUrl" TEXT,
    "excelUrl" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nc_manifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nc_manifest_amendment" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nc_manifest_amendment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_license_keyHash_key" ON "sys_license"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "sys_license_companyId_key" ON "sys_license"("companyId");

-- CreateIndex
CREATE INDEX "fin_analytic_account_companyId_idx" ON "fin_analytic_account"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_analytic_account_code_companyId_key" ON "fin_analytic_account"("code", "companyId");

-- CreateIndex
CREATE INDEX "fin_account_asset_companyId_idx" ON "fin_account_asset"("companyId");

-- CreateIndex
CREATE INDEX "fin_account_asset_companyId_state_idx" ON "fin_account_asset"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "fin_account_asset_line_moveId_key" ON "fin_account_asset_line"("moveId");

-- CreateIndex
CREATE INDEX "fin_account_asset_line_assetId_idx" ON "fin_account_asset_line"("assetId");

-- CreateIndex
CREATE INDEX "fin_account_loan_companyId_idx" ON "fin_account_loan"("companyId");

-- CreateIndex
CREATE INDEX "fin_account_loan_companyId_state_idx" ON "fin_account_loan"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "fin_loan_schedule_line_moveId_key" ON "fin_loan_schedule_line"("moveId");

-- CreateIndex
CREATE INDEX "fin_loan_schedule_line_loanId_idx" ON "fin_loan_schedule_line"("loanId");

-- CreateIndex
CREATE INDEX "fin_tax_return_companyId_idx" ON "fin_tax_return"("companyId");

-- CreateIndex
CREATE INDEX "fin_tax_return_companyId_state_idx" ON "fin_tax_return"("companyId", "state");

-- CreateIndex
CREATE INDEX "fin_tax_return_line_taxReturnId_idx" ON "fin_tax_return_line"("taxReturnId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_account_lock_date_companyId_key" ON "fin_account_lock_date"("companyId");

-- CreateIndex
CREATE INDEX "fin_audit_trail_companyId_idx" ON "fin_audit_trail"("companyId");

-- CreateIndex
CREATE INDEX "fin_audit_trail_companyId_modelName_idx" ON "fin_audit_trail"("companyId", "modelName");

-- CreateIndex
CREATE INDEX "fin_audit_trail_companyId_createdAt_idx" ON "fin_audit_trail"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "fin_working_file_companyId_idx" ON "fin_working_file"("companyId");

-- CreateIndex
CREATE INDEX "fin_working_file_companyId_state_idx" ON "fin_working_file"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "fin_deferred_revenue_moveLineId_key" ON "fin_deferred_revenue"("moveLineId");

-- CreateIndex
CREATE INDEX "fin_deferred_revenue_companyId_idx" ON "fin_deferred_revenue"("companyId");

-- CreateIndex
CREATE INDEX "fin_deferred_revenue_companyId_state_idx" ON "fin_deferred_revenue"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "fin_deferred_revenue_schedule_moveId_key" ON "fin_deferred_revenue_schedule"("moveId");

-- CreateIndex
CREATE INDEX "fin_deferred_revenue_schedule_deferredId_idx" ON "fin_deferred_revenue_schedule"("deferredId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_deferred_expense_moveLineId_key" ON "fin_deferred_expense"("moveLineId");

-- CreateIndex
CREATE INDEX "fin_deferred_expense_companyId_idx" ON "fin_deferred_expense"("companyId");

-- CreateIndex
CREATE INDEX "fin_deferred_expense_companyId_state_idx" ON "fin_deferred_expense"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "fin_deferred_expense_schedule_moveId_key" ON "fin_deferred_expense_schedule"("moveId");

-- CreateIndex
CREATE INDEX "fin_deferred_expense_schedule_deferredId_idx" ON "fin_deferred_expense_schedule"("deferredId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_unrealized_currency_adjustmentMoveId_key" ON "fin_unrealized_currency"("adjustmentMoveId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_unrealized_currency_reversalMoveId_key" ON "fin_unrealized_currency"("reversalMoveId");

-- CreateIndex
CREATE INDEX "fin_unrealized_currency_companyId_idx" ON "fin_unrealized_currency"("companyId");

-- CreateIndex
CREATE INDEX "fin_unrealized_currency_companyId_date_idx" ON "fin_unrealized_currency"("companyId", "date");

-- CreateIndex
CREATE INDEX "ct_contract_offer_tier_offerId_idx" ON "ct_contract_offer_tier"("offerId");

-- CreateIndex
CREATE INDEX "ct_contract_season_spo_contractId_idx" ON "ct_contract_season_spo"("contractId");

-- CreateIndex
CREATE INDEX "ct_contract_season_spo_contractId_spoType_idx" ON "ct_contract_season_spo"("contractId", "spoType");

-- CreateIndex
CREATE INDEX "ct_season_spo_btc_spoId_idx" ON "ct_season_spo_btc"("spoId");

-- CreateIndex
CREATE INDEX "ct_season_spo_room_sup_spoId_idx" ON "ct_season_spo_room_sup"("spoId");

-- CreateIndex
CREATE INDEX "ct_season_spo_date_spoId_idx" ON "ct_season_spo_date"("spoId");

-- CreateIndex
CREATE INDEX "ct_contract_marketing_contribution_contractId_idx" ON "ct_contract_marketing_contribution"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_tour_operator_partnerId_key" ON "ct_tour_operator"("partnerId");

-- CreateIndex
CREATE INDEX "ct_tour_operator_companyId_idx" ON "ct_tour_operator"("companyId");

-- CreateIndex
CREATE INDEX "ct_tour_operator_companyId_partnerType_idx" ON "ct_tour_operator"("companyId", "partnerType");

-- CreateIndex
CREATE UNIQUE INDEX "ct_tour_operator_companyId_code_key" ON "ct_tour_operator"("companyId", "code");

-- CreateIndex
CREATE INDEX "ct_contract_tour_operator_contractId_idx" ON "ct_contract_tour_operator"("contractId");

-- CreateIndex
CREATE INDEX "ct_contract_tour_operator_tourOperatorId_idx" ON "ct_contract_tour_operator"("tourOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_contract_tour_operator_contractId_tourOperatorId_key" ON "ct_contract_tour_operator"("contractId", "tourOperatorId");

-- CreateIndex
CREATE INDEX "ct_hotel_tour_operator_hotelId_idx" ON "ct_hotel_tour_operator"("hotelId");

-- CreateIndex
CREATE INDEX "ct_hotel_tour_operator_tourOperatorId_idx" ON "ct_hotel_tour_operator"("tourOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_hotel_tour_operator_hotelId_tourOperatorId_key" ON "ct_hotel_tour_operator"("hotelId", "tourOperatorId");

-- CreateIndex
CREATE INDEX "ct_markup_rule_companyId_idx" ON "ct_markup_rule"("companyId");

-- CreateIndex
CREATE INDEX "ct_tariff_companyId_idx" ON "ct_tariff"("companyId");

-- CreateIndex
CREATE INDEX "ct_tariff_contractId_idx" ON "ct_tariff"("contractId");

-- CreateIndex
CREATE INDEX "ct_tariff_tourOperatorId_idx" ON "ct_tariff"("tourOperatorId");

-- CreateIndex
CREATE INDEX "ct_contract_special_meal_contractId_idx" ON "ct_contract_special_meal"("contractId");

-- CreateIndex
CREATE INDEX "ct_rate_verification_companyId_idx" ON "ct_rate_verification"("companyId");

-- CreateIndex
CREATE INDEX "ct_rate_verification_contractId_idx" ON "ct_rate_verification"("contractId");

-- CreateIndex
CREATE INDEX "ct_contract_copy_log_companyId_idx" ON "ct_contract_copy_log"("companyId");

-- CreateIndex
CREATE INDEX "ct_contract_copy_log_sourceContractId_idx" ON "ct_contract_copy_log"("sourceContractId");

-- CreateIndex
CREATE INDEX "ct_contract_copy_log_targetContractId_idx" ON "ct_contract_copy_log"("targetContractId");

-- CreateIndex
CREATE INDEX "ct_contract_audit_log_contractId_createdAt_idx" ON "ct_contract_audit_log"("contractId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_companyId_idx" ON "ApiKey"("companyId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIntegration_tourOperatorId_key" ON "ApiIntegration"("tourOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIntegration_apiKeyId_key" ON "ApiIntegration"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiIntegration_companyId_idx" ON "ApiIntegration"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIntegration_companyId_tourOperatorId_key" ON "ApiIntegration"("companyId", "tourOperatorId");

-- CreateIndex
CREATE INDEX "ApiIntegrationHotel_apiIntegrationId_idx" ON "ApiIntegrationHotel"("apiIntegrationId");

-- CreateIndex
CREATE INDEX "ApiIntegrationHotel_hotelId_idx" ON "ApiIntegrationHotel"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIntegrationHotel_apiIntegrationId_hotelId_key" ON "ApiIntegrationHotel"("apiIntegrationId", "hotelId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_apiIntegrationId_idx" ON "WebhookDelivery"("apiIntegrationId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_event_idx" ON "WebhookDelivery"("event");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "incoming_webhook_apiIntegrationId_idx" ON "incoming_webhook"("apiIntegrationId");

-- CreateIndex
CREATE INDEX "incoming_webhook_createdAt_idx" ON "incoming_webhook"("createdAt");

-- CreateIndex
CREATE INDEX "rv_guest_companyId_idx" ON "rv_guest"("companyId");

-- CreateIndex
CREATE INDEX "rv_guest_companyId_email_idx" ON "rv_guest"("companyId", "email");

-- CreateIndex
CREATE INDEX "rv_guest_companyId_passportNo_idx" ON "rv_guest"("companyId", "passportNo");

-- CreateIndex
CREATE INDEX "rv_guest_companyId_lastName_firstName_idx" ON "rv_guest"("companyId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "rv_booking_finCustomerMoveId_key" ON "rv_booking"("finCustomerMoveId");

-- CreateIndex
CREATE UNIQUE INDEX "rv_booking_finVendorMoveId_key" ON "rv_booking"("finVendorMoveId");

-- CreateIndex
CREATE INDEX "rv_booking_companyId_idx" ON "rv_booking"("companyId");

-- CreateIndex
CREATE INDEX "rv_booking_companyId_status_idx" ON "rv_booking"("companyId", "status");

-- CreateIndex
CREATE INDEX "rv_booking_companyId_hotelId_idx" ON "rv_booking"("companyId", "hotelId");

-- CreateIndex
CREATE INDEX "rv_booking_companyId_tourOperatorId_idx" ON "rv_booking"("companyId", "tourOperatorId");

-- CreateIndex
CREATE INDEX "rv_booking_companyId_checkIn_idx" ON "rv_booking"("companyId", "checkIn");

-- CreateIndex
CREATE INDEX "rv_booking_hotelId_checkIn_checkOut_idx" ON "rv_booking"("hotelId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "rv_booking_contractId_idx" ON "rv_booking"("contractId");

-- CreateIndex
CREATE INDEX "rv_booking_marketId_idx" ON "rv_booking"("marketId");

-- CreateIndex
CREATE INDEX "rv_booking_seasonId_idx" ON "rv_booking"("seasonId");

-- CreateIndex
CREATE INDEX "rv_booking_createdById_idx" ON "rv_booking"("createdById");

-- CreateIndex
CREATE INDEX "rv_booking_leadGuestEmail_idx" ON "rv_booking"("leadGuestEmail");

-- CreateIndex
CREATE UNIQUE INDEX "rv_booking_companyId_code_key" ON "rv_booking"("companyId", "code");

-- CreateIndex
CREATE INDEX "rv_booking_rate_change_bookingId_idx" ON "rv_booking_rate_change"("bookingId");

-- CreateIndex
CREATE INDEX "rv_booking_rate_change_changedAt_idx" ON "rv_booking_rate_change"("changedAt");

-- CreateIndex
CREATE INDEX "rv_booking_currency_line_bookingId_idx" ON "rv_booking_currency_line"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "rv_booking_currency_line_bookingId_currencyId_key" ON "rv_booking_currency_line"("bookingId", "currencyId");

-- CreateIndex
CREATE INDEX "rv_booking_room_bookingId_idx" ON "rv_booking_room"("bookingId");

-- CreateIndex
CREATE INDEX "rv_booking_guest_bookingId_idx" ON "rv_booking_guest"("bookingId");

-- CreateIndex
CREATE INDEX "rv_booking_guest_bookingRoomId_idx" ON "rv_booking_guest"("bookingRoomId");

-- CreateIndex
CREATE INDEX "rv_booking_guest_guestId_idx" ON "rv_booking_guest"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "rv_booking_payment_finPaymentId_key" ON "rv_booking_payment"("finPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "rv_booking_payment_finMoveId_key" ON "rv_booking_payment"("finMoveId");

-- CreateIndex
CREATE INDEX "rv_booking_payment_bookingId_idx" ON "rv_booking_payment"("bookingId");

-- CreateIndex
CREATE INDEX "rv_voucher_companyId_idx" ON "rv_voucher"("companyId");

-- CreateIndex
CREATE INDEX "rv_voucher_bookingId_idx" ON "rv_voucher"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "rv_voucher_companyId_code_key" ON "rv_voucher"("companyId", "code");

-- CreateIndex
CREATE INDEX "rv_booking_timeline_bookingId_idx" ON "rv_booking_timeline"("bookingId");

-- CreateIndex
CREATE INDEX "rv_booking_deadline_bookingId_idx" ON "rv_booking_deadline"("bookingId");

-- CreateIndex
CREATE INDEX "rv_booking_deadline_dueDate_status_idx" ON "rv_booking_deadline"("dueDate", "status");

-- CreateIndex
CREATE INDEX "rv_booking_special_request_bookingId_idx" ON "rv_booking_special_request"("bookingId");

-- CreateIndex
CREATE INDEX "rv_booking_communication_bookingId_idx" ON "rv_booking_communication"("bookingId");

-- CreateIndex
CREATE INDEX "sys_notification_recipientId_read_idx" ON "sys_notification"("recipientId", "read");

-- CreateIndex
CREATE INDEX "sys_notification_companyId_idx" ON "sys_notification"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_code_key" ON "Airport"("code");

-- CreateIndex
CREATE INDEX "Airport_code_idx" ON "Airport"("code");

-- CreateIndex
CREATE INDEX "Airport_countryId_idx" ON "Airport"("countryId");

-- CreateIndex
CREATE INDEX "tt_zone_companyId_idx" ON "tt_zone"("companyId");

-- CreateIndex
CREATE INDEX "tt_zone_cityId_idx" ON "tt_zone"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_zone_companyId_cityId_code_key" ON "tt_zone"("companyId", "cityId", "code");

-- CreateIndex
CREATE INDEX "tt_vehicle_type_companyId_idx" ON "tt_vehicle_type"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_vehicle_type_companyId_code_key" ON "tt_vehicle_type"("companyId", "code");

-- CreateIndex
CREATE INDEX "tt_vehicle_companyId_idx" ON "tt_vehicle"("companyId");

-- CreateIndex
CREATE INDEX "tt_vehicle_vehicleTypeId_idx" ON "tt_vehicle"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "tt_vehicle_supplierId_idx" ON "tt_vehicle"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_vehicle_companyId_plateNumber_key" ON "tt_vehicle"("companyId", "plateNumber");

-- CreateIndex
CREATE INDEX "tt_vehicle_compliance_companyId_idx" ON "tt_vehicle_compliance"("companyId");

-- CreateIndex
CREATE INDEX "tt_vehicle_compliance_vehicleId_idx" ON "tt_vehicle_compliance"("vehicleId");

-- CreateIndex
CREATE INDEX "tt_vehicle_compliance_expiryDate_idx" ON "tt_vehicle_compliance"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "tt_driver_userId_key" ON "tt_driver"("userId");

-- CreateIndex
CREATE INDEX "tt_driver_companyId_idx" ON "tt_driver"("companyId");

-- CreateIndex
CREATE INDEX "tt_driver_userId_idx" ON "tt_driver"("userId");

-- CreateIndex
CREATE INDEX "tt_driver_vehicle_companyId_idx" ON "tt_driver_vehicle"("companyId");

-- CreateIndex
CREATE INDEX "tt_driver_vehicle_driverId_idx" ON "tt_driver_vehicle"("driverId");

-- CreateIndex
CREATE INDEX "tt_driver_vehicle_vehicleId_idx" ON "tt_driver_vehicle"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_driver_vehicle_driverId_vehicleId_key" ON "tt_driver_vehicle"("driverId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_rep_userId_key" ON "tt_rep"("userId");

-- CreateIndex
CREATE INDEX "tt_rep_companyId_idx" ON "tt_rep"("companyId");

-- CreateIndex
CREATE INDEX "tt_rep_userId_idx" ON "tt_rep"("userId");

-- CreateIndex
CREATE INDEX "tt_rep_zone_companyId_idx" ON "tt_rep_zone"("companyId");

-- CreateIndex
CREATE INDEX "tt_rep_zone_repId_idx" ON "tt_rep_zone"("repId");

-- CreateIndex
CREATE INDEX "tt_rep_zone_zoneId_idx" ON "tt_rep_zone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_rep_zone_repId_zoneId_key" ON "tt_rep_zone"("repId", "zoneId");

-- CreateIndex
CREATE INDEX "tt_price_item_companyId_idx" ON "tt_price_item"("companyId");

-- CreateIndex
CREATE INDEX "tt_price_item_vehicleTypeId_idx" ON "tt_price_item"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "tt_price_item_fromZoneId_idx" ON "tt_price_item"("fromZoneId");

-- CreateIndex
CREATE INDEX "tt_price_item_toZoneId_idx" ON "tt_price_item"("toZoneId");

-- CreateIndex
CREATE INDEX "tt_partner_price_override_companyId_idx" ON "tt_partner_price_override"("companyId");

-- CreateIndex
CREATE INDEX "tt_partner_price_override_partnerId_idx" ON "tt_partner_price_override"("partnerId");

-- CreateIndex
CREATE INDEX "tt_partner_price_override_priceItemId_idx" ON "tt_partner_price_override"("priceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_partner_price_override_partnerId_priceItemId_key" ON "tt_partner_price_override"("partnerId", "priceItemId");

-- CreateIndex
CREATE INDEX "tt_supplier_trip_price_companyId_idx" ON "tt_supplier_trip_price"("companyId");

-- CreateIndex
CREATE INDEX "tt_supplier_trip_price_supplierId_idx" ON "tt_supplier_trip_price"("supplierId");

-- CreateIndex
CREATE INDEX "tt_supplier_trip_price_vehicleTypeId_idx" ON "tt_supplier_trip_price"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "tt_traffic_job_companyId_idx" ON "tt_traffic_job"("companyId");

-- CreateIndex
CREATE INDEX "tt_traffic_job_companyId_serviceDate_idx" ON "tt_traffic_job"("companyId", "serviceDate");

-- CreateIndex
CREATE INDEX "tt_traffic_job_companyId_status_idx" ON "tt_traffic_job"("companyId", "status");

-- CreateIndex
CREATE INDEX "tt_traffic_job_partnerId_idx" ON "tt_traffic_job"("partnerId");

-- CreateIndex
CREATE INDEX "tt_traffic_job_bookingId_idx" ON "tt_traffic_job"("bookingId");

-- CreateIndex
CREATE INDEX "tt_traffic_job_flightId_idx" ON "tt_traffic_job"("flightId");

-- CreateIndex
CREATE INDEX "tt_traffic_job_createdById_idx" ON "tt_traffic_job"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "tt_traffic_job_companyId_code_key" ON "tt_traffic_job"("companyId", "code");

-- CreateIndex
CREATE INDEX "tt_traffic_flight_companyId_idx" ON "tt_traffic_flight"("companyId");

-- CreateIndex
CREATE INDEX "tt_traffic_flight_companyId_flightDate_idx" ON "tt_traffic_flight"("companyId", "flightDate");

-- CreateIndex
CREATE INDEX "tt_traffic_flight_flightNumber_idx" ON "tt_traffic_flight"("flightNumber");

-- CreateIndex
CREATE INDEX "tt_traffic_assignment_companyId_idx" ON "tt_traffic_assignment"("companyId");

-- CreateIndex
CREATE INDEX "tt_traffic_assignment_jobId_idx" ON "tt_traffic_assignment"("jobId");

-- CreateIndex
CREATE INDEX "tt_traffic_assignment_vehicleId_idx" ON "tt_traffic_assignment"("vehicleId");

-- CreateIndex
CREATE INDEX "tt_traffic_assignment_driverId_idx" ON "tt_traffic_assignment"("driverId");

-- CreateIndex
CREATE INDEX "tt_traffic_assignment_repId_idx" ON "tt_traffic_assignment"("repId");

-- CreateIndex
CREATE INDEX "tt_status_change_log_jobId_idx" ON "tt_status_change_log"("jobId");

-- CreateIndex
CREATE INDEX "tt_no_show_evidence_jobId_idx" ON "tt_no_show_evidence"("jobId");

-- CreateIndex
CREATE INDEX "tt_guest_booking_companyId_idx" ON "tt_guest_booking"("companyId");

-- CreateIndex
CREATE INDEX "tt_guest_booking_companyId_status_idx" ON "tt_guest_booking"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tt_guest_booking_companyId_code_key" ON "tt_guest_booking"("companyId", "code");

-- CreateIndex
CREATE INDEX "tt_guest_payment_guestBookingId_idx" ON "tt_guest_payment"("guestBookingId");

-- CreateIndex
CREATE INDEX "tt_operational_cost_companyId_idx" ON "tt_operational_cost"("companyId");

-- CreateIndex
CREATE INDEX "tt_operational_cost_jobId_idx" ON "tt_operational_cost"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_settings_companyId_key" ON "tt_settings"("companyId");

-- CreateIndex
CREATE INDEX "tt_push_token_userId_idx" ON "tt_push_token"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tt_push_token_userId_token_key" ON "tt_push_token"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "pub_branding_companyId_key" ON "pub_branding"("companyId");

-- CreateIndex
CREATE INDEX "pub_hero_slide_companyId_sortOrder_idx" ON "pub_hero_slide"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "pub_page_companyId_idx" ON "pub_page"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "pub_page_companyId_slug_key" ON "pub_page"("companyId", "slug");

-- CreateIndex
CREATE INDEX "pub_blog_post_companyId_idx" ON "pub_blog_post"("companyId");

-- CreateIndex
CREATE INDEX "pub_blog_post_companyId_status_idx" ON "pub_blog_post"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pub_blog_post_companyId_slug_key" ON "pub_blog_post"("companyId", "slug");

-- CreateIndex
CREATE INDEX "pub_faq_companyId_sortOrder_idx" ON "pub_faq"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "pub_testimonial_companyId_idx" ON "pub_testimonial"("companyId");

-- CreateIndex
CREATE INDEX "pub_testimonial_companyId_featured_idx" ON "pub_testimonial"("companyId", "featured");

-- CreateIndex
CREATE INDEX "pub_newsletter_subscriber_companyId_idx" ON "pub_newsletter_subscriber"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "pub_newsletter_subscriber_companyId_email_key" ON "pub_newsletter_subscriber"("companyId", "email");

-- CreateIndex
CREATE INDEX "pub_contact_inquiry_companyId_idx" ON "pub_contact_inquiry"("companyId");

-- CreateIndex
CREATE INDEX "pub_contact_inquiry_companyId_status_idx" ON "pub_contact_inquiry"("companyId", "status");

-- CreateIndex
CREATE INDEX "b2c_markup_rule_companyId_idx" ON "b2c_markup_rule"("companyId");

-- CreateIndex
CREATE INDEX "b2c_markup_tier_ruleId_idx" ON "b2c_markup_tier"("ruleId");

-- CreateIndex
CREATE INDEX "b2b_credit_transaction_companyId_idx" ON "b2b_credit_transaction"("companyId");

-- CreateIndex
CREATE INDEX "b2b_credit_transaction_tourOperatorId_idx" ON "b2b_credit_transaction"("tourOperatorId");

-- CreateIndex
CREATE INDEX "b2b_credit_transaction_companyId_tourOperatorId_idx" ON "b2b_credit_transaction"("companyId", "tourOperatorId");

-- CreateIndex
CREATE INDEX "crm_lead_companyId_idx" ON "crm_lead"("companyId");

-- CreateIndex
CREATE INDEX "crm_lead_companyId_status_idx" ON "crm_lead"("companyId", "status");

-- CreateIndex
CREATE INDEX "crm_lead_assignedToId_idx" ON "crm_lead"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_companyId_code_key" ON "crm_lead"("companyId", "code");

-- CreateIndex
CREATE INDEX "crm_opportunity_companyId_idx" ON "crm_opportunity"("companyId");

-- CreateIndex
CREATE INDEX "crm_opportunity_companyId_stage_idx" ON "crm_opportunity"("companyId", "stage");

-- CreateIndex
CREATE INDEX "crm_opportunity_ownerId_idx" ON "crm_opportunity"("ownerId");

-- CreateIndex
CREATE INDEX "crm_activity_companyId_idx" ON "crm_activity"("companyId");

-- CreateIndex
CREATE INDEX "crm_activity_leadId_idx" ON "crm_activity"("leadId");

-- CreateIndex
CREATE INDEX "crm_activity_opportunityId_idx" ON "crm_activity"("opportunityId");

-- CreateIndex
CREATE INDEX "crm_activity_customerId_idx" ON "crm_activity"("customerId");

-- CreateIndex
CREATE INDEX "crm_activity_bookingId_idx" ON "crm_activity"("bookingId");

-- CreateIndex
CREATE INDEX "crm_customer_companyId_idx" ON "crm_customer"("companyId");

-- CreateIndex
CREATE INDEX "crm_customer_companyId_email_idx" ON "crm_customer"("companyId", "email");

-- CreateIndex
CREATE INDEX "crm_supplier_companyId_idx" ON "crm_supplier"("companyId");

-- CreateIndex
CREATE INDEX "crm_excursion_companyId_idx" ON "crm_excursion"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_excursion_companyId_code_key" ON "crm_excursion"("companyId", "code");

-- CreateIndex
CREATE INDEX "crm_excursion_program_excursionId_idx" ON "crm_excursion_program"("excursionId");

-- CreateIndex
CREATE INDEX "crm_program_item_programId_idx" ON "crm_program_item"("programId");

-- CreateIndex
CREATE INDEX "crm_excursion_age_group_excursionId_idx" ON "crm_excursion_age_group"("excursionId");

-- CreateIndex
CREATE INDEX "crm_excursion_addon_excursionId_idx" ON "crm_excursion_addon"("excursionId");

-- CreateIndex
CREATE INDEX "crm_cost_sheet_excursionId_idx" ON "crm_cost_sheet"("excursionId");

-- CreateIndex
CREATE INDEX "crm_cost_component_costSheetId_idx" ON "crm_cost_component"("costSheetId");

-- CreateIndex
CREATE INDEX "crm_cost_component_supplierId_idx" ON "crm_cost_component"("supplierId");

-- CreateIndex
CREATE INDEX "crm_pickup_location_excursionId_idx" ON "crm_pickup_location"("excursionId");

-- CreateIndex
CREATE INDEX "crm_transport_tier_pickupLocationId_idx" ON "crm_transport_tier"("pickupLocationId");

-- CreateIndex
CREATE INDEX "crm_selling_price_costSheetId_idx" ON "crm_selling_price"("costSheetId");

-- CreateIndex
CREATE INDEX "crm_booking_companyId_idx" ON "crm_booking"("companyId");

-- CreateIndex
CREATE INDEX "crm_booking_customerId_idx" ON "crm_booking"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_booking_companyId_code_key" ON "crm_booking"("companyId", "code");

-- CreateIndex
CREATE INDEX "crm_booking_item_bookingId_idx" ON "crm_booking_item"("bookingId");

-- CreateIndex
CREATE INDEX "crm_program_plan_companyId_idx" ON "crm_program_plan"("companyId");

-- CreateIndex
CREATE INDEX "crm_program_plan_item_programPlanId_idx" ON "crm_program_plan_item"("programPlanId");

-- CreateIndex
CREATE INDEX "crm_program_plan_item_excursionId_idx" ON "crm_program_plan_item"("excursionId");

-- CreateIndex
CREATE INDEX "crm_program_tour_operator_programPlanId_idx" ON "crm_program_tour_operator"("programPlanId");

-- CreateIndex
CREATE INDEX "crm_program_tour_operator_tourOperatorId_idx" ON "crm_program_tour_operator"("tourOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_program_tour_operator_programPlanId_tourOperatorId_key" ON "crm_program_tour_operator"("programPlanId", "tourOperatorId");

-- CreateIndex
CREATE INDEX "crm_pickup_time_companyId_idx" ON "crm_pickup_time"("companyId");

-- CreateIndex
CREATE INDEX "crm_pickup_time_destinationId_idx" ON "crm_pickup_time"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_pickup_time_companyId_destinationId_hotelId_excursionId_key" ON "crm_pickup_time"("companyId", "destinationId", "hotelId", "excursionId");

-- CreateIndex
CREATE INDEX "crm_excursion_ticket_companyId_idx" ON "crm_excursion_ticket"("companyId");

-- CreateIndex
CREATE INDEX "crm_excursion_ticket_excursionId_idx" ON "crm_excursion_ticket"("excursionId");

-- CreateIndex
CREATE INDEX "crm_excursion_ticket_hotelId_idx" ON "crm_excursion_ticket"("hotelId");

-- CreateIndex
CREATE INDEX "crm_excursion_ticket_tourOperatorId_idx" ON "crm_excursion_ticket"("tourOperatorId");

-- CreateIndex
CREATE INDEX "crm_excursion_ticket_excursionDate_idx" ON "crm_excursion_ticket"("excursionDate");

-- CreateIndex
CREATE INDEX "crm_excursion_ticket_breakdownId_idx" ON "crm_excursion_ticket"("breakdownId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_excursion_ticket_companyId_ticketNo_key" ON "crm_excursion_ticket"("companyId", "ticketNo");

-- CreateIndex
CREATE INDEX "crm_excursion_breakdown_companyId_idx" ON "crm_excursion_breakdown"("companyId");

-- CreateIndex
CREATE INDEX "crm_excursion_breakdown_excursionId_idx" ON "crm_excursion_breakdown"("excursionId");

-- CreateIndex
CREATE INDEX "crm_excursion_breakdown_excursionDate_idx" ON "crm_excursion_breakdown"("excursionDate");

-- CreateIndex
CREATE UNIQUE INDEX "crm_excursion_breakdown_companyId_excursionId_excursionDate_key" ON "crm_excursion_breakdown"("companyId", "excursionId", "excursionDate", "language");

-- CreateIndex
CREATE INDEX "crm_excursion_dispatch_companyId_idx" ON "crm_excursion_dispatch"("companyId");

-- CreateIndex
CREATE INDEX "crm_excursion_dispatch_excursionId_idx" ON "crm_excursion_dispatch"("excursionId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_excursion_dispatch_companyId_excursionId_dispatchDate_key" ON "crm_excursion_dispatch"("companyId", "excursionId", "dispatchDate");

-- CreateIndex
CREATE UNIQUE INDEX "crm_dispatch_run_trafficJobId_key" ON "crm_dispatch_run"("trafficJobId");

-- CreateIndex
CREATE INDEX "crm_dispatch_run_dispatchId_idx" ON "crm_dispatch_run"("dispatchId");

-- CreateIndex
CREATE INDEX "crm_dispatch_run_stop_runId_idx" ON "crm_dispatch_run_stop"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_dispatch_run_stop_runId_hotelId_key" ON "crm_dispatch_run_stop"("runId", "hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_credit_note_sourceBookingId_key" ON "hotel_credit_note"("sourceBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_credit_note_finMoveId_key" ON "hotel_credit_note"("finMoveId");

-- CreateIndex
CREATE INDEX "hotel_credit_note_companyId_idx" ON "hotel_credit_note"("companyId");

-- CreateIndex
CREATE INDEX "hotel_credit_note_companyId_hotelId_idx" ON "hotel_credit_note"("companyId", "hotelId");

-- CreateIndex
CREATE INDEX "hotel_credit_note_companyId_status_idx" ON "hotel_credit_note"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_credit_note_companyId_code_key" ON "hotel_credit_note"("companyId", "code");

-- CreateIndex
CREATE INDEX "hotel_credit_consumption_creditNoteId_idx" ON "hotel_credit_consumption"("creditNoteId");

-- CreateIndex
CREATE INDEX "hotel_credit_consumption_bookingId_idx" ON "hotel_credit_consumption"("bookingId");

-- CreateIndex
CREATE INDEX "ops_file_companyId_idx" ON "ops_file"("companyId");

-- CreateIndex
CREATE INDEX "ops_file_companyId_status_idx" ON "ops_file"("companyId", "status");

-- CreateIndex
CREATE INDEX "ops_file_companyId_travelFrom_idx" ON "ops_file"("companyId", "travelFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ops_file_companyId_code_key" ON "ops_file"("companyId", "code");

-- CreateIndex
CREATE INDEX "ops_package_companyId_idx" ON "ops_package"("companyId");

-- CreateIndex
CREATE INDEX "ops_package_companyId_isTemplate_idx" ON "ops_package"("companyId", "isTemplate");

-- CreateIndex
CREATE INDEX "ops_package_fileId_idx" ON "ops_package"("fileId");

-- CreateIndex
CREATE INDEX "ops_package_component_packageId_idx" ON "ops_package_component"("packageId");

-- CreateIndex
CREATE INDEX "ops_package_component_packageId_type_idx" ON "ops_package_component"("packageId", "type");

-- CreateIndex
CREATE INDEX "ops_quotation_companyId_idx" ON "ops_quotation"("companyId");

-- CreateIndex
CREATE INDEX "ops_quotation_fileId_idx" ON "ops_quotation"("fileId");

-- CreateIndex
CREATE INDEX "ops_quotation_companyId_status_idx" ON "ops_quotation"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ops_quotation_companyId_code_key" ON "ops_quotation"("companyId", "code");

-- CreateIndex
CREATE INDEX "credit_override_request_companyId_idx" ON "credit_override_request"("companyId");

-- CreateIndex
CREATE INDEX "credit_override_request_companyId_status_idx" ON "credit_override_request"("companyId", "status");

-- CreateIndex
CREATE INDEX "credit_override_request_tourOperatorId_idx" ON "credit_override_request"("tourOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_pnl_fileId_key" ON "ops_pnl"("fileId");

-- CreateIndex
CREATE INDEX "ops_pnl_fileId_idx" ON "ops_pnl"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_flight_ticket_journalMoveId_key" ON "ops_flight_ticket"("journalMoveId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_flight_ticket_vendorMoveId_key" ON "ops_flight_ticket"("vendorMoveId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_flight_ticket_customerMoveId_key" ON "ops_flight_ticket"("customerMoveId");

-- CreateIndex
CREATE INDEX "ops_flight_ticket_companyId_idx" ON "ops_flight_ticket"("companyId");

-- CreateIndex
CREATE INDEX "ops_flight_ticket_companyId_status_idx" ON "ops_flight_ticket"("companyId", "status");

-- CreateIndex
CREATE INDEX "ops_flight_ticket_opsFileId_idx" ON "ops_flight_ticket"("opsFileId");

-- CreateIndex
CREATE INDEX "ops_flight_ticket_currencyId_idx" ON "ops_flight_ticket"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_flight_ticket_companyId_code_key" ON "ops_flight_ticket"("companyId", "code");

-- CreateIndex
CREATE INDEX "ops_flight_leg_ticketId_idx" ON "ops_flight_leg"("ticketId");

-- CreateIndex
CREATE INDEX "ops_flight_fare_line_ticketId_idx" ON "ops_flight_fare_line"("ticketId");

-- CreateIndex
CREATE INDEX "ops_transport_destination_companyId_idx" ON "ops_transport_destination"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_transport_destination_companyId_code_key" ON "ops_transport_destination"("companyId", "code");

-- CreateIndex
CREATE INDEX "ops_transport_route_companyId_idx" ON "ops_transport_route"("companyId");

-- CreateIndex
CREATE INDEX "ops_transport_route_destinationId_idx" ON "ops_transport_route"("destinationId");

-- CreateIndex
CREATE INDEX "ops_transport_rate_season_companyId_idx" ON "ops_transport_rate_season"("companyId");

-- CreateIndex
CREATE INDEX "ops_transport_rate_season_routeId_idx" ON "ops_transport_rate_season"("routeId");

-- CreateIndex
CREATE INDEX "ops_transport_rate_companyId_idx" ON "ops_transport_rate"("companyId");

-- CreateIndex
CREATE INDEX "ops_transport_rate_seasonId_idx" ON "ops_transport_rate"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_transport_rate_seasonId_vehicleType_key" ON "ops_transport_rate"("seasonId", "vehicleType");

-- CreateIndex
CREATE INDEX "ops_sightseeing_entry_companyId_idx" ON "ops_sightseeing_entry"("companyId");

-- CreateIndex
CREATE INDEX "ops_sightseeing_entry_companyId_destinationCode_idx" ON "ops_sightseeing_entry"("companyId", "destinationCode");

-- CreateIndex
CREATE INDEX "ops_sightseeing_rate_season_companyId_idx" ON "ops_sightseeing_rate_season"("companyId");

-- CreateIndex
CREATE INDEX "ops_sightseeing_rate_season_entryId_idx" ON "ops_sightseeing_rate_season"("entryId");

-- CreateIndex
CREATE INDEX "ops_guidance_rate_companyId_idx" ON "ops_guidance_rate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ops_guidance_rate_companyId_destinationCode_guideType_key" ON "ops_guidance_rate"("companyId", "destinationCode", "guideType");

-- CreateIndex
CREATE INDEX "ops_guidance_rate_season_companyId_idx" ON "ops_guidance_rate_season"("companyId");

-- CreateIndex
CREATE INDEX "ops_guidance_rate_season_guidanceId_idx" ON "ops_guidance_rate_season"("guidanceId");

-- CreateIndex
CREATE INDEX "ops_meal_rate_companyId_idx" ON "ops_meal_rate"("companyId");

-- CreateIndex
CREATE INDEX "ops_meal_rate_companyId_mealType_idx" ON "ops_meal_rate"("companyId", "mealType");

-- CreateIndex
CREATE INDEX "ops_meal_rate_season_companyId_idx" ON "ops_meal_rate_season"("companyId");

-- CreateIndex
CREATE INDEX "ops_meal_rate_season_mealRateId_idx" ON "ops_meal_rate_season"("mealRateId");

-- CreateIndex
CREATE UNIQUE INDEX "coa_template_name_key" ON "coa_template"("name");

-- CreateIndex
CREATE INDEX "coa_template_group_templateId_idx" ON "coa_template_group"("templateId");

-- CreateIndex
CREATE INDEX "coa_template_account_templateId_idx" ON "coa_template_account"("templateId");

-- CreateIndex
CREATE INDEX "coa_template_account_templateId_code_idx" ON "coa_template_account"("templateId", "code");

-- CreateIndex
CREATE INDEX "nc_boat_companyId_ownershipMode_idx" ON "nc_boat"("companyId", "ownershipMode");

-- CreateIndex
CREATE INDEX "nc_boat_companyId_boatClass_idx" ON "nc_boat"("companyId", "boatClass");

-- CreateIndex
CREATE UNIQUE INDEX "nc_boat_companyId_code_key" ON "nc_boat"("companyId", "code");

-- CreateIndex
CREATE INDEX "nc_boat_amenity_boatId_idx" ON "nc_boat_amenity"("boatId");

-- CreateIndex
CREATE INDEX "nc_boat_image_boatId_idx" ON "nc_boat_image"("boatId");

-- CreateIndex
CREATE INDEX "nc_deck_boatId_idx" ON "nc_deck"("boatId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_deck_boatId_level_key" ON "nc_deck"("boatId", "level");

-- CreateIndex
CREATE INDEX "nc_cabin_category_boatId_idx" ON "nc_cabin_category"("boatId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_cabin_category_boatId_code_key" ON "nc_cabin_category"("boatId", "code");

-- CreateIndex
CREATE INDEX "nc_cabin_boatId_categoryId_idx" ON "nc_cabin"("boatId", "categoryId");

-- CreateIndex
CREATE INDEX "nc_cabin_boatId_deckId_idx" ON "nc_cabin"("boatId", "deckId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_cabin_boatId_cabinNumber_key" ON "nc_cabin"("boatId", "cabinNumber");

-- CreateIndex
CREATE INDEX "nc_cabin_ooo_cabinId_idx" ON "nc_cabin_ooo"("cabinId");

-- CreateIndex
CREATE INDEX "nc_cabin_ooo_fromDate_toDate_idx" ON "nc_cabin_ooo"("fromDate", "toDate");

-- CreateIndex
CREATE UNIQUE INDEX "nc_type_companyId_code_key" ON "nc_type"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nc_itinerary_departureId_key" ON "nc_itinerary"("departureId");

-- CreateIndex
CREATE INDEX "nc_itinerary_boatId_cruiseTypeId_idx" ON "nc_itinerary"("boatId", "cruiseTypeId");

-- CreateIndex
CREATE INDEX "nc_itinerary_departureId_idx" ON "nc_itinerary"("departureId");

-- CreateIndex
CREATE INDEX "nc_itinerary_day_itineraryId_idx" ON "nc_itinerary_day"("itineraryId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_itinerary_day_itineraryId_dayNumber_key" ON "nc_itinerary_day"("itineraryId", "dayNumber");

-- CreateIndex
CREATE INDEX "nc_itinerary_day_excursion_dayId_idx" ON "nc_itinerary_day_excursion"("dayId");

-- CreateIndex
CREATE INDEX "nc_itinerary_day_excursion_excursionId_idx" ON "nc_itinerary_day_excursion"("excursionId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_itinerary_day_excursion_dayId_excursionId_key" ON "nc_itinerary_day_excursion"("dayId", "excursionId");

-- CreateIndex
CREATE INDEX "nc_cancellation_policy_companyId_idx" ON "nc_cancellation_policy"("companyId");

-- CreateIndex
CREATE INDEX "nc_cancellation_tier_policyId_idx" ON "nc_cancellation_tier"("policyId");

-- CreateIndex
CREATE INDEX "nc_contract_companyId_boatId_idx" ON "nc_contract"("companyId", "boatId");

-- CreateIndex
CREATE INDEX "nc_contract_companyId_status_idx" ON "nc_contract"("companyId", "status");

-- CreateIndex
CREATE INDEX "nc_contract_validFrom_validTo_idx" ON "nc_contract"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "nc_contract_companyId_code_key" ON "nc_contract"("companyId", "code");

-- CreateIndex
CREATE INDEX "nc_season_contractId_idx" ON "nc_season"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_season_contractId_code_key" ON "nc_season"("contractId", "code");

-- CreateIndex
CREATE INDEX "nc_base_rate_contractId_idx" ON "nc_base_rate"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_base_rate_contractId_seasonId_cabinCategoryId_marketId_key" ON "nc_base_rate"("contractId", "seasonId", "cabinCategoryId", "marketId");

-- CreateIndex
CREATE INDEX "nc_supplement_contractId_type_idx" ON "nc_supplement"("contractId", "type");

-- CreateIndex
CREATE INDEX "nc_supplement_contractId_seasonId_idx" ON "nc_supplement"("contractId", "seasonId");

-- CreateIndex
CREATE INDEX "nc_child_policy_contractId_idx" ON "nc_child_policy"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_child_policy_contractId_category_key" ON "nc_child_policy"("contractId", "category");

-- CreateIndex
CREATE INDEX "nc_contract_embark_day_contractId_idx" ON "nc_contract_embark_day"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_contract_embark_day_contractId_durationNights_dayOfWeek_key" ON "nc_contract_embark_day"("contractId", "durationNights", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "nc_contract_market_contractId_marketId_key" ON "nc_contract_market"("contractId", "marketId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_contract_to_contractId_tourOperatorId_key" ON "nc_contract_to"("contractId", "tourOperatorId");

-- CreateIndex
CREATE INDEX "nc_offer_contractId_type_idx" ON "nc_offer"("contractId", "type");

-- CreateIndex
CREATE INDEX "nc_gala_meal_contractId_applicableDate_idx" ON "nc_gala_meal"("contractId", "applicableDate");

-- CreateIndex
CREATE INDEX "nc_stop_sale_companyId_fromDate_toDate_idx" ON "nc_stop_sale"("companyId", "fromDate", "toDate");

-- CreateIndex
CREATE INDEX "nc_stop_sale_boatId_idx" ON "nc_stop_sale"("boatId");

-- CreateIndex
CREATE INDEX "nc_stop_sale_contractId_idx" ON "nc_stop_sale"("contractId");

-- CreateIndex
CREATE INDEX "nc_departure_pattern_companyId_boatId_idx" ON "nc_departure_pattern"("companyId", "boatId");

-- CreateIndex
CREATE INDEX "nc_departure_companyId_embarkDate_idx" ON "nc_departure"("companyId", "embarkDate");

-- CreateIndex
CREATE INDEX "nc_departure_boatId_embarkDate_idx" ON "nc_departure"("boatId", "embarkDate");

-- CreateIndex
CREATE INDEX "nc_departure_status_idx" ON "nc_departure"("status");

-- CreateIndex
CREATE UNIQUE INDEX "nc_departure_companyId_code_key" ON "nc_departure"("companyId", "code");

-- CreateIndex
CREATE INDEX "nc_allotment_contractId_idx" ON "nc_allotment"("contractId");

-- CreateIndex
CREATE INDEX "nc_allotment_departureId_idx" ON "nc_allotment"("departureId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_allotment_contractId_departureId_cabinCategoryId_key" ON "nc_allotment"("contractId", "departureId", "cabinCategoryId");

-- CreateIndex
CREATE INDEX "nc_booking_companyId_status_idx" ON "nc_booking"("companyId", "status");

-- CreateIndex
CREATE INDEX "nc_booking_departureId_idx" ON "nc_booking"("departureId");

-- CreateIndex
CREATE INDEX "nc_booking_customerId_idx" ON "nc_booking"("customerId");

-- CreateIndex
CREATE INDEX "nc_booking_tourOperatorId_idx" ON "nc_booking"("tourOperatorId");

-- CreateIndex
CREATE INDEX "nc_booking_opsFileId_idx" ON "nc_booking"("opsFileId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_booking_companyId_code_key" ON "nc_booking"("companyId", "code");

-- CreateIndex
CREATE INDEX "nc_booking_cabin_bookingId_idx" ON "nc_booking_cabin"("bookingId");

-- CreateIndex
CREATE INDEX "nc_passenger_bookingId_idx" ON "nc_passenger"("bookingId");

-- CreateIndex
CREATE INDEX "nc_cabin_assignment_bookingId_idx" ON "nc_cabin_assignment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_cabin_assignment_departureId_cabinId_key" ON "nc_cabin_assignment"("departureId", "cabinId");

-- CreateIndex
CREATE INDEX "nc_booking_payment_bookingId_idx" ON "nc_booking_payment"("bookingId");

-- CreateIndex
CREATE INDEX "nc_special_request_bookingId_idx" ON "nc_special_request"("bookingId");

-- CreateIndex
CREATE INDEX "nc_booking_comm_bookingId_idx" ON "nc_booking_comm"("bookingId");

-- CreateIndex
CREATE INDEX "nc_booking_amendment_bookingId_idx" ON "nc_booking_amendment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_voucher_code_key" ON "nc_voucher"("code");

-- CreateIndex
CREATE INDEX "nc_voucher_bookingId_idx" ON "nc_voucher"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "nc_manifest_departureId_key" ON "nc_manifest"("departureId");

-- CreateIndex
CREATE INDEX "nc_manifest_departureId_idx" ON "nc_manifest"("departureId");

-- CreateIndex
CREATE INDEX "nc_manifest_amendment_manifestId_idx" ON "nc_manifest_amendment"("manifestId");

-- CreateIndex
CREATE INDEX "User_tourOperatorId_idx" ON "User"("tourOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ct_hotel_partnerId_key" ON "ct_hotel"("partnerId");

-- CreateIndex
CREATE INDEX "fin_move_line_item_analyticAccountId_idx" ON "fin_move_line_item"("analyticAccountId");

-- CreateIndex
CREATE INDEX "fin_payment_opsFileId_idx" ON "fin_payment"("opsFileId");

-- AddForeignKey
ALTER TABLE "sys_license" ADD CONSTRAINT "sys_license_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_accountReceivableId_fkey" FOREIGN KEY ("accountReceivableId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_accountPayableId_fkey" FOREIGN KEY ("accountPayableId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account" ADD CONSTRAINT "fin_account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_move_line_item" ADD CONSTRAINT "fin_move_line_item_analyticAccountId_fkey" FOREIGN KEY ("analyticAccountId") REFERENCES "fin_analytic_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment" ADD CONSTRAINT "fin_payment_opsFileId_fkey" FOREIGN KEY ("opsFileId") REFERENCES "ops_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_analytic_account" ADD CONSTRAINT "fin_analytic_account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_analytic_account" ADD CONSTRAINT "fin_analytic_account_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_asset" ADD CONSTRAINT "fin_account_asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_asset" ADD CONSTRAINT "fin_account_asset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_asset" ADD CONSTRAINT "fin_account_asset_depreciationAccountId_fkey" FOREIGN KEY ("depreciationAccountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_asset" ADD CONSTRAINT "fin_account_asset_accumulationAccountId_fkey" FOREIGN KEY ("accumulationAccountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_asset" ADD CONSTRAINT "fin_account_asset_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_asset_line" ADD CONSTRAINT "fin_account_asset_line_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fin_account_asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_asset_line" ADD CONSTRAINT "fin_account_asset_line_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_loan" ADD CONSTRAINT "fin_account_loan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_loan" ADD CONSTRAINT "fin_account_loan_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_loan" ADD CONSTRAINT "fin_account_loan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_loan" ADD CONSTRAINT "fin_account_loan_interestAccountId_fkey" FOREIGN KEY ("interestAccountId") REFERENCES "fin_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_loan_schedule_line" ADD CONSTRAINT "fin_loan_schedule_line_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "fin_account_loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_loan_schedule_line" ADD CONSTRAINT "fin_loan_schedule_line_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_tax_return" ADD CONSTRAINT "fin_tax_return_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_tax_return" ADD CONSTRAINT "fin_tax_return_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "fin_fiscal_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_tax_return_line" ADD CONSTRAINT "fin_tax_return_line_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "fin_tax_return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_tax_return_line" ADD CONSTRAINT "fin_tax_return_line_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_account_lock_date" ADD CONSTRAINT "fin_account_lock_date_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_audit_trail" ADD CONSTRAINT "fin_audit_trail_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_working_file" ADD CONSTRAINT "fin_working_file_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_working_file" ADD CONSTRAINT "fin_working_file_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "fin_fiscal_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_revenue" ADD CONSTRAINT "fin_deferred_revenue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_revenue" ADD CONSTRAINT "fin_deferred_revenue_moveLineId_fkey" FOREIGN KEY ("moveLineId") REFERENCES "fin_move_line_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_revenue" ADD CONSTRAINT "fin_deferred_revenue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_revenue" ADD CONSTRAINT "fin_deferred_revenue_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_revenue_schedule" ADD CONSTRAINT "fin_deferred_revenue_schedule_deferredId_fkey" FOREIGN KEY ("deferredId") REFERENCES "fin_deferred_revenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_revenue_schedule" ADD CONSTRAINT "fin_deferred_revenue_schedule_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_expense" ADD CONSTRAINT "fin_deferred_expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_expense" ADD CONSTRAINT "fin_deferred_expense_moveLineId_fkey" FOREIGN KEY ("moveLineId") REFERENCES "fin_move_line_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_expense" ADD CONSTRAINT "fin_deferred_expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_expense" ADD CONSTRAINT "fin_deferred_expense_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "fin_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_expense_schedule" ADD CONSTRAINT "fin_deferred_expense_schedule_deferredId_fkey" FOREIGN KEY ("deferredId") REFERENCES "fin_deferred_expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_deferred_expense_schedule" ADD CONSTRAINT "fin_deferred_expense_schedule_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_unrealized_currency" ADD CONSTRAINT "fin_unrealized_currency_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_unrealized_currency" ADD CONSTRAINT "fin_unrealized_currency_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_unrealized_currency" ADD CONSTRAINT "fin_unrealized_currency_adjustmentMoveId_fkey" FOREIGN KEY ("adjustmentMoveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_unrealized_currency" ADD CONSTRAINT "fin_unrealized_currency_reversalMoveId_fkey" FOREIGN KEY ("reversalMoveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel" ADD CONSTRAINT "ct_hotel_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract" ADD CONSTRAINT "ct_contract_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_room_type" ADD CONSTRAINT "ct_contract_room_type_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_meal_basis" ADD CONSTRAINT "ct_contract_meal_basis_mealBasisId_fkey" FOREIGN KEY ("mealBasisId") REFERENCES "ct_hotel_meal_basis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_offer_tier" ADD CONSTRAINT "ct_contract_offer_tier_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ct_contract_special_offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_season_spo" ADD CONSTRAINT "ct_contract_season_spo_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_season_spo_btc" ADD CONSTRAINT "ct_season_spo_btc_spoId_fkey" FOREIGN KEY ("spoId") REFERENCES "ct_contract_season_spo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_season_spo_room_sup" ADD CONSTRAINT "ct_season_spo_room_sup_spoId_fkey" FOREIGN KEY ("spoId") REFERENCES "ct_contract_season_spo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_season_spo_room_sup" ADD CONSTRAINT "ct_season_spo_room_sup_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_season_spo_date" ADD CONSTRAINT "ct_season_spo_date_spoId_fkey" FOREIGN KEY ("spoId") REFERENCES "ct_contract_season_spo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_allotment" ADD CONSTRAINT "ct_contract_allotment_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_marketing_contribution" ADD CONSTRAINT "ct_contract_marketing_contribution_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_marketing_contribution" ADD CONSTRAINT "ct_contract_marketing_contribution_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_marketing_contribution" ADD CONSTRAINT "ct_contract_marketing_contribution_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ct_contract_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tour_operator" ADD CONSTRAINT "ct_tour_operator_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tour_operator" ADD CONSTRAINT "ct_tour_operator_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tour_operator" ADD CONSTRAINT "ct_tour_operator_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tour_operator" ADD CONSTRAINT "ct_tour_operator_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_tour_operator" ADD CONSTRAINT "ct_contract_tour_operator_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_tour_operator" ADD CONSTRAINT "ct_contract_tour_operator_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel_tour_operator" ADD CONSTRAINT "ct_hotel_tour_operator_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_hotel_tour_operator" ADD CONSTRAINT "ct_hotel_tour_operator_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_markup_rule" ADD CONSTRAINT "ct_markup_rule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_markup_rule" ADD CONSTRAINT "ct_markup_rule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_markup_rule" ADD CONSTRAINT "ct_markup_rule_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_markup_rule" ADD CONSTRAINT "ct_markup_rule_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ct_destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_markup_rule" ADD CONSTRAINT "ct_markup_rule_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_markup_rule" ADD CONSTRAINT "ct_markup_rule_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tariff" ADD CONSTRAINT "ct_tariff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tariff" ADD CONSTRAINT "ct_tariff_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tariff" ADD CONSTRAINT "ct_tariff_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_tariff" ADD CONSTRAINT "ct_tariff_markupRuleId_fkey" FOREIGN KEY ("markupRuleId") REFERENCES "ct_markup_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_special_meal" ADD CONSTRAINT "ct_contract_special_meal_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_rate_verification" ADD CONSTRAINT "ct_rate_verification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_rate_verification" ADD CONSTRAINT "ct_rate_verification_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_rate_verification" ADD CONSTRAINT "ct_rate_verification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_copy_log" ADD CONSTRAINT "ct_contract_copy_log_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_copy_log" ADD CONSTRAINT "ct_contract_copy_log_sourceContractId_fkey" FOREIGN KEY ("sourceContractId") REFERENCES "ct_contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_copy_log" ADD CONSTRAINT "ct_contract_copy_log_targetContractId_fkey" FOREIGN KEY ("targetContractId") REFERENCES "ct_contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_copy_log" ADD CONSTRAINT "ct_contract_copy_log_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ct_contract_audit_log" ADD CONSTRAINT "ct_contract_audit_log_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIntegration" ADD CONSTRAINT "ApiIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIntegration" ADD CONSTRAINT "ApiIntegration_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIntegration" ADD CONSTRAINT "ApiIntegration_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIntegrationHotel" ADD CONSTRAINT "ApiIntegrationHotel_apiIntegrationId_fkey" FOREIGN KEY ("apiIntegrationId") REFERENCES "ApiIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIntegrationHotel" ADD CONSTRAINT "ApiIntegrationHotel_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_apiIntegrationId_fkey" FOREIGN KEY ("apiIntegrationId") REFERENCES "ApiIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_webhook" ADD CONSTRAINT "incoming_webhook_apiIntegrationId_fkey" FOREIGN KEY ("apiIntegrationId") REFERENCES "ApiIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_guest" ADD CONSTRAINT "rv_guest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_guest" ADD CONSTRAINT "rv_guest_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_guest" ADD CONSTRAINT "rv_guest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ct_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ct_contract_season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_markupRuleId_fkey" FOREIGN KEY ("markupRuleId") REFERENCES "ct_markup_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking" ADD CONSTRAINT "rv_booking_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_rate_change" ADD CONSTRAINT "rv_booking_rate_change_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_rate_change" ADD CONSTRAINT "rv_booking_rate_change_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_currency_line" ADD CONSTRAINT "rv_booking_currency_line_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_currency_line" ADD CONSTRAINT "rv_booking_currency_line_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_room" ADD CONSTRAINT "rv_booking_room_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_room" ADD CONSTRAINT "rv_booking_room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ct_hotel_room_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_room" ADD CONSTRAINT "rv_booking_room_mealBasisId_fkey" FOREIGN KEY ("mealBasisId") REFERENCES "ct_hotel_meal_basis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_guest" ADD CONSTRAINT "rv_booking_guest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_guest" ADD CONSTRAINT "rv_booking_guest_bookingRoomId_fkey" FOREIGN KEY ("bookingRoomId") REFERENCES "rv_booking_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_guest" ADD CONSTRAINT "rv_booking_guest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "rv_guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_payment" ADD CONSTRAINT "rv_booking_payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_payment" ADD CONSTRAINT "rv_booking_payment_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_payment" ADD CONSTRAINT "rv_booking_payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_voucher" ADD CONSTRAINT "rv_voucher_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_voucher" ADD CONSTRAINT "rv_voucher_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_voucher" ADD CONSTRAINT "rv_voucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_timeline" ADD CONSTRAINT "rv_booking_timeline_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_timeline" ADD CONSTRAINT "rv_booking_timeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_deadline" ADD CONSTRAINT "rv_booking_deadline_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_deadline" ADD CONSTRAINT "rv_booking_deadline_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_deadline" ADD CONSTRAINT "rv_booking_deadline_waivedBy_fkey" FOREIGN KEY ("waivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_special_request" ADD CONSTRAINT "rv_booking_special_request_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_communication" ADD CONSTRAINT "rv_booking_communication_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_booking_communication" ADD CONSTRAINT "rv_booking_communication_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_notification" ADD CONSTRAINT "sys_notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_notification" ADD CONSTRAINT "sys_notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_notification" ADD CONSTRAINT "sys_notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_zone" ADD CONSTRAINT "tt_zone_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_zone" ADD CONSTRAINT "tt_zone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ct_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_vehicle_type" ADD CONSTRAINT "tt_vehicle_type_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_vehicle" ADD CONSTRAINT "tt_vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_vehicle" ADD CONSTRAINT "tt_vehicle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "tt_vehicle_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_vehicle" ADD CONSTRAINT "tt_vehicle_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_vehicle_compliance" ADD CONSTRAINT "tt_vehicle_compliance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_vehicle_compliance" ADD CONSTRAINT "tt_vehicle_compliance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "tt_vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_driver" ADD CONSTRAINT "tt_driver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_driver" ADD CONSTRAINT "tt_driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_driver_vehicle" ADD CONSTRAINT "tt_driver_vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_driver_vehicle" ADD CONSTRAINT "tt_driver_vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "tt_driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_driver_vehicle" ADD CONSTRAINT "tt_driver_vehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "tt_vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_rep" ADD CONSTRAINT "tt_rep_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_rep" ADD CONSTRAINT "tt_rep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_rep_zone" ADD CONSTRAINT "tt_rep_zone_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_rep_zone" ADD CONSTRAINT "tt_rep_zone_repId_fkey" FOREIGN KEY ("repId") REFERENCES "tt_rep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_rep_zone" ADD CONSTRAINT "tt_rep_zone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "tt_zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_price_item" ADD CONSTRAINT "tt_price_item_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_price_item" ADD CONSTRAINT "tt_price_item_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "tt_vehicle_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_price_item" ADD CONSTRAINT "tt_price_item_fromZoneId_fkey" FOREIGN KEY ("fromZoneId") REFERENCES "tt_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_price_item" ADD CONSTRAINT "tt_price_item_toZoneId_fkey" FOREIGN KEY ("toZoneId") REFERENCES "tt_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_price_item" ADD CONSTRAINT "tt_price_item_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_partner_price_override" ADD CONSTRAINT "tt_partner_price_override_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_partner_price_override" ADD CONSTRAINT "tt_partner_price_override_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_partner_price_override" ADD CONSTRAINT "tt_partner_price_override_priceItemId_fkey" FOREIGN KEY ("priceItemId") REFERENCES "tt_price_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_supplier_trip_price" ADD CONSTRAINT "tt_supplier_trip_price_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_supplier_trip_price" ADD CONSTRAINT "tt_supplier_trip_price_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_supplier_trip_price" ADD CONSTRAINT "tt_supplier_trip_price_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "tt_vehicle_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_supplier_trip_price" ADD CONSTRAINT "tt_supplier_trip_price_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "tt_vehicle_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_pickupAirportId_fkey" FOREIGN KEY ("pickupAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_pickupHotelId_fkey" FOREIGN KEY ("pickupHotelId") REFERENCES "ct_hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_dropoffAirportId_fkey" FOREIGN KEY ("dropoffAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_dropoffHotelId_fkey" FOREIGN KEY ("dropoffHotelId") REFERENCES "ct_hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "tt_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "tt_traffic_flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_job" ADD CONSTRAINT "tt_traffic_job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_flight" ADD CONSTRAINT "tt_traffic_flight_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_flight" ADD CONSTRAINT "tt_traffic_flight_arrAirportId_fkey" FOREIGN KEY ("arrAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_flight" ADD CONSTRAINT "tt_traffic_flight_depAirportId_fkey" FOREIGN KEY ("depAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_assignment" ADD CONSTRAINT "tt_traffic_assignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_assignment" ADD CONSTRAINT "tt_traffic_assignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "tt_traffic_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_assignment" ADD CONSTRAINT "tt_traffic_assignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "tt_vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_assignment" ADD CONSTRAINT "tt_traffic_assignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "tt_driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_traffic_assignment" ADD CONSTRAINT "tt_traffic_assignment_repId_fkey" FOREIGN KEY ("repId") REFERENCES "tt_rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_status_change_log" ADD CONSTRAINT "tt_status_change_log_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "tt_traffic_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_no_show_evidence" ADD CONSTRAINT "tt_no_show_evidence_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "tt_traffic_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_guest_booking" ADD CONSTRAINT "tt_guest_booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_guest_booking" ADD CONSTRAINT "tt_guest_booking_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "tt_vehicle_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_guest_booking" ADD CONSTRAINT "tt_guest_booking_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_guest_payment" ADD CONSTRAINT "tt_guest_payment_guestBookingId_fkey" FOREIGN KEY ("guestBookingId") REFERENCES "tt_guest_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_operational_cost" ADD CONSTRAINT "tt_operational_cost_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_operational_cost" ADD CONSTRAINT "tt_operational_cost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "tt_traffic_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_operational_cost" ADD CONSTRAINT "tt_operational_cost_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_settings" ADD CONSTRAINT "tt_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_push_token" ADD CONSTRAINT "tt_push_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_branding" ADD CONSTRAINT "pub_branding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_branding" ADD CONSTRAINT "pub_branding_defaultMarketId_fkey" FOREIGN KEY ("defaultMarketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_hero_slide" ADD CONSTRAINT "pub_hero_slide_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_page" ADD CONSTRAINT "pub_page_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_blog_post" ADD CONSTRAINT "pub_blog_post_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_faq" ADD CONSTRAINT "pub_faq_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_testimonial" ADD CONSTRAINT "pub_testimonial_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_newsletter_subscriber" ADD CONSTRAINT "pub_newsletter_subscriber_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_contact_inquiry" ADD CONSTRAINT "pub_contact_inquiry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_markup_rule" ADD CONSTRAINT "b2c_markup_rule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_markup_rule" ADD CONSTRAINT "b2c_markup_rule_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ct_destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_markup_rule" ADD CONSTRAINT "b2c_markup_rule_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_markup_tier" ADD CONSTRAINT "b2c_markup_tier_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "b2c_markup_rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_credit_transaction" ADD CONSTRAINT "b2b_credit_transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_credit_transaction" ADD CONSTRAINT "b2b_credit_transaction_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_credit_transaction" ADD CONSTRAINT "b2b_credit_transaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_credit_transaction" ADD CONSTRAINT "b2b_credit_transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead" ADD CONSTRAINT "crm_lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead" ADD CONSTRAINT "crm_lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead" ADD CONSTRAINT "crm_lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunity" ADD CONSTRAINT "crm_opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunity" ADD CONSTRAINT "crm_opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunity" ADD CONSTRAINT "crm_opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunity" ADD CONSTRAINT "crm_opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "crm_booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_customer" ADD CONSTRAINT "crm_customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_customer" ADD CONSTRAINT "crm_customer_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_supplier" ADD CONSTRAINT "crm_supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion" ADD CONSTRAINT "crm_excursion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_program" ADD CONSTRAINT "crm_excursion_program_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_item" ADD CONSTRAINT "crm_program_item_programId_fkey" FOREIGN KEY ("programId") REFERENCES "crm_excursion_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_age_group" ADD CONSTRAINT "crm_excursion_age_group_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_addon" ADD CONSTRAINT "crm_excursion_addon_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cost_sheet" ADD CONSTRAINT "crm_cost_sheet_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cost_component" ADD CONSTRAINT "crm_cost_component_costSheetId_fkey" FOREIGN KEY ("costSheetId") REFERENCES "crm_cost_sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cost_component" ADD CONSTRAINT "crm_cost_component_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "crm_supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_pickup_location" ADD CONSTRAINT "crm_pickup_location_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_transport_tier" ADD CONSTRAINT "crm_transport_tier_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "crm_pickup_location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_selling_price" ADD CONSTRAINT "crm_selling_price_costSheetId_fkey" FOREIGN KEY ("costSheetId") REFERENCES "crm_cost_sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_selling_price" ADD CONSTRAINT "crm_selling_price_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "crm_excursion_age_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_booking" ADD CONSTRAINT "crm_booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_booking" ADD CONSTRAINT "crm_booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_booking" ADD CONSTRAINT "crm_booking_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_booking" ADD CONSTRAINT "crm_booking_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_booking_item" ADD CONSTRAINT "crm_booking_item_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "crm_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_booking_item" ADD CONSTRAINT "crm_booking_item_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_booking_item" ADD CONSTRAINT "crm_booking_item_costSheetId_fkey" FOREIGN KEY ("costSheetId") REFERENCES "crm_cost_sheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_plan" ADD CONSTRAINT "crm_program_plan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_plan" ADD CONSTRAINT "crm_program_plan_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_plan_item" ADD CONSTRAINT "crm_program_plan_item_programPlanId_fkey" FOREIGN KEY ("programPlanId") REFERENCES "crm_program_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_plan_item" ADD CONSTRAINT "crm_program_plan_item_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_plan_item" ADD CONSTRAINT "crm_program_plan_item_sellingPriceId_fkey" FOREIGN KEY ("sellingPriceId") REFERENCES "crm_selling_price"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_tour_operator" ADD CONSTRAINT "crm_program_tour_operator_programPlanId_fkey" FOREIGN KEY ("programPlanId") REFERENCES "crm_program_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_program_tour_operator" ADD CONSTRAINT "crm_program_tour_operator_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_pickup_time" ADD CONSTRAINT "crm_pickup_time_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_pickup_time" ADD CONSTRAINT "crm_pickup_time_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ct_destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_pickup_time" ADD CONSTRAINT "crm_pickup_time_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_pickup_time" ADD CONSTRAINT "crm_pickup_time_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_ticket" ADD CONSTRAINT "crm_excursion_ticket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_ticket" ADD CONSTRAINT "crm_excursion_ticket_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_ticket" ADD CONSTRAINT "crm_excursion_ticket_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_ticket" ADD CONSTRAINT "crm_excursion_ticket_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_ticket" ADD CONSTRAINT "crm_excursion_ticket_breakdownId_fkey" FOREIGN KEY ("breakdownId") REFERENCES "crm_excursion_breakdown"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_breakdown" ADD CONSTRAINT "crm_excursion_breakdown_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_breakdown" ADD CONSTRAINT "crm_excursion_breakdown_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_breakdown" ADD CONSTRAINT "crm_excursion_breakdown_repId_fkey" FOREIGN KEY ("repId") REFERENCES "tt_rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_breakdown" ADD CONSTRAINT "crm_excursion_breakdown_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "tt_vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_breakdown" ADD CONSTRAINT "crm_excursion_breakdown_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "tt_driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_dispatch" ADD CONSTRAINT "crm_excursion_dispatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_excursion_dispatch" ADD CONSTRAINT "crm_excursion_dispatch_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_dispatch_run" ADD CONSTRAINT "crm_dispatch_run_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "crm_excursion_dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_dispatch_run" ADD CONSTRAINT "crm_dispatch_run_repId_fkey" FOREIGN KEY ("repId") REFERENCES "tt_rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_dispatch_run_stop" ADD CONSTRAINT "crm_dispatch_run_stop_runId_fkey" FOREIGN KEY ("runId") REFERENCES "crm_dispatch_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_dispatch_run_stop" ADD CONSTRAINT "crm_dispatch_run_stop_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_note" ADD CONSTRAINT "hotel_credit_note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_note" ADD CONSTRAINT "hotel_credit_note_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "ct_hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_note" ADD CONSTRAINT "hotel_credit_note_sourceBookingId_fkey" FOREIGN KEY ("sourceBookingId") REFERENCES "rv_booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_note" ADD CONSTRAINT "hotel_credit_note_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_note" ADD CONSTRAINT "hotel_credit_note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_consumption" ADD CONSTRAINT "hotel_credit_consumption_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "hotel_credit_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_consumption" ADD CONSTRAINT "hotel_credit_consumption_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rv_booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_credit_consumption" ADD CONSTRAINT "hotel_credit_consumption_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_file" ADD CONSTRAINT "ops_file_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_file" ADD CONSTRAINT "ops_file_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_file" ADD CONSTRAINT "ops_file_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_file" ADD CONSTRAINT "ops_file_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_package" ADD CONSTRAINT "ops_package_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_package" ADD CONSTRAINT "ops_package_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ops_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_package_component" ADD CONSTRAINT "ops_package_component_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ops_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_package_component" ADD CONSTRAINT "ops_package_component_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "crm_supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_quotation" ADD CONSTRAINT "ops_quotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_quotation" ADD CONSTRAINT "ops_quotation_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ops_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_quotation" ADD CONSTRAINT "ops_quotation_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ops_package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_override_request" ADD CONSTRAINT "credit_override_request_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_override_request" ADD CONSTRAINT "credit_override_request_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_override_request" ADD CONSTRAINT "credit_override_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_override_request" ADD CONSTRAINT "credit_override_request_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_override_request" ADD CONSTRAINT "credit_override_request_createdFileId_fkey" FOREIGN KEY ("createdFileId") REFERENCES "ops_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_pnl" ADD CONSTRAINT "ops_pnl_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ops_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_opsFileId_fkey" FOREIGN KEY ("opsFileId") REFERENCES "ops_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_parentTicketId_fkey" FOREIGN KEY ("parentTicketId") REFERENCES "ops_flight_ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_journalMoveId_fkey" FOREIGN KEY ("journalMoveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_vendorMoveId_fkey" FOREIGN KEY ("vendorMoveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_customerMoveId_fkey" FOREIGN KEY ("customerMoveId") REFERENCES "fin_move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_customerPartnerId_fkey" FOREIGN KEY ("customerPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_ticket" ADD CONSTRAINT "ops_flight_ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_leg" ADD CONSTRAINT "ops_flight_leg_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ops_flight_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_fare_line" ADD CONSTRAINT "ops_flight_fare_line_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ops_flight_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_flight_fare_line" ADD CONSTRAINT "ops_flight_fare_line_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_transport_destination" ADD CONSTRAINT "ops_transport_destination_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_transport_route" ADD CONSTRAINT "ops_transport_route_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_transport_route" ADD CONSTRAINT "ops_transport_route_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ops_transport_destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_transport_rate_season" ADD CONSTRAINT "ops_transport_rate_season_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_transport_rate_season" ADD CONSTRAINT "ops_transport_rate_season_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ops_transport_route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_transport_rate" ADD CONSTRAINT "ops_transport_rate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_transport_rate" ADD CONSTRAINT "ops_transport_rate_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ops_transport_rate_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_sightseeing_entry" ADD CONSTRAINT "ops_sightseeing_entry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_sightseeing_rate_season" ADD CONSTRAINT "ops_sightseeing_rate_season_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_sightseeing_rate_season" ADD CONSTRAINT "ops_sightseeing_rate_season_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ops_sightseeing_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_guidance_rate" ADD CONSTRAINT "ops_guidance_rate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_guidance_rate_season" ADD CONSTRAINT "ops_guidance_rate_season_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_guidance_rate_season" ADD CONSTRAINT "ops_guidance_rate_season_guidanceId_fkey" FOREIGN KEY ("guidanceId") REFERENCES "ops_guidance_rate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_meal_rate" ADD CONSTRAINT "ops_meal_rate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_meal_rate" ADD CONSTRAINT "ops_meal_rate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "crm_supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_meal_rate_season" ADD CONSTRAINT "ops_meal_rate_season_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_meal_rate_season" ADD CONSTRAINT "ops_meal_rate_season_mealRateId_fkey" FOREIGN KEY ("mealRateId") REFERENCES "ops_meal_rate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coa_template_group" ADD CONSTRAINT "coa_template_group_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "coa_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coa_template_account" ADD CONSTRAINT "coa_template_account_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "coa_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_boat" ADD CONSTRAINT "nc_boat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_boat" ADD CONSTRAINT "nc_boat_operatorPartnerId_fkey" FOREIGN KEY ("operatorPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_boat_amenity" ADD CONSTRAINT "nc_boat_amenity_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_boat_image" ADD CONSTRAINT "nc_boat_image_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_deck" ADD CONSTRAINT "nc_deck_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin_category" ADD CONSTRAINT "nc_cabin_category_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin" ADD CONSTRAINT "nc_cabin_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin" ADD CONSTRAINT "nc_cabin_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "nc_deck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin" ADD CONSTRAINT "nc_cabin_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "nc_cabin_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin_ooo" ADD CONSTRAINT "nc_cabin_ooo_cabinId_fkey" FOREIGN KEY ("cabinId") REFERENCES "nc_cabin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_type" ADD CONSTRAINT "nc_type_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_itinerary" ADD CONSTRAINT "nc_itinerary_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_itinerary" ADD CONSTRAINT "nc_itinerary_cruiseTypeId_fkey" FOREIGN KEY ("cruiseTypeId") REFERENCES "nc_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_itinerary" ADD CONSTRAINT "nc_itinerary_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "nc_departure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_itinerary_day" ADD CONSTRAINT "nc_itinerary_day_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "nc_itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_itinerary_day_excursion" ADD CONSTRAINT "nc_itinerary_day_excursion_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "nc_itinerary_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_itinerary_day_excursion" ADD CONSTRAINT "nc_itinerary_day_excursion_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "crm_excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cancellation_policy" ADD CONSTRAINT "nc_cancellation_policy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cancellation_tier" ADD CONSTRAINT "nc_cancellation_tier_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "nc_cancellation_policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract" ADD CONSTRAINT "nc_contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract" ADD CONSTRAINT "nc_contract_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract" ADD CONSTRAINT "nc_contract_cancellationPolicyId_fkey" FOREIGN KEY ("cancellationPolicyId") REFERENCES "nc_cancellation_policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract" ADD CONSTRAINT "nc_contract_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "nc_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_season" ADD CONSTRAINT "nc_season_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_base_rate" ADD CONSTRAINT "nc_base_rate_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_base_rate" ADD CONSTRAINT "nc_base_rate_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "nc_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_base_rate" ADD CONSTRAINT "nc_base_rate_cabinCategoryId_fkey" FOREIGN KEY ("cabinCategoryId") REFERENCES "nc_cabin_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_base_rate" ADD CONSTRAINT "nc_base_rate_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_supplement" ADD CONSTRAINT "nc_supplement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_supplement" ADD CONSTRAINT "nc_supplement_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "nc_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_supplement" ADD CONSTRAINT "nc_supplement_cabinCategoryId_fkey" FOREIGN KEY ("cabinCategoryId") REFERENCES "nc_cabin_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_supplement" ADD CONSTRAINT "nc_supplement_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_child_policy" ADD CONSTRAINT "nc_child_policy_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract_embark_day" ADD CONSTRAINT "nc_contract_embark_day_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract_market" ADD CONSTRAINT "nc_contract_market_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract_market" ADD CONSTRAINT "nc_contract_market_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract_to" ADD CONSTRAINT "nc_contract_to_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_contract_to" ADD CONSTRAINT "nc_contract_to_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_offer" ADD CONSTRAINT "nc_offer_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_gala_meal" ADD CONSTRAINT "nc_gala_meal_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_stop_sale" ADD CONSTRAINT "nc_stop_sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_stop_sale" ADD CONSTRAINT "nc_stop_sale_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_stop_sale" ADD CONSTRAINT "nc_stop_sale_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_stop_sale" ADD CONSTRAINT "nc_stop_sale_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "nc_departure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_stop_sale" ADD CONSTRAINT "nc_stop_sale_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_departure_pattern" ADD CONSTRAINT "nc_departure_pattern_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_departure" ADD CONSTRAINT "nc_departure_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_departure" ADD CONSTRAINT "nc_departure_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "nc_boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_departure" ADD CONSTRAINT "nc_departure_cruiseTypeId_fkey" FOREIGN KEY ("cruiseTypeId") REFERENCES "nc_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_departure" ADD CONSTRAINT "nc_departure_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_departure" ADD CONSTRAINT "nc_departure_generatedFromPatternId_fkey" FOREIGN KEY ("generatedFromPatternId") REFERENCES "nc_departure_pattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_allotment" ADD CONSTRAINT "nc_allotment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_allotment" ADD CONSTRAINT "nc_allotment_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "nc_departure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_allotment" ADD CONSTRAINT "nc_allotment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "nc_season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_allotment" ADD CONSTRAINT "nc_allotment_cabinCategoryId_fkey" FOREIGN KEY ("cabinCategoryId") REFERENCES "nc_cabin_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "nc_departure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "nc_contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "ct_market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_leadGuestNationalityId_fkey" FOREIGN KEY ("leadGuestNationalityId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_tourOperatorId_fkey" FOREIGN KEY ("tourOperatorId") REFERENCES "ct_tour_operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking" ADD CONSTRAINT "nc_booking_opsFileId_fkey" FOREIGN KEY ("opsFileId") REFERENCES "ops_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking_cabin" ADD CONSTRAINT "nc_booking_cabin_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking_cabin" ADD CONSTRAINT "nc_booking_cabin_cabinCategoryId_fkey" FOREIGN KEY ("cabinCategoryId") REFERENCES "nc_cabin_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_passenger" ADD CONSTRAINT "nc_passenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_passenger" ADD CONSTRAINT "nc_passenger_cabinLineId_fkey" FOREIGN KEY ("cabinLineId") REFERENCES "nc_booking_cabin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_passenger" ADD CONSTRAINT "nc_passenger_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "PartnerTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_passenger" ADD CONSTRAINT "nc_passenger_nationalityId_fkey" FOREIGN KEY ("nationalityId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_passenger" ADD CONSTRAINT "nc_passenger_passportIssueCountryId_fkey" FOREIGN KEY ("passportIssueCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin_assignment" ADD CONSTRAINT "nc_cabin_assignment_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "nc_departure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin_assignment" ADD CONSTRAINT "nc_cabin_assignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_cabin_assignment" ADD CONSTRAINT "nc_cabin_assignment_cabinId_fkey" FOREIGN KEY ("cabinId") REFERENCES "nc_cabin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking_payment" ADD CONSTRAINT "nc_booking_payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_special_request" ADD CONSTRAINT "nc_special_request_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking_comm" ADD CONSTRAINT "nc_booking_comm_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_booking_amendment" ADD CONSTRAINT "nc_booking_amendment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_voucher" ADD CONSTRAINT "nc_voucher_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "nc_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_manifest" ADD CONSTRAINT "nc_manifest_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "nc_departure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nc_manifest_amendment" ADD CONSTRAINT "nc_manifest_amendment_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "nc_manifest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

