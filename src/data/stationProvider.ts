import { Coordinates, FuelType, Station } from "@/types";

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
  count = 14
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
    const basePrice = 3.15 + rand() * 0.9;

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
