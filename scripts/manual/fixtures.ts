/**
 * Realistic records for the manual's screenshots, so detail windows show a
 * filled-in example rather than an empty state. Local demo database only.
 * Idempotent: fixed ids, upserts. Re-run any time.
 *
 *   npx tsx --env-file=.env scripts/manual/fixtures.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const EMAIL = process.env.MANUAL_EMAIL ?? "dens@local.test";
const day = (n: number) => new Date(Date.now() + n * 86_400_000);
const dateOnly = (n: number) => new Date(day(n).toISOString().slice(0, 10));

async function main() {
  const me = await db.user.findUniqueOrThrow({ where: { email: EMAIL } });
  const companyId = me.companyId!;
  const branch = await db.branch.findFirstOrThrow({ where: { companyId }, orderBy: { createdAt: "asc" } });
  const branchId = branch.id;
  const base = { companyId, branchId };
  const gb = await db.country.findFirst({ where: { code: "GB" } });
  const de = await db.country.findFirst({ where: { code: "DE" } });
  const market = await db.market.findFirst({ where: { companyId, active: true }, orderBy: { name: "asc" } });
  const excursion = await db.crmExcursion.findFirst({ where: { companyId }, orderBy: { createdAt: "asc" } });

  // Sales team covering one market, with the signed-in user as member and leader.
  await db.crmSalesTeam.upsert({
    where: { id: "mnl_team_uk" },
    update: {},
    create: {
      id: "mnl_team_uk",
      ...base,
      name: "UK & Ireland desk",
      leaderId: me.id,
      marketIds: market ? [market.id] : [],
      members: { connect: [{ id: me.id }] },
    },
  });

  const leads = [
    { id: "mnl_lead_1", code: "LD-DEMO1", firstName: "Sarah", lastName: "Mitchell", email: "sarah.mitchell@example.com", phone: "+44 7700 900111", source: "REFERRAL", status: "QUALIFIED", countryId: gb?.id, notes: "Family of four, wants a Red Sea week in February with two day trips." },
    { id: "mnl_lead_2", code: "LD-DEMO2", firstName: "Jonas", lastName: "Becker", email: "jonas.becker@example.de", phone: "+49 151 2345 6789", source: "WEBSITE", status: "CONTACTED", countryId: de?.id, notes: "Asked for a Luxor + Nile cruise combination." },
    { id: "mnl_lead_3", code: "LD-DEMO3", firstName: "Emily", lastName: "Carter", email: "emily.carter@example.com", phone: null, source: "SOCIAL_MEDIA", status: "NEW", countryId: gb?.id, notes: null },
  ] as const;
  for (const l of leads) {
    await db.crmLead.upsert({
      where: { id: l.id },
      update: {},
      create: { ...base, ...l, countryId: l.countryId ?? null, teamId: "mnl_team_uk", assignedToId: me.id, createdById: me.id },
    });
  }
  const acts = [
    { id: "mnl_act_1", leadId: "mnl_lead_1", type: "CALL", subject: "Intro call — dates and budget", completedAt: day(-3) },
    { id: "mnl_act_2", leadId: "mnl_lead_1", type: "EMAIL", subject: "Sent Hurghada hotel options", completedAt: day(-1) },
    { id: "mnl_act_3", leadId: "mnl_lead_1", type: "FOLLOW_UP", subject: "Confirm excursion choices", dueDate: day(2) },
    { id: "mnl_act_4", leadId: "mnl_lead_2", type: "EMAIL", subject: "Cruise availability for March", completedAt: day(-2) },
  ] as const;
  for (const a of acts) {
    await db.crmActivity.upsert({ where: { id: a.id }, update: {}, create: { ...base, ...a, assignedToId: me.id } });
  }

  const customers = [
    { id: "mnl_cust_1", firstName: "Sarah", lastName: "Mitchell", email: "sarah.mitchell@example.com", phone: "+44 7700 900111", nationality: "British", loyaltyTier: "GOLD" },
    { id: "mnl_cust_2", firstName: "Ahmed", lastName: "Hassan", email: "ahmed.hassan@example.com", phone: "+20 100 123 4567", nationality: "Egyptian", loyaltyTier: "STANDARD" },
  ];
  for (const c of customers) await db.crmCustomer.upsert({ where: { id: c.id }, update: {}, create: { companyId, ...c } });

  await db.crmOpportunity.upsert({
    where: { id: "mnl_opp_1" },
    update: {},
    create: {
      ...base,
      id: "mnl_opp_1",
      title: "Mitchell family — February Red Sea package",
      stage: "PROPOSAL",
      value: 4200,
      probability: 60,
      expectedCloseDate: dateOnly(14),
      ownerId: me.id,
      leadId: "mnl_lead_1",
      customerId: "mnl_cust_1",
      notes: "Hotel + two excursions; decision after school holiday dates are confirmed.",
    },
  });
  await db.crmActivity.upsert({
    where: { id: "mnl_act_5" },
    update: {},
    create: { ...base, id: "mnl_act_5", type: "MEETING", subject: "Proposal walkthrough (video call)", opportunityId: "mnl_opp_1", customerId: "mnl_cust_1", dueDate: day(3), assignedToId: me.id },
  });

  if (excursion) {
    await db.crmBooking.upsert({
      where: { id: "mnl_bk_1" },
      update: {},
      create: {
        ...base,
        id: "mnl_bk_1",
        code: "BK-DEMO1",
        travelDate: dateOnly(10),
        status: "CONFIRMED",
        customerId: "mnl_cust_1",
        opportunityId: "mnl_opp_1",
        paxAdults: 2,
        paxChildren: 2,
        totalCost: 180,
        totalSelling: 260,
        currency: "USD",
        notes: "Hotel pickup 07:30, two children aged 8 and 11.",
        bookedById: me.id,
        items: {
          create: [
            { excursionId: excursion.id, label: `${excursion.name} — Adult x2`, quantity: 2, unitCost: 55, unitPrice: 80, totalCost: 110, totalPrice: 160 },
            { excursionId: excursion.id, label: `${excursion.name} — Child x2`, quantity: 2, unitCost: 35, unitPrice: 50, totalCost: 70, totalPrice: 100 },
          ],
        },
      },
    });
    await db.crmActivity.upsert({
      where: { id: "mnl_act_6" },
      update: {},
      create: { ...base, id: "mnl_act_6", type: "NOTE", subject: "Guest asked for a vegetarian lunch", bookingId: "mnl_bk_1", completedAt: day(-1), assignedToId: me.id },
    });
  }

  await db.crmSupplier.upsert({
    where: { id: "mnl_sup_1" },
    update: {},
    create: { companyId, id: "mnl_sup_1", name: "Red Sea Boats Co.", contactName: "Captain Mahmoud", email: "ops@redseaboats.example", phone: "+20 65 344 5566", type: "Boat operator", active: true },
  });

  await db.crmMailing.upsert({
    where: { id: "mnl_mail_1" },
    update: {},
    create: {
      ...base,
      id: "mnl_mail_1",
      name: "Winter Nile offer — UK leads",
      subject: "Your winter on the Nile",
      body: "Dear {{firstName}},\n\nOur winter Nile programme is out: four nights Luxor to Aswan, with Abu Simbel on request.\n\nReply to this email and we'll hold a cabin for you.",
      audience: { target: "leads", statuses: ["QUALIFIED", "CONTACTED"], sources: [], teamId: "mnl_team_uk", minScore: 0, tiers: [] },
      status: "SENT",
      sentAt: day(-2),
      sentCount: 2,
      failedCount: 0,
      createdById: me.id,
      recipients: {
        create: [
          { email: "sarah.mitchell@example.com", name: "Sarah Mitchell", leadId: "mnl_lead_1", status: "SENT", sentAt: day(-2) },
          { email: "jonas.becker@example.de", name: "Jonas Becker", leadId: "mnl_lead_2", status: "SENT", sentAt: day(-2) },
        ],
      },
    },
  });

  // A hotel guest profile for the reservations guest windows.
  await db.guest.upsert({
    where: { id: "mnl_guest_1" },
    update: {},
    create: {
      id: "mnl_guest_1",
      companyId,
      firstName: "Sarah",
      lastName: "Mitchell",
      email: "sarah.mitchell@example.com",
      mobile: "+44 7700 900111",
      nationality: "British",
      passportNo: "533380006",
      passportExpiry: dateOnly(900),
      dateOfBirth: new Date("1984-05-12"),
      gender: "F",
      city: "Manchester",
      countryId: gb?.id,
      isVip: true,
      notes: "Prefers a high floor, sea view. Celebrating a 40th birthday.",
    },
  });

  // A flight and a private-transfer guest booking for the traffic detail windows.
  const hrg = await db.airport.findFirst({ where: { code: "HRG" } });
  const lgw = await db.airport.findFirst({ where: { code: "LGW" } });
  await db.ttTrafficFlight.upsert({
    where: { id: "mnl_flight_1" },
    update: {},
    create: {
      id: "mnl_flight_1",
      ...base,
      flightNumber: "BA2615",
      airlineCode: "BA",
      depAirportId: lgw?.id,
      arrAirportId: hrg?.id,
      depTime: "08:40",
      arrTime: "15:25",
      flightDate: dateOnly(5),
      terminal: "T1",
    },
  });
  const vType = await db.ttVehicleType.findFirst({ where: { companyId }, orderBy: { capacity: "asc" } });
  const usd = await db.currency.findFirst({ where: { code: "USD" } });
  if (vType && usd) {
    await db.ttGuestBooking.upsert({
      where: { id: "mnl_tgb_1" },
      update: {},
      create: {
        id: "mnl_tgb_1",
        ...base,
        code: "GB-MNL-001",
        status: "CONFIRMED",
        vehicleTypeId: vType.id,
        serviceType: "ARR",
        serviceDate: dateOnly(5),
        pickupTime: "15:45",
        pickupAddress: "Hurghada Airport (HRG), Terminal 1",
        dropoffAddress: "Steigenberger Al Dau Beach, Hurghada",
        paxCount: 2,
        guestName: "Sarah Mitchell",
        guestEmail: "sarah.mitchell@example.com",
        guestPhone: "+44 7700 900111",
        currencyId: usd.id,
        quotedPrice: 35,
        paidAmount: 35,
        notes: "Flight BA2615. Child seat not needed.",
      },
    });
  }

  console.log("manual fixtures ready in", branch.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
