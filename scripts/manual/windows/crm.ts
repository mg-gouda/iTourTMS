import { first, tab, type ManualWindow } from "./types";

const lead = first("/crm/leads/:id", (db) => db.crmLead.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const contact = first("/crm/contacts/:id", (db) => db.crmCustomer.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const opp = first("/crm/pipeline/:id", (db) => db.crmOpportunity.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const excursion = first("/crm/excursions/:id", (db) => db.crmExcursion.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const booking = first("/crm/bookings/:id", (db) => db.crmBooking.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const supplier = first("/crm/suppliers/:id", (db) => db.crmSupplier.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const plan = first("/crm/exc-programs/:id", (db) => db.crmProgramPlan.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const mailing = first("/crm/mailings/:id", (db) => db.crmMailing.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));

export const crm: ManualWindow[] = [
  { id: "dashboard", route: "/crm" },
  { id: "leads", route: "/crm/leads" },
  { id: "lead-new", route: "/crm/leads/new" },
  { id: "lead-details", route: "/crm/leads/:id", resolve: lead },
  { id: "lead-activities", route: "/crm/leads/:id", resolve: lead, setup: tab("activities") },
  { id: "pipeline", route: "/crm/pipeline" },
  { id: "opportunity-new", route: "/crm/pipeline/new" },
  { id: "opportunity-details", route: "/crm/pipeline/:id", resolve: opp },
  { id: "opportunity-bookings", route: "/crm/pipeline/:id", resolve: opp, setup: tab("bookings") },
  { id: "opportunity-activities", route: "/crm/pipeline/:id", resolve: opp, setup: tab("activities") },
  { id: "contacts", route: "/crm/contacts" },
  { id: "contact-new", route: "/crm/contacts/new" },
  { id: "contact-profile", route: "/crm/contacts/:id", resolve: contact },
  { id: "contact-activities", route: "/crm/contacts/:id", resolve: contact, setup: tab("activities") },
  { id: "contact-bookings", route: "/crm/contacts/:id", resolve: contact, setup: tab("bookings") },
  { id: "contact-opportunities", route: "/crm/contacts/:id", resolve: contact, setup: tab("opportunities") },
  {
    id: "teams",
    route: "/crm/teams",
  },
  {
    id: "team-edit",
    route: "/crm/teams",
    setup: async (p) => {
      await p.getByRole("button", { name: /new team|create the first team/i }).first().click();
    },
  },
  { id: "mailings", route: "/crm/mailings" },
  { id: "mailing-new", route: "/crm/mailings/new" },
  { id: "mailing-detail", route: "/crm/mailings/:id", resolve: mailing },
  { id: "bookings", route: "/crm/bookings" },
  { id: "booking-new", route: "/crm/bookings/new" },
  { id: "booking-items", route: "/crm/bookings/:id", resolve: booking },
  { id: "booking-activities", route: "/crm/bookings/:id", resolve: booking, setup: tab("activities") },
  { id: "excursions", route: "/crm/excursions" },
  { id: "excursion-new", route: "/crm/excursions/new" },
  { id: "excursion-info", route: "/crm/excursions/:id", resolve: excursion },
  { id: "excursion-program", route: "/crm/excursions/:id", resolve: excursion, setup: tab("program") },
  { id: "excursion-extras", route: "/crm/excursions/:id", resolve: excursion, setup: tab("extras") },
  { id: "excursion-pickup", route: "/crm/excursions/:id", resolve: excursion, setup: tab("pickup") },
  { id: "excursion-costs", route: "/crm/excursions/:id", resolve: excursion, setup: tab("costs") },
  { id: "excursion-pricing", route: "/crm/excursions/:id", resolve: excursion, setup: tab("pricing") },
  { id: "exc-programs", route: "/crm/exc-programs" },
  { id: "exc-program-new", route: "/crm/exc-programs/new" },
  { id: "exc-program-detail", route: "/crm/exc-programs/:id", resolve: plan },
  { id: "to-assign", route: "/crm/to-assign" },
  { id: "pickup-time-sheet", route: "/crm/pickup-time-sheet" },
  { id: "excursion-bookings", route: "/crm/excursion-bookings" },
  { id: "excursion-breakdown", route: "/crm/excursion-breakdown" },
  { id: "excursion-dispatch", route: "/crm/excursion-dispatch" },
  { id: "suppliers", route: "/crm/suppliers" },
  { id: "supplier-new", route: "/crm/suppliers/new" },
  { id: "supplier-details", route: "/crm/suppliers/:id", resolve: supplier },
  { id: "supplier-components", route: "/crm/suppliers/:id", resolve: supplier, setup: tab("components") },
];
