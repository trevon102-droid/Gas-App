import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gas-app:favorites";

export async function getFavoriteIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function toggleFavorite(stationId: string): Promise<string[]> {
  const current = await getFavoriteIds();
  const next = current.includes(stationId)
    ? current.filter((id) => id !== stationId)
    : [...current, stationId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
