# Gas App

Find the cheapest nearby gas stations, sorted by price and distance —
with price alerts and history tracking.

## Stack

- Expo (React Native) + TypeScript
- `expo-location` for GPS
- `expo-notifications` for local price alerts
- React Navigation (list → detail → alerts)
- AsyncStorage for favorites, alert settings, and price history

## Run it

```bash
npm install
npm start
```

Then scan the QR code with **Expo Go** (iOS/Android) or press `i` / `a` for a simulator.

## Data source (real regional prices)

No source publishes free, live, per-station gas prices — GasBuddy has no
public API, and services that do (CollectAPI, RapidAPI feeds) require a
paid key. So this app takes the best available real signal:

- **[EIA](https://www.eia.gov/opendata/register.php)** (U.S. Energy
  Information Administration) publishes free weekly average gas prices by
  state. Get a free key (instant, no approval wait) and put it in a `.env`
  file:

  ```bash
  cp .env.example .env
  # then edit .env and paste your key into EXPO_PUBLIC_EIA_API_KEY
  ```

- With a key set, the app reverse-geocodes your location to a US state,
  pulls that state's real current weekly average, and **anchors** the
  simulated per-station prices around it (±12%) instead of a fixed
  placeholder. The list screen also shows a real 12-week trend sparkline
  for your state.
- Without a key (or outside the US, or if the request fails), it falls
  back to simulated prices around a fixed baseline — the app never breaks,
  it just tells you it's using sample data.

To go fully live station-by-station, implement `StationProvider` in
`src/data/stationProvider.ts` against a paid feed and swap it in.

## Price alerts

Tap the 🔔 in the header to set a target price per fuel type. On every
refresh, if the cheapest nearby station is at or below your target, you
get a local push notification (cooldown of 6h per fuel type so it doesn't
spam you for the same price).

## Price history

Every refresh snapshots each station's prices to AsyncStorage (last 30
points). The station detail screen shows a sparkline per fuel type once
it has at least two data points — this is real history of what *this
app* has observed on *this device*, not a historical market feed.

## Structure

```
App.tsx                        navigation root (list → detail → alerts)
src/
  types.ts                     Station / FuelPrice types
  data/
    stationProvider.ts         pluggable price data source (EIA-anchored + mock fallback)
    eia.ts                     EIA API client (regional average + history)
    priceHistory.ts            AsyncStorage-backed per-station price snapshots
    alerts.ts                  AsyncStorage-backed alert thresholds + notify de-dupe
    favorites.ts               AsyncStorage-backed favorites
  services/notifications.ts    expo-notifications wrapper
  hooks/useLocation.ts         GPS permission + current position
  utils/distance.ts            haversine distance calc
  components/                  StationCard, FuelTypeTabs, Sparkline
  screens/                     StationListScreen, StationDetailScreen, AlertsScreen
```
