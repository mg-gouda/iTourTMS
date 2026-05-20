import type { HelpModule } from "./types";

export const crmHelp: HelpModule = {
  slug: "crm",
  name: "CRM & Excursions",
  icon: "Users",
  color: "green",
  description: "Leads, pipeline, contacts, excursion catalog, cost sheets, and excursion bookings.",
  overview:
    "The CRM & Excursions module manages your customer relationships and excursion product catalog. Track sales leads through a pipeline, manage customer contacts, build excursion programs with detailed cost sheets, and process excursion bookings from inquiry to confirmation.",
  sections: [
    {
      id: "leads",
      title: "Leads",
      description:
        "Capture incoming enquiries from any source. Each lead is assigned a unique LD-XXXXX code and tracked through qualification stages.",
      features: [
        "Lead capture with source tracking (web, phone, email, referral)",
        "Auto-generated lead codes (LD-00001 sequence)",
        "Status stages: New, Contacted, Qualified, Won, Lost",
        "Assignment to sales representatives",
        "Activity log for calls, emails, and follow-ups",
        "One-click conversion to Customer contact",
      ],
      steps: [
        { step: 1, title: "Create a Lead", description: "Go to CRM → Management → Leads → New Lead. Enter the contact name, source, and initial notes." },
        { step: 2, title: "Update Status", description: "Move the lead through stages (New → Contacted → Qualified) as you engage with the prospect." },
        { step: 3, title: "Convert to Customer", description: "Once qualified and won, click 'Convert to Customer' to create a CrmCustomer record linked to the lead." },
      ],
    },
    {
      id: "pipeline",
      title: "Pipeline (Kanban)",
      description:
        "Visualize all open opportunities in a drag-and-drop kanban board organized by sales stage.",
      features: [
        "Kanban columns: Prospecting, Qualification, Proposal, Negotiation, Won",
        "Color-coded cards with value and expected close date",
        "Move cards between stages with 'Move to Stage' dropdown",
        "Opportunity detail with linked activities and bookings",
        "Create Booking directly from an opportunity",
        "Revenue forecast per stage",
      ],
      steps: [
        { step: 1, title: "Open Pipeline", description: "Go to CRM → Management → Pipeline to see the kanban board." },
        { step: 2, title: "Create an Opportunity", description: "Click New Opportunity or drag a lead card into the pipeline. Set the expected value and close date." },
        { step: 3, title: "Move through stages", description: "Use the 'Move to Stage' button on each card or drag and drop to advance the opportunity." },
        { step: 4, title: "Create a Booking", description: "From the opportunity detail, click 'Create Booking' to pre-fill an excursion booking with the customer details." },
      ],
    },
    {
      id: "contacts",
      title: "Contacts (Customer 360)",
      description:
        "A unified customer profile showing all bookings, opportunities, activities, and lifetime value in one place.",
      features: [
        "Contact details: name, email, phone, address, title",
        "Bookings tab — all excursion bookings for this customer",
        "Opportunities tab — linked pipeline opportunities",
        "Activities tab — full interaction history",
        "Lifetime value (LTV) auto-calculated from confirmed bookings",
        "Booking count and opportunity count on list view",
      ],
    },
    {
      id: "excursions",
      title: "Excursion Catalog",
      description:
        "Define your excursion products with programs, age-group pricing, add-ons, and detailed cost sheets.",
      features: [
        "Excursion master with product type, category, duration, max pax",
        "Program builder — itinerary items with timing and descriptions",
        "Age groups (Adult, Child, Infant) with pricing tiers",
        "Optional add-ons (e.g., lunch, hotel pickup)",
        "Cost sheets with line items per supplier",
        "Selling price editor — markup by type (percentage or fixed) per age group",
      ],
      steps: [
        { step: 1, title: "Create an Excursion", description: "Go to CRM → Catalog → Excursions → New Excursion. Enter name, type, category, duration, and max pax." },
        { step: 2, title: "Build the Program", description: "In the Program tab, add itinerary steps with times and descriptions." },
        { step: 3, title: "Define Age Groups", description: "In the Age Groups & Addons tab, create age bands (Adult 12+, Child 4-11, Infant 0-3) with default rates." },
        { step: 4, title: "Create a Cost Sheet", description: "In the Cost Sheets tab, add a cost sheet for a season or market, then add supplier cost line items." },
        { step: 5, title: "Set Selling Prices", description: "In the Pricing tab, set the markup type and amount for each age group. The selling price is auto-calculated." },
      ],
    },
    {
      id: "bookings",
      title: "Excursion Bookings",
      description:
        "Process customer excursion bookings from initial request through confirmation and voucher generation.",
      features: [
        "Booking code auto-generated (BK-00001 sequence)",
        "Multi-item bookings — add multiple excursions per booking",
        "Cost, selling price, and margin per line item",
        "Status workflow: Draft → Confirmed → Completed / Cancelled",
        "PDF voucher generation for guests",
        "Excel export for individual and bulk bookings",
        "Calendar view — monthly grid of all bookings by travel date",
        "Activity timeline on each booking",
      ],
      steps: [
        { step: 1, title: "Create a Booking", description: "Go to CRM → Management → Bookings → New Booking. Select the customer and travel date." },
        { step: 2, title: "Add Items", description: "Click Add Item, select an excursion, and the system pre-fills cost and price from the excursion's selling prices." },
        { step: 3, title: "Confirm", description: "Review totals and click Confirm to lock the booking and update customer LTV." },
        { step: 4, title: "Generate Voucher", description: "Click the Voucher button to download a PDF voucher for the guest." },
      ],
    },
    {
      id: "suppliers",
      title: "Suppliers",
      description:
        "Manage excursion service suppliers who provide transport, guides, entry tickets, and other components.",
      features: [
        "Supplier master with contact details and service type",
        "Cost components linked to cost sheets per excursion",
        "Supplier detail view — all linked excursions and cost lines",
      ],
    },
  ],
};
