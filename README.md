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

Then scan the QR code with **Expo Go** (free, install from the App Store /
Play Store — it's the app that actually runs this project; it's separate
from Claude) or press `i` / `a` for a simulator.

Your phone and the computer running `npm start` need to be on the same
Wi-Fi network. If they aren't (e.g. phone on cellular), run
`npx expo start --tunnel` instead — same QR flow, but works over the
internet.

## Data sources (real stations, real regional prices)

No source publishes free, live, per-station gas prices — GasBuddy has no
public API, and services that do (CollectAPI, RapidAPI feeds) require a
paid key. So this app combines the best available real signals for each
half of the problem:

**Station names/addresses/locations** come from **OpenStreetMap**
(`src/data/overpass.ts`, via the free public Overpass API — no key
needed). These are real gas stations near you, crowd-sourced map data.
If Overpass is unreachable, it falls back to a small set of simulated
stations so the app still works offline.

**Prices** are still simulated per station (nothing free publishes
real-time per-station prices anywhere), but anchored to a real number
instead of a guess:

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
  it just tells you which parts of what you're seeing are simulated.

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
    stationProvider.ts         pluggable data source (real OSM stations + EIA-anchored prices, mock fallback)
    overpass.ts                OpenStreetMap client (real station names/addresses/coordinates)
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
