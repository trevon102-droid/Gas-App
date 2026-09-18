import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AlertThresholds, getAlertThresholds, setAlertThreshold } from "@/data/alerts";
import { ensureNotificationPermission } from "@/services/notifications";
import { FuelType } from "@/types";

const FUEL_TYPES: FuelType[] = ["regular", "midgrade", "premium", "diesel"];
const LABELS: Record<FuelType, string> = {
  regular: "Regular",
  midgrade: "Midgrade",
  premium: "Premium",
  diesel: "Diesel",
};

export function AlertsScreen() {
  const [thresholds, setThresholds] = useState<AlertThresholds>({});
  const [drafts, setDrafts] = useState<Record<FuelType, string>>({
    regular: "",
    midgrade: "",
    premium: "",
    diesel: "",
  });

  useEffect(() => {
    getAlertThresholds().then((loaded) => {
      setThresholds(loaded);
      setDrafts((prev) => {
        const next = { ...prev };
        FUEL_TYPES.forEach((fuelType) => {
          if (loaded[fuelType] !== undefined) {
            next[fuelType] = String(loaded[fuelType]);
          }
        });
        return next;
      });
    });
    ensureNotificationPermission();
  }, []);

  const handleSave = async (fuelType: FuelType) => {
    const raw = drafts[fuelType].trim();
    const value = raw === "" ? null : Number(raw);

    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      Alert.alert("Invalid price", "Enter a positive number like 3.29, or clear it to remove the alert.");
      return;
    }

    const next = await setAlertThreshold(fuelType, value);
    setThresholds(next);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Get notified when a nearby station's price drops to or below your
        target. Checked every time the list refreshes.
      </Text>

      {FUEL_TYPES.map((fuelType) => (
        <View key={fuelType} style={styles.row}>
          <Text style={styles.label}>{LABELS[fuelType]}</Text>
          <View style={styles.inputRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="No alert"
              placeholderTextColor="#6B7280"
              value={drafts[fuelType]}
              onChangeText={(text) =>
                setDrafts((prev) => ({ ...prev, [fuelType]: text }))
              }
              onBlur={() => handleSave(fuelType)}
            />
          </View>
          {thresholds[fuelType] !== undefined && (
            <TouchableOpacity
              onPress={() => {
                setDrafts((prev) => ({ ...prev, [fuelType]: "" }));
                setAlertThreshold(fuelType, null).then(setThresholds);
              }}
            >
              <Text style={styles.clear}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1115",
    padding: 20,
  },
  intro: {
    color: "#9AA0AC",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1F26",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  label: {
    color: "#F5F6F8",
    fontSize: 16,
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dollar: {
    color: "#9AA0AC",
    fontSize: 16,
    marginRight: 2,
  },
  input: {
    color: "#3DDC84",
    fontSize: 16,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "right",
  },
  clear: {
    color: "#F5C518",
    fontSize: 13,
    marginLeft: 12,
  },
});
