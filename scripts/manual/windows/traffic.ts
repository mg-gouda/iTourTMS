import { first, tab, type ManualWindow } from "./types";

const latest = (companyId: string) => ({ where: { companyId }, orderBy: { createdAt: "desc" as const }, select: { id: true } });
const job = first("/traffic/jobs/:id", (db, c) => db.ttTrafficJob.findFirst(latest(c)));
const driver = first("/traffic/drivers/:id", (db, c) => db.ttDriver.findFirst(latest(c)));
const rep = first("/traffic/reps/:id", (db, c) => db.ttRep.findFirst(latest(c)));
const vehicle = first("/traffic/vehicles/:id", (db, c) => db.ttVehicle.findFirst(latest(c)));
const flight = first("/traffic/flights/:id", (db, c) => db.ttTrafficFlight.findFirst(latest(c)));
const guestBooking = first("/traffic/guest-bookings/:id", (db, c) => db.ttGuestBooking.findFirst(latest(c)));

export const traffic: ManualWindow[] = [
  { id: "dashboard", route: "/traffic" },
  { id: "jobs", route: "/traffic/jobs" },
  { id: "job-new", route: "/traffic/jobs/new" },
  { id: "job-info", route: "/traffic/jobs/:id", resolve: job, setup: tab("info") },
  { id: "job-assignments", route: "/traffic/jobs/:id", resolve: job, setup: tab("assignments") },
  { id: "job-status-log", route: "/traffic/jobs/:id", resolve: job, setup: tab("status-log") },
  { id: "job-costs", route: "/traffic/jobs/:id", resolve: job, setup: tab("costs") },
  { id: "dispatch", route: "/traffic/dispatch" },
  { id: "flights", route: "/traffic/flights" },
  { id: "flight-new", route: "/traffic/flights/new" },
  { id: "flight-detail", route: "/traffic/flights/:id", resolve: flight },
  { id: "guest-bookings", route: "/traffic/guest-bookings" },
  { id: "guest-booking-new", route: "/traffic/guest-bookings/new" },
  { id: "guest-booking-detail", route: "/traffic/guest-bookings/:id", resolve: guestBooking },
  { id: "vehicles", route: "/traffic/vehicles" },
  { id: "vehicle-new", route: "/traffic/vehicles/new" },
  { id: "vehicle-info", route: "/traffic/vehicles/:id", resolve: vehicle, setup: tab("info") },
  { id: "vehicle-compliance", route: "/traffic/vehicles/:id", resolve: vehicle, setup: tab("compliance") },
  { id: "vehicle-drivers", route: "/traffic/vehicles/:id", resolve: vehicle, setup: tab("drivers"), skip: ["^(?!Back$|Info$|Compliance|Drivers|Delete$)"] },
  { id: "vehicle-types", route: "/traffic/vehicle-types" },
  { id: "drivers", route: "/traffic/drivers" },
  { id: "driver-new", route: "/traffic/drivers/new" },
  { id: "driver-info", route: "/traffic/drivers/:id", resolve: driver, setup: tab("info") },
  { id: "driver-vehicles", route: "/traffic/drivers/:id", resolve: driver, setup: tab("vehicles") },
  { id: "driver-history", route: "/traffic/drivers/:id", resolve: driver, setup: tab("history"), skip: ["^FT-"] },
  { id: "reps", route: "/traffic/reps" },
  { id: "rep-new", route: "/traffic/reps/new" },
  { id: "rep-info", route: "/traffic/reps/:id", resolve: rep, setup: tab("info") },
  { id: "rep-zones", route: "/traffic/reps/:id", resolve: rep, setup: tab("zones") },
  { id: "rep-history", route: "/traffic/reps/:id", resolve: rep, setup: tab("history"), skip: ["^FT-"] },
  { id: "airports", route: "/traffic/airports" },
  { id: "zones", route: "/traffic/zones" },
  { id: "pricing", route: "/traffic/pricing" },
  { id: "supplier-prices", route: "/traffic/supplier-prices" },
  { id: "partner-overrides", route: "/traffic/partner-overrides" },
  { id: "settings", route: "/traffic/settings" },
  { id: "reports", route: "/traffic/reports" },
  { id: "report-daily-dispatch", route: "/traffic/reports/daily-dispatch" },
  { id: "report-driver-performance", route: "/traffic/reports/driver-performance" },
  { id: "report-job-stats", route: "/traffic/reports/job-stats" },
  { id: "report-revenue-by-service", route: "/traffic/reports/revenue-by-service" },
];
