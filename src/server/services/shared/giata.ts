/**
 * GIATA Drive API client
 * Docs: https://giatadrive.com/specs
 *
 * API key is stored per-company in Company.giataApiKey (Settings → Integrations → GIATA).
 * All functions accept apiKey as first argument.
 */

const GIATA_BASE_URL = "https://giatadrive.com/api/v1";

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GiataName {
  value: string;
  locale: string;
  isDefault?: boolean;
}

export interface GiataAddress {
  addressLines: string[];
  street?: string;
  streetNum?: string;
  zip?: string;
  cityName?: string;
}

export interface GiataGeoCode {
  latitude: number;
  longitude: number;
  accuracy?: string;
}

export interface GiataImage {
  id: number;
  motifType: string;
  heroImage?: boolean;
  baseName?: string;
  sizes: Record<string, { maxWidth: number; href: string }>;
}

export interface GiataTextSection {
  title: string;
  para: string;
}

export interface GiataText {
  locale: string;
  lastUpdate?: number;
  sections: GiataTextSection[];
}

export interface GiataProperty {
  giataId: number;
  names: GiataName[];
  city?: { giataId: number; names: GiataName[] };
  destination?: { giataId: number; names: GiataName[] };
  country?: { code: string; names: GiataName[] };
  addresses?: GiataAddress[];
  geoCodes?: GiataGeoCode[];
  images?: GiataImage[];
  texts?: Record<string, GiataText>;
  facts?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultName(names: GiataName[]): string {
  return (
    names.find((n) => n.locale === "en" && n.isDefault)?.value ??
    names.find((n) => n.locale === "en")?.value ??
    names.find((n) => n.isDefault)?.value ??
    names[0]?.value ??
    ""
  );
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetch a single property by GIATA ID
 */
export async function getGiataProperty(
  apiKey: string,
  giataId: number,
): Promise<GiataProperty> {
  const res = await fetch(`${GIATA_BASE_URL}/properties/${giataId}`, {
    headers: getHeaders(apiKey),
    next: { revalidate: 3600 },
  });
  if (res.status === 404) {
    throw new Error(
      `GIATA property ${giataId} is not accessible on your account tier. Use the "Link GIATA" search dialog to find a valid property, or upgrade your GIATA Drive plan.`,
    );
  }
  if (!res.ok) {
    throw new Error(`GIATA API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<GiataProperty>;
}

/**
 * Search GIATA by hotel name + optional country ISO-2 code.
 * Returns a lightweight list suitable for a search dialog.
 */
export async function searchGiataByName(
  apiKey: string,
  name: string,
  countryCode?: string,
): Promise<Array<{ giataId: number; name: string; city: string; country: string }>> {
  const url = new URL(`${GIATA_BASE_URL}/properties`);
  url.searchParams.set("name", name);
  if (countryCode) url.searchParams.set("countryCode", countryCode);

  const res = await fetch(url.toString(), { headers: getHeaders(apiKey) });
  if (!res.ok) {
    throw new Error(`GIATA search error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as
    | { urls: string[] }
    | GiataProperty[]
    | { properties: GiataProperty[] };

  // URL-list response — fetch each property in parallel (cap at 20)
  if ("urls" in data && Array.isArray(data.urls)) {
    const urls = data.urls.slice(0, 20);
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const r = await fetch(url, {
            headers: getHeaders(apiKey),
            next: { revalidate: 3600 },
          });
          if (!r.ok) return null;
          const p = (await r.json()) as GiataProperty;
          return {
            giataId: p.giataId,
            name: defaultName(p.names),
            city: p.city ? defaultName(p.city.names) : "",
            country: p.country
              ? (p.country.names.find((n) => n.locale === "en")?.value ?? p.country.code)
              : "",
          };
        } catch {
          return null;
        }
      }),
    );
    return results.filter(Boolean) as Array<{
      giataId: number;
      name: string;
      city: string;
      country: string;
    }>;
  }

  // Direct array or { properties } shape
  const props: GiataProperty[] = Array.isArray(data)
    ? data
    : "properties" in data
      ? data.properties
      : [];

  return props.slice(0, 20).map((p) => ({
    giataId: p.giataId,
    name: defaultName(p.names),
    city: p.city ? defaultName(p.city.names) : "",
    country: p.country
      ? (p.country.names.find((n) => n.locale === "en")?.value ?? p.country.code)
      : "",
  }));
}

// ─── Enrichment helper ────────────────────────────────────────────────────────

export interface GiataEnrichmentData {
  giataId: string;
  name?: string;
  description?: string;
  address?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  images: Array<{ url: string; caption?: string; sortOrder: number }>;
}

/**
 * Fetch a GIATA property and map it to Hotel field updates
 */
export async function enrichFromGiata(
  apiKey: string,
  giataId: number,
): Promise<GiataEnrichmentData> {
  const prop = await getGiataProperty(apiKey, giataId);

  const address = prop.addresses?.[0];
  const geo = prop.geoCodes?.[0];
  const enText =
    prop.texts?.en?.sections?.map((s) => `${s.title}\n${s.para}`).join("\n\n") ??
    prop.texts?.de?.sections?.map((s) => s.para).join("\n\n") ??
    undefined;

  // Images — prefer 800px size
  const images = (prop.images ?? []).slice(0, 30).map((img, i) => ({
    url:
      img.sizes["800"]?.href ??
      img.sizes["320"]?.href ??
      Object.values(img.sizes)[0]?.href ??
      "",
    caption: img.motifType,
    sortOrder: img.heroImage ? 0 : i + 1,
  }));

  return {
    giataId: String(giataId),
    name: defaultName(prop.names) || undefined,
    description: enText,
    address: address
      ? [address.streetNum, address.street].filter(Boolean).join(" ") ||
        address.addressLines?.[0]
      : undefined,
    zipCode: address?.zip,
    latitude: geo?.latitude,
    longitude: geo?.longitude,
    images,
  };
}
