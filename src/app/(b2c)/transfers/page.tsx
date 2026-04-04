import { Bus, Plane, Users } from "lucide-react";

import { getCompanyInfo } from "@/lib/b2c/get-branding";
import { db } from "@/server/db";
import { TransferBookingForm } from "@/components/b2c/transfer-booking-form";

export const metadata = { title: "Airport Transfers" };

export default async function TransfersPage() {
  const company = await getCompanyInfo();
  if (!company)
    return <div className="pub-section pub-container">Not configured</div>;

  // Fetch available vehicle types and airports
  const [vehicleTypes, airports] = await Promise.all([
    db.ttVehicleType.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { capacity: "asc" },
    }),
    db.airport.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 20,
    }),
  ]);

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Airport Transfers
        </h1>
        <p className="mb-8 text-[var(--pub-muted-foreground)]">
          Reliable airport pickup and drop-off services
        </p>

        {/* Booking Form */}
        <div className="mb-10">
          <TransferBookingForm
            airports={airports.map((a) => ({ id: a.id, name: a.name, code: a.code }))}
            vehicleTypes={vehicleTypes.map((v) => ({ id: v.id, name: v.name, capacity: v.capacity }))}
          />
        </div>

        {/* Vehicle Types */}
        {vehicleTypes.length > 0 && (
          <div className="mb-10">
            <h2
              className="mb-6 text-2xl font-bold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Our Vehicles
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicleTypes.map((vt) => (
                <div
                  key={vt.id}
                  className="pub-card flex items-start gap-4 p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--pub-primary)]/10">
                    <Bus className="h-6 w-6 text-[var(--pub-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{vt.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-[var(--pub-muted-foreground)]">
                      <Users className="h-3.5 w-3.5" />
                      Up to {vt.capacity} passengers
                    </p>
                    {vt.description && (
                      <p className="mt-1 text-xs text-[var(--pub-muted-foreground)]">
                        {vt.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Airports Served */}
        {airports.length > 0 && (
          <div>
            <h2
              className="mb-6 text-2xl font-bold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Airports We Serve
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {airports.map((apt) => (
                <div
                  key={apt.id}
                  className="pub-card flex items-center gap-3 p-4"
                >
                  <Plane className="h-5 w-5 shrink-0 text-[var(--pub-accent)]" />
                  <div>
                    <p className="font-medium">{apt.name}</p>
                    <p className="text-xs font-mono text-[var(--pub-muted-foreground)]">
                      {apt.code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
