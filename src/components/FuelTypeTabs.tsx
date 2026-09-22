import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FuelType } from "@/types";

const LABELS: Record<FuelType, string> = {
  regular: "Regular",
  midgrade: "Midgrade",
  premium: "Premium",
  diesel: "Diesel",
};

const ORDER: FuelType[] = ["regular", "midgrade", "premium", "diesel"];

interface Props {
  value: FuelType;
  onChange: (fuelType: FuelType) => void;
}

export function FuelTypeTabs({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {ORDER.map((fuelType) => {
        const active = fuelType === value;
        return (
          <TouchableOpacity
            key={fuelType}
            onPress={() => onChange(fuelType)}
            style={[styles.tab, active && styles.tabActive]}
            activeOpacity={0.7}
            hitSlop={4}
          >
            <Text
              style={[styles.tabText, active && styles.tabTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {LABELS[fuelType]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1C1F26",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#3DDC84",
  },
  tabText: {
    color: "#9AA0AC",
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#0F1115",
  },
});
