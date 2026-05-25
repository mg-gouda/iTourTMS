import type { HelpModule } from "./types";

export const nileCruisesHelp: HelpModule = {
  slug: "nile-cruises",
  name: "Nile Cruises",
  icon: "Ship",
  color: "sky",
  description: "Own-fleet and contracted Nile cruise management: boats, cabins, contracts, departures, bookings, manifests, and reports.",
  overview:
    "The Nile Cruises module covers the full operational lifecycle of Nile cruise products — from fleet setup and pricing contracts through departure scheduling, passenger bookings, cabin assignments, payment tracking, and manifests. It supports both own-fleet (Ownership mode) and contracted vessels, with multi-market pricing, gala meal supplements, child policies, cancellation tiers, and embarkation day scheduling.",
  sections: [
    {
      id: "fleet-setup",
      title: "Fleet Setup",
      description:
        "Define your boats, decks, cabin categories, and individual cabins before creating contracts or departures.",
      features: [
        "Boat master with name, code, year built, and flag",
        "Decks linked to each boat with sort order",
        "Cabin categories — suite, deluxe, standard — with capacity and base occupancy",
        "Individual cabins numbered per deck, linked to category",
        "Cruise types (3-night, 4-night, 7-night) with itinerary templates",
        "Itinerary day-by-day port stops and overnight schedule",
      ],
      steps: [
        { step: 1, title: "Add a Boat", description: "Go to Nile Cruises → Fleet → Boats → New Boat. Enter the name, code, and ownership details." },
        { step: 2, title: "Create Decks", description: "Open the boat, go to the Decks tab, and add each deck with a name and sort order." },
        { step: 3, title: "Add Cabin Categories", description: "Under Fleet → Cabin Categories, create the category types (Suite, Deluxe, Standard) linked to the boat." },
        { step: 4, title: "Add Cabins", description: "Under Fleet → Cabins, add individual cabins with number, deck, and category. These are used for cabin assignments at booking." },
      ],
    },
    {
      id: "contracts",
      title: "Contracts",
      description:
        "Set up pricing contracts per boat with seasons, base rates, supplements, offers, child policies, cancellation tiers, and embarkation day flags.",
      features: [
        "Contract code auto-generated (NC-CT-XXXXX sequence)",
        "Status lifecycle: Draft → Posted → Published",
        "Validity date range and base currency",
        "Rate basis: per person per night or per cabin",
        "Inclusion flags: full board, sightseeing, soft drinks, visit fees, transfers, domestic flight",
        "Seasons tab — define named date bands with release day overrides",
        "Base Rates tab — season × cabin category pricing matrix",
        "Supplements tab — cabin category, occupancy, deck, and gala meal surcharges",
        "Special Offers tab — early bird, free nights, long stay, honeymoon discounts",
        "Gala Meals tab — event pricing per departure date, adult and child rates",
        "Child Policies tab — age bands (infant/child/teen), bedding, free flag, discount %",
        "Cancellation tab — tiered penalty schedule linked to a cancellation policy",
        "Embark Days tab — per cruise duration (3/4/7-night) weekday toggle for valid embarkation days",
        "Markup tab — per-market and per-tour-operator markup percentages",
        "PDF tariff sheet and Excel export from the contract header",
        "Clone contract for next season",
      ],
      steps: [
        { step: 1, title: "New Contract", description: "Go to Nile Cruises → Contracts → New Contract. Select the boat, validity dates, ownership mode, and base currency." },
        { step: 2, title: "Add Seasons", description: "Open the Seasons tab. Create named date bands (e.g. High Season, Low Season) with optional release day overrides." },
        { step: 3, title: "Enter Base Rates", description: "Open the Base Rates tab. Fill in the rate matrix — one cell per season × cabin category combination." },
        { step: 4, title: "Set Embark Days", description: "Open the Embark Days tab. For each cruise duration (3/4/7-night), toggle which weekdays this boat embarks on. Used for departure validation and tour-ops quotations." },
        { step: 5, title: "Publish", description: "Click Post then Publish to make the contract active for bookings and tour operations." },
      ],
    },
    {
      id: "departures",
      title: "Departures",
      description:
        "Schedule individual departure instances from a published contract, allocate cabin allotments, and track availability.",
      features: [
        "Departure code auto-generated from the sequence",
        "Linked to a contract — inherits pricing and policies",
        "Embark and disembark dates define the cruise duration",
        "Status: Scheduled → Confirmed → Departed → Cancelled",
        "Allotments tab — per cabin category: freesale, on-request, commitment, or fixed allocation",
        "Allotment counts drive real-time availability checks at booking",
        "Departure patterns for recurring weekly schedules",
      ],
      steps: [
        { step: 1, title: "New Departure", description: "Go to Nile Cruises → Departures → New Departure. Select the contract, embark date, and disembark date." },
        { step: 2, title: "Set Allotments", description: "Open the Allotments tab. Add a row per cabin category with the allocation basis and total cabin count." },
        { step: 3, title: "Confirm Departure", description: "Once the boat is confirmed with the supplier, click Confirm Departure to make it bookable." },
      ],
    },
    {
      id: "bookings",
      title: "Bookings",
      description:
        "Create and manage cruise reservations from inquiry through payment and final manifest.",
      features: [
        "Booking code auto-generated (NC-BK-XXXXX sequence)",
        "Linked to a departure — inherits contract and pricing",
        "Lead guest name, email, and phone",
        "Pax counts: adults, children, infants",
        "Billing type: guest direct, tour operator, or travel agent",
        "Booking source: direct, CRM, tour ops, B2C, B2B, tour operator",
        "Pricing fields: net total, markup %, discounts, gross total, balance due",
        "Gala supplement line item",
        "Status: Provisional → Confirmed → On Board → Completed / Cancelled / No Show",
        "Passengers tab — add each traveller with DOB, nationality, passport, dietary notes",
        "Cabin Assignments tab — assign each passenger to a specific cabin",
        "Payments tab — record payments with method, reference, and running balance",
        "Special Requests tab — log requests and mark as fulfilled or declined",
        "Communications tab — log inbound and outbound messages per channel",
        "Amendments tab — track changes to the booking with reason and timestamp",
        "Voucher generation for the passenger",
      ],
      steps: [
        { step: 1, title: "New Booking", description: "Go to Nile Cruises → Bookings → New Booking. Select the departure — the contract is linked automatically." },
        { step: 2, title: "Enter Guest & Pax", description: "Fill in the lead guest name, pax counts, source, and billing type." },
        { step: 3, title: "Set Pricing", description: "Enter the net total. The system calculates the gross total from markup % and discounts." },
        { step: 4, title: "Add Passengers", description: "Open the Passengers tab. Add each traveller's details for the manifest." },
        { step: 5, title: "Record Payment", description: "Open the Payments tab. Click Record Payment and enter the amount, method, and reference." },
        { step: 6, title: "Assign Cabins", description: "Open the Cabin Assignments tab and assign each passenger to a specific cabin." },
      ],
    },
    {
      id: "manifests",
      title: "Manifests",
      description:
        "Generate, submit, and track official passenger manifests for departure clearance.",
      features: [
        "Auto-populated from confirmed booking passengers",
        "Manifest status: Pending → Submitted → Accepted / Rejected / Amended",
        "Submission method: online portal, email, physical delivery, fax",
        "Submission reference tracking",
        "Rejection reason logging and amendment flow",
        "Linked to the departure for consolidated clearance",
      ],
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      description:
        "Operational and financial reports across boats, departures, and bookings.",
      features: [
        "Departure occupancy report — cabins booked vs allocated per departure",
        "Revenue report — gross, net, and balance due totals by period or boat",
        "Booking source breakdown — direct, B2C, tour ops, etc.",
        "Passenger nationality analysis",
        "Cancellation report — policies applied and penalties collected",
        "Export to Excel for management reporting",
      ],
    },
  ],
};
