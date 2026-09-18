export type FuelType = "regular" | "midgrade" | "premium" | "diesel";

export interface FuelPrice {
  fuelType: FuelType;
  price: number;
  updatedAt: string;
}

export interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  latitude: number;
  longitude: number;
  prices: FuelPrice[];
}

export interface StationWithDistance extends Station {
  distanceMiles: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
