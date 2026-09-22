import { fetchLatestRegionalPrice, resolveRegion, RegionCandidate } from "@/data/eia";
import { fetchNearbyStationsWithRealPrices } from "@/data/googlePlaces";
import { fetchNearbyRealStations } from "@/data/overpass";
import { Coordinates, FuelType, Station } from "@/types";

const DEFAULT_REGULAR_BASE_PRICE = 3.15;
const MAX_STATIONS = 30;

/**
 * StationProvider is the seam for real price data. `mockStationProvider`
 * below generates plausible stations around the user so the app is usable
 * out of the box; swap it for a real API (e.g. GasBuddy/CollectAPI/RapidAPI
 * gas-price feeds) by implementing the same interface.
 */
export interface StationProvider {
  getStationsNear(center: Coordinates): Promise<Station[]>;
}

interface StationLocation {
  id: string;
  name: string;
  brand: string;
  address: string;
  latitude: number;
  longitude: number;
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

const STREET_NAMES = [
  "Main St",
  "Broadway",
  "Market St",
  "Church St",
  "Park Ave",
  "Mill Rd",
  "Highland Ave",
  "River Rd",
  "Franklin St",
  "Union Ave",
  "5th Ave",
  "Washington Blvd",
];

// Deterministic pseudo-random generator so re-renders don't jitter prices.
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 233280;
}

function milesToLatDegrees(miles: number): number {
  return miles / 69;
}

function milesToLonDegrees(miles: number, atLatitude: number): number {
  return miles / (69 * Math.cos((atLatitude * Math.PI) / 180));
}

function generateMockLocations(center: Coordinates, count = 14): StationLocation[] {
  const locations: StationLocation[] = [];

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
    const streetName = STREET_NAMES[Math.floor(rand() * STREET_NAMES.length)];
    const houseNumber = 100 + Math.floor(rand() * 9800);

    locations.push({
      id: `sim-${i}`,
      name: `${brand} #${1000 + i}`,
      brand,
      address: `${houseNumber} ${streetName}`,
      latitude,
      longitude,
    });
  }

  return locations;
}

// Deterministic per-station pricing, seeded from the station id so real
// (OSM) and simulated locations both get stable, non-jittery prices.
function generatePricesForLocations(
  locations: StationLocation[],
  regularBasePrice: number
): Station[] {
  return locations.map((location) => {
    const rand = seededRandom(hashString(location.id));
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

    return { ...location, prices };
  });
}

export function generateMockStations(
  center: Coordinates,
  count = 14,
  regularBasePrice: number = DEFAULT_REGULAR_BASE_PRICE
): Station[] {
  return generatePricesForLocations(generateMockLocations(center, count), regularBasePrice);
}

export const mockStationProvider: StationProvider = {
  async getStationsNear(center: Coordinates): Promise<Station[]> {
    return generateMockStations(center);
  },
};

export interface StationsResult {
  stations: Station[];
  region: RegionCandidate | null;
  /** The full state -> PADD -> national fallback chain, for re-querying (e.g. a regional trend chart) without re-geocoding. */
  regionCandidates: RegionCandidate[] | null;
  /** "live" if prices are grounded in real data (Google per-station or EIA regional average), "mock" if using the fixed fallback baseline. */
  anchorSource: "live" | "mock";
  /** "real" if station names/addresses/coordinates came from a real source (Google or OpenStreetMap), "simulated" if generated as a fallback. */
  locationSource: "real" | "simulated";
  /** Where the displayed prices actually came from. */
  priceSource: "google" | "eia-anchored" | "mock";
}

export interface StationApiKeys {
  eiaApiKey?: string;
  googlePlacesApiKey?: string;
}

/**
 * Fetches stations near `center`, preferring the most real data available:
 *
 * 1. Google Places (real stations + real per-station prices) when a
 *    Google Places API key is configured -- this is the only source with
 *    genuine live-ish per-station pricing, since nothing free publishes it.
 * 2. OpenStreetMap for real station names/addresses/coordinates (free, no
 *    key), with prices simulated but anchored to a real EIA regional
 *    average when an EIA key is configured.
 * 3. Fully simulated stations and prices as the last-resort fallback so
 *    the app always works (offline, no keys, or every request failing).
 */
export async function getStationsForLocation(
  center: Coordinates,
  { eiaApiKey, googlePlacesApiKey }: StationApiKeys = {}
): Promise<StationsResult> {
  if (googlePlacesApiKey) {
    try {
      const stations = await fetchNearbyStationsWithRealPrices(center, googlePlacesApiKey);
      return {
        stations: stations.slice(0, MAX_STATIONS),
        region: null,
        regionCandidates: null,
        anchorSource: "live",
        locationSource: "real",
        priceSource: "google",
      };
    } catch (err) {
      if (__DEV__) {
        console.warn("[gas-app] Google Places fetch failed, falling back:", err);
      }
    }
  }

  let anchorPrice = DEFAULT_REGULAR_BASE_PRICE;
  let anchorSource: "live" | "mock" = "mock";
  let region: RegionCandidate | null = null;
  let regionCandidates: RegionCandidate[] | null = null;

  if (eiaApiKey) {
    try {
      const candidates = await resolveRegion(center);
      const { price, area } = await fetchLatestRegionalPrice(candidates, "regular", eiaApiKey);
      anchorPrice = price;
      anchorSource = "live";
      region = area;
      regionCandidates = candidates;
    } catch (err) {
      if (__DEV__) {
        console.warn("[gas-app] EIA live price fetch failed, using simulated baseline:", err);
      }
    }
  }

  let locations: StationLocation[];
  let locationSource: "real" | "simulated";
  try {
    const real = await fetchNearbyRealStations(center);
    locations = real.slice(0, MAX_STATIONS);
    locationSource = "real";
  } catch (err) {
    if (__DEV__) {
      console.warn("[gas-app] Real station lookup failed, using simulated locations:", err);
    }
    locations = generateMockLocations(center);
    locationSource = "simulated";
  }

  return {
    stations: generatePricesForLocations(locations, anchorPrice),
    region,
    regionCandidates,
    anchorSource,
    locationSource,
    priceSource: anchorSource === "live" ? "eia-anchored" : "mock",
  };
}
