import type { HelpModule } from "./types";

export const trafficHelp: HelpModule = {
  slug: "traffic",
  name: "Traffic & Transport",
  icon: "Bus",
  color: "orange",
  description: "Transport jobs, fleet management, drivers, dispatch, reps, and reporting.",
  overview:
    "The Traffic & Transport module manages all ground transportation operations. It handles airport transfers, city-to-city transfers, and excursion transport. Jobs are auto-created from reservation flight data and dispatched to drivers through the dispatch console.",
  sections: [
    {
      id: "traffic-jobs",
      title: "Traffic Jobs",
      description:
        "Traffic jobs represent individual transfer or transport tasks. They are auto-created from hotel booking flight data and can also be created manually.",
      features: [
        "Auto-creation from reservation arrivals (ARR) and departures (DEP)",
        "Job code auto-generated (FT-00001 sequence)",
        "Job types: Airport Transfer, City Transfer, Excursion Transport",
        "Job status: Pending → Assigned → In Progress → Completed / Cancelled",
        "Pickup and drop-off location with time windows",
        "Passenger manifest from booking guests",
        "Cost and revenue tracking per job",
      ],
      steps: [
        { step: 1, title: "View Jobs", description: "Go to Traffic → Operations → Traffic Jobs to see all pending and scheduled jobs." },
        { step: 2, title: "Assign a Driver", description: "Open a job, click Assign Driver, and select from the available drivers and vehicles for the service date." },
        { step: 3, title: "Confirm the Job", description: "Once assigned, the job status moves to Assigned. The driver sees it in their job list." },
        { step: 4, title: "Mark Complete", description: "After the transfer is completed, mark the job as Completed to close it for billing." },
      ],
    },
    {
      id: "dispatch-console",
      title: "Dispatch Console",
      description:
        "A real-time overview of all jobs for a selected date, grouped by time slot and vehicle. Used by the operations team to manage daily dispatch.",
      features: [
        "Date-picker to view any day's job schedule",
        "Jobs grouped by service time and vehicle",
        "Driver and vehicle assignment from the console",
        "Color-coded status indicators (Pending, Assigned, In-Progress)",
        "Quick reassignment for last-minute changes",
        "Print dispatch sheet for driver briefings",
      ],
      steps: [
        { step: 1, title: "Open Dispatch Console", description: "Go to Traffic → Operations → Dispatch Console. Select today's date." },
        { step: 2, title: "Review Jobs", description: "All jobs are displayed in time order. Unassigned jobs are highlighted for action." },
        { step: 3, title: "Assign", description: "Click any unassigned job and select a driver + vehicle. Changes update in real time." },
      ],
    },
    {
      id: "fleet",
      title: "Fleet Management",
      description:
        "Maintain your vehicle fleet and driver profiles to enable job assignment.",
      features: [
        "Vehicle types with capacity and class (sedan, van, bus)",
        "Individual vehicle records with registration and notes",
        "Driver profiles with license details and contact info",
        "Driver availability and assignment history",
      ],
      steps: [
        { step: 1, title: "Add a Vehicle Type", description: "Go to Traffic → Fleet → Vehicle Types. Click New and enter the type name, capacity, and class." },
        { step: 2, title: "Add a Vehicle", description: "Go to Traffic → Fleet → Vehicles. Click New and assign it to a vehicle type with the registration plate." },
        { step: 3, title: "Add a Driver", description: "Go to Traffic → Fleet → Drivers. Create a driver profile with name, license number, and contact details." },
      ],
    },
    {
      id: "reps-guest-bookings",
      title: "Reps & Guest Bookings",
      description:
        "Manage destination representatives (reps) who handle guests on the ground, and track direct guest transport bookings.",
      features: [
        "Rep profiles linked to zones and hotels",
        "Rep assignment to arrivals for welcome meetings",
        "Direct guest transport bookings (ad-hoc transfers)",
        "Rep schedule and job list",
      ],
    },
    {
      id: "configuration",
      title: "Configuration",
      description:
        "Set up the operational geography, pricing, and system settings for the traffic module.",
      features: [
        "Zones — geographic areas for pricing and assignment",
        "Airports — departure and arrival points",
        "Price items — rate cards for transfer types",
        "Supplier prices — contracted rates from transport suppliers",
        "Partner overrides — custom pricing per tour operator",
        "Traffic settings — default behaviors and rules",
      ],
    },
    {
      id: "reports",
      title: "Reports",
      description:
        "Operational and financial reports for the traffic and transport function.",
      features: [
        "Daily Dispatch Report — complete schedule for any date",
        "Job Statistics — volumes by type, status, and zone",
        "Driver Performance — jobs completed, on-time rate",
        "Revenue by Service — income breakdown by transfer type",
      ],
    },
  ],
};
