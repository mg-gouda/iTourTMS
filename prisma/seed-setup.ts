/**
 * Full system seed — company, roles, users, finance, contracting, traffic, reservations.
 * Run with: npx tsx prisma/seed-setup.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedFinance, seedContracting } from "./seed";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const MODULES = [
  { name: "finance", displayName: "Finance & Accounting" },
  { name: "contracting", displayName: "Contracting" },
  { name: "crm", displayName: "Excursions" },
  { name: "reservations", displayName: "Reservations" },
  { name: "traffic", displayName: "Traffic & Transport" },
  { name: "b2c-site", displayName: "B2C Website" },
  { name: "b2b-portal", displayName: "B2B Portal" },
];

const SEQUENCES = [
  { code: "invoice", prefix: "INV", padding: 5 },
  { code: "booking", prefix: "BK", padding: 6 },
  { code: "contract", prefix: "CTR", padding: 5 },
  { code: "payment", prefix: "PAY", padding: 5 },
  { code: "voucher", prefix: "VCH", padding: 5 },
  { code: "lead", prefix: "LD", padding: 5 },
  { code: "traffic_job", prefix: "TJ", padding: 5 },
];

async function main() {
  console.log("=== Full System Seed ===\n");

  // ── 1. Countries & currencies ──
  const egypt = await prisma.country.findFirst({ where: { code: "EG" } });
  const uae = await prisma.country.findFirst({ where: { code: "AE" } });
  const uk = await prisma.country.findFirst({ where: { code: "GB" } });
  const germany = await prisma.country.findFirst({ where: { code: "DE" } });
  const russia = await prisma.country.findFirst({ where: { code: "RU" } });
  const egp = await prisma.currency.findFirst({ where: { code: "EGP" } });
  const usd = await prisma.currency.findFirst({ where: { code: "USD" } });
  const eur = await prisma.currency.findFirst({ where: { code: "EUR" } });

  // ── 2. Create company ──
  const company = await prisma.company.upsert({
    where: { id: "seed-company" },
    update: {},
    create: {
      id: "seed-company",
      name: "iTour TMS",
      abbreviation: "IT",
      legalName: "iTour Travel Management Systems",
      countryId: egypt?.id,
      baseCurrencyId: egp?.id,
      fiscalYearStart: 1,
      fiscalYearEnd: 12,
      timezone: "Africa/Cairo",
    },
  });
  const cId = company.id;
  console.log(`  ✓ Company "${company.name}" created`);

  // ── 3. Install all modules ──
  for (const mod of MODULES) {
    await prisma.installedModule.upsert({
      where: { name_companyId: { name: mod.name, companyId: cId } },
      update: {},
      create: { companyId: cId, name: mod.name, displayName: mod.displayName, isInstalled: true, installedAt: new Date() },
    });
  }
  console.log(`  ✓ ${MODULES.length} modules installed`);

  // ── 4. Roles ──
  const superAdminRole = await prisma.role.upsert({
    where: { name_companyId: { name: "super_admin", companyId: cId } },
    update: {},
    create: { companyId: cId, name: "super_admin", displayName: "Super Administrator", description: "Full access to all modules and features", isSystem: true },
  });
  const trafficManagerRole = await prisma.role.upsert({
    where: { name_companyId: { name: "traffic_manager", companyId: cId } },
    update: {},
    create: { companyId: cId, name: "traffic_manager", displayName: "Traffic Manager", description: "Manage transport operations, dispatch, and fleet", isSystem: true },
  });
  const reservationsManagerRole = await prisma.role.upsert({
    where: { name_companyId: { name: "reservations_manager", companyId: cId } },
    update: {},
    create: { companyId: cId, name: "reservations_manager", displayName: "Reservations Manager", description: "Manage bookings, guests, and vouchers", isSystem: true },
  });
  const contractingManagerRole = await prisma.role.upsert({
    where: { name_companyId: { name: "contracting_manager", companyId: cId } },
    update: {},
    create: { companyId: cId, name: "contracting_manager", displayName: "Contracting Manager", description: "Manage hotel contracts, rates, and allotments", isSystem: true },
  });
  // Finance roles are created in seedFinance
  console.log("  ✓ 4 roles created (super_admin, traffic_manager, reservations_manager, contracting_manager)");

  // ── 5. Users ──
  const hashedAdmin = await bcrypt.hash("admin123", 12);
  const hashedUser = await bcrypt.hash("user123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@itour.com" },
    update: {},
    create: { name: "Admin", email: "admin@itour.com", password: hashedAdmin, companyId: cId, emailVerified: new Date() },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: superAdminRole.id },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: "driver@itour.com" },
    update: {},
    create: { name: "Ahmed Hassan", email: "driver@itour.com", password: hashedUser, companyId: cId, emailVerified: new Date() },
  });

  const repUser = await prisma.user.upsert({
    where: { email: "rep@itour.com" },
    update: {},
    create: { name: "Mohamed Ali", email: "rep@itour.com", password: hashedUser, companyId: cId, emailVerified: new Date() },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: repUser.id, roleId: trafficManagerRole.id } },
    update: {},
    create: { userId: repUser.id, roleId: trafficManagerRole.id },
  });

  const resUser = await prisma.user.upsert({
    where: { email: "reservations@itour.com" },
    update: {},
    create: { name: "Sara Ahmed", email: "reservations@itour.com", password: hashedUser, companyId: cId, emailVerified: new Date() },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: resUser.id, roleId: reservationsManagerRole.id } },
    update: {},
    create: { userId: resUser.id, roleId: reservationsManagerRole.id },
  });

  console.log("  ✓ 4 users created (admin, driver, rep, reservations)");

  // ── 6. Sequences ──
  for (const seq of SEQUENCES) {
    await prisma.sequence.upsert({
      where: { companyId_code: { code: seq.code, companyId: cId } },
      update: {},
      create: { companyId: cId, code: seq.code, prefix: seq.prefix, padding: seq.padding },
    });
  }
  console.log(`  ✓ ${SEQUENCES.length} sequences created`);

  // ── 7. Mark setup as complete ──
  await prisma.companySetup.upsert({
    where: { companyId: cId },
    update: {},
    create: { companyId: cId, isComplete: true, currentStep: 4, completedSteps: [1, 2, 3, 4], completedAt: new Date() },
  });
  console.log("  ✓ Setup marked as complete\n");

  // ── 8. Finance & Contracting (existing seeds) ──
  await seedFinance(cId);
  await seedContracting(cId);

  // ══════════════════════════════════════════════════════════════════════════
  // 9. PARTNERS (suppliers, tour operators as Partner records)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n  Seeding partners & tour operators...");

  const supplierPartner = await prisma.partner.create({
    data: { companyId: cId, type: "supplier", isCompany: true, name: "Nile Transport Co.", email: "info@niletransport.com", phone: "+20-2-555-0200", countryId: egypt?.id },
  });

  await prisma.partner.createMany({
    data: [
      { companyId: cId, type: "supplier", isCompany: true, name: "Cairo Limousine Services", email: "booking@cairolimo.com", phone: "+20-2-555-0300", countryId: egypt?.id },
      { companyId: cId, type: "customer", isCompany: true, name: "Sunshine Holidays Ltd", email: "ops@sunshineholidays.co.uk", phone: "+44-20-7946-0958", countryId: uk?.id },
      { companyId: cId, type: "customer", isCompany: true, name: "Reisen GmbH", email: "buchung@reisen.de", phone: "+49-30-1234-5678", countryId: germany?.id },
      { companyId: cId, type: "customer", isCompany: false, name: "Ivan Petrov", email: "ivan.petrov@mail.ru", phone: "+7-495-123-4567", countryId: russia?.id },
    ],
  });
  console.log("    ✓ 5 partners seeded (2 suppliers, 3 customers)");

  // ── Markets ──
  const marketUK = await prisma.market.upsert({
    where: { companyId_code: { companyId: cId, code: "UK" } },
    update: {},
    create: { companyId: cId, name: "United Kingdom", code: "UK", countryIds: uk ? [uk.id] : [] },
  });
  const marketDE = await prisma.market.upsert({
    where: { companyId_code: { companyId: cId, code: "DACH" } },
    update: {},
    create: { companyId: cId, name: "DACH (Germany, Austria, Switzerland)", code: "DACH", countryIds: germany ? [germany.id] : [] },
  });
  const marketRU = await prisma.market.upsert({
    where: { companyId_code: { companyId: cId, code: "RU" } },
    update: {},
    create: { companyId: cId, name: "Russia & CIS", code: "RU", countryIds: russia ? [russia.id] : [] },
  });
  console.log("    ✓ 3 markets seeded (UK, DACH, Russia)");

  // ── Tour Operators ──
  await prisma.tourOperator.createMany({
    data: [
      { companyId: cId, name: "TUI UK", code: "TUI", contactPerson: "John Smith", email: "contracting@tui.co.uk", phone: "+44-1234-567890", countryId: uk?.id, marketId: marketUK.id },
      { companyId: cId, name: "FTI Touristik", code: "FTI", contactPerson: "Hans Müller", email: "einkauf@fti.de", phone: "+49-89-1234-5678", countryId: germany?.id, marketId: marketDE.id },
      { companyId: cId, name: "Anex Tour", code: "ANEX", contactPerson: "Alexei Ivanov", email: "contracts@anextour.ru", phone: "+7-495-987-6543", countryId: russia?.id, marketId: marketRU.id },
    ],
  });
  console.log("    ✓ 3 tour operators seeded (TUI, FTI, Anex)");

  // ══════════════════════════════════════════════════════════════════════════
  // 10. CITIES & ZONES (contracting)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n  Seeding cities & zones...");

  // Get destinations from contracting seed
  const destSSH = await prisma.destination.findFirst({ where: { companyId: cId, code: "SSH" } });
  const destDXB = await prisma.destination.findFirst({ where: { companyId: cId, code: "DXB" } });
  const destAUH = await prisma.destination.findFirst({ where: { companyId: cId, code: "AUH" } });

  const cityMap: Record<string, string> = {};

  if (destSSH) {
    const c1 = await prisma.city.create({ data: { companyId: cId, destinationId: destSSH.id, name: "Sharm El Sheikh", code: "SSH" } });
    cityMap["SSH"] = c1.id;
  }
  if (destDXB) {
    const c2 = await prisma.city.create({ data: { companyId: cId, destinationId: destDXB.id, name: "Dubai City", code: "DXB" } });
    cityMap["DXB"] = c2.id;
  }
  if (destAUH) {
    const c3 = await prisma.city.create({ data: { companyId: cId, destinationId: destAUH.id, name: "Abu Dhabi City", code: "AUH" } });
    cityMap["AUH"] = c3.id;
  }
  console.log(`    ✓ ${Object.keys(cityMap).length} cities seeded`);

  // Contracting zones (hotel zones within cities)
  const ctZones: { cityCode: string; name: string; code: string }[] = [
    { cityCode: "SSH", name: "Naama Bay", code: "A" },
    { cityCode: "SSH", name: "Hadaba", code: "B" },
    { cityCode: "SSH", name: "Nabq Bay", code: "C" },
    { cityCode: "SSH", name: "Sharks Bay", code: "D" },
    { cityCode: "SSH", name: "Ras Um El Sid", code: "E" },
    { cityCode: "DXB", name: "Jumeirah Beach", code: "A" },
    { cityCode: "DXB", name: "Downtown Dubai", code: "B" },
    { cityCode: "DXB", name: "Dubai Marina", code: "C" },
    { cityCode: "DXB", name: "Deira", code: "D" },
    { cityCode: "AUH", name: "Corniche", code: "A" },
    { cityCode: "AUH", name: "Saadiyat Island", code: "B" },
    { cityCode: "AUH", name: "Yas Island", code: "C" },
  ];

  for (const z of ctZones) {
    const cityId = cityMap[z.cityCode];
    if (cityId) {
      await prisma.zone.upsert({
        where: { companyId_cityId_code: { companyId: cId, cityId, code: z.code } },
        update: {},
        create: { companyId: cId, cityId, name: z.name, code: z.code },
      });
    }
  }
  console.log(`    ✓ ${ctZones.length} contracting zones seeded`);

  // ══════════════════════════════════════════════════════════════════════════
  // 11. TRAFFIC MODULE
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n  Seeding traffic module...");

  // ── Traffic Zones ──
  const ttZoneMap: Record<string, string> = {};
  const ttZones = [
    { cityCode: "SSH", name: "Naama Bay Zone", code: "NB" },
    { cityCode: "SSH", name: "Hadaba Zone", code: "HD" },
    { cityCode: "SSH", name: "Nabq Bay Zone", code: "NQ" },
    { cityCode: "SSH", name: "Sharks Bay Zone", code: "SB" },
    { cityCode: "SSH", name: "Airport Zone", code: "APT" },
    { cityCode: "DXB", name: "Jumeirah Zone", code: "JUM" },
    { cityCode: "DXB", name: "Downtown Zone", code: "DT" },
    { cityCode: "DXB", name: "Marina Zone", code: "MAR" },
    { cityCode: "DXB", name: "Airport Zone", code: "APT" },
    { cityCode: "AUH", name: "City Centre Zone", code: "CC" },
    { cityCode: "AUH", name: "Saadiyat Zone", code: "SAD" },
    { cityCode: "AUH", name: "Yas Zone", code: "YAS" },
    { cityCode: "AUH", name: "Airport Zone", code: "APT" },
  ];

  for (const z of ttZones) {
    const cityId = cityMap[z.cityCode];
    if (cityId) {
      const created = await prisma.ttZone.upsert({
        where: { companyId_cityId_code: { companyId: cId, cityId, code: z.code } },
        update: {},
        create: { companyId: cId, cityId, name: z.name, code: z.code },
      });
      ttZoneMap[`${z.cityCode}-${z.code}`] = created.id;
    }
  }
  console.log(`    ✓ ${ttZones.length} traffic zones seeded`);

  // ── Vehicle Types ──
  const vtData = [
    { name: "Sedan", code: "SED", capacity: 3, luggageCapacity: 3, sortOrder: 1 },
    { name: "Minivan", code: "VAN", capacity: 6, luggageCapacity: 6, sortOrder: 2 },
    { name: "Minibus", code: "MBUS", capacity: 14, luggageCapacity: 14, sortOrder: 3 },
    { name: "Coaster Bus", code: "COAST", capacity: 28, luggageCapacity: 28, sortOrder: 4 },
    { name: "Full-Size Bus", code: "BUS", capacity: 50, luggageCapacity: 50, sortOrder: 5 },
  ];
  const vtMap: Record<string, string> = {};
  for (const vt of vtData) {
    const created = await prisma.ttVehicleType.upsert({
      where: { companyId_code: { companyId: cId, code: vt.code } },
      update: {},
      create: { companyId: cId, ...vt },
    });
    vtMap[vt.code] = created.id;
  }
  console.log(`    ✓ ${vtData.length} vehicle types seeded`);

  // ── Vehicles ──
  const vehiclesData = [
    { typeCode: "SED", plateNumber: "SSH-1234", make: "Toyota", model: "Camry", year: 2024, color: "White" },
    { typeCode: "VAN", plateNumber: "SSH-5678", make: "Toyota", model: "HiAce", year: 2023, color: "Silver" },
    { typeCode: "MBUS", plateNumber: "SSH-9012", make: "Mercedes", model: "Sprinter", year: 2023, color: "White" },
    { typeCode: "COAST", plateNumber: "SSH-3456", make: "Toyota", model: "Coaster", year: 2022, color: "White" },
    { typeCode: "BUS", plateNumber: "CAI-7890", make: "Mercedes", model: "Tourismo", year: 2024, color: "Blue" },
  ];
  for (const v of vehiclesData) {
    await prisma.ttVehicle.upsert({
      where: { companyId_plateNumber: { companyId: cId, plateNumber: v.plateNumber } },
      update: {},
      create: {
        companyId: cId,
        vehicleTypeId: vtMap[v.typeCode],
        supplierId: v.typeCode === "BUS" ? supplierPartner.id : null,
        plateNumber: v.plateNumber,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        ownership: v.typeCode === "BUS" ? "CONTRACTED" : "OWNED",
      },
    });
  }
  console.log(`    ✓ ${vehiclesData.length} vehicles seeded`);

  // ── Driver ──
  const driver = await prisma.ttDriver.create({
    data: {
      companyId: cId,
      userId: driverUser.id,
      licenseNumber: "EG-DL-2024-001",
      licenseExpiry: new Date("2027-06-30"),
      phone: "+20-100-555-0001",
      status: "ACTIVE",
    },
  });
  // Assign primary vehicle to driver
  const sedan = await prisma.ttVehicle.findFirst({ where: { companyId: cId, plateNumber: "SSH-1234" } });
  if (sedan) {
    await prisma.ttDriverVehicle.create({
      data: { companyId: cId, driverId: driver.id, vehicleId: sedan.id, isPrimary: true },
    });
  }
  console.log("    ✓ 1 driver seeded with vehicle assignment");

  // ── Rep ──
  const rep = await prisma.ttRep.create({
    data: {
      companyId: cId,
      userId: repUser.id,
      phone: "+20-100-555-0002",
    },
  });
  // Assign rep to zones
  const repZoneKeys = ["SSH-NB", "SSH-HD", "SSH-NQ", "SSH-SB", "SSH-APT"];
  for (const key of repZoneKeys) {
    const zoneId = ttZoneMap[key];
    if (zoneId) {
      await prisma.ttRepZone.create({
        data: { companyId: cId, repId: rep.id, zoneId },
      });
    }
  }
  console.log("    ✓ 1 rep seeded with zone assignments");

  // ── Price Items (sample routes) ──
  if (usd) {
    const priceRoutes = [
      { from: "SSH-APT", to: "SSH-NB", typeCode: "SED", price: 25, serviceType: "ARR" },
      { from: "SSH-APT", to: "SSH-NB", typeCode: "VAN", price: 35, serviceType: "ARR" },
      { from: "SSH-APT", to: "SSH-NB", typeCode: "MBUS", price: 60, serviceType: "ARR" },
      { from: "SSH-APT", to: "SSH-HD", typeCode: "SED", price: 30, serviceType: "ARR" },
      { from: "SSH-APT", to: "SSH-HD", typeCode: "VAN", price: 40, serviceType: "ARR" },
      { from: "SSH-APT", to: "SSH-NQ", typeCode: "SED", price: 35, serviceType: "ARR" },
      { from: "SSH-APT", to: "SSH-NQ", typeCode: "VAN", price: 50, serviceType: "ARR" },
      { from: "SSH-NB", to: "SSH-APT", typeCode: "SED", price: 25, serviceType: "DEP" },
      { from: "SSH-NB", to: "SSH-APT", typeCode: "VAN", price: 35, serviceType: "DEP" },
      { from: "SSH-HD", to: "SSH-APT", typeCode: "SED", price: 30, serviceType: "DEP" },
    ];

    for (const r of priceRoutes) {
      const fromZoneId = ttZoneMap[r.from];
      const toZoneId = ttZoneMap[r.to];
      if (fromZoneId && toZoneId) {
        await prisma.ttPriceItem.create({
          data: {
            companyId: cId,
            vehicleTypeId: vtMap[r.typeCode],
            fromZoneId,
            toZoneId,
            priceType: "PER_VEHICLE",
            price: r.price,
            currencyId: usd.id,
            serviceType: r.serviceType as any,
          },
        });
      }
    }
    console.log(`    ✓ ${priceRoutes.length} price items seeded`);
  }

  // ── Sample Traffic Flights ──
  const sshAirport = await prisma.airport.findFirst({ where: { code: "SSH" } });
  const caiAirport = await prisma.airport.findFirst({ where: { code: "CAI" } });
  const lgwAirport = await prisma.airport.findFirst({ where: { code: "LGW" } });
  const svoAirport = await prisma.airport.findFirst({ where: { code: "SVO" } });

  const flightData = [
    { flightNumber: "MS741", airlineCode: "MS", arrAirportId: sshAirport?.id, depAirportId: caiAirport?.id, arrTime: "10:30", depTime: "09:15", flightDate: new Date("2026-03-15"), terminal: "T1" },
    { flightNumber: "MS742", airlineCode: "MS", arrAirportId: caiAirport?.id, depAirportId: sshAirport?.id, arrTime: "14:00", depTime: "12:45", flightDate: new Date("2026-03-22"), terminal: "T1" },
    { flightNumber: "BA2197", airlineCode: "BA", arrAirportId: sshAirport?.id, depAirportId: lgwAirport?.id, arrTime: "15:45", depTime: "09:30", flightDate: new Date("2026-03-15"), terminal: "T1" },
    { flightNumber: "BA2198", airlineCode: "BA", arrAirportId: lgwAirport?.id, depAirportId: sshAirport?.id, arrTime: "14:30", depTime: "11:00", flightDate: new Date("2026-03-22"), terminal: "T1" },
    { flightNumber: "SU590", airlineCode: "SU", arrAirportId: sshAirport?.id, depAirportId: svoAirport?.id, arrTime: "13:00", depTime: "08:00", flightDate: new Date("2026-03-16"), terminal: "T1" },
    { flightNumber: "SU591", airlineCode: "SU", arrAirportId: svoAirport?.id, depAirportId: sshAirport?.id, arrTime: "18:00", depTime: "15:30", flightDate: new Date("2026-03-23"), terminal: "T1" },
    { flightNumber: "MS743", airlineCode: "MS", arrAirportId: sshAirport?.id, depAirportId: caiAirport?.id, arrTime: "18:00", depTime: "16:45", flightDate: new Date("2026-03-16"), terminal: "T1" },
    { flightNumber: "MS744", airlineCode: "MS", arrAirportId: caiAirport?.id, depAirportId: sshAirport?.id, arrTime: "22:00", depTime: "20:45", flightDate: new Date("2026-03-23"), terminal: "T1" },
    { flightNumber: "XQ581", airlineCode: "XQ", arrAirportId: sshAirport?.id, depAirportId: null, arrTime: "11:15", depTime: "06:00", flightDate: new Date("2026-03-17"), terminal: "T2" },
    { flightNumber: "XQ582", airlineCode: "XQ", arrAirportId: null, depAirportId: sshAirport?.id, arrTime: "16:00", depTime: "13:30", flightDate: new Date("2026-03-24"), terminal: "T2" },
  ];

  const flightMap: Record<string, string> = {};
  for (const f of flightData) {
    if (f.arrAirportId || f.depAirportId) {
      const created = await prisma.ttTrafficFlight.create({
        data: { companyId: cId, ...f } as any,
      });
      flightMap[`${f.flightNumber}-${f.flightDate.toISOString().slice(0, 10)}`] = created.id;
    }
  }
  console.log(`    ✓ ${Object.keys(flightMap).length} traffic flights seeded`);

  // ── Sample Traffic Jobs ──
  const naamaZone = ttZoneMap["SSH-NB"];
  const hadabaZone = ttZoneMap["SSH-HD"];
  const nabqZone = ttZoneMap["SSH-NQ"];

  if (naamaZone && sshAirport && usd) {
    const jobsData = [
      {
        code: "TJ-00001",
        serviceType: "ARR",
        status: "PENDING",
        vehicleTypeId: vtMap["SED"],
        serviceDate: new Date("2026-03-15"),
        pickupTime: "10:30",
        pickupAirportId: sshAirport.id,
        dropoffAddress: "Grand Seaside Resort, Naama Bay",
        zoneId: naamaZone,
        paxCount: 2,
        leadPassenger: "John Smith",
        passengerPhone: "+44-7700-900123",
        flightId: flightMap["BA2197-2026-03-15"],
        price: 25,
        currencyId: usd.id,
      },
      {
        code: "TJ-00002",
        serviceType: "ARR",
        status: "CONFIRMED",
        vehicleTypeId: vtMap["VAN"],
        serviceDate: new Date("2026-03-15"),
        pickupTime: "10:30",
        pickupAirportId: sshAirport.id,
        dropoffAddress: "Stella Di Mare, Naama Bay",
        zoneId: naamaZone,
        paxCount: 5,
        leadPassenger: "Hans Müller",
        passengerPhone: "+49-170-1234567",
        flightId: flightMap["MS741-2026-03-15"],
        price: 35,
        currencyId: usd.id,
      },
      {
        code: "TJ-00003",
        serviceType: "ARR",
        status: "PENDING",
        vehicleTypeId: vtMap["SED"],
        serviceDate: new Date("2026-03-16"),
        pickupTime: "13:00",
        pickupAirportId: sshAirport.id,
        dropoffAddress: "Rixos Seagate, Nabq Bay",
        zoneId: nabqZone,
        paxCount: 2,
        leadPassenger: "Alexei Ivanov",
        passengerPhone: "+7-915-123-4567",
        flightId: flightMap["SU590-2026-03-16"],
        price: 35,
        currencyId: usd.id,
      },
      {
        code: "TJ-00004",
        serviceType: "DEP",
        status: "PENDING",
        vehicleTypeId: vtMap["SED"],
        serviceDate: new Date("2026-03-22"),
        pickupTime: "09:00",
        pickupAddress: "Grand Seaside Resort, Naama Bay",
        dropoffAirportId: sshAirport.id,
        zoneId: naamaZone,
        paxCount: 2,
        leadPassenger: "John Smith",
        passengerPhone: "+44-7700-900123",
        flightId: flightMap["BA2198-2026-03-22"],
        price: 25,
        currencyId: usd.id,
      },
      {
        code: "TJ-00005",
        serviceType: "ARR",
        status: "PENDING",
        vehicleTypeId: vtMap["MBUS"],
        serviceDate: new Date("2026-03-17"),
        pickupTime: "11:15",
        pickupAirportId: sshAirport.id,
        dropoffAddress: "Sunrise Arabian Resort, Hadaba",
        zoneId: hadabaZone,
        paxCount: 12,
        leadPassenger: "Group Leader",
        flightId: flightMap["XQ581-2026-03-17"],
        price: 60,
        currencyId: usd.id,
      },
    ];

    for (const job of jobsData) {
      await prisma.ttTrafficJob.create({
        data: { companyId: cId, createdById: adminUser.id, ...job } as any,
      });
    }
    console.log(`    ✓ ${jobsData.length} traffic jobs seeded`);
  }

  // ── Traffic Permissions ──
  const trafficPermissions = [
    { code: "traffic:zone:read", module: "traffic", resource: "zone", action: "read", displayName: "View Zones" },
    { code: "traffic:zone:create", module: "traffic", resource: "zone", action: "create", displayName: "Create Zones" },
    { code: "traffic:zone:update", module: "traffic", resource: "zone", action: "update", displayName: "Update Zones" },
    { code: "traffic:zone:delete", module: "traffic", resource: "zone", action: "delete", displayName: "Delete Zones" },
    { code: "traffic:vehicle:read", module: "traffic", resource: "vehicle", action: "read", displayName: "View Vehicles" },
    { code: "traffic:vehicle:create", module: "traffic", resource: "vehicle", action: "create", displayName: "Create Vehicles" },
    { code: "traffic:vehicle:update", module: "traffic", resource: "vehicle", action: "update", displayName: "Update Vehicles" },
    { code: "traffic:vehicle:delete", module: "traffic", resource: "vehicle", action: "delete", displayName: "Delete Vehicles" },
    { code: "traffic:driver:read", module: "traffic", resource: "driver", action: "read", displayName: "View Drivers" },
    { code: "traffic:driver:create", module: "traffic", resource: "driver", action: "create", displayName: "Create Drivers" },
    { code: "traffic:driver:update", module: "traffic", resource: "driver", action: "update", displayName: "Update Drivers" },
    { code: "traffic:job:read", module: "traffic", resource: "job", action: "read", displayName: "View Traffic Jobs" },
    { code: "traffic:job:create", module: "traffic", resource: "job", action: "create", displayName: "Create Traffic Jobs" },
    { code: "traffic:job:update", module: "traffic", resource: "job", action: "update", displayName: "Update Traffic Jobs" },
    { code: "traffic:job:assign", module: "traffic", resource: "job", action: "assign", displayName: "Assign Traffic Jobs" },
    { code: "traffic:job:dispatch", module: "traffic", resource: "job", action: "dispatch", displayName: "Dispatch Traffic Jobs" },
    { code: "traffic:rep:read", module: "traffic", resource: "rep", action: "read", displayName: "View Reps" },
    { code: "traffic:rep:create", module: "traffic", resource: "rep", action: "create", displayName: "Create Reps" },
    { code: "traffic:rep:update", module: "traffic", resource: "rep", action: "update", displayName: "Update Reps" },
    { code: "traffic:flight:read", module: "traffic", resource: "flight", action: "read", displayName: "View Flights" },
    { code: "traffic:flight:create", module: "traffic", resource: "flight", action: "create", displayName: "Create Flights" },
    { code: "traffic:flight:update", module: "traffic", resource: "flight", action: "update", displayName: "Update Flights" },
    { code: "traffic:price:read", module: "traffic", resource: "price", action: "read", displayName: "View Price List" },
    { code: "traffic:price:manage", module: "traffic", resource: "price", action: "manage", displayName: "Manage Prices" },
    { code: "traffic:settings:manage", module: "traffic", resource: "settings", action: "manage", displayName: "Manage Traffic Settings" },
  ];

  for (const perm of trafficPermissions) {
    await prisma.permission.upsert({ where: { code: perm.code }, update: {}, create: perm });
  }

  // Assign all traffic perms to traffic_manager role
  const allTrafficPerms = await prisma.permission.findMany({ where: { module: "traffic" } });
  for (const perm of allTrafficPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: trafficManagerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: trafficManagerRole.id, permissionId: perm.id },
    });
  }
  console.log(`    ✓ ${trafficPermissions.length} traffic permissions seeded & assigned`);

  // ── Reservations & Contracting Permissions ──
  const resPermissions = [
    { code: "reservations:booking:read", module: "reservations", resource: "booking", action: "read", displayName: "View Bookings" },
    { code: "reservations:booking:create", module: "reservations", resource: "booking", action: "create", displayName: "Create Bookings" },
    { code: "reservations:booking:update", module: "reservations", resource: "booking", action: "update", displayName: "Update Bookings" },
    { code: "reservations:booking:cancel", module: "reservations", resource: "booking", action: "cancel", displayName: "Cancel Bookings" },
    { code: "reservations:booking:confirm", module: "reservations", resource: "booking", action: "confirm", displayName: "Confirm Bookings" },
    { code: "reservations:guest:read", module: "reservations", resource: "guest", action: "read", displayName: "View Guests" },
    { code: "reservations:guest:create", module: "reservations", resource: "guest", action: "create", displayName: "Create Guests" },
    { code: "reservations:guest:update", module: "reservations", resource: "guest", action: "update", displayName: "Update Guests" },
    { code: "reservations:voucher:read", module: "reservations", resource: "voucher", action: "read", displayName: "View Vouchers" },
    { code: "reservations:voucher:create", module: "reservations", resource: "voucher", action: "create", displayName: "Create Vouchers" },
    { code: "contracting:hotel:read", module: "contracting", resource: "hotel", action: "read", displayName: "View Hotels" },
    { code: "contracting:hotel:create", module: "contracting", resource: "hotel", action: "create", displayName: "Create Hotels" },
    { code: "contracting:hotel:update", module: "contracting", resource: "hotel", action: "update", displayName: "Update Hotels" },
    { code: "contracting:contract:read", module: "contracting", resource: "contract", action: "read", displayName: "View Contracts" },
    { code: "contracting:contract:create", module: "contracting", resource: "contract", action: "create", displayName: "Create Contracts" },
    { code: "contracting:contract:update", module: "contracting", resource: "contract", action: "update", displayName: "Update Contracts" },
    { code: "contracting:contract:publish", module: "contracting", resource: "contract", action: "publish", displayName: "Publish Contracts" },
    { code: "contracting:market:read", module: "contracting", resource: "market", action: "read", displayName: "View Markets" },
    { code: "contracting:market:manage", module: "contracting", resource: "market", action: "manage", displayName: "Manage Markets" },
  ];

  for (const perm of resPermissions) {
    await prisma.permission.upsert({ where: { code: perm.code }, update: {}, create: perm });
  }

  // Assign res perms to reservations_manager
  const allResPerms = await prisma.permission.findMany({ where: { module: "reservations" } });
  for (const perm of allResPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: reservationsManagerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: reservationsManagerRole.id, permissionId: perm.id },
    });
  }

  // Assign contracting perms to contracting_manager
  const allContractingPerms = await prisma.permission.findMany({ where: { module: "contracting" } });
  for (const perm of allContractingPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: contractingManagerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: contractingManagerRole.id, permissionId: perm.id },
    });
  }

  // Assign ALL permissions to super_admin
  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }
  console.log(`    ✓ ${resPermissions.length} reservations & contracting permissions seeded & assigned`);
  console.log(`    ✓ ${allPerms.length} total permissions assigned to super_admin`);

  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n=== Full System Seed Complete ===");
  console.log("\nUsers:");
  console.log("  admin@itour.com / admin123  (Super Admin)");
  console.log("  driver@itour.com / user123  (Driver)");
  console.log("  rep@itour.com / user123     (Traffic Rep)");
  console.log("  reservations@itour.com / user123 (Reservations Manager)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
