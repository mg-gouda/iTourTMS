/**
 * Seed predefined operational roles with appropriate permission sets.
 * Idempotent — safe to re-run.
 * Run with: npx tsx prisma/seed-roles.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Permission shorthand lists ─────────────────────────────────────────────

// Finance
const F_ACCOUNT        = ["finance:account:read","finance:account:create","finance:account:update","finance:account:delete"];
const F_ACCOUNT_R      = ["finance:account:read"];
const F_JOURNAL        = ["finance:journal:read","finance:journal:create","finance:journal:update","finance:journal:delete"];
const F_JOURNAL_R      = ["finance:journal:read"];
const F_TAX            = ["finance:tax:read","finance:tax:create","finance:tax:update","finance:tax:delete"];
const F_TAX_R          = ["finance:tax:read"];
const F_PAYMENT_TERM   = ["finance:paymentTerm:read","finance:paymentTerm:create","finance:paymentTerm:update","finance:paymentTerm:delete"];
const F_PAYMENT_TERM_R = ["finance:paymentTerm:read"];
const F_PARTNER        = ["finance:partner:read","finance:partner:create","finance:partner:update","finance:partner:delete"];
const F_PARTNER_RCU    = ["finance:partner:read","finance:partner:create","finance:partner:update"];
const F_PARTNER_R      = ["finance:partner:read"];
const F_MOVE           = ["finance:move:read","finance:move:create","finance:move:update","finance:move:delete","finance:move:confirm","finance:move:cancel"];
const F_MOVE_R         = ["finance:move:read"];
const F_MOVE_RCC       = ["finance:move:read","finance:move:create","finance:move:confirm","finance:move:cancel"];
const F_INVOICE        = ["finance:invoice:read","finance:invoice:create","finance:invoice:update","finance:invoice:cancel","finance:invoice:export"];
const F_INVOICE_R      = ["finance:invoice:read"];
const F_BILL           = ["finance:bill:read","finance:bill:create","finance:bill:update","finance:bill:cancel","finance:bill:export"];
const F_BILL_R         = ["finance:bill:read"];
const F_PAYMENT        = ["finance:payment:read","finance:payment:create","finance:payment:confirm","finance:payment:cancel"];
const F_PAYMENT_R      = ["finance:payment:read"];
const F_BANK           = ["finance:bankStatement:read","finance:bankStatement:create","finance:bankStatement:import","finance:bankStatement:validate","finance:bankStatement:delete"];
const F_BANK_R         = ["finance:bankStatement:read"];
const F_RECON          = ["finance:reconciliation:read","finance:reconciliation:reconcile"];
const F_RECON_R        = ["finance:reconciliation:read"];
const F_BATCH          = ["finance:batchPayment:read","finance:batchPayment:create","finance:batchPayment:confirm","finance:batchPayment:delete"];
const F_BATCH_R        = ["finance:batchPayment:read"];
const F_BUDGET         = ["finance:budget:read","finance:budget:create","finance:budget:update","finance:budget:delete"];
const F_BUDGET_R       = ["finance:budget:read"];
const F_ASSET          = ["finance:asset:read","finance:asset:create","finance:asset:update","finance:asset:delete"];
const F_ASSET_R        = ["finance:asset:read"];
const F_DEFERRED       = ["finance:deferred:read","finance:deferred:create","finance:deferred:update"];
const F_DEFERRED_R     = ["finance:deferred:read"];
const F_PERIOD         = ["finance:period:read","finance:period:manage"];
const F_PERIOD_R       = ["finance:period:read"];
const F_LOCK_DATE      = ["finance:lockDate:manage"];
const F_FISCAL_POS     = ["finance:fiscalPosition:read","finance:fiscalPosition:create","finance:fiscalPosition:update","finance:fiscalPosition:delete"];
const F_FISCAL_POS_R   = ["finance:fiscalPosition:read"];
const F_CURRENCY       = ["finance:currency:read","finance:currency:manage"];
const F_CURRENCY_R     = ["finance:currency:read"];
const F_REPORT_R       = ["finance:report:read"];
const F_AUDIT_R        = ["finance:auditTrail:read"];
const F_SETTINGS       = ["finance:settings:manage"];

// All finance (Financial Controller)
const F_ALL = [...F_ACCOUNT,...F_JOURNAL,...F_TAX,...F_PAYMENT_TERM,...F_PARTNER,...F_MOVE,...F_INVOICE,...F_BILL,...F_PAYMENT,...F_BANK,...F_RECON,...F_BATCH,...F_BUDGET,...F_ASSET,...F_DEFERRED,...F_PERIOD,...F_LOCK_DATE,...F_FISCAL_POS,...F_CURRENCY,F_REPORT_R[0],F_AUDIT_R[0],F_SETTINGS[0]];

// Contracting
const C_HOTEL      = ["contracting:hotel:read","contracting:hotel:create","contracting:hotel:update","contracting:hotel:delete"];
const C_HOTEL_R    = ["contracting:hotel:read"];
const C_DEST       = ["contracting:destination:read","contracting:destination:create","contracting:destination:update","contracting:destination:delete"];
const C_DEST_R     = ["contracting:destination:read"];
const C_MARKET     = ["contracting:market:read","contracting:market:create","contracting:market:update","contracting:market:delete"];
const C_MARKET_R   = ["contracting:market:read"];
const C_ROOMTYPE   = ["contracting:roomType:read","contracting:roomType:create","contracting:roomType:update","contracting:roomType:delete"];
const C_ROOMTYPE_R = ["contracting:roomType:read"];
const C_MEALBASIS  = ["contracting:mealBasis:read","contracting:mealBasis:create","contracting:mealBasis:update","contracting:mealBasis:delete"];
const C_MEALBASIS_R= ["contracting:mealBasis:read"];
const C_CONTRACT   = ["contracting:contract:read","contracting:contract:create","contracting:contract:update","contracting:contract:delete","contracting:contract:post","contracting:contract:publish"];
const C_CONTRACT_RU= ["contracting:contract:read","contracting:contract:update"];
const C_RATE       = ["contracting:rate:read","contracting:rate:create","contracting:rate:update","contracting:rate:delete"];
const C_RATE_R     = ["contracting:rate:read"];
const C_SEASON     = ["contracting:season:read","contracting:season:create","contracting:season:update","contracting:season:delete"];
const C_SEASON_R   = ["contracting:season:read"];
const C_SUPPLEMENT = ["contracting:supplement:read","contracting:supplement:create","contracting:supplement:update","contracting:supplement:delete"];
const C_SUPPLEMENT_R=["contracting:supplement:read"];
const C_OFFER      = ["contracting:offer:read","contracting:offer:create","contracting:offer:update","contracting:offer:delete"];
const C_OFFER_R    = ["contracting:offer:read"];
const C_POLICY     = ["contracting:policy:read","contracting:policy:create","contracting:policy:update","contracting:policy:delete"];
const C_POLICY_R   = ["contracting:policy:read"];
const C_MARKUP     = ["contracting:markup:read","contracting:markup:create","contracting:markup:update","contracting:markup:delete"];
const C_MARKUP_R   = ["contracting:markup:read"];
const C_ALLOTMENT  = ["contracting:allotment:read","contracting:allotment:create","contracting:allotment:update"];
const C_ALLOTMENT_R= ["contracting:allotment:read"];
const C_TARIFF     = ["contracting:tariff:read","contracting:tariff:export"];
const C_TARIFF_R   = ["contracting:tariff:read"];
const C_REPORT_R   = ["contracting:report:read"];

// All contracting
const C_ALL = [...C_HOTEL,...C_DEST,...C_MARKET,...C_ROOMTYPE,...C_MEALBASIS,...C_CONTRACT,...C_RATE,...C_SEASON,...C_SUPPLEMENT,...C_OFFER,...C_POLICY,...C_MARKUP,...C_ALLOTMENT,...C_TARIFF,C_REPORT_R[0]];

// Reservations
const R_BOOKING    = ["reservations:booking:read","reservations:booking:create","reservations:booking:update","reservations:booking:delete","reservations:booking:confirm","reservations:booking:cancel","reservations:booking:export"];
const R_BOOKING_RCUCC = ["reservations:booking:read","reservations:booking:create","reservations:booking:update","reservations:booking:confirm","reservations:booking:cancel"];
const R_BOOKING_RC = ["reservations:booking:read","reservations:booking:create"];
const R_BOOKING_R  = ["reservations:booking:read"];
const R_PAYMENT    = ["reservations:payment:read","reservations:payment:create","reservations:payment:confirm","reservations:payment:cancel"];
const R_PAYMENT_R  = ["reservations:payment:read"];
const R_GUEST      = ["reservations:guest:read","reservations:guest:create","reservations:guest:update","reservations:guest:delete"];
const R_GUEST_RC   = ["reservations:guest:read","reservations:guest:create"];
const R_VOUCHER    = ["reservations:voucher:read","reservations:voucher:create","reservations:voucher:export"];
const R_VOUCHER_R  = ["reservations:voucher:read"];
const R_COMM       = ["reservations:communication:read","reservations:communication:create"];
const R_COMM_R     = ["reservations:communication:read"];
const R_HCREDIT    = ["reservations:hotelCredit:read","reservations:hotelCredit:create","reservations:hotelCredit:update"];
const R_HCREDIT_R  = ["reservations:hotelCredit:read"];
const R_REPORT_R   = ["reservations:report:read"];

// All reservations
const R_ALL = [...R_BOOKING,...R_PAYMENT,...R_GUEST,...R_VOUCHER,...R_COMM,...R_HCREDIT,R_REPORT_R[0]];

// Traffic
const T_JOB        = ["traffic:job:read","traffic:job:create","traffic:job:update","traffic:job:delete"];
const T_JOB_RCU    = ["traffic:job:read","traffic:job:create","traffic:job:update"];
const T_JOB_R      = ["traffic:job:read"];
const T_VEHICLE    = ["traffic:vehicle:read","traffic:vehicle:create","traffic:vehicle:update","traffic:vehicle:delete"];
const T_VEHICLE_R  = ["traffic:vehicle:read"];
const T_DRIVER     = ["traffic:driver:read","traffic:driver:create","traffic:driver:update","traffic:driver:delete"];
const T_DRIVER_R   = ["traffic:driver:read"];
const T_ZONE       = ["traffic:zone:read","traffic:zone:create","traffic:zone:update","traffic:zone:delete"];
const T_ZONE_R     = ["traffic:zone:read"];
const T_AIRPORT    = ["traffic:airport:read","traffic:airport:create","traffic:airport:update"];
const T_AIRPORT_R  = ["traffic:airport:read"];
const T_PRICING    = ["traffic:pricing:read","traffic:pricing:create","traffic:pricing:update","traffic:pricing:delete"];
const T_PRICING_R  = ["traffic:pricing:read"];
const T_DISPATCH   = ["traffic:dispatch:read","traffic:dispatch:manage"];
const T_DISPATCH_R = ["traffic:dispatch:read"];
const T_ASSIGN     = ["traffic:assignment:read","traffic:assignment:manage"];
const T_ASSIGN_R   = ["traffic:assignment:read"];
const T_GBOOKING   = ["traffic:guestBooking:read","traffic:guestBooking:create","traffic:guestBooking:update"];
const T_GBOOKING_R = ["traffic:guestBooking:read"];
const T_REPORT_R   = ["traffic:report:read"];
const T_SETTINGS   = ["traffic:settings:manage"];

// All traffic
const T_ALL = [...T_JOB,...T_VEHICLE,...T_DRIVER,...T_ZONE,...T_AIRPORT,...T_PRICING,...T_DISPATCH,...T_ASSIGN,...T_GBOOKING,T_REPORT_R[0],T_SETTINGS[0]];

// CRM
const CRM_LEAD     = ["crm:lead:read","crm:lead:create","crm:lead:update","crm:lead:delete"];
const CRM_LEAD_R   = ["crm:lead:read"];
const CRM_OPP      = ["crm:opportunity:read","crm:opportunity:create","crm:opportunity:update","crm:opportunity:delete"];
const CRM_OPP_RCU  = ["crm:opportunity:read","crm:opportunity:create","crm:opportunity:update"];
const CRM_CUST     = ["crm:customer:read","crm:customer:create","crm:customer:update","crm:customer:delete"];
const CRM_CUST_RCU = ["crm:customer:read","crm:customer:create","crm:customer:update"];
const CRM_EXCURSION= ["crm:excursion:read","crm:excursion:create","crm:excursion:update","crm:excursion:delete","crm:excursion:export"];
const CRM_EXCURSION_RCU = ["crm:excursion:read","crm:excursion:create","crm:excursion:update"];
const CRM_BOOKING  = ["crm:booking:read","crm:booking:create","crm:booking:update","crm:booking:delete","crm:booking:confirm","crm:booking:cancel","crm:booking:export"];
const CRM_BOOKING_RCU = ["crm:booking:read","crm:booking:create","crm:booking:update"];
const CRM_SUPPLIER = ["crm:supplier:read","crm:supplier:create","crm:supplier:update"];
const CRM_SUPPLIER_R=["crm:supplier:read"];
const CRM_ACTIVITY = ["crm:activity:read","crm:activity:create","crm:activity:update","crm:activity:delete"];
const CRM_ACTIVITY_RCU = ["crm:activity:read","crm:activity:create","crm:activity:update"];
const CRM_COST     = ["crm:costSheet:read","crm:costSheet:create","crm:costSheet:update","crm:costSheet:delete"];
const CRM_COST_R   = ["crm:costSheet:read"];
const CRM_REPORT_R = ["crm:report:read"];

// All CRM
const CRM_ALL = [...CRM_LEAD,...CRM_OPP,...CRM_CUST,...CRM_EXCURSION,...CRM_BOOKING,...CRM_SUPPLIER,...CRM_ACTIVITY,...CRM_COST,CRM_REPORT_R[0]];

// Tour Ops
const TO_FILE      = ["tour-ops:file:read","tour-ops:file:create","tour-ops:file:update","tour-ops:file:delete"];
const TO_FILE_RCU  = ["tour-ops:file:read","tour-ops:file:create","tour-ops:file:update"];
const TO_FILE_R    = ["tour-ops:file:read"];
const TO_PACKAGE   = ["tour-ops:package:read","tour-ops:package:create","tour-ops:package:update","tour-ops:package:delete"];
const TO_PACKAGE_R = ["tour-ops:package:read"];
const TO_QUOTATION = ["tour-ops:quotation:read","tour-ops:quotation:create","tour-ops:quotation:update","tour-ops:quotation:delete","tour-ops:quotation:export"];
const TO_QUOTATION_RCU = ["tour-ops:quotation:read","tour-ops:quotation:create","tour-ops:quotation:update"];
const TO_TICKET    = ["tour-ops:flightTicket:read","tour-ops:flightTicket:create","tour-ops:flightTicket:update","tour-ops:flightTicket:delete","tour-ops:flightTicket:post","tour-ops:flightTicket:cancel"];
const TO_TICKET_RCU= ["tour-ops:flightTicket:read","tour-ops:flightTicket:create","tour-ops:flightTicket:update"];
const TO_COMPONENT = ["tour-ops:component:read","tour-ops:component:create","tour-ops:component:update","tour-ops:component:delete"];
const TO_COMPONENT_R=["tour-ops:component:read"];
const TO_DISPATCH  = ["tour-ops:dispatch:read","tour-ops:dispatch:manage"];
const TO_DISPATCH_R= ["tour-ops:dispatch:read"];
const TO_PNL_R     = ["tour-ops:pnl:read"];
const TO_REPORT_R  = ["tour-ops:report:read"];

// All tour-ops
const TO_ALL = [...TO_FILE,...TO_PACKAGE,...TO_QUOTATION,...TO_TICKET,...TO_COMPONENT,...TO_DISPATCH,TO_PNL_R[0],TO_REPORT_R[0]];

// B2C
const B2C_ALL = [
  "b2c-site:branding:read","b2c-site:branding:manage",
  "b2c-site:heroSlide:read","b2c-site:heroSlide:create","b2c-site:heroSlide:update","b2c-site:heroSlide:delete",
  "b2c-site:page:read","b2c-site:page:create","b2c-site:page:update","b2c-site:page:delete",
  "b2c-site:blog:read","b2c-site:blog:create","b2c-site:blog:update","b2c-site:blog:delete",
  "b2c-site:faq:read","b2c-site:faq:create","b2c-site:faq:update","b2c-site:faq:delete",
  "b2c-site:testimonial:read","b2c-site:testimonial:create","b2c-site:testimonial:update","b2c-site:testimonial:delete",
  "b2c-site:inquiry:read","b2c-site:inquiry:delete",
  "b2c-site:newsletter:read","b2c-site:newsletter:manage",
  "b2c-site:markup:read","b2c-site:markup:create","b2c-site:markup:update","b2c-site:markup:delete",
];

// B2B
const B2B_ALL = [
  "b2b-portal:tourOperator:read","b2b-portal:tourOperator:create","b2b-portal:tourOperator:update","b2b-portal:tourOperator:delete",
  "b2b-portal:travelAgent:read","b2b-portal:travelAgent:create","b2b-portal:travelAgent:update","b2b-portal:travelAgent:delete",
  "b2b-portal:partnerUser:read","b2b-portal:partnerUser:create","b2b-portal:partnerUser:update",
  "b2b-portal:reservation:read","b2b-portal:reservation:create","b2b-portal:reservation:update",
  "b2b-portal:voucher:read","b2b-portal:voucher:create",
  "b2b-portal:credit:read","b2b-portal:credit:manage",
  "b2b-portal:markup:read","b2b-portal:markup:create","b2b-portal:markup:update","b2b-portal:markup:delete",
  "b2b-portal:rateSheet:read","b2b-portal:rateSheet:create","b2b-portal:rateSheet:update","b2b-portal:rateSheet:delete",
  "b2b-portal:report:read",
];

// ── Role definitions ───────────────────────────────────────────────────────

interface RoleDef {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

const ROLES: RoleDef[] = [

  // ── Finance ────────────────────────────────────────────────────────────────

  {
    name: "financial_controller",
    displayName: "Financial Controller",
    description: "Full access to all finance operations, reporting, and configuration",
    permissions: [...new Set(F_ALL)],
  },
  {
    name: "receivable_accountant_tourism",
    displayName: "Receivable Accountant (Tourism)",
    description: "Manage customer invoices and payments for tourism bookings",
    permissions: [...new Set([...F_INVOICE, ...F_PAYMENT, ...F_PARTNER_RCU, ...F_MOVE_R, ...F_JOURNAL_R, ...F_REPORT_R, ...F_TAX_R, ...F_PAYMENT_TERM_R])],
  },
  {
    name: "payable_accountant_tourism",
    displayName: "Payable Accountant (Tourism)",
    description: "Manage supplier bills and payments for tourism operations",
    permissions: [...new Set([...F_BILL, ...F_PAYMENT, ...F_PARTNER_RCU, ...F_MOVE_R, ...F_JOURNAL_R, ...F_REPORT_R, ...F_TAX_R, ...F_PAYMENT_TERM_R])],
  },
  {
    name: "receivable_accountant_excursion",
    displayName: "Receivable Accountant (Excursion)",
    description: "Manage invoices and receipts for excursion bookings",
    permissions: [...new Set([...F_INVOICE, ...F_PAYMENT, ...F_PARTNER_RCU, ...F_MOVE_R, ...F_JOURNAL_R, ...F_REPORT_R, ...F_TAX_R, ...CRM_BOOKING_RCU, ...CRM_CUST_RCU])],
  },
  {
    name: "payable_accountant_excursion",
    displayName: "Payable Accountant (Excursion)",
    description: "Manage supplier bills and costs for excursion services",
    permissions: [...new Set([...F_BILL, ...F_PAYMENT, ...F_PARTNER_RCU, ...F_MOVE_R, ...F_JOURNAL_R, ...F_REPORT_R, ...F_TAX_R, ...CRM_COST_R, ...CRM_SUPPLIER_R])],
  },
  {
    name: "receivable_accountant_transportation",
    displayName: "Receivable Accountant (Transportation)",
    description: "Manage invoices and receipts for transport services",
    permissions: [...new Set([...F_INVOICE, ...F_PAYMENT, ...F_PARTNER_RCU, ...F_MOVE_R, ...F_JOURNAL_R, ...F_REPORT_R, ...F_TAX_R, ...T_PRICING_R, ...T_JOB_R])],
  },
  {
    name: "payable_accountant_transportation",
    displayName: "Payable Accountant (Transportation)",
    description: "Manage bills and costs for transport suppliers and drivers",
    permissions: [...new Set([...F_BILL, ...F_PAYMENT, ...F_PARTNER_RCU, ...F_MOVE_R, ...F_JOURNAL_R, ...F_REPORT_R, ...F_TAX_R, ...T_PRICING_R, ...T_DRIVER_R])],
  },
  {
    name: "treasury",
    displayName: "Treasury",
    description: "Manage bank accounts, payments, reconciliation, and cash flow",
    permissions: [...new Set([...F_BANK, ...F_RECON, ...F_BATCH, ...F_PAYMENT, ...F_PARTNER_R, ...F_MOVE_RCC, ...F_JOURNAL_R, ...F_REPORT_R, ...F_CURRENCY])],
  },
  {
    name: "internal_auditor",
    displayName: "Internal Auditor",
    description: "Read-only access to all financial records and audit trails",
    permissions: [...new Set([...F_ACCOUNT_R, ...F_JOURNAL_R, ...F_TAX_R, ...F_PAYMENT_TERM_R, ...F_PARTNER_R, ...F_MOVE_R, ...F_INVOICE_R, ...F_BILL_R, ...F_PAYMENT_R, ...F_BANK_R, ...F_RECON_R, ...F_BATCH_R, ...F_BUDGET_R, ...F_ASSET_R, ...F_DEFERRED_R, ...F_PERIOD_R, ...F_FISCAL_POS_R, ...F_CURRENCY_R, ...F_REPORT_R, ...F_AUDIT_R])],
  },

  // ── Contracting ────────────────────────────────────────────────────────────

  {
    name: "contracting_commercial_director",
    displayName: "Contracting & Commercial Director",
    description: "Full access to all contracting, rates, and commercial configuration",
    permissions: [...new Set(C_ALL)],
  },
  {
    name: "contracting_manager",
    displayName: "Contracting Manager",
    description: "Manage hotel contracts, rates, seasons, and allotments",
    permissions: [...new Set([...C_CONTRACT, ...C_RATE, ...C_SEASON, ...C_SUPPLEMENT, ...C_OFFER, ...C_POLICY, ...C_ALLOTMENT, ...C_HOTEL_R, ...C_DEST_R, ...C_MARKET_R, ...C_ROOMTYPE_R, ...C_MEALBASIS_R, ...C_TARIFF, ...C_REPORT_R])],
  },
  {
    name: "contracting_pricing_admin",
    displayName: "Contracting & Pricing Admin",
    description: "Manage rates, tariffs, markup rules, and pricing data",
    permissions: [...new Set([...C_RATE, ...C_TARIFF, ...C_MARKUP, ...C_SEASON_R, ...C_SUPPLEMENT_R, ...C_OFFER_R, ...C_CONTRACT_RU, ...C_HOTEL_R, ...C_DEST_R, ...C_MARKET_R, ...C_ROOMTYPE_R, ...C_MEALBASIS_R, ...C_REPORT_R])],
  },

  // ── Reservations ──────────────────────────────────────────────────────────

  {
    name: "reservations_manager",
    displayName: "Reservations Manager",
    description: "Full access to all reservations operations and reporting",
    permissions: [...new Set(R_ALL)],
  },
  {
    name: "reservations_supervisor",
    displayName: "Reservations Supervisor",
    description: "Manage bookings, payments, guests, and vouchers — cannot delete",
    permissions: [...new Set([...R_BOOKING_RCUCC, ...R_PAYMENT, ...R_GUEST, ...R_VOUCHER, ...R_COMM, ...R_HCREDIT, ...R_REPORT_R])],
  },
  {
    name: "reservations_agent",
    displayName: "Reservations Agent",
    description: "Create and view bookings and register guests",
    permissions: [...new Set([...R_BOOKING_RC, ...R_GUEST_RC, ...R_VOUCHER_R, ...R_COMM_R, ...R_PAYMENT_R])],
  },

  // ── Tour Operations ───────────────────────────────────────────────────────

  {
    name: "operations_manager",
    displayName: "Operations Manager",
    description: "Full access to all tour operations: files, packages, quotations, tickets, dispatch",
    permissions: [...new Set(TO_ALL)],
  },
  {
    name: "operations_supervisor",
    displayName: "Operations Supervisor",
    description: "Manage ops files, packages, quotations, components, and monitor dispatch",
    permissions: [...new Set([...TO_FILE, ...TO_PACKAGE, ...TO_QUOTATION, ...TO_TICKET_RCU, ...TO_COMPONENT, ...TO_DISPATCH_R, ...TO_PNL_R, ...TO_REPORT_R])],
  },
  {
    name: "tour_operator",
    displayName: "Tour Operator",
    description: "Create and manage quotations and ops files; view packages",
    permissions: [...new Set([...TO_FILE_RCU, ...TO_QUOTATION_RCU, ...TO_PACKAGE_R, ...TO_COMPONENT_R, ...TO_TICKET_RCU, ...TO_DISPATCH_R])],
  },

  // ── Excursions (CRM) ──────────────────────────────────────────────────────

  {
    name: "excursions_manager",
    displayName: "Excursions Manager",
    description: "Full access to CRM excursions, bookings, cost sheets, and reporting",
    permissions: [...new Set(CRM_ALL)],
  },
  {
    name: "excursions_operator",
    displayName: "Excursions Operator",
    description: "Manage excursion bookings, customers, and activities day-to-day",
    permissions: [...new Set([...CRM_EXCURSION_RCU, ...CRM_BOOKING_RCU, ...CRM_CUST_RCU, ...CRM_ACTIVITY_RCU, ...CRM_SUPPLIER_R, ...CRM_OPP_RCU, ...CRM_LEAD_R, ...CRM_REPORT_R])],
  },

  // ── Traffic & Transportation ──────────────────────────────────────────────

  {
    name: "traffic_manager",
    displayName: "Traffic Manager",
    description: "Full access to traffic operations, fleet, drivers, pricing, and dispatch",
    permissions: [...new Set(T_ALL)],
  },
  {
    name: "traffic_operator",
    displayName: "Traffic Operator",
    description: "Handle daily job dispatch, assignments, and guest bookings",
    permissions: [...new Set([...T_JOB_RCU, ...T_DISPATCH, ...T_ASSIGN, ...T_GBOOKING, ...T_VEHICLE_R, ...T_DRIVER_R, ...T_ZONE_R, ...T_AIRPORT_R, ...T_PRICING_R, ...T_REPORT_R])],
  },

  // ── B2C Website ────────────────────────────────────────────────────────────

  {
    name: "b2c_operator",
    displayName: "B2C Operator",
    description: "Full access to B2C website content, engagement, and pricing",
    permissions: [...new Set(B2C_ALL)],
  },

  // ── B2B Portal ─────────────────────────────────────────────────────────────

  {
    name: "b2b_operator",
    displayName: "B2B Operator",
    description: "Full access to B2B portal partners, reservations, commercial, and reporting",
    permissions: [...new Set(B2B_ALL)],
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function seedCompany(companyId: string, permMap: Map<string, string>) {
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name_companyId: { name: roleDef.name, companyId } },
      update: { displayName: roleDef.displayName, description: roleDef.description },
      create: {
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.description,
        companyId,
        isSystem: false,
      },
    });

    const permIds: string[] = [];
    const missing: string[] = [];
    for (const code of roleDef.permissions) {
      const id = permMap.get(code);
      if (id) permIds.push(id);
      else missing.push(code);
    }
    if (missing.length) console.warn(`  ⚠  "${roleDef.name}" — unknown codes:`, missing);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permIds.length) {
      await prisma.rolePermission.createMany({
        data: permIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
    console.log(`    ✓  ${roleDef.displayName} — ${permIds.length} permissions`);
  }
}

async function main() {
  console.log("Seeding operational roles...\n");

  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  if (!companies.length) {
    console.error("No companies found. Run prisma/seed-setup.ts first.");
    process.exit(1);
  }

  const allPerms = await prisma.permission.findMany({ select: { id: true, code: true } });
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));
  console.log(`  Loaded ${permMap.size} permissions from DB\n`);

  for (const company of companies) {
    console.log(`  Company: ${company.name} (${company.id})`);
    await seedCompany(company.id, permMap);
    console.log();
  }

  console.log(`  Done. ${ROLES.length} roles × ${companies.length} companies.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
