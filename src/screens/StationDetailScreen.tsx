import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "StationDetail">;

const FUEL_LABELS: Record<string, string> = {
  regular: "Regular",
  midgrade: "Midgrade",
  premium: "Premium",
  diesel: "Diesel",
};

export function StationDetailScreen({ route }: Props) {
  const { station } = route.params;

  const openMaps = () => {
    const query = encodeURIComponent(`${station.name} ${station.address}`);
    Linking.openURL(`https://maps.apple.com/?q=${query}&ll=${station.latitude},${station.longitude}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.address}>{station.address}</Text>
      <Text style={styles.distance}>{station.distanceMiles.toFixed(1)} miles away</Text>

      <View style={styles.priceList}>
        {station.prices.map((price) => (
          <View key={price.fuelType} style={styles.priceRow}>
            <Text style={styles.fuelLabel}>{FUEL_LABELS[price.fuelType]}</Text>
            <Text style={styles.priceValue}>${price.price.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={openMaps}>
        <Text style={styles.buttonText}>Open in Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1115",
    padding: 20,
  },
  name: {
    color: "#F5F6F8",
    fontSize: 24,
    fontWeight: "800",
  },
  address: {
    color: "#9AA0AC",
    fontSize: 15,
    marginTop: 4,
  },
  distance: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 4,
  },
  priceList: {
    marginTop: 24,
    backgroundColor: "#1C1F26",
    borderRadius: 14,
    padding: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomColor: "#2A2E37",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fuelLabel: {
    color: "#F5F6F8",
    fontSize: 16,
  },
  priceValue: {
    color: "#3DDC84",
    fontSize: 16,
    fontWeight: "700",
  },
  button: {
    marginTop: 24,
    backgroundColor: "#3DDC84",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#0F1115",
    fontWeight: "800",
    fontSize: 16,
  },
});
