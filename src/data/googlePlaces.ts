import { Coordinates, FuelPrice, FuelType, Station } from "@/types";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min -- real money per request, avoid hammering it

const FUEL_TYPE_MAP: Record<string, FuelType> = {
  REGULAR_UNLEADED: "regular",
  MIDGRADE: "midgrade",
  PREMIUM: "premium",
  DIESEL: "diesel",
};

interface GoogleMoney {
  currencyCode: string;
  units?: string;
  nanos?: number;
}

interface GoogleFuelPrice {
  type: string;
  price: GoogleMoney;
  updateTime?: string;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  fuelOptions?: { fuelPrices?: GoogleFuelPrice[] };
}

function moneyToNumber(money: GoogleMoney): number {
  const units = Number(money.units ?? "0");
  const nanos = (money.nanos ?? 0) / 1e9;
  return units + nanos;
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100; // ~1km grid, plenty for cache-key purposes
}

let cache: { key: string; timestamp: number; stations: Station[] } | null = null;

/**
 * Real gas stations with real, per-station, per-fuel-type prices, sourced
 * from Google Places API (New)'s fuelOptions field. Requires a billing-
 * enabled Google Cloud project. Prices are Google's own aggregated data
 * (delayed, not live-live, but genuinely real per-station numbers) --
 * nothing free publishes this.
 */
export async function fetchNearbyStationsWithRealPrices(
  center: Coordinates,
  apiKey: string,
  radiusMeters = 8000
): Promise<Station[]> {
  const cacheKey = `${roundCoord(center.latitude)},${roundCoord(center.longitude)}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.stations;
  }

  const response = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions",
    },
    body: JSON.stringify({
      includedTypes: ["gas_station"],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: center.latitude, longitude: center.longitude },
          radius: radiusMeters,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Places request failed: ${response.status} ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  const places: GooglePlace[] = json?.places ?? [];

  const stations = places
    .map((place): Station | null => {
      if (!place.location || !place.fuelOptions?.fuelPrices?.length) return null;

      const prices: FuelPrice[] = place.fuelOptions.fuelPrices
        .map((fp): FuelPrice | null => {
          const fuelType = FUEL_TYPE_MAP[fp.type];
          if (!fuelType) return null;
          return {
            fuelType,
            price: Math.round(moneyToNumber(fp.price) * 100) / 100,
            updatedAt: fp.updateTime ?? new Date().toISOString(),
          };
        })
        .filter((p): p is FuelPrice => p !== null);

      if (prices.length === 0) return null;

      return {
        id: `gp-${place.id}`,
        name: place.displayName?.text ?? "Gas Station",
        brand: place.displayName?.text ?? "Gas Station",
        address: place.formattedAddress ?? "Address unavailable",
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        prices,
      };
    })
    .filter((s): s is Station => s !== null);

  if (stations.length === 0) {
    throw new Error("Google Places returned no stations with fuel price data");
  }

  cache = { key: cacheKey, timestamp: Date.now(), stations };
  return stations;
}
