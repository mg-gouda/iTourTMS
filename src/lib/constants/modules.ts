import type { ModuleDefinition } from "@/types";

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    name: "finance",
    displayName: "Finance & Accounting",
    description: "Chart of accounts, journals, invoicing, payments, bank reconciliation",
    icon: "Landmark",
    dependencies: [],
    isAvailable: true,
  },
  {
    name: "contracting",
    displayName: "Contracting",
    description: "Hotel contracts, rates, allotment, stop sales, markets",
    icon: "FileText",
    dependencies: [],
    isAvailable: true,
  },
  {
    name: "crm",
    displayName: "Excursions",
    description: "Leads, pipeline, activities, quotations, customer management",
    icon: "Users",
    dependencies: [],
    isAvailable: true,
  },
  {
    name: "reservations",
    displayName: "Reservations",
    description: "Bookings, guests, vouchers, rooming lists, TO billing",
    icon: "CalendarCheck",
    dependencies: ["finance", "contracting"],
    isAvailable: true,
  },
  {
    name: "traffic",
    displayName: "Traffic & Transport",
    description: "Transport jobs, fleet, drivers, reps, dispatch, guest bookings",
    icon: "Bus",
    dependencies: [],
    isAvailable: true,
  },
  {
    name: "b2c-site",
    displayName: "B2C Website",
    description: "Public website CMS, branding, blog, FAQ, testimonials, newsletter",
    icon: "Globe",
    dependencies: [],
    isAvailable: true,
  },
  {
    name: "b2b-portal",
    displayName: "B2B Portal",
    description: "Partner portal for tour operators, travel agents, rate sheets, and bookings",
    icon: "Briefcase",
    dependencies: [],
    isAvailable: true,
  },
];

export function getModule(name: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.name === name);
}

export function getAvailableModules(): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => m.isAvailable);
}
