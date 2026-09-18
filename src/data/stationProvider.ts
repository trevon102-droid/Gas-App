import { fetchLatestRegionalPrice, resolveRegion, RegionalContext } from "@/data/eia";
import { Coordinates, FuelType, Station } from "@/types";

const DEFAULT_REGULAR_BASE_PRICE = 3.15;

/**
 * StationProvider is the seam for real price data. `mockStationProvider`
 * below generates plausible stations around the user so the app is usable
 * out of the box; swap it for a real API (e.g. GasBuddy/CollectAPI/RapidAPI
 * gas-price feeds) by implementing the same interface.
 */
export interface StationProvider {
  getStationsNear(center: Coordinates): Promise<Station[]>;
}

const BRANDS = [
  "Shell",
  "Chevron",
  "Costco",
  "Circle K",
  "Speedway",
  "Sunoco",
  "Marathon",
  "76",
  "Exxon",
  "Valero",
];

const FUEL_TYPES: FuelType[] = ["regular", "midgrade", "premium", "diesel"];

// Deterministic pseudo-random generator so re-renders don't jitter prices.
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function milesToLatDegrees(miles: number): number {
  return miles / 69;
}

function milesToLonDegrees(miles: number, atLatitude: number): number {
  return miles / (69 * Math.cos((atLatitude * Math.PI) / 180));
}

export function generateMockStations(
  center: Coordinates,
  count = 14,
  regularBasePrice: number = DEFAULT_REGULAR_BASE_PRICE
): Station[] {
  const stations: Station[] = [];

  for (let i = 0; i < count; i++) {
    const rand = seededRandom(i * 7919 + 13);
    const distanceMiles = 0.3 + rand() * 6;
    const bearing = rand() * 2 * Math.PI;

    const latitude =
      center.latitude + milesToLatDegrees(distanceMiles) * Math.cos(bearing);
    const longitude =
      center.longitude +
      milesToLonDegrees(distanceMiles, center.latitude) * Math.sin(bearing);

    const brand = BRANDS[i % BRANDS.length];
    // Spread stations +/- 12% around the real (or fallback) regional average.
    const basePrice = regularBasePrice * (0.94 + rand() * 0.12);

    const prices = FUEL_TYPES.map((fuelType, idx) => {
      const bump = idx === 0 ? 0 : idx === 1 ? 0.25 : idx === 2 ? 0.55 : 0.4;
      const jitter = (rand() - 0.5) * 0.1;
      return {
        fuelType,
        price: Math.round((basePrice + bump + jitter) * 100) / 100,
        updatedAt: new Date(Date.now() - rand() * 1000 * 60 * 60 * 6).toISOString(),
      };
    });

    stations.push({
      id: `station-${i}`,
      name: `${brand} #${1000 + i}`,
      brand,
      address: `${100 + i * 12} Main St`,
      latitude,
      longitude,
      prices,
    });
  }

  return stations;
}

export const mockStationProvider: StationProvider = {
  async getStationsNear(center: Coordinates): Promise<Station[]> {
    return generateMockStations(center);
  },
};

export interface StationsResult {
  stations: Station[];
  region: RegionalContext | null;
  /** "live" if stations are anchored to a real EIA regional average, "mock" if using the fixed fallback. */
  anchorSource: "live" | "mock";
}

/**
 * Fetches stations near `center`, anchoring the simulated per-station prices
 * to a real EIA regional average when an API key is configured. Individual
 * station-level live prices aren't available from any free public API, so
 * stations are still simulated — but around a real, current market number
 * instead of a hardcoded one.
 */
export async function getStationsForLocation(
  center: Coordinates,
  apiKey?: string
): Promise<StationsResult> {
  if (!apiKey) {
    return {
      stations: generateMockStations(center),
      region: null,
      anchorSource: "mock",
    };
  }

  try {
    const region = await resolveRegion(center);
    const anchorPrice = await fetchLatestRegionalPrice(region, "regular", apiKey);
    return {
      stations: generateMockStations(center, 14, anchorPrice),
      region,
      anchorSource: "live",
    };
  } catch {
    return {
      stations: generateMockStations(center),
      region: null,
      anchorSource: "mock",
    };
  }
}
