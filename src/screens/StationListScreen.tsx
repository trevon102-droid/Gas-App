import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FuelTypeTabs } from "@/components/FuelTypeTabs";
import { Sparkline } from "@/components/Sparkline";
import { StationCard } from "@/components/StationCard";
import { getAlertThresholds, shouldNotify } from "@/data/alerts";
import { fetchRegionalHistory, RegionCandidate, RegionalPricePoint } from "@/data/eia";
import { getFavoriteIds, toggleFavorite } from "@/data/favorites";
import { recordSnapshot } from "@/data/priceHistory";
import { getStationsForLocation } from "@/data/stationProvider";
import { useLocation } from "@/hooks/useLocation";
import { RootStackParamList } from "@/navigation/types";
import { sendPriceAlert } from "@/services/notifications";
import { FuelType, Station, StationWithDistance } from "@/types";
import { haversineMiles } from "@/utils/distance";

type Props = NativeStackScreenProps<RootStackParamList, "StationList">;

const EIA_API_KEY = process.env.EXPO_PUBLIC_EIA_API_KEY;

const FUEL_LABELS: Record<FuelType, string> = {
  regular: "Regular",
  midgrade: "Midgrade",
  premium: "Premium",
  diesel: "Diesel",
};

export function StationListScreen({ navigation }: Props) {
  const { coords, loading: locationLoading, error: locationError, retry } = useLocation();
  const [stations, setStations] = useState<Station[]>([]);
  const [regionCandidates, setRegionCandidates] = useState<RegionCandidate[] | null>(null);
  const [anchorSource, setAnchorSource] = useState<"live" | "mock">("mock");
  const [regionalHistory, setRegionalHistory] = useState<RegionalPricePoint[]>([]);
  const [historyArea, setHistoryArea] = useState<RegionCandidate | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [fuelType, setFuelType] = useState<FuelType>("regular");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadStations = useCallback(async () => {
    if (!coords) return;
    setLoadingStations(true);
    try {
      const result = await getStationsForLocation(coords, EIA_API_KEY);
      setStations(result.stations);
      setRegionCandidates(result.regionCandidates);
      setAnchorSource(result.anchorSource);
      recordSnapshot(result.stations);
    } finally {
      setLoadingStations(false);
    }
  }, [coords]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    getFavoriteIds().then(setFavoriteIds);
  }, []);

  useEffect(() => {
    if (!regionCandidates || !EIA_API_KEY) {
      setRegionalHistory([]);
      setHistoryArea(null);
      return;
    }
    fetchRegionalHistory(regionCandidates, fuelType, EIA_API_KEY)
      .then(({ points, area }) => {
        setRegionalHistory(points);
        setHistoryArea(area);
      })
      .catch(() => {
        setRegionalHistory([]);
        setHistoryArea(null);
      });
  }, [regionCandidates, fuelType]);

  const stationsWithDistance: StationWithDistance[] = useMemo(() => {
    if (!coords) return [];
    return stations
      .map((station) => ({
        ...station,
        distanceMiles: haversineMiles(coords, station),
      }))
      .sort((a, b) => {
        const priceA = a.prices.find((p) => p.fuelType === fuelType)?.price ?? Infinity;
        const priceB = b.prices.find((p) => p.fuelType === fuelType)?.price ?? Infinity;
        return priceA - priceB;
      });
  }, [stations, coords, fuelType]);

  const cheapestId = stationsWithDistance[0]?.id;

  // Check every fuel type's alert threshold against the current cheapest match, not just the selected tab.
  useEffect(() => {
    if (stationsWithDistance.length === 0) return;

    getAlertThresholds().then((thresholds) => {
      (Object.keys(thresholds) as FuelType[]).forEach((type) => {
        const target = thresholds[type];
        if (target === undefined) return;

        const cheapest = [...stationsWithDistance].sort((a, b) => {
          const priceA = a.prices.find((p) => p.fuelType === type)?.price ?? Infinity;
          const priceB = b.prices.find((p) => p.fuelType === type)?.price ?? Infinity;
          return priceA - priceB;
        })[0];
        const price = cheapest?.prices.find((p) => p.fuelType === type)?.price;

        if (price !== undefined && price <= target) {
          shouldNotify(type, cheapest.id, price).then((notify) => {
            if (notify) {
              sendPriceAlert(
                `${FUEL_LABELS[type]} hit $${price.toFixed(2)}`,
                `${cheapest.name} is ${cheapest.distanceMiles.toFixed(1)} mi away — at or below your $${target.toFixed(2)} target.`
              );
            }
          });
        }
      });
    });
  }, [stationsWithDistance]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    const next = await toggleFavorite(id);
    setFavoriteIds(next);
  }, []);

  if (locationLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3DDC84" size="large" />
        <Text style={styles.centerText}>Finding your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(locationError || anchorSource === "mock") && (
        <View style={styles.header}>
          {locationError && <Text style={styles.warning}>{locationError}</Text>}
          {anchorSource === "mock" && (
            <Text style={styles.hint}>
              {EIA_API_KEY
                ? "Couldn't reach live regional data — showing simulated prices."
                : "Simulated prices. Add EXPO_PUBLIC_EIA_API_KEY for real regional anchoring (see README)."}
            </Text>
          )}
        </View>
      )}
      <FuelTypeTabs value={fuelType} onChange={setFuelType} />
      {regionalHistory.length >= 2 && (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>
            {historyArea?.label} · {FUEL_LABELS[fuelType]} · {regionalHistory.length}wk
          </Text>
          <Sparkline
            height={32}
            points={regionalHistory.map((p) => p.price)}
            formatValue={(v) => `$${v.toFixed(2)}`}
          />
        </View>
      )}
      <FlatList
        data={stationsWithDistance}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loadingStations}
            onRefresh={() => {
              retry();
              loadStations();
            }}
            tintColor="#3DDC84"
          />
        }
        ListEmptyComponent={
          !loadingStations ? (
            <Text style={styles.centerText}>No stations found nearby.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <StationCard
            station={item}
            fuelType={fuelType}
            isCheapest={item.id === cheapestId}
            isFavorite={favoriteIds.includes(item.id)}
            onPress={() => navigation.navigate("StationDetail", { station: item })}
            onToggleFavorite={() => handleToggleFavorite(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1115",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  warning: {
    color: "#F5C518",
    fontSize: 12,
  },
  hint: {
    color: "#6B7280",
    fontSize: 12,
  },
  trendCard: {
    backgroundColor: "#1C1F26",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  trendTitle: {
    color: "#9AA0AC",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  list: {
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F1115",
  },
  centerText: {
    color: "#9AA0AC",
    marginTop: 12,
  },
});
