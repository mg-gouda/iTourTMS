import type { HelpModule } from "./types";

export const tourOpsHelp: HelpModule = {
  slug: "tour-ops",
  name: "Tour Operations",
  icon: "FolderOpen",
  color: "indigo",
  description: "Tour file management, package builder, quotations, P&L tracking, and cross-module dispatch.",
  overview:
    "The Tour Operations module manages the full lifecycle of group and FIT tour programs. You create tour files, build package templates with accommodation, transport, and excursions, generate client quotations with margin control, track actual vs budgeted costs, and dispatch components to the Reservations and Traffic modules.",
  sections: [
    {
      id: "tour-files",
      title: "Tour Files",
      description:
        "A tour file is the operational record for a group or FIT program. It aggregates all services and tracks actual costs and revenues.",
      features: [
        "File code auto-generated (FI-XXXXX sequence)",
        "Tour file types: Group, FIT, Series",
        "Status lifecycle: Draft → Active → Completed / Cancelled",
        "Date range, pax count, and market association",
        "Linked quotation, reservations, and traffic jobs",
        "P&L summary — budgeted vs actual per cost category",
        "File notes and internal remarks",
        "Flight ticket files for air component management",
      ],
      steps: [
        { step: 1, title: "Open Tour Files", description: "Go to Tour Operations → Files → Open Files to see all active tour files." },
        { step: 2, title: "Create a File", description: "Click New File. Enter the file name, type (Group/FIT), date range, and pax count." },
        { step: 3, title: "Link Services", description: "Add hotel bookings, traffic jobs, and excursion bookings to the file for consolidated tracking." },
        { step: 4, title: "Monitor P&L", description: "Use the P&L tab to compare budgeted costs from the quotation against actual incurred costs." },
      ],
    },
    {
      id: "package-templates",
      title: "Package Templates",
      description:
        "Reusable program templates that define the standard services, routing, and cost structure for recurring tour products.",
      features: [
        "Template header with name, duration, and destination",
        "Day-by-day itinerary with service line items",
        "Accommodation, transport, meals, and excursion components",
        "Cost per component from master data rate tables",
        "Template versioning for year-over-year updates",
        "Apply template to a quotation in one click",
      ],
    },
    {
      id: "quotations",
      title: "Quotations",
      description:
        "Generate detailed cost-based quotations for tour programs, with auto-calculated margins, VAT, and per-person pricing.",
      features: [
        "Quotation code auto-generated (QT-XXXXX sequence)",
        "Status: Draft → Sent → Accepted / Declined",
        "Transport PP, Sightseeing PP, Accommodation PP auto-summed",
        "Margin percentage and VAT rate controls",
        "FOC (Free of Charge) adjustment for group leader",
        "Final selling price per person calculation",
        "PDF quotation export for client delivery",
        "Convert accepted quotation to Tour File",
      ],
      steps: [
        { step: 1, title: "New Quotation", description: "Go to Tour Operations → Commercial → Quotations → New Quotation. Select the package template or build manually." },
        { step: 2, title: "Add Cost Lines", description: "Add transport, sightseeing, accommodation, and meal cost lines. The system sums the total cost per person." },
        { step: 3, title: "Set Margin", description: "Enter the target margin percentage. The system calculates the selling price per person including VAT." },
        { step: 4, title: "Export PDF", description: "Click Export PDF to generate a client-ready quotation document." },
        { step: 5, title: "Convert to File", description: "Once accepted, click Convert to Tour File to create the operational file with all services." },
      ],
    },
    {
      id: "master-data",
      title: "Master Data",
      description:
        "Rate tables for transportation, sightseeing, guidance, and meal services used in quotation cost calculations.",
      features: [
        "Transportation rates — vehicle type, zone, seasonal pricing",
        "Sightseeing rates — attraction entry fees and guide rates",
        "Guidance rates — guide fees per language and duration",
        "Meal rates — per-head cost for different meal types and venues",
        "Seasonal overrides — date-specific rate adjustments",
        "Currency and unit configuration",
      ],
    },
    {
      id: "reports",
      title: "P&L Reports & Analytics",
      description:
        "Financial performance reports across all tour files and quotation conversions.",
      features: [
        "P&L Reports — file-by-file budget vs actual comparison",
        "Revenue Analytics — total revenue, cost, and margin over a period",
        "Conversion rate — quotations accepted vs sent",
        "Cost breakdown by service category",
        "Export to Excel for management reporting",
      ],
    },
  ],
};
