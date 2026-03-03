import { db } from "@/server/db";

export async function getB2cDestinations(companyId: string) {
  return db.destination.findMany({
    where: { companyId, active: true },
    include: {
      country: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          hotels: { where: { publicVisible: true, active: true } },
        },
      },
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
}

export async function getB2cDestinationById(companyId: string, destinationId: string) {
  const destination = await db.destination.findFirst({
    where: { id: destinationId, companyId, active: true },
    include: {
      country: { select: { id: true, name: true, code: true } },
    },
  });

  if (!destination) return null;

  const hotels = await db.hotel.findMany({
    where: { companyId, destinationId, publicVisible: true, active: true },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      amenities: { select: { name: true }, take: 4 },
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  return { ...destination, hotels };
}
