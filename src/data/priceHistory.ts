import AsyncStorage from "@react-native-async-storage/async-storage";
import { FuelPrice, Station } from "@/types";

const HISTORY_PREFIX = "gas-app:history:";
const MAX_POINTS_PER_STATION = 30;

export interface HistoryPoint {
  timestamp: string;
  prices: FuelPrice[];
}

function key(stationId: string): string {
  return `${HISTORY_PREFIX}${stationId}`;
}

export async function getStationHistory(stationId: string): Promise<HistoryPoint[]> {
  const raw = await AsyncStorage.getItem(key(stationId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryPoint[];
  } catch {
    return [];
  }
}

/** Appends a snapshot for each station, capped to the most recent N points. Safe to call on every refresh. */
export async function recordSnapshot(stations: Station[]): Promise<void> {
  const timestamp = new Date().toISOString();

  await Promise.all(
    stations.map(async (station) => {
      const existing = await getStationHistory(station.id);
      const next = [...existing, { timestamp, prices: station.prices }].slice(
        -MAX_POINTS_PER_STATION
      );
      await AsyncStorage.setItem(key(station.id), JSON.stringify(next));
    })
  );
}
