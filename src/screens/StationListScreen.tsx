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
import { StationCard } from "@/components/StationCard";
import { getFavoriteIds, toggleFavorite } from "@/data/favorites";
import { mockStationProvider } from "@/data/stationProvider";
import { useLocation } from "@/hooks/useLocation";
import { RootStackParamList } from "@/navigation/types";
import { FuelType, Station, StationWithDistance } from "@/types";
import { haversineMiles } from "@/utils/distance";

type Props = NativeStackScreenProps<RootStackParamList, "StationList">;

export function StationListScreen({ navigation }: Props) {
  const { coords, loading: locationLoading, error: locationError, retry } = useLocation();
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [fuelType, setFuelType] = useState<FuelType>("regular");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadStations = useCallback(async () => {
    if (!coords) return;
    setLoadingStations(true);
    try {
      const result = await mockStationProvider.getStationsNear(coords);
      setStations(result);
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
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Gas Prices</Text>
        {locationError && <Text style={styles.warning}>{locationError}</Text>}
      </View>
      <FuelTypeTabs value={fuelType} onChange={setFuelType} />
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    color: "#F5F6F8",
    fontSize: 26,
    fontWeight: "800",
  },
  warning: {
    color: "#F5C518",
    fontSize: 12,
    marginTop: 4,
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
