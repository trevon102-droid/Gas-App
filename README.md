# Gas App

Find the cheapest nearby gas stations, sorted by price and distance.

## Stack

- Expo (React Native) + TypeScript
- `expo-location` for GPS
- React Navigation (list → detail)
- AsyncStorage for favorites

## Run it

```bash
npm install
npm start
```

Then scan the QR code with **Expo Go** (iOS/Android) or press `i` / `a` for a simulator.

## Data source

Prices currently come from `src/data/stationProvider.ts`, which generates
realistic mock stations around your current location so the app works with
zero setup. To wire in real, live prices:

1. Implement the `StationProvider` interface with a real API call (e.g. a
   gas-price API like CollectAPI or RapidAPI's gas-prices feeds, or your own
   scraper/backend).
2. Swap `mockStationProvider` for your implementation in
   `src/screens/StationListScreen.tsx`.

## Structure

```
App.tsx                       navigation root
src/
  types.ts                    Station / FuelPrice types
  data/
    stationProvider.ts        pluggable price data source (mock by default)
    favorites.ts               AsyncStorage-backed favorites
  hooks/useLocation.ts         GPS permission + current position
  utils/distance.ts            haversine distance calc
  components/                 StationCard, FuelTypeTabs
  screens/                    StationListScreen, StationDetailScreen
```
