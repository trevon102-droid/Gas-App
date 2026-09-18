import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FuelType } from "@/types";

const LABELS: Record<FuelType, string> = {
  regular: "Regular",
  midgrade: "Midgrade",
  premium: "Premium",
  diesel: "Diesel",
};

interface Props {
  value: FuelType;
  onChange: (fuelType: FuelType) => void;
}

export function FuelTypeTabs({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {(Object.keys(LABELS) as FuelType[]).map((fuelType) => {
        const active = fuelType === value;
        return (
          <TouchableOpacity
            key={fuelType}
            onPress={() => onChange(fuelType)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {LABELS[fuelType]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#1C1F26",
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: "#3DDC84",
  },
  tabText: {
    color: "#9AA0AC",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0F1115",
  },
});
