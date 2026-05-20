import type { HelpModule } from "./types";

export const contractingHelp: HelpModule = {
  slug: "contracting",
  name: "Contracting",
  icon: "FileText",
  color: "amber",
  description: "Hotel contracts, rates, allotments, stop sales, tariffs, and market management.",
  overview:
    "The Contracting module manages your hotel supplier relationships. You build contracts that define room types, seasonal rate schedules, allotments, meal supplements, special offers, child policies, and marketing contributions. Rates are then used by the Reservations and B2C modules to price bookings accurately.",
  sections: [
    {
      id: "master-data",
      title: "Destinations & Hotels",
      description:
        "Set up the destination hierarchy and hotel master records before creating contracts. Hotels are linked to destinations and markets.",
      features: [
        "Destination management (countries, regions, cities)",
        "Hotel master records with star rating, address, and contact info",
        "Market definitions with country mappings for geo-pricing",
        "Tour operator master records for allotment allocation",
      ],
      steps: [
        { step: 1, title: "Create a Destination", description: "Go to Contracting → Master Data → Destinations. Click New Destination and enter the country, region, and city." },
        { step: 2, title: "Create a Hotel", description: "Go to Contracting → Master Data → Hotels. Click New Hotel, fill in the name, star rating, destination, and contact details." },
        { step: 3, title: "Define Markets", description: "Go to Contracting → Master Data → Markets. Add market definitions (e.g., 'Europe', 'GCC') and map country codes to each market." },
      ],
    },
    {
      id: "contracts",
      title: "Contracts",
      description:
        "A contract is the master agreement with a hotel supplier, containing all rate schedules, policies, and commercial terms for a validity period.",
      features: [
        "Contract header with hotel, validity dates, and currency",
        "Status lifecycle: Draft → Posted → Published",
        "Room types with occupancy and base configurations",
        "Seasonal date bands that control rate applicability",
        "Marketing contributions (flat or percentage)",
        "Hotel notes and special terms sections",
        "PDF and Excel export of the full contract",
      ],
      steps: [
        { step: 1, title: "Create a Contract", description: "Go to Contracting → Contracts → Contracts → New Contract. Select the hotel, set validity dates, and choose the contract currency." },
        { step: 2, title: "Add Room Types", description: "In the Room Types tab, add each room category (e.g., Standard, Superior, Suite) with its max occupancy and base board." },
        { step: 3, title: "Define Seasons", description: "In the Seasons tab, create date bands (e.g., Peak, Mid, Low) that will control rate changes through the year." },
        { step: 4, title: "Enter Rates", description: "In the Base Rates tab, enter the nightly rate per room type for each season." },
        { step: 5, title: "Post the Contract", description: "Click Post to lock rates and make the contract available for allotment and tariff generation." },
        { step: 6, title: "Publish", description: "Click Publish to make the contract visible to the B2C search engine and B2B portal." },
      ],
    },
    {
      id: "rates-seasons",
      title: "Rates & Seasons",
      description:
        "Manage rate supplements, meal plan pricing, child policies, and special offers on top of base room rates.",
      features: [
        "Room type supplements (e.g., sea view, pool view)",
        "Meal plan supplements per season (BB, HB, FB, AI)",
        "Child policy with age bands and percentage reductions",
        "Special offers (Early Bird, Last Minute, Stay & Save)",
        "Special meals pricing (e.g., Christmas gala, wedding package)",
        "Cancellation policy with penalty schedule",
      ],
    },
    {
      id: "allotments",
      title: "Allotments",
      description:
        "Control inventory allocation per room type. Allotments define how many rooms are available per night and can be split between tour operators.",
      features: [
        "Allotment basis: Freesale, On-Request, Commitment, or Allocation",
        "Date-range inventory blocks per room type",
        "Tour operator-specific allocation splits",
        "Release periods for unsold inventory",
        "Real-time availability tracking from bookings",
      ],
    },
    {
      id: "stop-sales",
      title: "Stop Sales",
      description:
        "Block availability on specific dates or room types when inventory must be removed from sale.",
      features: [
        "Date-range stop sale entries per room type",
        "Global stop sale across all room types",
        "Override allotment for complete closure",
        "Visible in the B2C availability calendar",
      ],
    },
    {
      id: "commercial",
      title: "Commercial Rules & Tariffs",
      description:
        "Define markup rules for net-to-retail pricing and generate tariff sheets for distribution to partners.",
      features: [
        "Markup rules: percentage or fixed per destination/hotel",
        "Tariff generation from posted contract rates",
        "Tariff PDF and Excel export for tour operators",
        "Rate comparison tool — compare two contracts side by side",
        "Rate simulator — preview customer-facing price for any date/room/pax combination",
      ],
    },
    {
      id: "reports",
      title: "Reports",
      description:
        "Analytical reports covering contract coverage, allotment utilization, and seasonal pricing analysis.",
      features: [
        "Contract Summary — all active contracts per hotel",
        "Rate Comparison — side-by-side rate analysis",
        "Season Coverage — which hotels have rates for selected dates",
        "Seasonal Offers — active offers by date range",
        "EBD Conditions — early booking discount analysis",
        "Allotment Utilization — booked vs allocated rooms",
      ],
    },
  ],
};
