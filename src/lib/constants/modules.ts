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
    displayName: "CRM & Sales",
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
    description: "Vehicle management, routes, driver scheduling, transfers",
    icon: "Bus",
    dependencies: [],
    isAvailable: false,
  },
];

export function getModule(name: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.name === name);
}

export function getAvailableModules(): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => m.isAvailable);
}
