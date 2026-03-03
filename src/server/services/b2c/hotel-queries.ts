import { db } from "@/server/db";

export interface B2cHotelFilters {
  companyId: string;
  destinationId?: string;
  starRating?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getB2cHotels(filters: B2cHotelFilters) {
  const { companyId, destinationId, starRating, search, page = 1, pageSize = 12 } = filters;

  const where = {
    companyId,
    publicVisible: true,
    active: true,
    ...(destinationId ? { destinationId } : {}),
    ...(starRating ? { starRating: starRating as any } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [hotels, total] = await Promise.all([
    db.hotel.findMany({
      where,
      include: {
        destination: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        images: { where: { isPrimary: true }, take: 1 },
        amenities: { select: { id: true, name: true, icon: true }, take: 6 },
        _count: { select: { roomTypes: true } },
      },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.hotel.count({ where }),
  ]);

  return { hotels, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getB2cHotelById(companyId: string, hotelId: string) {
  return db.hotel.findFirst({
    where: { id: hotelId, companyId, publicVisible: true, active: true },
    include: {
      destination: { select: { id: true, name: true } },
      country: { select: { id: true, name: true, code: true } },
      state: { select: { name: true } },
      cityRel: { select: { name: true } },
      zone: { select: { name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      amenities: { select: { id: true, name: true, icon: true, category: true } },
      roomTypes: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          maxAdults: true,
          maxChildren: true,
          maxOccupancy: true,
        },
      },
      mealBasis: {
        select: { mealCode: true },
      },
    },
  });
}
