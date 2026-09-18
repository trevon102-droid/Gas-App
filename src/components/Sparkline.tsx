import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  points: number[];
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
}

export function Sparkline({ points, color = "#3DDC84", height = 48, formatValue }: Props) {
  if (points.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>Not enough data yet</Text>
      </View>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { height }]}>
        {points.map((value, index) => {
          const ratio = (value - min) / range;
          const barHeight = Math.max(4, ratio * height);
          return (
            <View
              key={index}
              style={[
                styles.bar,
                { height: barHeight, backgroundColor: color, opacity: 0.4 + ratio * 0.6 },
              ]}
            />
          );
        })}
      </View>
      {formatValue && (
        <View style={styles.labels}>
          <Text style={styles.labelText}>{formatValue(min)}</Text>
          <Text style={styles.labelText}>{formatValue(max)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  labelText: {
    color: "#6B7280",
    fontSize: 11,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
  },
});
