import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Coordinates } from "@/types";

interface LocationState {
  coords: Coordinates | null;
  loading: boolean;
  error: string | null;
}

// Default fallback: roughly the geographic center of the contiguous US,
// used only if the user denies location permission.
const FALLBACK_COORDS: Coordinates = { latitude: 39.8283, longitude: -98.5795 };

export function useLocation(): LocationState & { retry: () => void } {
  const [state, setState] = useState<LocationState>({
    coords: null,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ coords: null, loading: true, error: null });
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setState({
              coords: FALLBACK_COORDS,
              loading: false,
              error: "Location permission denied — showing sample area.",
            });
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setState({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            coords: FALLBACK_COORDS,
            loading: false,
            error: "Couldn't get your location — showing sample area.",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { ...state, retry: () => setAttempt((a) => a + 1) };
}
