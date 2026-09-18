import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { AlertsScreen } from "@/screens/AlertsScreen";
import { StationDetailScreen } from "@/screens/StationDetailScreen";
import { StationListScreen } from "@/screens/StationListScreen";
import { RootStackParamList } from "@/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0F1115",
    card: "#0F1115",
    text: "#F5F6F8",
    border: "#1C1F26",
  },
};

export default function App() {
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="StationList"
          component={StationListScreen}
          options={({ navigation }) => ({
            title: "Gas App",
            headerLargeTitle: true,
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate("Alerts")} hitSlop={10}>
                <Text style={{ color: "#3DDC84", fontSize: 22 }}>🔔</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="StationDetail"
          component={StationDetailScreen}
          options={{ title: "Station" }}
        />
        <Stack.Screen
          name="Alerts"
          component={AlertsScreen}
          options={{ title: "Price Alerts" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
