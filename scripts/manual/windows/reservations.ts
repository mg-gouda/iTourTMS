import { first, tab, type ManualWindow } from "./types";

const booking = first("/reservations/bookings/:id", (db) =>
  db.booking.findFirst({ where: { rooms: { some: {} } }, orderBy: { createdAt: "desc" }, select: { id: true } }),
);
const bookingEdit = first("/reservations/bookings/:id/edit", (db) =>
  db.booking.findFirst({ where: { rooms: { some: {} } }, orderBy: { createdAt: "desc" }, select: { id: true } }),
);
const guest = first("/reservations/guests/:id", (db) => db.guest.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
const guestEdit = first("/reservations/guests/:id/edit", (db) => db.guest.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));

const BOOKING_TABS = ["rooms", "payments", "vouchers", "hotel-credits", "timeline", "requests", "communications"];
const REPORT_TABS = [
  "revenue", "occupancy", "arrivals", "arrival-list", "payment-option", "materialization", "pl", "ebd-list",
  "rebooking", "production-to", "cancellation", "no-show", "lead-time", "market-mix",
];

export const reservations: ManualWindow[] = [
  { id: "dashboard", route: "/reservations" },
  { id: "bookings", route: "/reservations/bookings" },
  { id: "booking-new", route: "/reservations/bookings/new" },
  { id: "booking-new-group", route: "/reservations/bookings/new-group" },
  { id: "booking-overview", route: "/reservations/bookings/:id", resolve: booking, setup: tab("overview") },
  ...BOOKING_TABS.map((t) => ({ id: `booking-${t}`, route: "/reservations/bookings/:id", resolve: booking, setup: tab(t) })),
  { id: "booking-edit", route: "/reservations/bookings/:id/edit", resolve: bookingEdit },
  { id: "guests", route: "/reservations/guests" },
  { id: "guest-new", route: "/reservations/guests/new" },
  { id: "guest-detail", route: "/reservations/guests/:id", resolve: guest },
  { id: "guest-edit", route: "/reservations/guests/:id/edit", resolve: guestEdit },
  { id: "operations", route: "/reservations/operations" },
  { id: "deadlines", route: "/reservations/deadlines" },
  { id: "vouchers", route: "/reservations/vouchers" },
  { id: "hotel-credits", route: "/reservations/hotel-credits" },
  ...REPORT_TABS.map((t) => ({ id: `report-${t}`, route: "/reservations/reports", setup: tab(t) })),
];
