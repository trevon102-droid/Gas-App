import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FuelType, StationWithDistance } from "@/types";

interface Props {
  station: StationWithDistance;
  fuelType: FuelType;
  isCheapest: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

export function StationCard({
  station,
  fuelType,
  isCheapest,
  isFavorite,
  onPress,
  onToggleFavorite,
}: Props) {
  const price = station.prices.find((p) => p.fuelType === fuelType);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.name}>{station.name}</Text>
        <Text style={styles.address}>{station.address}</Text>
        <Text style={styles.distance}>{station.distanceMiles.toFixed(1)} mi away</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.priceRow}>
          {isCheapest && <Text style={styles.badge}>BEST</Text>}
          <Text style={styles.price}>
            {price ? `$${price.price.toFixed(2)}` : "—"}
          </Text>
        </View>
        <TouchableOpacity onPress={onToggleFavorite} hitSlop={10}>
          <Text style={styles.star}>{isFavorite ? "★" : "☆"}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1C1F26",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  left: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    color: "#F5F6F8",
    fontSize: 16,
    fontWeight: "700",
  },
  address: {
    color: "#9AA0AC",
    fontSize: 13,
    marginTop: 2,
  },
  distance: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 6,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceRow: {
    alignItems: "flex-end",
  },
  badge: {
    color: "#0F1115",
    backgroundColor: "#3DDC84",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
    overflow: "hidden",
  },
  price: {
    color: "#3DDC84",
    fontSize: 20,
    fontWeight: "800",
  },
  star: {
    color: "#F5C518",
    fontSize: 22,
    marginTop: 8,
  },
});
