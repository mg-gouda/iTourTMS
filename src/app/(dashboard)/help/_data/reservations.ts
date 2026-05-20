import type { HelpModule } from "./types";

export const reservationsHelp: HelpModule = {
  slug: "reservations",
  name: "Reservations",
  icon: "CalendarCheck",
  color: "violet",
  description: "Hotel bookings, guest management, vouchers, rooming lists, and daily operations.",
  overview:
    "The Reservations module handles the complete hotel booking lifecycle — from search and availability check through to check-in, check-out, voucher issuance, and financial settlement. It integrates with Contracting for rate calculation and Finance for invoicing.",
  sections: [
    {
      id: "bookings",
      title: "Bookings",
      description:
        "Create and manage individual hotel reservation files. Each booking draws rates from a published contract and generates accounting entries automatically.",
      features: [
        "Booking code auto-generated (BK-XXXXX sequence)",
        "Rate calculation from published contracts (base + supplements + offers)",
        "Flight information tracking (arrival and departure)",
        "Guest roster with title, name, and special requests",
        "Meal plan and room type selection",
        "Booking status: Draft → Confirmed → Checked-In → Checked-Out",
        "Cancellation with penalty calculation per contract policy",
        "PDF rooming list generation for hotel communication",
        "Traffic job auto-creation for arrivals and departures",
      ],
      steps: [
        { step: 1, title: "New Booking", description: "Go to Reservations → Management → Bookings → New Booking. Select hotel, dates, room type, and pax counts." },
        { step: 2, title: "Rate Check", description: "The system calculates the rate from the active contract. Review the rate breakdown (base + supplements)." },
        { step: 3, title: "Add Guests", description: "In the Guests tab, add all guest names with title and passport details." },
        { step: 4, title: "Enter Flights", description: "In the Flights tab, enter arrival and departure flight details. This auto-creates traffic transfer jobs." },
        { step: 5, title: "Confirm", description: "Click Confirm to lock the booking and generate the accounting entry." },
        { step: 6, title: "Send to Hotel", description: "Use the 'Send to Hotel' action to generate a rooming list PDF and prepare the hotel communication." },
      ],
    },
    {
      id: "group-bookings",
      title: "Group Bookings",
      description:
        "Manage group and series bookings that span multiple dates or include multiple rooms under a single group reference.",
      features: [
        "Group booking reference linking multiple individual bookings",
        "Shared guest manifest across the group",
        "Bulk confirmation and voucher generation",
        "Group-level financial summary",
      ],
    },
    {
      id: "guests",
      title: "Guests",
      description:
        "A searchable guest registry across all bookings. Find returning guests, view their booking history, and track special requests.",
      features: [
        "Search guests by name, passport number, or email",
        "Guest booking history across all stays",
        "Special request and dietary requirement tracking",
        "VIP flag for priority handling",
      ],
    },
    {
      id: "vouchers",
      title: "Vouchers",
      description:
        "Generate and manage hotel service vouchers that guests present on arrival.",
      features: [
        "PDF voucher generation per booking",
        "Voucher includes: hotel details, dates, room type, meal plan, guest names",
        "Voucher number tracking",
        "Bulk voucher generation for groups",
        "Resend voucher by email",
      ],
    },
    {
      id: "hotel-credits",
      title: "Hotel Credits",
      description:
        "Track credit balances with hotel suppliers resulting from overpayments, cancellations, or advance deposits.",
      features: [
        "Credit balance per hotel/supplier",
        "Credit transaction history",
        "Apply credits against future invoices",
        "Credit expiry tracking",
      ],
    },
    {
      id: "daily-operations",
      title: "Daily Operations",
      description:
        "Operational views for managing arrivals, departures, and in-house guests on a daily basis.",
      features: [
        "Daily arrivals dashboard — all check-ins for today",
        "Daily departures dashboard — all check-outs for today",
        "In-house guests report — all currently checked-in guests",
        "Deadline tracker — bookings approaching cancellation deadlines",
        "Room occupancy overview by hotel",
      ],
    },
    {
      id: "reports",
      title: "Reports & Analysis",
      description:
        "Production and financial reports for reservation management and revenue analysis.",
      features: [
        "Booking summary by hotel, date range, or status",
        "Revenue report by hotel and room type",
        "Occupancy analysis",
        "Guest nationality breakdown",
        "Tour operator production report",
        "Finance reconciliation report — bookings vs invoiced amounts",
      ],
    },
  ],
};
