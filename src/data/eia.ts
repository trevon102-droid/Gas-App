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

export interface RegionalPricePoint {
  period: string;
  price: number;
}

export interface RegionalContext {
  areaLabel: string;
  duoarea: string;
}

/** Best-effort: figures out a US state abbreviation for a coordinate, or falls back to the national average area. */
export async function resolveRegion(center: Coordinates): Promise<RegionalContext> {
  try {
    const [place] = await Location.reverseGeocodeAsync(center);
    if (place?.isoCountryCode === "US" && place.region) {
      const abbr =
        place.region.length === 2
          ? place.region.toUpperCase()
          : STATE_NAME_TO_ABBR[place.region];
      if (abbr) {
        return { areaLabel: place.region, duoarea: `S${abbr}` };
      }
    }
  } catch {
    // fall through to national average
  }
  return { areaLabel: "U.S.", duoarea: "NUS" };
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
    throw new Error(`EIA response had no data: ${JSON.stringify(json).slice(0, 300)}`);
  }

  return rows
    .map((row) => ({ period: row.period, price: Number(row.value) }))
    .filter((point) => Number.isFinite(point.price))
    .reverse(); // oldest -> newest
}

/** Last ~12 weeks of real, published regional average prices for a fuel type. */
export async function fetchRegionalHistory(
  region: RegionalContext,
  fuelType: FuelType,
  apiKey: string,
  weeks = 12
): Promise<RegionalPricePoint[]> {
  return queryEia(region.duoarea, fuelType, apiKey, weeks);
}

/** Latest real regional average price, used to anchor the simulated station prices. */
export async function fetchLatestRegionalPrice(
  region: RegionalContext,
  fuelType: FuelType,
  apiKey: string
): Promise<number> {
  const history = await queryEia(region.duoarea, fuelType, apiKey, 1);
  return history[history.length - 1].price;
}
