import { Coordinates } from "@/types";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export interface RealStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface OverpassTags {
  name?: string;
  brand?: string;
  operator?: string;
  "addr:housenumber"?: string;
  "addr:street"?: string;
  "addr:city"?: string;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OverpassTags;
}

function buildQuery(center: Coordinates, radiusMeters: number): string {
  const { latitude, longitude } = center;
  return `[out:json][timeout:20];(node["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude});way["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude}););out center tags;`;
}

function toAddress(tags: OverpassTags): string {
  const houseNumber = tags["addr:housenumber"];
  const street = tags["addr:street"];
  if (houseNumber && street) return `${houseNumber} ${street}`;
  if (street) return street;
  const city = tags["addr:city"];
  return city ?? "Address unavailable";
}

function toDisplayName(tags: OverpassTags, fallbackIndex: number): { name: string; brand: string } {
  const brand = tags.brand ?? tags.operator ?? "Gas Station";
  if (tags.name) return { name: tags.name, brand };
  if (tags.brand) return { name: `${tags.brand} #${fallbackIndex}`, brand: tags.brand };
  return { name: `${brand} #${fallbackIndex}`, brand };
}

async function queryEndpoint(url: string, query: string, timeoutMs: number): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass request failed: ${response.status}`);
    }

    const json = await response.json();
    const elements: OverpassElement[] = json?.elements ?? [];
    if (!Array.isArray(elements)) {
      throw new Error("Overpass response had no elements");
    }
    return elements;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Real gas station locations (name/brand/address/coordinates) near `center`,
 * sourced from OpenStreetMap — free, no API key, no per-station price data
 * (nothing free publishes that; see stationProvider.ts for how prices are
 * simulated on top of these real locations).
 */
export async function fetchNearbyRealStations(
  center: Coordinates,
  radiusMeters = 8000
): Promise<RealStation[]> {
  const query = buildQuery(center, radiusMeters);
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const elements = await queryEndpoint(endpoint, query, 12000);

      const stations = elements
        .map((el, index) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (lat === undefined || lon === undefined) return null;

          const tags = el.tags ?? {};
          const { name, brand } = toDisplayName(tags, index + 1);

          return {
            id: `osm-${el.id}`,
            name,
            brand,
            address: toAddress(tags),
            latitude: lat,
            longitude: lon,
          };
        })
        .filter((s): s is RealStation => s !== null);

      if (stations.length > 0) return stations;
      throw new Error("Overpass returned zero usable stations");
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Overpass endpoints failed");
}
