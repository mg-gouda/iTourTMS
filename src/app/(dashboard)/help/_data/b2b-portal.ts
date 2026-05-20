import type { HelpModule } from "./types";

export const b2bPortalHelp: HelpModule = {
  slug: "b2b-portal",
  name: "B2B Portal",
  icon: "Briefcase",
  color: "rose",
  description: "Partner portal for tour operators, travel agents, rate sheets, bookings, credit, and reports.",
  overview:
    "The B2B Portal module manages your trade partner relationships — both tour operators and travel agents. Partners can search for availability and make bookings at net (contracted) rates. The module handles rate sheet distribution, credit limits, markup rules specific to B2B channels, and provides detailed production and revenue reports per partner.",
  sections: [
    {
      id: "tour-operators",
      title: "Tour Operators",
      description:
        "Manage your tour operator partners who book hotel allocations in bulk and require credit facilities.",
      features: [
        "Tour operator master record with contact and contract details",
        "Credit limit and payment term configuration",
        "Commission percentage setting",
        "Linked partner users for portal login access",
        "Booking history and production overview",
        "Credit usage and balance tracking",
      ],
      steps: [
        { step: 1, title: "Create a Tour Operator", description: "Go to B2B Portal → Partners → Tour Operators → New Tour Operator. Fill in the company name, contact, and commercial terms." },
        { step: 2, title: "Set Credit Limit", description: "In the Commercial tab, enter the credit limit and payment term days." },
        { step: 3, title: "Add Portal Users", description: "Go to B2B Portal → Partners → Partner Users to create login credentials for the tour operator's staff." },
      ],
    },
    {
      id: "travel-agents",
      title: "Travel Agents",
      description:
        "Register retail travel agents who book on behalf of end customers. Travel agents typically receive commission rather than credit facilities.",
      features: [
        "Travel agent profile with IATA number and contact",
        "Commission rate configuration",
        "Booking history and revenue tracking",
        "Portal access management",
      ],
    },
    {
      id: "partner-users",
      title: "Partner Users",
      description:
        "Create and manage login accounts for partner company staff who will use the B2B portal.",
      features: [
        "Create portal login (email + password) per partner",
        "Link user to a specific tour operator or travel agent",
        "Active/inactive toggle to suspend access",
        "Password reset functionality",
      ],
      steps: [
        { step: 1, title: "Create a Partner User", description: "Go to B2B Portal → Partners → Partner Users → New User. Enter the email, set a temporary password, and link to the tour operator or travel agent." },
        { step: 2, title: "Activate", description: "Toggle Active to enable the login. The partner can now log in at the B2B portal URL." },
        { step: 3, title: "Reset Password", description: "Click Reset Password to generate a new temporary password for the partner user." },
      ],
    },
    {
      id: "search-book",
      title: "Search & Book",
      description:
        "Search for hotel availability at net rates and create bookings directly for partner clients.",
      features: [
        "Availability search using contracted net rates (no B2C markup applied)",
        "Filter by destination, dates, pax, star rating",
        "Room type selection with rate breakdown",
        "Direct booking creation linked to the partner",
        "Instant confirmation for freesale rooms",
      ],
    },
    {
      id: "reservations",
      title: "Partner Reservations",
      description:
        "View and manage all bookings made through the B2B portal, including status tracking and voucher generation.",
      features: [
        "Full booking list with partner, hotel, dates, and status",
        "Booking detail with guest roster and rate breakdown",
        "Voucher generation per booking",
        "Booking amendment and cancellation",
        "Financial summary per booking (net rate, commission, margin)",
      ],
    },
    {
      id: "commercial",
      title: "Commercial Rules",
      description:
        "Configure rate sheets, channel-specific markup rules, and credit management for B2B partners.",
      features: [
        "Rate sheets — compiled from contract rates for distribution",
        "B2B markup rules — adjust net rates for specific partners",
        "Credit management — record payments, adjustments, and view credit statements",
        "Credit transaction history per partner",
      ],
    },
    {
      id: "reports",
      title: "Reports",
      description:
        "Production and financial reports across all B2B partner activity.",
      features: [
        "Booking Reports — summary by partner, hotel, or date range with KPIs",
        "Revenue Analytics — revenue vs cost vs margin per partner",
        "Partner Statements — running balance with all transactions and payments",
        "Export to Excel for external distribution",
      ],
    },
  ],
};
