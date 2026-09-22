import * as Location from "expo-location";
import { Coordinates, FuelType } from "@/types";

const EIA_BASE_URL = "https://api.eia.gov/v2/petroleum/pri/gnd/data/";

const PRODUCT_CODES: Record<FuelType, string> = {
  regular: "EPMR",
  midgrade: "EPMM",
  premium: "EPMP",
  diesel: "EPD2D",
};

const STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC",
};

/**
 * EIA's weekly gas price series only breaks out a handful of individual
 * states (CA, CO, FL, MA, MN, NY, OH, TX, WA) plus the 5 PADD regions
 * (with PADD 1 further split into 1A/1B/1C). Every other state has no
 * "S{state}" series and must fall back to its PADD's regional average.
 */
const STATE_TO_PADD: Record<string, { code: string; label: string }> = {
  CT: { code: "R1X", label: "New England (PADD 1A)" },
  ME: { code: "R1X", label: "New England (PADD 1A)" },
  MA: { code: "R1X", label: "New England (PADD 1A)" },
  NH: { code: "R1X", label: "New England (PADD 1A)" },
  RI: { code: "R1X", label: "New England (PADD 1A)" },
  VT: { code: "R1X", label: "New England (PADD 1A)" },

  DE: { code: "R1Y", label: "Central Atlantic (PADD 1B)" },
  DC: { code: "R1Y", label: "Central Atlantic (PADD 1B)" },
  MD: { code: "R1Y", label: "Central Atlantic (PADD 1B)" },
  NJ: { code: "R1Y", label: "Central Atlantic (PADD 1B)" },
  NY: { code: "R1Y", label: "Central Atlantic (PADD 1B)" },
  PA: { code: "R1Y", label: "Central Atlantic (PADD 1B)" },

  FL: { code: "R1Z", label: "Lower Atlantic (PADD 1C)" },
  GA: { code: "R1Z", label: "Lower Atlantic (PADD 1C)" },
  NC: { code: "R1Z", label: "Lower Atlantic (PADD 1C)" },
  SC: { code: "R1Z", label: "Lower Atlantic (PADD 1C)" },
  VA: { code: "R1Z", label: "Lower Atlantic (PADD 1C)" },
  WV: { code: "R1Z", label: "Lower Atlantic (PADD 1C)" },

  IL: { code: "R20", label: "Midwest (PADD 2)" },
  IN: { code: "R20", label: "Midwest (PADD 2)" },
  IA: { code: "R20", label: "Midwest (PADD 2)" },
  KS: { code: "R20", label: "Midwest (PADD 2)" },
  KY: { code: "R20", label: "Midwest (PADD 2)" },
  MI: { code: "R20", label: "Midwest (PADD 2)" },
  MN: { code: "R20", label: "Midwest (PADD 2)" },
  MO: { code: "R20", label: "Midwest (PADD 2)" },
  NE: { code: "R20", label: "Midwest (PADD 2)" },
  ND: { code: "R20", label: "Midwest (PADD 2)" },
  OH: { code: "R20", label: "Midwest (PADD 2)" },
  OK: { code: "R20", label: "Midwest (PADD 2)" },
  SD: { code: "R20", label: "Midwest (PADD 2)" },
  TN: { code: "R20", label: "Midwest (PADD 2)" },
  WI: { code: "R20", label: "Midwest (PADD 2)" },

  AL: { code: "R30", label: "Gulf Coast (PADD 3)" },
  AR: { code: "R30", label: "Gulf Coast (PADD 3)" },
  LA: { code: "R30", label: "Gulf Coast (PADD 3)" },
  MS: { code: "R30", label: "Gulf Coast (PADD 3)" },
  NM: { code: "R30", label: "Gulf Coast (PADD 3)" },
  TX: { code: "R30", label: "Gulf Coast (PADD 3)" },

  CO: { code: "R40", label: "Rocky Mountain (PADD 4)" },
  ID: { code: "R40", label: "Rocky Mountain (PADD 4)" },
  MT: { code: "R40", label: "Rocky Mountain (PADD 4)" },
  UT: { code: "R40", label: "Rocky Mountain (PADD 4)" },
  WY: { code: "R40", label: "Rocky Mountain (PADD 4)" },

  AK: { code: "R50", label: "West Coast (PADD 5)" },
  AZ: { code: "R50", label: "West Coast (PADD 5)" },
  CA: { code: "R50", label: "West Coast (PADD 5)" },
  HI: { code: "R50", label: "West Coast (PADD 5)" },
  NV: { code: "R50", label: "West Coast (PADD 5)" },
  OR: { code: "R50", label: "West Coast (PADD 5)" },
  WA: { code: "R50", label: "West Coast (PADD 5)" },
};

export interface RegionalPricePoint {
  period: string;
  price: number;
}

export interface RegionCandidate {
  duoarea: string;
  label: string;
}

/**
 * Ordered fallback chain: the state's own series first (works for the ~9
 * states EIA tracks individually), then its PADD region, then the US
 * national average. The first candidate that actually has data wins.
 */
export async function resolveRegion(center: Coordinates): Promise<RegionCandidate[]> {
  const national = { duoarea: "NUS", label: "U.S." };

  try {
    const [place] = await Location.reverseGeocodeAsync(center);
    if (place?.isoCountryCode === "US" && place.region) {
      const abbr =
        place.region.length === 2
          ? place.region.toUpperCase()
          : STATE_NAME_TO_ABBR[place.region];

      if (abbr) {
        const candidates: RegionCandidate[] = [{ duoarea: `S${abbr}`, label: place.region }];
        const padd = STATE_TO_PADD[abbr];
        if (padd) {
          candidates.push({ duoarea: padd.code, label: padd.label });
        }
        candidates.push(national);
        return candidates;
      }
    }
  } catch {
    // fall through to national average
  }
  return [national];
}

interface EiaResponseRow {
  period: string;
  value: string | number;
}

async function queryEia(
  duoarea: string,
  fuelType: FuelType,
  apiKey: string,
  length: number
): Promise<RegionalPricePoint[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: "weekly",
    "data[0]": "value",
    "facets[duoarea][]": duoarea,
    "facets[product][]": PRODUCT_CODES[fuelType],
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    length: String(length),
  });

  const response = await fetch(`${EIA_BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`EIA request failed: ${response.status} ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  const rows: EiaResponseRow[] = json?.response?.data ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`EIA response had no data for duoarea=${duoarea}`);
  }

  return rows
    .map((row) => ({ period: row.period, price: Number(row.value) }))
    .filter((point) => Number.isFinite(point.price))
    .reverse(); // oldest -> newest
}

async function queryEiaWithFallback(
  candidates: RegionCandidate[],
  fuelType: FuelType,
  apiKey: string,
  length: number
): Promise<{ points: RegionalPricePoint[]; area: RegionCandidate }> {
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const points = await queryEia(candidate.duoarea, fuelType, apiKey, length);
      return { points, area: candidate };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("No region candidates to query");
}

/** Last ~12 weeks of real, published prices for a fuel type, walking the state -> PADD -> national fallback chain. */
export async function fetchRegionalHistory(
  candidates: RegionCandidate[],
  fuelType: FuelType,
  apiKey: string,
  weeks = 12
): Promise<{ points: RegionalPricePoint[]; area: RegionCandidate }> {
  return queryEiaWithFallback(candidates, fuelType, apiKey, weeks);
}

/** Latest real average price used to anchor the simulated station prices, with the same fallback chain. */
export async function fetchLatestRegionalPrice(
  candidates: RegionCandidate[],
  fuelType: FuelType,
  apiKey: string
): Promise<{ price: number; area: RegionCandidate }> {
  const { points, area } = await queryEiaWithFallback(candidates, fuelType, apiKey, 1);
  return { price: points[points.length - 1].price, area };
}
