import AsyncStorage from "@react-native-async-storage/async-storage";
import { FuelType } from "@/types";

const THRESHOLDS_KEY = "gas-app:alert-thresholds";
const NOTIFIED_KEY = "gas-app:alert-last-notified";

export type AlertThresholds = Partial<Record<FuelType, number>>;

export async function getAlertThresholds(): Promise<AlertThresholds> {
  const raw = await AsyncStorage.getItem(THRESHOLDS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as AlertThresholds;
  } catch {
    return {};
  }
}

export async function setAlertThreshold(
  fuelType: FuelType,
  price: number | null
): Promise<AlertThresholds> {
  const current = await getAlertThresholds();
  const next = { ...current };
  if (price === null) {
    delete next[fuelType];
  } else {
    next[fuelType] = price;
  }
  await AsyncStorage.setItem(THRESHOLDS_KEY, JSON.stringify(next));
  return next;
}

interface LastNotified {
  [fuelType: string]: { stationId: string; price: number; at: string };
}

async function getLastNotified(): Promise<LastNotified> {
  const raw = await AsyncStorage.getItem(NOTIFIED_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LastNotified;
  } catch {
    return {};
  }
}

const RENOTIFY_COOLDOWN_MS = 1000 * 60 * 60 * 6; // 6 hours

/**
 * Returns true (and records the notification) only if this is a new best
 * price worth alerting on for this fuel type — avoids repeat pings every
 * refresh for the same station/price.
 */
export async function shouldNotify(
  fuelType: FuelType,
  stationId: string,
  price: number
): Promise<boolean> {
  const last = await getLastNotified();
  const previous = last[fuelType];

  const isSameAsLast =
    previous && previous.stationId === stationId && previous.price === price;
  const withinCooldown =
    previous && Date.now() - new Date(previous.at).getTime() < RENOTIFY_COOLDOWN_MS;

  if (isSameAsLast && withinCooldown) {
    return false;
  }

  last[fuelType] = { stationId, price, at: new Date().toISOString() };
  await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify(last));
  return true;
}
